using System.Collections.Concurrent;
using ModelContextProtocol.Authentication;

namespace WebAPI1.Services;

/// <summary>
/// 橋接「MCP SDK 的 OAuth 授權流程」跟「網頁 request/response 模式」——SDK 的
/// ClientOAuthOptions.AuthorizationCallbackHandler 設計成在同一個流程裡同步等瀏覽器跳轉完成
/// （CLI 工具的典型用法：開瀏覽器 + 本機監聽 redirect），但我們是後端網頁服務，「開始連接」
/// 跟「使用者完成瀏覽器授權、被導回我們的 callback 路由」是兩個分開的 HTTP request。
///
/// 用法（見 AgentController.BeginMcpOAuthConnectAsync）：
/// 1. CreateFlow() 拿到 (Handler, WaitForAuthorizationUri) 這一組。
/// 2. 把 Handler 塞進 ClientOAuthOptions.AuthorizationCallbackHandler，背景執行
///    McpClient.CreateAsync(...)——SDK 探索 metadata + 完成 Dynamic Client Registration 後，
///    會算出授權網址並呼叫 Handler，Handler 內部會把這個網址發布出去、然後掛起等使用者完成授權。
/// 3. 呼叫端同時呼叫 WaitForAuthorizationUri(...)，拿到網址後可以馬上回給前端（不用等使用者
///    真的按下同意），前端開新分頁讓使用者走完授權流程。
/// 4. 使用者授權完成後，外部授權伺服器把瀏覽器導回我們的 callback 路由（帶 code/state），
///    controller 呼叫 CompleteCallback(...)，把結果轉交給步驟 2 裡還在等待的那個 Handler，
///    Handler 才能 return，讓 McpClient.CreateAsync 繼續往下換 token。
///
/// 純記憶體實作（singleton），不用查資料庫——流程本身是短命的（幾分鐘內要完成，逾時會失敗），
/// 不需要跨伺服器重啟存活。跟 ISHAAudit（石化）同一套設計。
/// </summary>
public interface IMcpOAuthFlowCoordinator
{
    /// <summary>
    /// 建立一個新的連接流程追蹤。回傳的 Handler 要塞進 ClientOAuthOptions.AuthorizationCallbackHandler；
    /// WaitForAuthorizationUri 給呼叫端 await，逾時會丟 TimeoutException。
    /// </summary>
    (Func<AuthorizationCallbackContext, CancellationToken, Task<AuthorizationResult?>> Handler,
        Func<TimeSpan, Task<Uri>> WaitForAuthorizationUri) CreateFlow();

    /// <summary>
    /// OAuth callback 路由收到外部授權伺服器導回來的參數時呼叫，把結果（或錯誤）轉交給對應的
    /// 流程（用 state 關聯，state 是 SDK 自己在授權網址裡帶的高熵亂數，不是我們自己發的）。
    /// 找不到對應的流程（過期/被取消/state 對不上/重複呼叫）回傳 false，呼叫端應該顯示
    /// 「連接已過期或無效，請重新操作」而不是當成成功。
    /// </summary>
    bool CompleteCallback(string? state, string? code, string? iss, string? error, string? errorDescription);
}

/// <summary>見 IMcpOAuthFlowCoordinator 的完整說明——這裡是純記憶體的 singleton 實作。</summary>
public sealed class McpOAuthFlowCoordinator : IMcpOAuthFlowCoordinator
{
    // 使用者真的要走完瀏覽器登入/同意畫面才會回呼，給寬一點的時間；逾時了就讓整個
    // McpClient.CreateAsync 失敗，不要無限期占著一個背景工作。
    private static readonly TimeSpan AuthorizationTimeout = TimeSpan.FromMinutes(5);

    private readonly ConcurrentDictionary<string, TaskCompletionSource<AuthorizationResult>> _pendingByState = new();
    private readonly ILogger<McpOAuthFlowCoordinator> _logger;

    public McpOAuthFlowCoordinator(ILogger<McpOAuthFlowCoordinator> logger)
    {
        _logger = logger;
    }

    public (Func<AuthorizationCallbackContext, CancellationToken, Task<AuthorizationResult?>> Handler,
        Func<TimeSpan, Task<Uri>> WaitForAuthorizationUri) CreateFlow()
    {
        var authUriTcs = new TaskCompletionSource<Uri>(TaskCreationOptions.RunContinuationsAsynchronously);

        async Task<AuthorizationResult?> Handler(AuthorizationCallbackContext context, CancellationToken ct)
        {
            // context.AuthorizationUri 是 SDK 探索 metadata + 完成 DCR 之後算出來的授權網址，
            // 裡面本來就帶了 SDK 自己產生的 state 參數（高熵亂數，做 CSRF 防護用）——直接從
            // 這個網址取出來當我們自己的關聯 key，不用另外自己發一組、也不用另外驗證這個
            // state 本身的安全性（那是 SDK 自己的責任）。
            var state = ExtractQueryParam(context.AuthorizationUri, "state");
            if (string.IsNullOrEmpty(state))
            {
                throw new InvalidOperationException("授權網址缺少 state 參數，無法追蹤這次連接流程");
            }

            var resultTcs = new TaskCompletionSource<AuthorizationResult>(TaskCreationOptions.RunContinuationsAsynchronously);
            if (!_pendingByState.TryAdd(state, resultTcs))
            {
                throw new InvalidOperationException("已經有一個相同 state 的連接流程在進行中，請稍後再試");
            }

            // 授權網址算好了，發布出去給正在等待的呼叫端（BeginMcpOAuthConnectAsync）——
            // 它可以立刻把網址回給前端，不用等使用者真的按下同意。
            authUriTcs.TrySetResult(context.AuthorizationUri);

            try
            {
                var completed = await Task.WhenAny(resultTcs.Task, Task.Delay(AuthorizationTimeout, ct));
                if (completed != resultTcs.Task)
                {
                    throw new TimeoutException($"等待使用者完成 OAuth 授權逾時（{AuthorizationTimeout.TotalMinutes} 分鐘）");
                }
                return await resultTcs.Task;
            }
            finally
            {
                _pendingByState.TryRemove(state, out _);
            }
        }

        async Task<Uri> WaitForAuthorizationUri(TimeSpan timeout)
        {
            var completed = await Task.WhenAny(authUriTcs.Task, Task.Delay(timeout));
            if (completed != authUriTcs.Task)
            {
                throw new TimeoutException("等待 MCP OAuth 授權網址逾時——探索 metadata 或 Dynamic Client Registration 可能失敗了，詳見伺服器 log");
            }
            return await authUriTcs.Task;
        }

        return (Handler, WaitForAuthorizationUri);
    }

    public bool CompleteCallback(string? state, string? code, string? iss, string? error, string? errorDescription)
    {
        if (string.IsNullOrEmpty(state) || !_pendingByState.TryGetValue(state, out var pending))
        {
            _logger.LogWarning("MCP OAuth callback 找不到對應的連接流程，可能已逾時或被重複呼叫 state={State}", state);
            return false;
        }

        if (!string.IsNullOrEmpty(error))
        {
            pending.TrySetException(new InvalidOperationException($"授權伺服器回傳錯誤：{error}（{errorDescription}）"));
            return true;
        }
        if (string.IsNullOrEmpty(code))
        {
            pending.TrySetException(new InvalidOperationException("授權回呼缺少 code 參數"));
            return true;
        }

        pending.TrySetResult(new AuthorizationResult { Code = code, State = state, Iss = iss });
        return true;
    }

    private static string? ExtractQueryParam(Uri uri, string name)
    {
        var query = uri.Query.TrimStart('?');
        if (query.Length == 0)
        {
            return null;
        }
        foreach (var pair in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var idx = pair.IndexOf('=');
            var key = Uri.UnescapeDataString(idx >= 0 ? pair[..idx] : pair);
            if (!string.Equals(key, name, StringComparison.Ordinal))
            {
                continue;
            }
            return idx >= 0 ? Uri.UnescapeDataString(pair[(idx + 1)..]) : string.Empty;
        }
        return null;
    }
}

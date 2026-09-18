using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Authentication;
using WebAPI1.Context;

namespace WebAPI1.Services;

/// <summary>
/// ModelContextProtocol SDK 的 ITokenCache 接到我們自己的資料庫（AgentMcpEndpoint 的
/// OAuth* 欄位）——SDK 每次建立 McpClient 都會呼叫 GetTokensAsync 檢查有沒有快取的 token，
/// 過期的話只要有 RefreshToken，SDK 會自動打 token endpoint 換新的，換完會呼叫
/// StoreTokensAsync，不需要我們自己實作 refresh 邏輯，只要把讀/寫接到 DB 就好。
///
/// 每次用都是新建一個實例（見 AgentController.BuildMcpTransportOptions），endpointId 用建構子
/// 傳入固定——ITokenCache 一個實例對應一個 McpClient/一個 OAuth 連線，不是共用的全域快取，
/// 這是 SDK 介面本身的設計。
///
/// 實測踩過的坑：一開始這裡直接共用呼叫端傳進來的 ISHAuditDbcontext 實例，結果 SDK 內部驗證
/// 流程會並發呼叫 GetTokensAsync，EF Core 的 DbContext 本身不是執行緒安全的，兩個並行的非同步
/// 查詢共用同一個實例直接炸出
/// 「A second operation was started on this context instance before a previous operation
/// completed」。改成每次呼叫都用 IServiceScopeFactory 開一個全新、短命、只在這次呼叫範圍內
/// 存活的 scope/DbContext，不管 SDK 內部怎麼並發呼叫，各自都是獨立實例，不會互相踩。
/// </summary>
public sealed class AgentMcpTokenCache : ITokenCache
{
    private readonly int _endpointId;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDataProtector _protector;

    public AgentMcpTokenCache(int endpointId, IServiceScopeFactory scopeFactory, IDataProtector protector)
    {
        _endpointId = endpointId;
        _scopeFactory = scopeFactory;
        _protector = protector;
    }

    public async ValueTask<TokenContainer?> GetTokensAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ISHAuditDbcontext>();

        var endpoint = await db.AgentMcpEndpoints.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == _endpointId, cancellationToken);
        if (endpoint is null || string.IsNullOrEmpty(endpoint.OAuthAccessTokenEncrypted))
        {
            return null;
        }

        // TokenContainer 用 ObtainedAt + ExpiresIn（秒數）表示過期時間，不是直接存絕對時間；
        // 我們資料庫存的是算好的絕對到期時間（OAuthAccessTokenExpiresAt），這裡換算回
        // 「以現在為 ObtainedAt、往後還剩幾秒」這組等價值，語意不變（SDK 只看兩者相加
        // 是否已經過去，不管 ObtainedAt 本身是不是真的等於當初取得 token 的那一刻）。
        int? expiresIn = endpoint.OAuthAccessTokenExpiresAt.HasValue
            ? (int)Math.Max(0, (endpoint.OAuthAccessTokenExpiresAt.Value - DateTime.UtcNow).TotalSeconds)
            : null;

        return new TokenContainer
        {
            TokenType = endpoint.OAuthTokenType ?? "Bearer",
            AccessToken = _protector.Unprotect(endpoint.OAuthAccessTokenEncrypted),
            RefreshToken = string.IsNullOrEmpty(endpoint.OAuthRefreshTokenEncrypted)
                ? null : _protector.Unprotect(endpoint.OAuthRefreshTokenEncrypted),
            ExpiresIn = expiresIn,
            Scope = endpoint.OAuthScope,
            ObtainedAt = DateTimeOffset.UtcNow,
            ClientId = endpoint.OAuthClientId,
            ClientSecret = string.IsNullOrEmpty(endpoint.OAuthClientSecretEncrypted)
                ? null : _protector.Unprotect(endpoint.OAuthClientSecretEncrypted),
            AuthorizationServer = endpoint.OAuthAuthorizationServer,
        };
    }

    public async ValueTask StoreTokensAsync(TokenContainer tokens, CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ISHAuditDbcontext>();

        var endpoint = await db.AgentMcpEndpoints.FirstOrDefaultAsync(e => e.Id == _endpointId, cancellationToken);
        if (endpoint is null)
        {
            return; // endpoint 被刪了，沒地方存——靜默放棄，不影響 McpClient 本身這次操作有沒有成功
        }

        endpoint.OAuthAccessTokenEncrypted = _protector.Protect(tokens.AccessToken);
        endpoint.OAuthRefreshTokenEncrypted = string.IsNullOrEmpty(tokens.RefreshToken)
            ? endpoint.OAuthRefreshTokenEncrypted // refresh 回應有時不會帶新的 refresh token，沿用舊的
            : _protector.Protect(tokens.RefreshToken);
        endpoint.OAuthTokenType = tokens.TokenType;
        endpoint.OAuthScope = tokens.Scope ?? endpoint.OAuthScope;
        endpoint.OAuthClientId = tokens.ClientId ?? endpoint.OAuthClientId;
        endpoint.OAuthClientSecretEncrypted = string.IsNullOrEmpty(tokens.ClientSecret)
            ? endpoint.OAuthClientSecretEncrypted
            : _protector.Protect(tokens.ClientSecret);
        endpoint.OAuthAuthorizationServer = tokens.AuthorizationServer ?? endpoint.OAuthAuthorizationServer;
        endpoint.OAuthAccessTokenExpiresAt = tokens.ExpiresIn.HasValue
            ? tokens.ObtainedAt.UtcDateTime.AddSeconds(tokens.ExpiresIn.Value)
            : null;
        endpoint.OAuthConnectedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
    }
}

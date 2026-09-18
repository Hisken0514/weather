using WebAPI1.DTOs;

namespace WebAPI1.Services;

/// <summary>
/// KPI 對外開放 /mcp 端點的 OAuth 2.1 Authorization Server 核心邏輯。
/// 照搬自 ISHAAudit 那套已經在跑的實作（IMcpAuthorizationServerService），資料庫從 Postgres
/// 換成這裡的 SQL Server（ISHAuditDbcontext），pending-authorization 暫存從 ICacheService
/// 換成直接用 IConnectionMultiplexer（KPI 這邊本來就沒有那層抽象）。
/// </summary>
public interface IMcpAuthorizationServerService
{
    Task<McpClientRegistrationResponse> RegisterClientAsync(McpClientRegistrationRequest request, CancellationToken ct);

    /// <summary>驗證 client_id/redirect_uri/code_challenge 合法後，把這次授權請求存起來，回傳
    /// 一個短命的 requestId，讓 GET /oauth/authorize 導去前端同意頁時帶著這個 id。</summary>
    Task<string> CreatePendingAuthorizationAsync(
        string clientId, string redirectUri, string codeChallenge, string? state, string? scope, string userId, CancellationToken ct);

    Task<PendingMcpAuthorizationDto?> GetPendingAuthorizationAsync(string requestId, CancellationToken ct);

    /// <summary>使用者按下允許/拒絕後呼叫，回傳要把瀏覽器導回哪個 redirect_uri（帶 code/state 或
    /// error/state）。</summary>
    Task<string> DecideAuthorizationAsync(string requestId, bool approve, CancellationToken ct);

    Task<McpTokenResponse> ExchangeAuthorizationCodeAsync(
        string code, string redirectUri, string clientId, string codeVerifier, CancellationToken ct);

    Task<McpTokenResponse> ExchangeRefreshTokenAsync(string refreshToken, string clientId, CancellationToken ct);

    /// <summary>/mcp 每次呼叫都重新查一次資料庫，確認這個使用者現在還有沒有存取權限——不吃
    /// token 裡的 claim，權限被收回要立刻生效，不用等 token 過期。null 代表沒有權限。</summary>
    Task<string?> ResolveCallerUserIdAsync(string userId, CancellationToken ct);

    Task<List<McpOAuthClientAdminDto>> ListClientsAsync(CancellationToken ct);

    Task RevokeClientAsync(string clientId, CancellationToken ct);
}

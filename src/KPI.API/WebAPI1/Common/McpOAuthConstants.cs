namespace WebAPI1.Common;

/// <summary>
/// KPI 對外開放 /mcp 端點的 OAuth 2.1 Authorization Server 共用常數。
/// 照搬自 ISHAAudit 那套已經在跑的實作（McpOAuthConstants.cs），數值可以各自獨立調整。
/// </summary>
public static class McpOAuthConstants
{
    /// <summary>核發給外部 MCP client 的 access token 的 aud claim——跟一般登入 token 的
    /// Audience 不同，兩種 token 互不相通，避免一般登入 token 被拿來打 /mcp。</summary>
    public const string Audience = "isha-kpi-mcp";

    /// <summary>驗證 /mcp 端點 access token 用的第二組 JwtBearer scheme 名稱。</summary>
    public const string AuthenticationScheme = "Mcp";

    /// <summary>限定只接受上面那個 scheme 的 authorization policy，掛在 /mcp 上。</summary>
    public const string AuthorizationPolicy = "mcp.access";

    public static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromHours(1);
    public static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(30);
    public static readonly TimeSpan AuthorizationCodeLifetime = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan PendingAuthorizationLifetime = TimeSpan.FromMinutes(10);
}

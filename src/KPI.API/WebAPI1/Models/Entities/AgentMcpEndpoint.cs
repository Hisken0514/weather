using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

/// <summary>
/// 一個 MCP endpoint 用哪種方式驗證。None——完全不帶認證資訊（內網/未啟用驗證的 server）；
/// ApiKey——固定的 Bearer token，原本就有的方式；OAuth——走 MCP 的 OAuth 2.1 授權流程
/// （metadata 探索 + Dynamic Client Registration + PKCE），給像「免註冊，但連線要走 OAuth」
/// 的公開遠端 MCP server 用（例如台灣法律 MCP server）。見 AgentController 的
/// BuildMcpTransportOptions/BeginMcpOAuthConnectAsync。
/// </summary>
public enum McpAuthType
{
    None = 0,
    ApiKey = 1,
    OAuth = 2,
}

/// <summary>
/// 外部 MCP endpoint 登記表。三個文件工具（search_documents 等）是 in-process，不依賴這張表；
/// 這張表登記的外部 MCP server，同步進來的工具跟 in-process 工具共用同一套 AgentTool 目錄／
/// 角色權限機制，實際執行時由 AgentController 透過官方 ModelContextProtocol SDK 的 McpClient
/// 連線對應 endpoint。
/// </summary>
public class AgentMcpEndpoint
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string Url { get; set; } = string.Empty;

    /// <summary>這個 endpoint 用哪種方式驗證，見 <see cref="McpAuthType"/>。</summary>
    public McpAuthType AuthType { get; set; } = McpAuthType.None;

    /// <summary>只有 AuthType=ApiKey 時有意義，加密後的密文。</summary>
    public string? ApiKeyEncrypted { get; set; }

    // ── OAuth（AuthType=OAuth 時才有意義）──────────────────────────────
    // 這幾個欄位合起來對應 ModelContextProtocol SDK 的 TokenContainer——整包存下來，之後
    // SDK 重新建立 McpClient 時（每次同步/執行工具都是全新的短命 McpClient 實例）才能靠
    // RefreshToken 自動換新 AccessToken，不用每次都重新跑一次瀏覽器授權。ClientId/ClientSecret
    // 是「連接」當下 Dynamic Client Registration 註冊回來的結果，存下來下次連線才能跳過 DCR、
    // 直接沿用同一個已註冊的 client。

    /// <summary>Dynamic Client Registration 註冊回來的 client_id，首次連接後才會有值。</summary>
    public string? OAuthClientId { get; set; }

    /// <summary>DCR 註冊回來的 client_secret（選填，依授權伺服器而定），加密後的密文。</summary>
    public string? OAuthClientSecretEncrypted { get; set; }

    /// <summary>目前的 access token，加密後的密文。</summary>
    public string? OAuthAccessTokenEncrypted { get; set; }

    /// <summary>目前的 refresh token（選填，依授權伺服器而定），加密後的密文。</summary>
    public string? OAuthRefreshTokenEncrypted { get; set; }

    /// <summary>token 型別，通常是 "Bearer"。</summary>
    public string? OAuthTokenType { get; set; }

    /// <summary>實際取得的授權範圍（scope），空白分隔的字串，純顯示用。</summary>
    public string? OAuthScope { get; set; }

    /// <summary>這次 access token 的授權伺服器 URL，refresh 時需要知道要打去哪裡。</summary>
    public string? OAuthAuthorizationServer { get; set; }

    /// <summary>access token 的絕對到期時間（UTC）——用 ObtainedAt+ExpiresIn 換算好存下來，判斷要不要 refresh 比較直接。</summary>
    public DateTime? OAuthAccessTokenExpiresAt { get; set; }

    /// <summary>最近一次成功完成 OAuth 連接（初次授權或 refresh 都算）的時間，給 admin 畫面顯示連線狀態用。</summary>
    public DateTime? OAuthConnectedAt { get; set; }

    public bool IsEnabled { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

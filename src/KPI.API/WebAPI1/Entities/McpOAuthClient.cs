using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

/// <summary>
/// 透過 Dynamic Client Registration（RFC 7591）自動註冊進來的外部 MCP client。
/// 公開型 client，沒有 client secret，安全性完全靠 PKCE（code_challenge/verifier）。
/// </summary>
public class McpOAuthClient
{
    [Key]
    public string ClientId { get; set; } = Guid.NewGuid().ToString("N");

    [Required, MaxLength(200)]
    public string ClientName { get; set; } = string.Empty;

    /// <summary>用逗號分隔存多個 redirect_uri，authorize 時要求完全比對，防 open redirect。</summary>
    [Required]
    public string RedirectUrisRaw { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public IReadOnlyList<string> RedirectUris =>
        RedirectUrisRaw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}

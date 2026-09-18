using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

/// <summary>
/// 使用者同意授權後核發的一次性 authorization code，5 分鐘內沒換成 token 就失效。
/// 換 token 時要用 code_verifier 重算 SHA-256 跟這裡存的 code_challenge 比對（PKCE S256）。
/// </summary>
public class McpAuthorizationCode
{
    [Key, MaxLength(100)]
    public string Code { get; set; } = Guid.NewGuid().ToString("N");

    [Required, MaxLength(100)]
    public string ClientId { get; set; } = string.Empty;

    [Required]
    public string RedirectUri { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string UserId { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string CodeChallenge { get; set; } = string.Empty;

    public DateTime ExpiresAtUtc { get; set; }

    public bool Used { get; set; }
}

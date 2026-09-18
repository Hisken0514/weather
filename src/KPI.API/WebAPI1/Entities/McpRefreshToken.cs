using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

/// <summary>
/// 只存 refresh token 的 SHA-256 雜湊，不存明文——資料庫洩漏也沒辦法拿去換 access token。
/// 每次用掉就整筆標記撤銷、換一組新的（rotation），不是原地更新過期時間。
/// </summary>
public class McpRefreshToken
{
    [Key]
    public long Id { get; set; }

    [Required, MaxLength(100)]
    public string ClientId { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string UserId { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAtUtc { get; set; }

    public bool Revoked { get; set; }
}

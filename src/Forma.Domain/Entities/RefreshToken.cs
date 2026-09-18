namespace Forma.Domain.Entities;

/// <summary>
/// Refresh Token 實體
/// </summary>
public class RefreshToken : BaseEntity
{
    /// <summary>
    /// Token 值
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 過期時間
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 撤銷時間
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// 替換此 Token 的新 Token
    /// </summary>
    public string? ReplacedByToken { get; set; }

    /// <summary>
    /// 撤銷原因
    /// </summary>
    public string? RevokedReason { get; set; }

    /// <summary>
    /// 裝置資訊
    /// </summary>
    public string? DeviceInfo { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// 是否已過期
    /// </summary>
    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;

    /// <summary>
    /// 是否已撤銷
    /// </summary>
    public bool IsRevoked => RevokedAt != null;

    /// <summary>
    /// 是否有效
    /// </summary>
    public bool IsActive => !IsRevoked && !IsExpired;

    // Navigation Property
    public virtual User User { get; set; } = null!;
}

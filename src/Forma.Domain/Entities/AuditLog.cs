namespace Forma.Domain.Entities;

/// <summary>
/// 審計日誌
/// </summary>
public class AuditLog : BaseEntity
{
    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid? UserId { get; set; }

    /// <summary>
    /// 操作
    /// </summary>
    public string Action { get; set; } = string.Empty;

    /// <summary>
    /// 實體類型
    /// </summary>
    public string EntityType { get; set; } = string.Empty;

    /// <summary>
    /// 實體 ID
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// 變更內容 (JSON)
    /// </summary>
    public string? Changes { get; set; }

    /// <summary>
    /// 時間戳記
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }

    // Navigation Properties
    public virtual User? User { get; set; }
}

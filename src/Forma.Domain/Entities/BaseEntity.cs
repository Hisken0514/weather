namespace Forma.Domain.Entities;

/// <summary>
/// 實體基類
/// </summary>
public abstract class BaseEntity
{
    /// <summary>
    /// 主鍵
    /// </summary>
    public Guid Id { get; set; }
}

/// <summary>
/// 可審計實體基類
/// </summary>
public abstract class AuditableEntity : BaseEntity
{
    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime? UpdatedAt { get; set; }
}

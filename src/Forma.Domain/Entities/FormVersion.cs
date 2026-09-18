namespace Forma.Domain.Entities;

/// <summary>
/// 表單版本歷史
/// </summary>
public class FormVersion : BaseEntity
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 版本號
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// 表單結構定義快照 (JSON)
    /// </summary>
    public string Schema { get; set; } = "{}";

    /// <summary>
    /// 變更說明
    /// </summary>
    public string? ChangeNote { get; set; }

    /// <summary>
    /// 建立者 ID
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 是否為已發布版本
    /// </summary>
    public bool IsPublished { get; set; }

    // Navigation Properties
    public virtual Form Form { get; set; } = null!;
    public virtual User CreatedBy { get; set; } = null!;
}

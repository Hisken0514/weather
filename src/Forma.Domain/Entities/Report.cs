namespace Forma.Domain.Entities;

/// <summary>
/// 報告
/// </summary>
public class Report : AuditableEntity
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 報告名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 報告設定 (JSON)
    /// </summary>
    public string Configuration { get; set; } = "{}";

    /// <summary>
    /// 建立者 ID
    /// </summary>
    public Guid CreatedById { get; set; }

    // Navigation Properties
    public virtual Form Form { get; set; } = null!;
    public virtual User CreatedBy { get; set; } = null!;
}

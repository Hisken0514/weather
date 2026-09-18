namespace Forma.Domain.Entities;

/// <summary>
/// 表單範本
/// </summary>
public class FormTemplate : AuditableEntity
{
    /// <summary>
    /// 範本名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 分類
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 表單結構定義 (JSON)
    /// </summary>
    public string Schema { get; set; } = "{}";

    /// <summary>
    /// 縮圖 URL
    /// </summary>
    public string? ThumbnailUrl { get; set; }

    /// <summary>
    /// 是否公開
    /// </summary>
    public bool IsPublic { get; set; } = false;

    /// <summary>
    /// 建立者 ID
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// 使用次數
    /// </summary>
    public int UsageCount { get; set; } = 0;

    // Navigation Properties
    public virtual User CreatedBy { get; set; } = null!;
    public virtual ICollection<Form> Forms { get; set; } = new List<Form>();
}

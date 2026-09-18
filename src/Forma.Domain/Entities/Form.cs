using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 表單
/// </summary>
public class Form : AuditableEntity
{
    /// <summary>
    /// 計畫 ID
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// 表單名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 表單結構定義 (JSON)
    /// </summary>
    public string Schema { get; set; } = "{}";

    /// <summary>
    /// 範本 ID
    /// </summary>
    public Guid? TemplateId { get; set; }

    /// <summary>
    /// 建立者 ID
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// 發布時間
    /// </summary>
    public DateTime? PublishedAt { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 版本號
    /// </summary>
    public string Version { get; set; } = "1.0";

    /// <summary>
    /// 存取控制
    /// </summary>
    public FormAccessControl AccessControl { get; set; } = FormAccessControl.Private;

    /// <summary>
    /// 是否已鎖定
    /// </summary>
    public bool IsLocked { get; set; }

    /// <summary>
    /// 鎖定人 ID
    /// </summary>
    public Guid? LockedById { get; set; }

    /// <summary>
    /// 鎖定時間
    /// </summary>
    public DateTime? LockedAt { get; set; }

    // Navigation Properties
    public virtual Project Project { get; set; } = null!;
    public virtual User CreatedBy { get; set; } = null!;
    public virtual User? LockedBy { get; set; }
    public virtual FormTemplate? Template { get; set; }
    public virtual ICollection<FormSubmission> Submissions { get; set; } = new List<FormSubmission>();
    public virtual ICollection<FormPermission> Permissions { get; set; } = new List<FormPermission>();
    public virtual ICollection<Report> Reports { get; set; } = new List<Report>();
    public virtual ICollection<FormVersion> Versions { get; set; } = new List<FormVersion>();
}

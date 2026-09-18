using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 計畫
/// </summary>
public class Project : AuditableEntity
{
    /// <summary>
    /// 組織 ID
    /// </summary>
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// 計畫名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 計畫代碼
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 年度
    /// </summary>
    public int Year { get; set; }

    /// <summary>
    /// 預算
    /// </summary>
    public decimal? Budget { get; set; }

    /// <summary>
    /// 開始日期
    /// </summary>
    public DateOnly? StartDate { get; set; }

    /// <summary>
    /// 結束日期
    /// </summary>
    public DateOnly? EndDate { get; set; }

    /// <summary>
    /// 計畫狀態
    /// </summary>
    public ProjectStatus Status { get; set; } = ProjectStatus.Draft;

    /// <summary>
    /// 計畫設定 (JSON 格式，存放主題等設定)
    /// </summary>
    public string? Settings { get; set; }

    /// <summary>
    /// 建立者 ID
    /// </summary>
    public Guid CreatedById { get; set; }

    // Navigation Properties
    public virtual Organization Organization { get; set; } = null!;
    public virtual User CreatedBy { get; set; } = null!;
    public virtual ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
    public virtual ICollection<Form> Forms { get; set; } = new List<Form>();
    public virtual ICollection<FormSubmission> Submissions { get; set; } = new List<FormSubmission>();
}

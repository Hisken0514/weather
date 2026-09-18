using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 表單提交記錄
/// </summary>
public class FormSubmission : BaseEntity
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 計畫 ID
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// 提交者 ID (匿名提交可為 null)
    /// </summary>
    public Guid? SubmittedById { get; set; }

    /// <summary>
    /// 提交資料 (JSON)
    /// </summary>
    public string SubmissionData { get; set; } = "{}";

    /// <summary>
    /// 提交時的表單版本
    /// </summary>
    public string FormVersion { get; set; } = "1.0";

    /// <summary>
    /// 提交時間
    /// </summary>
    public DateTime SubmittedAt { get; set; }

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime? UpdatedAt { get; set; }

    /// <summary>
    /// 狀態
    /// </summary>
    public SubmissionStatus Status { get; set; } = SubmissionStatus.Draft;

    /// <summary>
    /// 審核者 ID
    /// </summary>
    public Guid? ReviewedById { get; set; }

    /// <summary>
    /// 審核時間
    /// </summary>
    public DateTime? ReviewedAt { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// 報告下載時間
    /// </summary>
    public DateTime? ReportDownloadedAt { get; set; }

    // Navigation Properties
    public virtual Form Form { get; set; } = null!;
    public virtual Project Project { get; set; } = null!;
    public virtual User? SubmittedBy { get; set; }
    public virtual User? ReviewedBy { get; set; }
}

using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 督導任務（業者 × 機關 × 表單）
/// </summary>
public class SupervisionTask : AuditableEntity
{
    /// <summary>
    /// 被督導業者 ID
    /// </summary>
    public Guid SupervisedFactoryId { get; set; }

    /// <summary>
    /// 督導機關 ID
    /// </summary>
    public Guid AgencyId { get; set; }

    /// <summary>
    /// 對應表單 ID（連結 Forma Form）
    /// </summary>
    public Guid? FormId { get; set; }

    /// <summary>
    /// 表單類型名稱（快取，方便顯示）
    /// </summary>
    public string FormTypeName { get; set; } = string.Empty;

    /// <summary>
    /// 填寫完成後的 Submission ID
    /// </summary>
    public Guid? SubmissionId { get; set; }

    /// <summary>
    /// 任務狀態
    /// </summary>
    public SupervisionTaskStatus Status { get; set; } = SupervisionTaskStatus.Pending;

    /// <summary>
    /// 完成時間
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 是否無需改善回覆（機關督導時沒有發現任何需要改善的項目）。Admin 在「工廠回覆項目
    /// 管理」標記後，這筆任務不會出現在工廠改善回覆連結、機關複查登打連結，也不計入回覆/
    /// 複查進度統計。
    /// </summary>
    public bool NoImprovementNeeded { get; set; }

    // Navigation Properties
    public virtual SupervisedFactory Factory { get; set; } = null!;
    public virtual Agency Agency { get; set; } = null!;
    public virtual Form? Form { get; set; }
    public virtual FormSubmission? Submission { get; set; }
    public virtual FactoryReply? FactoryReply { get; set; }
    public virtual AgencyReview? AgencyReview { get; set; }
    public virtual ICollection<FactoryReplyItem> FactoryReplyItems { get; set; } = new List<FactoryReplyItem>();
}

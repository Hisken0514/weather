namespace Forma.Domain.Entities;

/// <summary>
/// 通知偏好設定
/// </summary>
public class NotificationPreference : BaseEntity
{
    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 是否啟用電子郵件通知
    /// </summary>
    public bool EmailEnabled { get; set; } = true;

    /// <summary>
    /// 是否啟用站內通知
    /// </summary>
    public bool InAppEnabled { get; set; } = true;

    /// <summary>
    /// 表單提交通知
    /// </summary>
    public bool NotifyOnFormSubmission { get; set; } = true;

    /// <summary>
    /// 提交審核通知
    /// </summary>
    public bool NotifyOnSubmissionReview { get; set; } = true;

    /// <summary>
    /// 成員變動通知
    /// </summary>
    public bool NotifyOnMemberChange { get; set; } = true;

    /// <summary>
    /// 專案更新通知
    /// </summary>
    public bool NotifyOnProjectUpdate { get; set; } = true;

    /// <summary>
    /// 表單發布通知
    /// </summary>
    public bool NotifyOnFormPublish { get; set; } = true;

    /// <summary>
    /// 每日摘要郵件
    /// </summary>
    public bool DailyDigestEmail { get; set; } = false;

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual User User { get; set; } = null!;
}

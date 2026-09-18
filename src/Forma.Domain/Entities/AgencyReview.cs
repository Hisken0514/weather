namespace Forma.Domain.Entities;

/// <summary>
/// 主管機關針對工廠改善回覆的複查登打（與 SupervisionTask 一對一）。
/// 是否複查/複查日期/複查結果/是否裁處/違反法條/裁處金額/備註改為每一條 FactoryReplyItem
/// 各自填寫（比照工廠回覆逐點的設計，一條建議對應一份完整複查），這裡只保留填表人資訊
/// 跟整份是否已送出。
/// </summary>
public class AgencyReview : AuditableEntity
{
    /// <summary>
    /// 對應的督導任務 ID
    /// </summary>
    public Guid SupervisionTaskId { get; set; }

    /// <summary>
    /// 機關單位（填表人所屬機關，自由文字）
    /// </summary>
    public string? ReviewerAgencyName { get; set; }

    /// <summary>
    /// 填寫人姓名
    /// </summary>
    public string? ReviewerName { get; set; }

    /// <summary>
    /// 聯絡方式
    /// </summary>
    public string? ReviewerContact { get; set; }

    /// <summary>
    /// 送出時間（null 表示尚未填寫送出）
    /// </summary>
    public DateTime? SubmittedAt { get; set; }

    /// <summary>
    /// 透過登入管道填寫時的使用者 ID；透過公開連結填寫則為 null
    /// </summary>
    public Guid? SubmittedByUserId { get; set; }

    // Navigation Properties
    public virtual SupervisionTask Task { get; set; } = null!;
    public virtual User? SubmittedByUser { get; set; }
}

namespace Forma.Domain.Entities;

/// <summary>
/// 工廠針對督導結果的改善回覆（與 SupervisionTask 一對一）。
/// 是否完成改善/完成日期/備註改為每一條 FactoryReplyItem 各自填寫（一條建議對應一份完整回覆），
/// 這裡只保留填表人資訊跟送出時間。
/// </summary>
public class FactoryReply : AuditableEntity
{
    /// <summary>
    /// 對應的督導任務 ID
    /// </summary>
    public Guid SupervisionTaskId { get; set; }

    /// <summary>
    /// 填表人單位（工廠內部部門或職稱，自由文字）
    /// </summary>
    public string? FillerUnitName { get; set; }

    /// <summary>
    /// 填表人姓名
    /// </summary>
    public string? FillerName { get; set; }

    /// <summary>
    /// 填表人聯絡方式
    /// </summary>
    public string? FillerContact { get; set; }

    /// <summary>
    /// 送出時間（null 表示尚未填寫送出）
    /// </summary>
    public DateTime? SubmittedAt { get; set; }

    // Navigation Properties
    public virtual SupervisionTask Task { get; set; } = null!;
}

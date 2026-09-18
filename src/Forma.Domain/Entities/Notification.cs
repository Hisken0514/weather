namespace Forma.Domain.Entities;

/// <summary>
/// 通知
/// </summary>
public class Notification : BaseEntity
{
    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 通知類型 (FormSubmitted, SubmissionReviewed, MemberAdded, etc.)
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 標題
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 內容
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// 相關連結
    /// </summary>
    public string? Link { get; set; }

    /// <summary>
    /// 相關實體類型 (Form, Submission, Project, etc.)
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// 相關實體 ID
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// 是否已讀
    /// </summary>
    public bool IsRead { get; set; }

    /// <summary>
    /// 讀取時間
    /// </summary>
    public DateTime? ReadAt { get; set; }

    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public virtual User User { get; set; } = null!;
}

namespace Forma.Application.Features.Notifications.DTOs;

/// <summary>
/// 通知 DTO
/// </summary>
public class NotificationDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Link { get; set; }
    public string? EntityType { get; set; }
    public Guid? EntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 通知偏好設定 DTO
/// </summary>
public class NotificationPreferenceDto
{
    public bool EmailEnabled { get; set; }
    public bool InAppEnabled { get; set; }
    public bool NotifyOnFormSubmission { get; set; }
    public bool NotifyOnSubmissionReview { get; set; }
    public bool NotifyOnMemberChange { get; set; }
    public bool NotifyOnProjectUpdate { get; set; }
    public bool NotifyOnFormPublish { get; set; }
    public bool DailyDigestEmail { get; set; }
}

/// <summary>
/// 未讀數量 DTO
/// </summary>
public class UnreadCountDto
{
    public int Count { get; set; }
}

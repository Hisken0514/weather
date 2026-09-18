using Forma.Application.Common.Models;
using Forma.Application.Features.Notifications.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 通知服務介面
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// 取得通知列表
    /// </summary>
    Task<PagedResult<NotificationDto>> GetNotificationsAsync(
        GetNotificationsRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得未讀通知數量
    /// </summary>
    Task<UnreadCountDto> GetUnreadCountAsync(
        Guid currentUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 標記通知為已讀
    /// </summary>
    Task MarkAsReadAsync(
        Guid notificationId,
        Guid currentUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 標記所有通知為已讀
    /// </summary>
    Task<int> MarkAllAsReadAsync(
        Guid currentUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 刪除通知
    /// </summary>
    Task DeleteNotificationAsync(
        Guid notificationId,
        Guid currentUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得通知偏好設定
    /// </summary>
    Task<NotificationPreferenceDto> GetPreferencesAsync(
        Guid currentUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新通知偏好設定
    /// </summary>
    Task<NotificationPreferenceDto> UpdatePreferencesAsync(
        UpdatePreferencesRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 發送測試郵件
    /// </summary>
    Task<bool> SendTestEmailAsync(
        SendTestEmailRequest request,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得通知列表請求
/// </summary>
public class GetNotificationsRequest
{
    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid CurrentUserId { get; set; }

    /// <summary>
    /// 是否已讀篩選
    /// </summary>
    public bool? IsRead { get; set; }

    /// <summary>
    /// 頁碼
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 每頁筆數
    /// </summary>
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// 更新通知偏好設定請求
/// </summary>
public class UpdatePreferencesRequest
{
    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid CurrentUserId { get; set; }

    /// <summary>
    /// 是否啟用電子郵件通知
    /// </summary>
    public bool EmailEnabled { get; set; }

    /// <summary>
    /// 是否啟用應用程式內通知
    /// </summary>
    public bool InAppEnabled { get; set; }

    /// <summary>
    /// 表單提交時通知
    /// </summary>
    public bool NotifyOnFormSubmission { get; set; }

    /// <summary>
    /// 提交審核時通知
    /// </summary>
    public bool NotifyOnSubmissionReview { get; set; }

    /// <summary>
    /// 成員變更時通知
    /// </summary>
    public bool NotifyOnMemberChange { get; set; }

    /// <summary>
    /// 專案更新時通知
    /// </summary>
    public bool NotifyOnProjectUpdate { get; set; }

    /// <summary>
    /// 表單發布時通知
    /// </summary>
    public bool NotifyOnFormPublish { get; set; }

    /// <summary>
    /// 每日摘要郵件
    /// </summary>
    public bool DailyDigestEmail { get; set; }
}

/// <summary>
/// 發送測試郵件請求
/// </summary>
public class SendTestEmailRequest
{
    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid CurrentUserId { get; set; }

    /// <summary>
    /// 是否為系統管理員
    /// </summary>
    public bool IsSystemAdmin { get; set; }

    /// <summary>
    /// 目標郵件地址
    /// </summary>
    public string? TargetEmail { get; set; }
}

#endregion

using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Notifications.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 通知服務實作
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IApplicationDbContext _context;

    public NotificationService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<PagedResult<NotificationDto>> GetNotificationsAsync(
        GetNotificationsRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == request.CurrentUserId)
            .AsNoTracking();

        if (request.IsRead.HasValue)
        {
            query = query.Where(n => n.IsRead == request.IsRead.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                Link = n.Link,
                EntityType = n.EntityType,
                EntityId = n.EntityId,
                IsRead = n.IsRead,
                ReadAt = n.ReadAt,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<NotificationDto>
        {
            Items = notifications,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<UnreadCountDto> GetUnreadCountAsync(
        Guid currentUserId,
        CancellationToken cancellationToken = default)
    {
        var count = await _context.Notifications
            .CountAsync(n => n.UserId == currentUserId && !n.IsRead, cancellationToken);

        return new UnreadCountDto { Count = count };
    }

    /// <inheritdoc />
    public async Task MarkAsReadAsync(
        Guid notificationId,
        Guid currentUserId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == currentUserId, cancellationToken);

        if (notification == null)
        {
            throw new KeyNotFoundException("找不到通知");
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    /// <inheritdoc />
    public async Task<int> MarkAllAsReadAsync(
        Guid currentUserId,
        CancellationToken cancellationToken = default)
    {
        var unreadNotifications = await _context.Notifications
            .Where(n => n.UserId == currentUserId && !n.IsRead)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        foreach (var notification in unreadNotifications)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return unreadNotifications.Count;
    }

    /// <inheritdoc />
    public async Task DeleteNotificationAsync(
        Guid notificationId,
        Guid currentUserId,
        CancellationToken cancellationToken = default)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == currentUserId, cancellationToken);

        if (notification == null)
        {
            throw new KeyNotFoundException("找不到通知");
        }

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<NotificationPreferenceDto> GetPreferencesAsync(
        Guid currentUserId,
        CancellationToken cancellationToken = default)
    {
        var preference = await _context.NotificationPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == currentUserId, cancellationToken);

        if (preference == null)
        {
            // 回傳預設值
            return new NotificationPreferenceDto
            {
                EmailEnabled = true,
                InAppEnabled = true,
                NotifyOnFormSubmission = true,
                NotifyOnSubmissionReview = true,
                NotifyOnMemberChange = true,
                NotifyOnProjectUpdate = true,
                NotifyOnFormPublish = true,
                DailyDigestEmail = false
            };
        }

        return new NotificationPreferenceDto
        {
            EmailEnabled = preference.EmailEnabled,
            InAppEnabled = preference.InAppEnabled,
            NotifyOnFormSubmission = preference.NotifyOnFormSubmission,
            NotifyOnSubmissionReview = preference.NotifyOnSubmissionReview,
            NotifyOnMemberChange = preference.NotifyOnMemberChange,
            NotifyOnProjectUpdate = preference.NotifyOnProjectUpdate,
            NotifyOnFormPublish = preference.NotifyOnFormPublish,
            DailyDigestEmail = preference.DailyDigestEmail
        };
    }

    /// <inheritdoc />
    public async Task<NotificationPreferenceDto> UpdatePreferencesAsync(
        UpdatePreferencesRequest request,
        CancellationToken cancellationToken = default)
    {
        var preference = await _context.NotificationPreferences
            .FirstOrDefaultAsync(p => p.UserId == request.CurrentUserId, cancellationToken);

        if (preference == null)
        {
            preference = new NotificationPreference
            {
                Id = Guid.CreateVersion7(),
                UserId = request.CurrentUserId
            };
            _context.NotificationPreferences.Add(preference);
        }

        preference.EmailEnabled = request.EmailEnabled;
        preference.InAppEnabled = request.InAppEnabled;
        preference.NotifyOnFormSubmission = request.NotifyOnFormSubmission;
        preference.NotifyOnSubmissionReview = request.NotifyOnSubmissionReview;
        preference.NotifyOnMemberChange = request.NotifyOnMemberChange;
        preference.NotifyOnProjectUpdate = request.NotifyOnProjectUpdate;
        preference.NotifyOnFormPublish = request.NotifyOnFormPublish;
        preference.DailyDigestEmail = request.DailyDigestEmail;
        preference.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new NotificationPreferenceDto
        {
            EmailEnabled = preference.EmailEnabled,
            InAppEnabled = preference.InAppEnabled,
            NotifyOnFormSubmission = preference.NotifyOnFormSubmission,
            NotifyOnSubmissionReview = preference.NotifyOnSubmissionReview,
            NotifyOnMemberChange = preference.NotifyOnMemberChange,
            NotifyOnProjectUpdate = preference.NotifyOnProjectUpdate,
            NotifyOnFormPublish = preference.NotifyOnFormPublish,
            DailyDigestEmail = preference.DailyDigestEmail
        };
    }

    /// <inheritdoc />
    public async Task<bool> SendTestEmailAsync(
        SendTestEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        // 權限檢查
        if (!request.IsSystemAdmin)
        {
            throw new UnauthorizedAccessException("只有系統管理員可以發送測試郵件");
        }

        // 取得目標郵件地址
        string? targetEmail = request.TargetEmail;

        if (string.IsNullOrEmpty(targetEmail))
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == request.CurrentUserId, cancellationToken);

            if (user == null)
            {
                throw new InvalidOperationException("找不到使用者");
            }

            targetEmail = user.Email;
        }

        // 模擬發送郵件（實際實作時應該使用 IEmailService）
        // 這裡只是模擬成功
        await Task.Delay(100, cancellationToken);

        return true;
    }
}

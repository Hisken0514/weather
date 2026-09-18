using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Notifications.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UpdatePreferencesServiceRequest = Forma.Application.Services.UpdatePreferencesRequest;
using GetNotificationsServiceRequest = Forma.Application.Services.GetNotificationsRequest;
using SendTestEmailServiceRequest = Forma.Application.Services.SendTestEmailRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 通知管理 API
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize(Policy = Policies.RequireUser)]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly ICurrentUserService _currentUser;

    public NotificationsController(INotificationService notificationService, ICurrentUserService currentUser)
    {
        _notificationService = notificationService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得通知列表
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<NotificationDto>>> GetNotifications(
        [FromQuery] bool? isRead = null,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var request = new GetNotificationsServiceRequest
        {
            CurrentUserId = _currentUser.UserId!.Value,
            IsRead = isRead,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _notificationService.GetNotificationsAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 取得未讀數量
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountDto>> GetUnreadCount()
    {
        var result = await _notificationService.GetUnreadCountAsync(_currentUser.UserId!.Value);
        return Ok(result);
    }

    /// <summary>
    /// 標記為已讀
    /// </summary>
    [HttpPut("{id:guid}/read")]
    public async Task<ActionResult> MarkAsRead(Guid id)
    {
        try
        {
            await _notificationService.MarkAsReadAsync(id, _currentUser.UserId!.Value);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 全部標記已讀
    /// </summary>
    [HttpPut("read-all")]
    public async Task<ActionResult<int>> MarkAllAsRead()
    {
        var count = await _notificationService.MarkAllAsReadAsync(_currentUser.UserId!.Value);
        return Ok(new { markedCount = count });
    }

    /// <summary>
    /// 刪除通知
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteNotification(Guid id)
    {
        try
        {
            await _notificationService.DeleteNotificationAsync(id, _currentUser.UserId!.Value);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得通知偏好設定
    /// </summary>
    [HttpGet("preferences")]
    public async Task<ActionResult<NotificationPreferenceDto>> GetPreferences()
    {
        var result = await _notificationService.GetPreferencesAsync(_currentUser.UserId!.Value);
        return Ok(result);
    }

    /// <summary>
    /// 更新通知偏好設定
    /// </summary>
    [HttpPut("preferences")]
    public async Task<ActionResult<NotificationPreferenceDto>> UpdatePreferences([FromBody] UpdatePreferencesRequest request)
    {
        var serviceRequest = new UpdatePreferencesServiceRequest
        {
            CurrentUserId = _currentUser.UserId!.Value,
            EmailEnabled = request.EmailEnabled,
            InAppEnabled = request.InAppEnabled,
            NotifyOnFormSubmission = request.NotifyOnFormSubmission,
            NotifyOnSubmissionReview = request.NotifyOnSubmissionReview,
            NotifyOnMemberChange = request.NotifyOnMemberChange,
            NotifyOnProjectUpdate = request.NotifyOnProjectUpdate,
            NotifyOnFormPublish = request.NotifyOnFormPublish,
            DailyDigestEmail = request.DailyDigestEmail
        };

        var result = await _notificationService.UpdatePreferencesAsync(serviceRequest);
        return Ok(result);
    }

    /// <summary>
    /// 發送測試郵件（管理員）
    /// </summary>
    [HttpPost("test-email")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> SendTestEmail([FromBody] SendTestEmailRequest? request = null)
    {
        var serviceRequest = new SendTestEmailServiceRequest
        {
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin,
            TargetEmail = request?.TargetEmail
        };

        try
        {
            var result = await _notificationService.SendTestEmailAsync(serviceRequest);
            return Ok(new { success = result, message = "測試郵件已發送（模擬）" });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

#region Request DTOs

public class UpdatePreferencesRequest
{
    public bool EmailEnabled { get; set; } = true;
    public bool InAppEnabled { get; set; } = true;
    public bool NotifyOnFormSubmission { get; set; } = true;
    public bool NotifyOnSubmissionReview { get; set; } = true;
    public bool NotifyOnMemberChange { get; set; } = true;
    public bool NotifyOnProjectUpdate { get; set; } = true;
    public bool NotifyOnFormPublish { get; set; } = true;
    public bool DailyDigestEmail { get; set; } = false;
}

public class SendTestEmailRequest
{
    public string? TargetEmail { get; set; }
}

#endregion

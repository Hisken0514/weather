using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Dashboard.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 儀表板 API
/// </summary>
[ApiController]
[Route("api/dashboard")]
[Authorize(Policy = Policies.RequireUser)]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ICurrentUserService _currentUser;

    public DashboardController(IDashboardService dashboardService, ICurrentUserService currentUser)
    {
        _dashboardService = dashboardService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得個人儀表板摘要
    /// </summary>
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        var result = await _dashboardService.GetDashboardSummaryAsync(_currentUser.UserId!.Value);
        return Ok(result);
    }

    /// <summary>
    /// 取得待辦事項（跨計畫）
    /// </summary>
    [HttpGet("pending-tasks")]
    public async Task<ActionResult<List<PendingTaskDto>>> GetPendingTasks([FromQuery] int limit = 20)
    {
        var result = await _dashboardService.GetPendingTasksAsync(_currentUser.UserId!.Value, limit);
        return Ok(result);
    }

    /// <summary>
    /// 取得最近活動
    /// </summary>
    [HttpGet("recent-activities")]
    public async Task<ActionResult<List<RecentActivityDto>>> GetRecentActivities([FromQuery] int limit = 20)
    {
        var result = await _dashboardService.GetRecentActivitiesAsync(_currentUser.UserId!.Value, limit);
        return Ok(result);
    }

    /// <summary>
    /// 取得個人統計資料
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<PersonalStatisticsDto>> GetStatistics()
    {
        var result = await _dashboardService.GetPersonalStatisticsAsync(_currentUser.UserId!.Value);
        return Ok(result);
    }

    /// <summary>
    /// 取得所有參與計畫的統計
    /// </summary>
    [HttpGet("projects/stats")]
    public async Task<ActionResult<List<ProjectStatsDto>>> GetProjectsStats()
    {
        var result = await _dashboardService.GetProjectsStatsAsync(_currentUser.UserId!.Value);
        return Ok(result);
    }

    /// <summary>
    /// 取得所有待審核提交（跨計畫）
    /// </summary>
    [HttpGet("pending-review")]
    [Authorize(Policy = Policies.RequireUser)]
    public async Task<ActionResult<PagedResult<PendingReviewSubmissionDto>>> GetPendingReview(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _dashboardService.GetPendingReviewSubmissionsAsync(
            _currentUser.UserId!.Value,
            _currentUser.IsSystemAdmin,
            pageNumber,
            pageSize);
        return Ok(result);
    }
}

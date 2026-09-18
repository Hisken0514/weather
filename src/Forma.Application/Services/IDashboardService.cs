using Forma.Application.Common.Models;
using Forma.Application.Features.Dashboard.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 儀表板服務介面
/// </summary>
public interface IDashboardService
{
    /// <summary>
    /// 取得儀表板摘要
    /// </summary>
    Task<DashboardSummaryDto> GetDashboardSummaryAsync(Guid currentUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得待辦事項
    /// </summary>
    Task<List<PendingTaskDto>> GetPendingTasksAsync(Guid currentUserId, int limit = 10, CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得待審核提交
    /// </summary>
    Task<PagedResult<PendingReviewSubmissionDto>> GetPendingReviewSubmissionsAsync(
        Guid currentUserId,
        bool isSystemAdmin,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得個人統計資料
    /// </summary>
    Task<PersonalStatisticsDto> GetPersonalStatisticsAsync(Guid currentUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得專案統計資料
    /// </summary>
    Task<List<ProjectStatsDto>> GetProjectsStatsAsync(Guid currentUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得最近活動
    /// </summary>
    Task<List<RecentActivityDto>> GetRecentActivitiesAsync(Guid currentUserId, int limit = 20, CancellationToken cancellationToken = default);
}

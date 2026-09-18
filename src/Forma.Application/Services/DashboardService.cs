using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Dashboard.DTOs;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 儀表板服務實作
/// </summary>
public class DashboardService : IDashboardService
{
    private readonly IApplicationDbContext _context;

    public DashboardService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(Guid currentUserId, CancellationToken cancellationToken = default)
    {
        // 取得使用者參與的專案
        var userProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == currentUserId && pm.RemovedAt == null)
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        var projects = await _context.Projects
            .Where(p => userProjectIds.Contains(p.Id))
            .Include(p => p.Organization)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var activeProjects = projects.Where(p => p.Status == ProjectStatus.Active).ToList();

        // 取得表單統計
        var forms = await _context.Forms
            .Where(f => userProjectIds.Contains(f.ProjectId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // 取得提交統計
        var submissions = await _context.FormSubmissions
            .Where(s => userProjectIds.Contains(s.ProjectId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        // 取得未讀通知數
        var unreadNotifications = await _context.Notifications
            .CountAsync(n => n.UserId == currentUserId && !n.IsRead, cancellationToken);

        // 取得最近專案
        var recentProjects = new List<RecentProjectDto>();
        foreach (var project in projects.OrderByDescending(p => p.CreatedAt).Take(5))
        {
            var projectForms = forms.Where(f => f.ProjectId == project.Id).ToList();
            var projectSubmissions = submissions.Where(s => s.ProjectId == project.Id).ToList();
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm => pm.ProjectId == project.Id && pm.UserId == currentUserId && pm.RemovedAt == null, cancellationToken);

            recentProjects.Add(new RecentProjectDto
            {
                Id = project.Id,
                Name = project.Name,
                OrganizationName = project.Organization?.Name ?? "",
                Role = membership?.Role.ToString() ?? "",
                FormCount = projectForms.Count,
                PendingSubmissions = projectSubmissions.Count(s => s.Status == SubmissionStatus.Submitted),
                LastActivityAt = projectSubmissions.Any()
                    ? projectSubmissions.Max(s => s.SubmittedAt)
                    : project.CreatedAt
            });
        }

        return new DashboardSummaryDto
        {
            TotalProjects = projects.Count,
            ActiveProjects = activeProjects.Count,
            TotalForms = forms.Count,
            PublishedForms = forms.Count(f => f.PublishedAt != null),
            TotalSubmissions = submissions.Count,
            PendingReviewCount = submissions.Count(s => s.Status == SubmissionStatus.Submitted),
            UnreadNotifications = unreadNotifications,
            RecentProjects = recentProjects
        };
    }

    /// <inheritdoc />
    public async Task<List<PendingTaskDto>> GetPendingTasksAsync(Guid currentUserId, int limit = 10, CancellationToken cancellationToken = default)
    {
        var tasks = new List<PendingTaskDto>();

        // 取得使用者是 Manager 以上的專案
        var managerProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == currentUserId &&
                         pm.RemovedAt == null &&
                         pm.Role >= ProjectRole.Manager)
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        // 待審核的提交
        var pendingSubmissions = await _context.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.Project)
            .Where(s => managerProjectIds.Contains(s.ProjectId) &&
                        s.Status == SubmissionStatus.Submitted)
            .OrderByDescending(s => s.SubmittedAt)
            .Take(limit)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        foreach (var submission in pendingSubmissions)
        {
            tasks.Add(new PendingTaskDto
            {
                Type = "PendingReview",
                Title = $"審核提交 - {submission.Form.Name}",
                Description = $"來自 {submission.Project.Name} 的表單提交待審核",
                Link = $"/submissions/{submission.Id}",
                EntityId = submission.Id,
                EntityType = "Submission",
                ProjectName = submission.Project.Name,
                CreatedAt = submission.SubmittedAt,
                Priority = "Normal"
            });
        }

        return tasks.OrderByDescending(t => t.CreatedAt).Take(limit).ToList();
    }

    /// <inheritdoc />
    public async Task<PagedResult<PendingReviewSubmissionDto>> GetPendingReviewSubmissionsAsync(
        Guid currentUserId,
        bool isSystemAdmin,
        int pageNumber = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Guid> projectIdsQuery;

        if (isSystemAdmin)
        {
            projectIdsQuery = _context.Projects
                .Select(p => p.Id);
        }
        else
        {
            // 只取得 Manager 以上的專案
            projectIdsQuery = _context.ProjectMembers
                .Where(pm => pm.UserId == currentUserId &&
                             pm.RemovedAt == null &&
                             pm.Role >= ProjectRole.Manager)
                .Select(pm => pm.ProjectId);
        }

        var query = _context.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.Project)
            .Include(s => s.SubmittedBy)
            .Where(s => projectIdsQuery.Contains(s.ProjectId) &&
                        s.Status == SubmissionStatus.Submitted)
            .AsNoTracking();

        var totalCount = await query.CountAsync(cancellationToken);

        pageNumber = Math.Max(1, pageNumber);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var submissions = await query
            .OrderByDescending(s => s.SubmittedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new PendingReviewSubmissionDto
            {
                Id = s.Id,
                FormId = s.FormId,
                FormName = s.Form.Name,
                ProjectId = s.ProjectId,
                ProjectName = s.Project.Name,
                SubmittedByUsername = s.SubmittedBy != null ? s.SubmittedBy.Username : null,
                SubmittedAt = s.SubmittedAt,
                Status = s.Status.ToString()
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<PendingReviewSubmissionDto>
        {
            Items = submissions,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<PersonalStatisticsDto> GetPersonalStatisticsAsync(Guid currentUserId, CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var thirtyDaysAgo = now.AddDays(-30).Date;

        // 本月提交數
        var submissionsThisMonth = await _context.FormSubmissions
            .CountAsync(s => s.SubmittedById == currentUserId &&
                             s.SubmittedAt >= thisMonthStart, cancellationToken);

        // 上月提交數
        var submissionsLastMonth = await _context.FormSubmissions
            .CountAsync(s => s.SubmittedById == currentUserId &&
                             s.SubmittedAt >= lastMonthStart &&
                             s.SubmittedAt < thisMonthStart, cancellationToken);

        // 本月審核數
        var reviewedThisMonth = await _context.FormSubmissions
            .CountAsync(s => s.ReviewedById == currentUserId &&
                             s.ReviewedAt >= thisMonthStart, cancellationToken);

        // 本月建立表單數
        var formsCreatedThisMonth = await _context.Forms
            .CountAsync(f => f.CreatedById == currentUserId &&
                             f.CreatedAt >= thisMonthStart, cancellationToken);

        // 每日活動統計
        var dailySubmissions = await _context.FormSubmissions
            .Where(s => s.SubmittedById == currentUserId &&
                        s.SubmittedAt >= thirtyDaysAgo)
            .GroupBy(s => s.SubmittedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var dailyReviews = await _context.FormSubmissions
            .Where(s => s.ReviewedById == currentUserId &&
                        s.ReviewedAt >= thirtyDaysAgo)
            .GroupBy(s => s.ReviewedAt!.Value.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken);

        var dailyActivities = new List<DailyActivityStat>();
        for (var date = thirtyDaysAgo; date <= now.Date; date = date.AddDays(1))
        {
            dailyActivities.Add(new DailyActivityStat
            {
                Date = date,
                Submissions = dailySubmissions.FirstOrDefault(d => d.Date == date)?.Count ?? 0,
                Reviews = dailyReviews.FirstOrDefault(d => d.Date == date)?.Count ?? 0
            });
        }

        return new PersonalStatisticsDto
        {
            SubmissionsThisMonth = submissionsThisMonth,
            SubmissionsLastMonth = submissionsLastMonth,
            ReviewedThisMonth = reviewedThisMonth,
            FormsCreatedThisMonth = formsCreatedThisMonth,
            AverageReviewTime = 0, // 可以後續實作
            DailyActivities = dailyActivities
        };
    }

    /// <inheritdoc />
    public async Task<List<ProjectStatsDto>> GetProjectsStatsAsync(Guid currentUserId, CancellationToken cancellationToken = default)
    {
        var memberships = await _context.ProjectMembers
            .Include(pm => pm.Project)
                .ThenInclude(p => p.Organization)
            .Where(pm => pm.UserId == currentUserId && pm.RemovedAt == null)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var projectIds = memberships.Select(m => m.ProjectId).ToList();

        var forms = await _context.Forms
            .Where(f => projectIds.Contains(f.ProjectId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var submissions = await _context.FormSubmissions
            .Where(s => projectIds.Contains(s.ProjectId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var result = new List<ProjectStatsDto>();
        foreach (var membership in memberships)
        {
            var projectForms = forms.Where(f => f.ProjectId == membership.ProjectId).ToList();
            var projectSubmissions = submissions.Where(s => s.ProjectId == membership.ProjectId).ToList();

            result.Add(new ProjectStatsDto
            {
                ProjectId = membership.ProjectId,
                ProjectName = membership.Project.Name,
                OrganizationName = membership.Project.Organization?.Name ?? "",
                Role = membership.Role.ToString(),
                TotalForms = projectForms.Count,
                PublishedForms = projectForms.Count(f => f.PublishedAt != null),
                TotalSubmissions = projectSubmissions.Count,
                PendingReviews = projectSubmissions.Count(s => s.Status == SubmissionStatus.Submitted),
                ApprovedSubmissions = projectSubmissions.Count(s => s.Status == SubmissionStatus.Approved),
                RejectedSubmissions = projectSubmissions.Count(s => s.Status == SubmissionStatus.Rejected),
                LastSubmissionAt = projectSubmissions.Any() ? projectSubmissions.Max(s => s.SubmittedAt) : null
            });
        }

        return result.OrderByDescending(p => p.LastSubmissionAt ?? DateTime.MinValue).ToList();
    }

    /// <inheritdoc />
    public async Task<List<RecentActivityDto>> GetRecentActivitiesAsync(Guid currentUserId, int limit = 20, CancellationToken cancellationToken = default)
    {
        var activities = new List<RecentActivityDto>();

        // 取得使用者參與的專案
        var userProjectIds = await _context.ProjectMembers
            .Where(pm => pm.UserId == currentUserId && pm.RemovedAt == null)
            .Select(pm => pm.ProjectId)
            .ToListAsync(cancellationToken);

        // 最近的提交
        var recentSubmissions = await _context.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.Project)
            .Include(s => s.SubmittedBy)
            .Where(s => userProjectIds.Contains(s.ProjectId))
            .OrderByDescending(s => s.SubmittedAt)
            .Take(10)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        foreach (var submission in recentSubmissions)
        {
            activities.Add(new RecentActivityDto
            {
                Type = "Submission",
                Description = $"{submission.SubmittedBy?.Username ?? "匿名"} 提交了表單",
                ActorName = submission.SubmittedBy?.Username,
                ProjectName = submission.Project.Name,
                FormName = submission.Form.Name,
                EntityId = submission.Id,
                EntityType = "Submission",
                OccurredAt = submission.SubmittedAt
            });
        }

        // 最近發布的表單
        var recentPublishedForms = await _context.Forms
            .Include(f => f.Project)
            .Include(f => f.CreatedBy)
            .Where(f => userProjectIds.Contains(f.ProjectId) &&
                        f.PublishedAt != null)
            .OrderByDescending(f => f.PublishedAt)
            .Take(5)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        foreach (var form in recentPublishedForms)
        {
            activities.Add(new RecentActivityDto
            {
                Type = "FormPublished",
                Description = $"{form.CreatedBy.Username} 發布了表單 {form.Name}",
                ActorName = form.CreatedBy.Username,
                ProjectName = form.Project.Name,
                FormName = form.Name,
                EntityId = form.Id,
                EntityType = "Form",
                OccurredAt = form.PublishedAt!.Value
            });
        }

        return activities.OrderByDescending(a => a.OccurredAt).Take(limit).ToList();
    }
}

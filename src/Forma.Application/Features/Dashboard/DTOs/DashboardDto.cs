namespace Forma.Application.Features.Dashboard.DTOs;

/// <summary>
/// 儀表板摘要 DTO
/// </summary>
public class DashboardSummaryDto
{
    public int TotalProjects { get; set; }
    public int ActiveProjects { get; set; }
    public int TotalForms { get; set; }
    public int PublishedForms { get; set; }
    public int TotalSubmissions { get; set; }
    public int PendingReviewCount { get; set; }
    public int UnreadNotifications { get; set; }
    public List<RecentProjectDto> RecentProjects { get; set; } = new();
}

/// <summary>
/// 最近專案 DTO
/// </summary>
public class RecentProjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int FormCount { get; set; }
    public int PendingSubmissions { get; set; }
    public DateTime LastActivityAt { get; set; }
}

/// <summary>
/// 待辦事項 DTO
/// </summary>
public class PendingTaskDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Link { get; set; }
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string Priority { get; set; } = "Normal";
}

/// <summary>
/// 最近活動 DTO
/// </summary>
public class RecentActivityDto
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ActorName { get; set; }
    public string? ProjectName { get; set; }
    public string? FormName { get; set; }
    public Guid? EntityId { get; set; }
    public string? EntityType { get; set; }
    public DateTime OccurredAt { get; set; }
}

/// <summary>
/// 個人統計資料 DTO
/// </summary>
public class PersonalStatisticsDto
{
    public int SubmissionsThisMonth { get; set; }
    public int SubmissionsLastMonth { get; set; }
    public int ReviewedThisMonth { get; set; }
    public int FormsCreatedThisMonth { get; set; }
    public double AverageReviewTime { get; set; }
    public List<DailyActivityStat> DailyActivities { get; set; } = new();
}

/// <summary>
/// 每日活動統計
/// </summary>
public class DailyActivityStat
{
    public DateTime Date { get; set; }
    public int Submissions { get; set; }
    public int Reviews { get; set; }
}

/// <summary>
/// 專案統計 DTO
/// </summary>
public class ProjectStatsDto
{
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int TotalForms { get; set; }
    public int PublishedForms { get; set; }
    public int TotalSubmissions { get; set; }
    public int PendingReviews { get; set; }
    public int ApprovedSubmissions { get; set; }
    public int RejectedSubmissions { get; set; }
    public DateTime? LastSubmissionAt { get; set; }
}

/// <summary>
/// 待審核提交 DTO
/// </summary>
public class PendingReviewSubmissionDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public string FormName { get; set; } = string.Empty;
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? SubmittedByUsername { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

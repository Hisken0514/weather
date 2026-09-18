namespace Forma.Application.Features.Projects.DTOs;

/// <summary>
/// 專案詳情 DTO
/// </summary>
public class ProjectDto
{
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Year { get; set; }
    public decimal? Budget { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid CreatedById { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int MemberCount { get; set; }
    public int FormCount { get; set; }
    public string? CurrentUserRole { get; set; }
    public string? Settings { get; set; }
}

/// <summary>
/// 專案列表 DTO
/// </summary>
public class ProjectListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Year { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public int MemberCount { get; set; }
    public int FormCount { get; set; }
    public string? CurrentUserRole { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 可新增成員 DTO
/// </summary>
public class AvailableMemberDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
}

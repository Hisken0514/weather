namespace Forma.Application.Features.Submissions.DTOs;

/// <summary>
/// 表單提交詳情 DTO
/// </summary>
public class SubmissionDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public string FormName { get; set; } = string.Empty;
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public Guid? SubmittedById { get; set; }
    public string? SubmittedByUsername { get; set; }
    public string SubmissionData { get; set; } = "{}";
    public string FormVersion { get; set; } = "1.0";
    public DateTime SubmittedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid? ReviewedById { get; set; }
    public string? ReviewedByUsername { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? IpAddress { get; set; }
    public DateTime? ReportDownloadedAt { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
}

/// <summary>
/// 表單提交列表 DTO
/// </summary>
public class SubmissionListDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public string FormName { get; set; } = string.Empty;
    public Guid? SubmittedById { get; set; }
    public string? SubmittedByUsername { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? ReviewedAt { get; set; }
    public DateTime? ReportDownloadedAt { get; set; }
}

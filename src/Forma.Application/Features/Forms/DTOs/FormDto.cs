namespace Forma.Application.Features.Forms.DTOs;

/// <summary>
/// 表單詳情 DTO
/// </summary>
public class FormDto
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Schema { get; set; } = "{}";
    public Guid? TemplateId { get; set; }
    public string? TemplateName { get; set; }
    public Guid CreatedById { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public bool IsActive { get; set; }
    public string Version { get; set; } = "1.0";
    public string AccessControl { get; set; } = string.Empty;
    public int SubmissionCount { get; set; }
    public string? ProjectSettings { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
    public bool IsLocked { get; set; }
    public string? LockedByUsername { get; set; }
    public DateTime? LockedAt { get; set; }
}

/// <summary>
/// 表單列表 DTO
/// </summary>
public class FormListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Version { get; set; } = "1.0";
    public string AccessControl { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public int SubmissionCount { get; set; }
    public bool IsLocked { get; set; }
    public string? LockedByUsername { get; set; }
    public DateTime? LockedAt { get; set; }
}

/// <summary>
/// 表單版本 DTO
/// </summary>
public class FormVersionDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public string Version { get; set; } = string.Empty;
    public string Schema { get; set; } = "{}";
    public string? ChangeNote { get; set; }
    public Guid CreatedById { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsPublished { get; set; }
}

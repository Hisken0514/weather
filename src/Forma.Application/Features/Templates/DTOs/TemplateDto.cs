namespace Forma.Application.Features.Templates.DTOs;

/// <summary>
/// 範本詳情 DTO
/// </summary>
public class TemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string Schema { get; set; } = "{}";
    public string? ThumbnailUrl { get; set; }
    public bool IsPublic { get; set; }
    public Guid CreatedById { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int UsageCount { get; set; }
    public bool CanEdit { get; set; }
    public bool CanDelete { get; set; }
}

/// <summary>
/// 範本列表 DTO
/// </summary>
public class TemplateListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? ThumbnailUrl { get; set; }
    public bool IsPublic { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int UsageCount { get; set; }
}

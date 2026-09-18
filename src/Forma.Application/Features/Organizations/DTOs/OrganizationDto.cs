namespace Forma.Application.Features.Organizations.DTOs;

/// <summary>
/// 組織詳情 DTO
/// </summary>
public class OrganizationDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int ProjectCount { get; set; }
}

/// <summary>
/// 組織列表 DTO
/// </summary>
public class OrganizationListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int ProjectCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

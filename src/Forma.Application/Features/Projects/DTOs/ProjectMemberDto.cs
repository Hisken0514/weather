namespace Forma.Application.Features.Projects.DTOs;

/// <summary>
/// 專案成員 DTO
/// </summary>
public class ProjectMemberDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? JobTitle { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime AddedAt { get; set; }
    public Guid AddedById { get; set; }
    public string AddedByUsername { get; set; } = string.Empty;
}

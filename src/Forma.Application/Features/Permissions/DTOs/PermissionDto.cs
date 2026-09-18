namespace Forma.Application.Features.Permissions.DTOs;

/// <summary>
/// 權限 DTO
/// </summary>
public class PermissionDto
{
    public Guid Id { get; set; }
    public Guid FormId { get; set; }
    public Guid? UserId { get; set; }
    public string? Username { get; set; }
    public string? UserEmail { get; set; }
    public string? ProjectMemberRole { get; set; }
    public string PermissionType { get; set; } = string.Empty;
    public Guid GrantedById { get; set; }
    public string GrantedByUsername { get; set; } = string.Empty;
    public DateTime GrantedAt { get; set; }
}

/// <summary>
/// 表單權限摘要 DTO
/// </summary>
public class FormPermissionSummaryDto
{
    public Guid FormId { get; set; }
    public string FormName { get; set; } = string.Empty;
    public List<PermissionDto> Permissions { get; set; } = new();
}

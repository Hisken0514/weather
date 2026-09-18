namespace Forma.Application.Features.Roles.DTOs;

/// <summary>
/// 角色 DTO
/// </summary>
public class RoleDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long PermissionValue { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// 建立角色請求
/// </summary>
public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long PermissionValue { get; set; }
}

/// <summary>
/// 更新角色請求
/// </summary>
public class UpdateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public long PermissionValue { get; set; }
}

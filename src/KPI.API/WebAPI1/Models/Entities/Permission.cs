using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

public class Permission
{
    [Key]
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty; // e.g., "view", "edit"
    public string? Description { get; set; }

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
}
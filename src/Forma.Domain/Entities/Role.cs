namespace Forma.Domain.Entities;

/// <summary>
/// 系統角色
/// </summary>
public class Role : AuditableEntity
{
    /// <summary>
    /// 角色名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 角色描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 權限值 (位元遮罩，對應 UserPermission enum)
    /// </summary>
    public long PermissionValue { get; set; }
}

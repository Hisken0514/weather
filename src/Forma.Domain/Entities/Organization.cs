using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 組織
/// </summary>
public class Organization : AuditableEntity
{
    /// <summary>
    /// 組織名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 組織代碼
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 組織類型
    /// </summary>
    public OrganizationType Type { get; set; }

    // Navigation Properties
    public virtual ICollection<Project> Projects { get; set; } = new List<Project>();
}

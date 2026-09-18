namespace Forma.Domain.Entities;

/// <summary>
/// 督導機關
/// </summary>
public class Agency : AuditableEntity
{
    /// <summary>
    /// 機關名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 所屬轄區（臺北分局、臺中分局、臺南分局、高屏分局、總局）
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; } = true;

    // Navigation Properties
    public virtual ICollection<AgencyFormType> FormTypes { get; set; } = new List<AgencyFormType>();
    public virtual ICollection<AgencyUser> AgencyUsers { get; set; } = new List<AgencyUser>();
    public virtual ICollection<SupervisionTask> SupervisionTasks { get; set; } = new List<SupervisionTask>();
}

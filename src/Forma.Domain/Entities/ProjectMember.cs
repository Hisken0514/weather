using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 計畫成員
/// </summary>
public class ProjectMember : BaseEntity
{
    /// <summary>
    /// 計畫 ID
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 角色
    /// </summary>
    public ProjectRole Role { get; set; }

    /// <summary>
    /// 新增者 ID
    /// </summary>
    public Guid AddedById { get; set; }

    /// <summary>
    /// 新增時間
    /// </summary>
    public DateTime AddedAt { get; set; }

    /// <summary>
    /// 移除時間
    /// </summary>
    public DateTime? RemovedAt { get; set; }

    /// <summary>
    /// 移除者 ID
    /// </summary>
    public Guid? RemovedById { get; set; }

    // Navigation Properties
    public virtual Project Project { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual User AddedBy { get; set; } = null!;
    public virtual User? RemovedBy { get; set; }
}

using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 表單權限
/// </summary>
public class FormPermission : BaseEntity
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 使用者 ID (特定使用者)
    /// </summary>
    public Guid? UserId { get; set; }

    /// <summary>
    /// 計畫成員角色 (或特定角色)
    /// </summary>
    public ProjectRole? ProjectMemberRole { get; set; }

    /// <summary>
    /// 權限類型
    /// </summary>
    public PermissionType PermissionType { get; set; }

    /// <summary>
    /// 授權者 ID
    /// </summary>
    public Guid GrantedById { get; set; }

    /// <summary>
    /// 授權時間
    /// </summary>
    public DateTime GrantedAt { get; set; }

    // Navigation Properties
    public virtual Form Form { get; set; } = null!;
    public virtual User? User { get; set; }
    public virtual User GrantedBy { get; set; } = null!;
}

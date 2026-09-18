namespace Forma.Domain.Entities;

/// <summary>
/// 使用者
/// </summary>
public class User : AuditableEntity
{
    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 電子郵件
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 密碼雜湊
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// 自訂角色 ID（關聯 Role 表）
    /// </summary>
    public Guid? RoleId { get; set; }

    /// <summary>
    /// 自訂角色
    /// </summary>
    public virtual Role? Role { get; set; }

    /// <summary>
    /// 部門
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// 職稱
    /// </summary>
    public string? JobTitle { get; set; }

    /// <summary>
    /// 電話號碼
    /// </summary>
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 最後登入時間
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    // Navigation Properties
    public virtual ICollection<Project> CreatedProjects { get; set; } = new List<Project>();
    public virtual ICollection<ProjectMember> ProjectMemberships { get; set; } = new List<ProjectMember>();
    public virtual ICollection<Form> CreatedForms { get; set; } = new List<Form>();
    public virtual ICollection<Form> LockedForms { get; set; } = new List<Form>();
    public virtual ICollection<FormSubmission> Submissions { get; set; } = new List<FormSubmission>();
    public virtual ICollection<FormTemplate> CreatedTemplates { get; set; } = new List<FormTemplate>();
    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public virtual ICollection<UploadedFile> UploadedFiles { get; set; } = new List<UploadedFile>();
    public virtual ICollection<AgencyUser> AgencyMemberships { get; set; } = new List<AgencyUser>();

    /// <summary>綁定的產業園區（可複選）</summary>
    public virtual ICollection<UserIndustrialPark> IndustrialParks { get; set; } = new List<UserIndustrialPark>();
}

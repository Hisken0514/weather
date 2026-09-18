using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class OrganizationDomain
{
    /// <summary>
    /// 域名ID
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 組織ID
    /// </summary>
    [Required]
    public int OrganizationId { get; set; }

    /// <summary>
    /// 域名
    /// </summary>
    [Required, MaxLength(255)]
    public string DomainName { get; set; }

    /// <summary>
    /// 域名說明
    /// </summary>
    [MaxLength(255)]
    public string? Description { get; set; }

    /// <summary>
    /// 域名驗證令牌
    /// </summary>
    [MaxLength(100)]
    public string? VerificationToken { get; set; }

    /// <summary>
    /// 域名通過驗證的時間
    /// </summary>
    public DateTime? VerifiedAt { get; set; }

    /// <summary>
    /// 是否為主要域名
    /// </summary>
    public bool IsPrimary { get; set; } = false;

    /// <summary>
    /// 是否共享給子組織
    /// </summary>
    public bool IsSharedWithChildren { get; set; } = false;

    /// <summary>
    /// 域名優先級 (用於解決同一用戶郵箱匹配多個域名時的衝突)
    /// </summary>
    public int Priority { get; set; } = 0;

    /// <summary>
    /// 創建時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime UpdatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 導覽屬性：所屬組織
    /// </summary>
    [ForeignKey("OrganizationId")]
    public virtual Organization Organization { get; set; }
}
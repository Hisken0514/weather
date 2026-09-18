using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class Organization
{
    /// <summary>
    /// 組織ID
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 組織名稱
    /// </summary>
    [Required, MaxLength(100)]
    public string Name { get; set; }

    /// <summary>
    /// 組織類型ID
    /// </summary>
    public int TypeId { get; set; }

    /// <summary>
    /// 上級組織ID
    /// </summary>
    public int? ParentId { get; set; }

    /// <summary>
    /// 組織代碼
    /// </summary>
    [MaxLength(50)]
    public string Code { get; set; }

    /// <summary>
    /// 地址
    /// </summary>
    public string? Address { get; set; }

    /// <summary>
    /// 聯絡人
    /// </summary>
    [MaxLength(50)]
    public string? ContactPerson { get; set; }

    /// <summary>
    /// 聯絡電話
    /// </summary>
    [MaxLength(20)]
    public string? ContactPhone { get; set; }

    /// <summary>
    /// 統一編號/稅籍編號
    /// </summary>
    [MaxLength(20)]
    public string? TaxId { get; set; }
    

    /// <summary>
    /// 是否使用父組織的域名驗證
    /// </summary>
    public bool UseParentDomainVerification { get; set; } = false;

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// 創建時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime UpdatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 導覽屬性：組織類型
    /// </summary>
    [ForeignKey("TypeId")]
    public virtual OrganizationType OrganizationType { get; set; }

    /// <summary>
    /// 導覽屬性：上級組織
    /// </summary>
    [ForeignKey("ParentId")]
    public virtual Organization ParentOrganization { get; set; }

    /// <summary>
    /// 導覽屬性：下級組織
    /// </summary>
    public virtual ICollection<Organization> ChildOrganizations { get; set; } = new List<Organization>();

    /// <summary>
    /// 導覽屬性：組織用戶
    /// </summary>
    public virtual ICollection<User> Users { get; set; } = new List<User>();


    /// <summary>
    /// 導覽屬性：組織域名
    /// </summary>
    public virtual ICollection<OrganizationDomain> Domains { get; set; } = new List<OrganizationDomain>();
    
    /// <summary>
    /// 導覽屬性：密碼策略
    /// </summary>
    public virtual ICollection<PasswordPolicy> PasswordPolicies { get; set; } = new List<PasswordPolicy>();
}
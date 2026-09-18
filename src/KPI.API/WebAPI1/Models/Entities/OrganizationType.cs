using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class OrganizationType
{
    /// <summary>
    /// 類型ID
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 類型代碼
    /// </summary>
    [Required, MaxLength(50)]
    public string TypeCode { get; set; }= ""; // 確保不為 NULL

    /// <summary>
    /// 類型名稱
    /// </summary>
    [Required, MaxLength(100)]
    public string? TypeName { get; set; }

    /// <summary>
    /// 類型描述
    /// </summary>
    [MaxLength(200)]
    public string Description { get; set; }

    /// <summary>
    /// 是否可以有子組織
    /// </summary>
    public bool CanHaveChildren { get; set; }

    /// <summary>
    /// 創建時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 導覽屬性：此類型的組織
    /// </summary>
    public virtual ICollection<Organization> Organizations { get; set; } = new List<Organization>();

    /// <summary>
    /// 導覽屬性：作為父類型的階層關係
    /// </summary>
    public virtual ICollection<OrganizationHierarchy> ParentHierarchies { get; set; } = new List<OrganizationHierarchy>();

    /// <summary>
    /// 導覽屬性：作為子類型的階層關係
    /// </summary>
    public virtual ICollection<OrganizationHierarchy> ChildHierarchies { get; set; } = new List<OrganizationHierarchy>();
    /// <summary>
    /// 導覽屬性：組織使用者
    /// </summary>
    public virtual ICollection<User> Users { get; set; } = new List<User>();
    
    /// <summary>
    /// 導覽屬性：密碼策略
    /// </summary>
    public virtual ICollection<PasswordPolicy> PasswordPolicies { get; set; } = new List<PasswordPolicy>();
   
}
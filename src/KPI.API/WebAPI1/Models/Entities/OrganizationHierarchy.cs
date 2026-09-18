using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class OrganizationHierarchy
{
    /// <summary>
    /// 階層ID
    /// </summary>
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 父組織類型ID
    /// </summary>
    public int ParentTypeId { get; set; }

    /// <summary>
    /// 子組織類型ID
    /// </summary>
    public int ChildTypeId { get; set; }

    /// <summary>
    /// 關係是否必須
    /// </summary>
    public bool IsRequired { get; set; }

    /// <summary>
    /// 最大子組織數量
    /// </summary>
    public int? MaxChildren { get; set; }

    /// <summary>
    /// 創建時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 導覽屬性：父組織類型
    /// </summary>
    [ForeignKey("ParentTypeId")]
    public virtual OrganizationType ParentType { get; set; }

    /// <summary>
    /// 導覽屬性：子組織類型
    /// </summary>
    [ForeignKey("ChildTypeId")]
    public virtual OrganizationType ChildType { get; set; }
}
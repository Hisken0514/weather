using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

public class KpiItem
{
    [Key]
    public int Id { get; set; }
    
    /// <summary>
    /// 導覽屬性：指標編號
    /// </summary>
    public int IndicatorNumber { get; set; }
    
    /// <summary>
    /// 導覽屬性：基礎型(0)客制型(1)
    /// </summary>
    public int KpiCategoryId { get; set; }
    
    /// <summary>
    /// 導覽屬性：指標領域
    /// </summary>
    public int KpiFieldId { get; set; }
    [ForeignKey("KpiFieldId")]
    public virtual KpiField KpiField { get; set; }
    
    //有客制型就有組織id
    public int? OrganizationId { get; set; }
    
    [ForeignKey("OrganizationId")]
    public virtual Organization Organization { get; set; }
    
    
    public virtual ICollection<KpiDetailItem> KpiDetailItems { get; set; } = new List<KpiDetailItem>();
    public virtual ICollection<KpiItemName> KpiItemNames { get; set; } = new List<KpiItemName>();
     
    public DateTime CreateTime { get; set; }
    public DateTime UploadTime { get; set; }
   
}
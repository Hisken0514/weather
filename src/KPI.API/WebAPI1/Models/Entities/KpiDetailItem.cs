using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

public class KpiDetailItem
{
    [Key]
    public int Id { get; set; }
    
    public int KpiItemId { get; set; }
    [ForeignKey("KpiItemId")]
    public virtual KpiItem KpiItem { get; set; }
    
    /// <summary>
    /// 導覽屬性：單位
    /// </summary>
    [StringLength(50)]
    public string Unit { get; set; }
    
    /// <summary>
    /// 導覽屬性：公式
    /// </summary>
    [StringLength(3)]
    public string? ComparisonOperator { get; set; }
    
    /// <summary>
    /// 是否為指標項目
    /// </summary>
    public bool IsIndicator { get; set; }
    public virtual ICollection<KpiData> KpiDatas { get; set; } = new List<KpiData>();
    public virtual ICollection<KpiDetailItemName> KpiDetailItemNames { get; set; } = new List<KpiDetailItemName>();
    
    public DateTime CreateTime { get; set; }
    public DateTime UploadTime { get; set; }
}
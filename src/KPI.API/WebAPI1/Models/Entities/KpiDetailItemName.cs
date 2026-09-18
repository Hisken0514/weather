using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

public class KpiDetailItemName
{
    [Key]
    public int Id { get; set; }
    public int KpiDetailItemId { get; set; }
    public string Name { get; set; }
    
    /// <summary>
    /// 導覽屬性：開始使用年份
    /// </summary>
    public int StartYear { get; set; }
    
    /// <summary>
    /// 導覽屬性：結束使用年份
    /// </summary>
    public int? EndYear { get; set; }
    public string UserEmail { get; set; }
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdateAt { get; set; }

    [ForeignKey("KpiDetailItemId")]
    public virtual KpiDetailItem KpiDetailItem { get; set; }
    [ForeignKey("UserEmail")]
    public virtual User User { get; set; }
}
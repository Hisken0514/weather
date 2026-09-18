using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

public class KpiData
{
    [Key]
    public int Id { get; set; }
    
    /// <summary>
    /// 導覽屬性：是否啟用
    /// </summary>
    public bool IsApplied { get; set; }
    
    /// <summary>
    /// 導覽屬性：基線值數據年份
    /// </summary>
    [StringLength(20)]
    public string BaselineYear { get; set; }
    
    /// <summary>
    /// 導覽屬性：基線值
    /// </summary>
    [Column(TypeName = "decimal(18, 4)")]
    public decimal? BaselineValue { get; set; }

    /// <summary>
    /// 導覽屬性：目標
    /// </summary>
    [Column(TypeName = "decimal(18, 4)")]
    public decimal? TargetValue { get; set; }

    /// <summary>
    /// 導覽屬性：備註
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string? Remarks { get; set; }

    
    //外鍵
    public int DetailItemId { get; set; }

    [ForeignKey("DetailItemId")]
    public virtual KpiDetailItem DetailItem { get; set; }
    
    public int? KpiCycleId { get; set; }
    public virtual KpiCycle KpiCycle { get; set; }
        
    public int? OrganizationId { get; set; }
    [ForeignKey("OrganizationId")]
    public virtual Organization Organization { get; set; }
    
    public virtual ICollection<KpiReport> KpiReports { get; set; } = new List<KpiReport>();
    
    /// <summary>
    /// 導覽屬性：工場/製程區
    /// </summary>
    public string? ProductionSite { get; set; }
    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdateAt { get; set; }

}
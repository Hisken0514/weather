using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;

public class KpiField
{
    [Key]
    public int Id { get; set; }

    /// <summary>
    /// 導覽屬性：領域中文名稱
    /// </summary>
    [StringLength(50)]
    public string field { get; set; }
    
    /// <summary>
    /// 導覽屬性：領域英文名稱
    /// </summary>
    [StringLength(50)]
    public string enfield { get; set; }
    
    public virtual ICollection<KpiItem> KpiItems { get; set; } = new List<KpiItem>();
    public virtual ICollection<SuggestReport> SuggestReports { get; set; } = new List<SuggestReport>();
    
    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdateAt { get; set; }
}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;

public class KpiUnitData
{
    [Key]
    public int Id { get; set; }

    [StringLength(50)]
    public string UnitData { get; set; }
    
    
    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdateAt { get; set; }
    
    [InverseProperty("KpiUnitData")]
    public virtual ICollection<KpiData> KpiDatas { get; set; } = new List<KpiData>();
}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;


public class SuggestDate
{
    [Key]
    public int Id { get; set; }

    //建議日期
    [Column(TypeName = "date")]
    public DateTime Date { get; set; }

    // 會議/活動類別
    public int SuggestEventTypeId { get; set; }

    [ForeignKey("SuggestEventTypeId")]
    public SuggestEventType SuggestEventType { get; set; }
    
    public int? OrganizationId { get; set; }
    [ForeignKey("OrganizationId")]
    public virtual Organization Organization { get; set; }
    
    public virtual ICollection<SuggestReport> SuggestReports { get; set; } = new List<SuggestReport>();
    
    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdateAt { get; set; }
}
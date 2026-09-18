using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;

public class SuggestFile
{
    [Key]
    public int Id { get; set; } // 主鍵
    
    public int Year { get; set; } // 年份
    
    public int Quarter { get; set; } // 所屬季度
    
    [MaxLength(255)]
    public string ReportName { get; set; } // 報告書名稱

    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdateAt { get; set; }
    
    public int? OrganizationId { get; set; }
    [ForeignKey("OrganizationId")]
    public virtual Organization Organization { get; set; }

    public int? FileId { get; set; }
    [ForeignKey("FileId")]
    public virtual File file { get; set; }
    
}
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;


// Draft	公司填寫中，尚未送出
// Submitted	公司點擊「確認送出」
// Reviewed	審查委員／主管機關已審閱
// Returned	審查退回修正中
// Finalized	報告完成，不再允許修改（進入歷史記錄）
public enum ReportStatus : byte
{
    Draft = 0,
    Submitted = 1,
    Reviewed = 2,
    Returned = 3,
    Finalized = 4,
}

[Index("KpiDataId", Name = "IX_KpiReports_KpiDataId")]
public class KpiReport
{
    [Key]
    public int Id { get; set; }
    
    [Range(0, 10)]
    public int Year { get; set; }
    
    //季度(如 Q1、Q2、Q3、Q4、H1、Y 全年)
    public string Period { get; set; }
    
    [Column(TypeName = "decimal(18, 4)")]
    public decimal? KpiReportValue { get; set; }
    
    public bool IsSkipped { get; set; } = false;
    
    public string? Remarks { get; set; }
    
    [Column(TypeName = "tinyint")]
    public ReportStatus Status { get; set; }
    public int KpiDataId { get; set; }
    
    [ForeignKey("KpiDataId")]
    public virtual KpiData KpiData { get; set; }
    
    public DateTime? CreatedAt { get; set; }
    public DateTime? UpdateAt { get; set; }
}
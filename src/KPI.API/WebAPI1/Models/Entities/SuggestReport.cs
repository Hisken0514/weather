using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace WebAPI1.Entities;

public enum IsAdopted : byte
{
    否 = 0,
    是 = 1,
    不參採 = 2,
    詳備註 = 3
}

public class SuggestReport
{
    [Key]
    public int Id { get; set; }

    // 督導關聯
    public int SuggestDateId { get; set; }
    [ForeignKey("SuggestDateId")]
    public virtual SuggestDate SuggestDate { get; set; }
    
    // 建議類別
    public int SuggestionTypeId { get; set; }

    [ForeignKey("SuggestionTypeId")]
    public SuggestionType SuggestionType { get; set; }
    
    public string SuggestionContent { get; set; } // 建議內容
    
    [Column(TypeName = "tinyint")] // 是否參採
    public IsAdopted? IsAdopted { get; set; }
    public string? IsAdoptedOther { get; set; }
    public string? RespDept { get; set; } //負責部門
    
    public string? ImproveDetails { get; set; } // 改善對策/辦理情形
    
    public int? Manpower { get; set; } // 投入人力
    
    public decimal? Budget { get; set; } // 投入改善經費
    
    [Column(TypeName = "tinyint")] // 是否完成改善
    public IsAdopted? Completed { get; set; }
    
    public string? CompletedOther { get; set; }
    public int? DoneYear { get; set; } // 完成/預計完成日期 西元年份
    public int? DoneMonth { get; set; } // 完成/預計完成日期 月份
    
    [Column(TypeName = "tinyint")] // 是否平行展開
    public IsAdopted? ParallelExec { get; set; }
    public string? ParallelExecOther { get; set; }
    
    public string? ExecPlan { get; set; } // 平行展開執行規劃
    
    public string? Remark { get; set; } // 平行展開執行規劃
    
    public int? KpiFieldId { get; set; }
    
    [ForeignKey("KpiFieldId")]
    public virtual KpiField? KpiField { get; set; }
    
    public Guid UserId { get; set; } //委員使用者
    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
    
    public DateTime? CreatedAt { get; set; }

    public DateTime? UpdateAt { get; set; }
}
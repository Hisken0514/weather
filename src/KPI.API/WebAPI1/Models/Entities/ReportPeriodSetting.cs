using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

/// <summary>
/// 全域設定：目前開放填報的年度/季度，以及是不是鎖定（鎖定時使用者不能自己選其他年度/季度）。
/// 只會有一筆（單例設定），沒有資料時前端視為「未鎖定」。
/// </summary>
public class ReportPeriodSetting
{
    [Key]
    public int Id { get; set; }

    public int CurrentYear { get; set; }

    [StringLength(10)]
    public string CurrentQuarter { get; set; }

    public bool IsLocked { get; set; }

    public string? UpdatedByEmail { get; set; }
    public DateTime UpdatedAt { get; set; }
}

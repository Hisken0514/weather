using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

/// <summary>
/// 系統公告（全站 Banner 使用）
/// </summary>
public class SystemAnnouncement
{
    [Key]
    public int Id { get; set; }

    /// <summary>是否啟用公告</summary>
    public bool IsEnabled { get; set; } = false;

    /// <summary>公告內容</summary>
    [MaxLength(500)]
    public string Message { get; set; } = string.Empty;

    /// <summary>公告類型：info / warning / error</summary>
    [MaxLength(20)]
    public string Severity { get; set; } = "warning";

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

namespace Forma.Domain.Entities;

/// <summary>
/// 匯出任務
/// </summary>
public class Export : BaseEntity
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 匯出格式 (CSV, Excel, JSON)
    /// </summary>
    public string Format { get; set; } = "CSV";

    /// <summary>
    /// 篩選條件 (JSON)
    /// </summary>
    public string? Filters { get; set; }

    /// <summary>
    /// 狀態 (Pending, Processing, Completed, Failed)
    /// </summary>
    public string Status { get; set; } = "Pending";

    /// <summary>
    /// 檔案路徑
    /// </summary>
    public string? FilePath { get; set; }

    /// <summary>
    /// 檔案名稱
    /// </summary>
    public string? FileName { get; set; }

    /// <summary>
    /// 檔案大小 (bytes)
    /// </summary>
    public long? FileSize { get; set; }

    /// <summary>
    /// 記錄筆數
    /// </summary>
    public int? RecordCount { get; set; }

    /// <summary>
    /// 錯誤訊息
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// 建立者 ID
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// 完成時間
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// 過期時間
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    // Navigation Properties
    public virtual Form Form { get; set; } = null!;
    public virtual User CreatedBy { get; set; } = null!;
}

namespace Forma.Domain.Entities;

/// <summary>
/// 系統設定 (使用 JSONB 儲存分類設定)
/// </summary>
public class SystemSetting
{
    /// <summary>
    /// 主鍵
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// 設定分類 (Key) - 例如: "Email", "Security", "FileStorage"
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// 設定值 (JSONB)
    /// </summary>
    public string Value { get; set; } = "{}";

    /// <summary>
    /// 設定描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime? UpdatedAt { get; set; }
}

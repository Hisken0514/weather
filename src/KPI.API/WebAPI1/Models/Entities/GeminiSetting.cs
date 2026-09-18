using System.ComponentModel.DataAnnotations;
using WebAPI1.Services;

namespace WebAPI1.Entities;

/// <summary>
/// 單一列的全域設定表，目前只放 Gemini 聊天機器人的 system prompt。
/// 固定用 Id = 1 那一列（upsert），不是每個使用者各自一份設定。
/// </summary>
public class GeminiSetting
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string SystemInstruction { get; set; } = string.Empty;

    /// <summary>
    /// 一般使用者的聊天視窗要不要顯示「第 X 次呼叫工具」這個透明化區塊（含呼叫次數、參數、
    /// 查詢結果）。預設關閉——這些細節對一般使用者來說偏技術性、容易造成困惑，只有管理員在
    /// 後台驗證行為時才需要看到；工具名稱本身（例如「已查詢：summary_by_org」）不受這個開關
    /// 影響，一律顯示，讓使用者至少知道「機器人有去查資料」。
    /// </summary>
    public bool ShowToolCallDetailsToUsers { get; set; } = false;

    public DateTime UpdatedAt { get; set; } = tool.GetTaiwanNow();

    public string? UpdatedByUserId { get; set; }

    public string? UpdatedByUserName { get; set; }
}

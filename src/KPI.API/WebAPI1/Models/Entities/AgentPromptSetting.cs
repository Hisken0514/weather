using System.ComponentModel.DataAnnotations;
using WebAPI1.Services;

namespace WebAPI1.Entities;

/// <summary>
/// 單一列（Id=1 upsert）AgentController 專用的 system prompt。刻意跟 GeminiSetting
/// 分開兩張表，避免兩個 controller 對同一列設定互相覆寫。
/// </summary>
public class AgentPromptSetting
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string SystemInstruction { get; set; } = string.Empty;

    /// <summary>
    /// AgentChatConversation（AI Agent 文件 RAG 聊天）要不要對一般使用者顯示「呼叫工具」明細
    /// （參數、查詢結果）。預設關閉，跟 GeminiSetting.ShowToolCallDetailsToUsers 是同一個產品
    /// 決策、分開存兩份，因為兩套聊天系統本來就刻意不共用設定表。管理員在「AI Agent 測試」頁
    /// 一律看得到完整明細，不受這個開關影響（那是給管理員驗證行為用的，不是一般使用者入口）。
    /// </summary>
    public bool ShowToolCallDetailsToUsers { get; set; } = false;

    public DateTime UpdatedAt { get; set; } = tool.GetTaiwanNow();
    public Guid? UpdatedByUserId { get; set; }
    public string? UpdatedByUserName { get; set; }
}

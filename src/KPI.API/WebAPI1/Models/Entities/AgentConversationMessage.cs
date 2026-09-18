using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public class AgentConversationMessage
{
    [Key]
    public long Id { get; set; }

    public Guid ConversationId { get; set; }

    /// <summary>"user" 或 "assistant"。</summary>
    [Required, MaxLength(20)]
    public string Role { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    /// <summary>這一則訊息呼叫過的工具（JSON 陣列），純紀錄用途，方便前端展開查詢細節。</summary>
    public string? ToolCallsJson { get; set; }

    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    [ForeignKey("ConversationId")]
    public virtual AgentConversation Conversation { get; set; } = null!;
}

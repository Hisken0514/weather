using System.ComponentModel.DataAnnotations;
using WebAPI1.Services;

namespace WebAPI1.Entities;

/// <summary>
/// 伺服器端對話紀錄（取代前端自己傳整段歷史的做法）。長期記錄存在既有 SQL Server
/// （沿用 ISHAuditDbcontext，不另外引入 Postgres 依賴），短期串流續傳狀態走 Redis。
/// </summary>
public class AgentConversation
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [MaxLength(200)]
    public string? Title { get; set; }

    public bool IsPinned { get; set; }

    public bool IsArchived { get; set; }

    public DateTime CreatedAt { get; set; } = tool.GetTaiwanNow();

    public DateTime LastMessageAt { get; set; } = tool.GetTaiwanNow();

    /// <summary>
    /// 這段對話最近一輪完成時用的是 Tier1 還是 Tier2（"Tier1"/"Tier2"，null 代表還沒有任何
    /// 一輪完成過）。給 Tier1/Tier2 分流的「sticky 規則」用——上一輪如果已經在 Tier2（查資料
    /// 查到一半），這一輪即使是「試看看」「再確認一次」這種完全不含關鍵字的簡短追問，也直接
    /// 沿用 Tier2，不用再讓 Tier1 重新判斷一次（關鍵字比對抓不到這種依語境才看得懂的追問，
    /// 見 AgentControllerTierRoutingTests 的說明）。
    /// </summary>
    [MaxLength(10)]
    public string? LastTier { get; set; }

    public virtual ICollection<AgentConversationMessage> Messages { get; set; } = new List<AgentConversationMessage>();
}

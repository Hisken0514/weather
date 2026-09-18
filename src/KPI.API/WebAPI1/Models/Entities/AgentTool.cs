using System.ComponentModel.DataAnnotations;

namespace WebAPI1.Entities;

public enum AgentToolSource
{
    InProcess = 0,
    McpEndpoint = 1,
}

/// <summary>
/// 風險等級是註冊工具時由開發者/admin 指定的靜態屬性，LLM 不能自己宣告自己是低風險。
/// v1 只有唯讀查詢工具（Low），Medium/High 的同意流程留給之後真的有寫入型工具時再做。
/// </summary>
public enum AgentToolRiskTier
{
    Low = 0,
    Medium = 1,
    High = 2,
}

/// <summary>
/// 工具目錄。角色能用哪些工具由 AgentToolRole 對照表決定，這裡只登記「系統裡有哪些工具」。
/// </summary>
public class AgentTool
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(100)]
    public string ToolKey { get; set; } = string.Empty;

    [Required, MaxLength(300)]
    public string Description { get; set; } = string.Empty;

    public AgentToolSource Source { get; set; } = AgentToolSource.InProcess;

    public AgentToolRiskTier RiskTier { get; set; } = AgentToolRiskTier.Low;

    /// <summary>Source=McpEndpoint 時對應到哪個 AgentMcpEndpoint，InProcess 工具此欄位為 null。</summary>
    public int? McpEndpointId { get; set; }

    /// <summary>Source=McpEndpoint 時，這個工具在 MCP server 原始的 tool name——呼叫 tools/call
    /// 要用這個，不是 ToolKey（ToolKey 加了 endpoint 前綴避免跟其他來源撞名，MCP server 不認得
    /// 這個前綴）。InProcess 工具此欄位為 null。</summary>
    [MaxLength(200)]
    public string? McpToolName { get; set; }

    /// <summary>Source=McpEndpoint 時，MCP server 在 tools/list 回傳的 inputSchema（原始 JSON
    /// Schema 字串），組 LLM function-calling 的 parameters 欄位用。InProcess 工具的 parameters
    /// 是寫死在 AgentDocumentTools.BuildToolDeclarations，此欄位為 null。</summary>
    public string? ParametersSchema { get; set; }

    public bool IsEnabled { get; set; } = true;

    /// <summary>「外部存取」開關——只有勾了這個的 InProcess 工具，才會出現在 /mcp 端點的
    /// tools/list 給外部 MCP client 看到、呼叫。跟 IsEnabled 分開控制：一個工具可以只給
    /// 內部 AI Agent 用（IsEnabled=true, ExternalAccessEnabled=false），或兩邊都開。</summary>
    public bool ExternalAccessEnabled { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual ICollection<AgentToolRole> AgentToolRoles { get; set; } = new List<AgentToolRole>();
}

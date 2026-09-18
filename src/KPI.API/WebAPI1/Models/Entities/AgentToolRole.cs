using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

/// <summary>
/// 工具矩陣本體。組 tools 定義丟給 LiteLLM 前先依呼叫者角色從這張表濾出可用清單；
/// LLM 真的回 tool_call 時，執行入口要再驗一次是否真的在這個角色允許的清單裡（雙重關卡）。
/// </summary>
public class AgentToolRole
{
    [Key]
    public int Id { get; set; }

    public int ToolId { get; set; }

    public int RoleId { get; set; }

    [ForeignKey("ToolId")]
    public virtual AgentTool Tool { get; set; } = null!;

    [ForeignKey("RoleId")]
    public virtual Role Role { get; set; } = null!;
}

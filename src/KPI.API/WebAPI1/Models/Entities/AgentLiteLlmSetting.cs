using System.ComponentModel.DataAnnotations;
using WebAPI1.Services;

namespace WebAPI1.Entities;

/// <summary>
/// 單一列的全域設定表（Id=1 upsert），存 AgentController 專用的 LiteLLM 連線設定。
/// 跟 GeminiController 用的 GeminiSettings 分開，兩個 controller 互不干擾。
/// ApiKey 用 IDataProtector 加密存，永遠不會有明文欄位。
/// </summary>
public class AgentLiteLlmSetting
{
    [Key]
    public int Id { get; set; }

    [Required, MaxLength(500)]
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>Tier 2：帶完整工具集（RAG）用的正式模型，一定要支援真正的 function-calling。</summary>
    [Required, MaxLength(200)]
    public string Model { get; set; } = "claude-sonnet-4-6";

    /// <summary>
    /// Tier 1：便宜/快、完全不帶工具的模型（例如 gemma），只回答不需要查文件的閒聊/FAQ。
    /// 留空代表不分流，所有訊息一律用 Tier 2（Model）處理——這是目前既有行為，向下相容。
    /// 刻意不給 Tier 1 工具權限：小模型能正確判斷「要不要查」，但把工具結果整理成文字、或
    /// 判斷「該不該收手」都不穩定，實測會出現假造工具呼叫格式、無限重複呼叫等問題。
    /// </summary>
    [MaxLength(200)]
    public string? Tier1Model { get; set; }

    [MaxLength(200)]
    public string EmbeddingModel { get; set; } = "text-embedding-3-large";

    /// <summary>加密後的 API Key，null 代表尚未設定。</summary>
    public string? ApiKeyEncrypted { get; set; }

    public int MaxOutputTokens { get; set; } = 4096;
    public int MaxToolCalls { get; set; } = 12;
    public double StreamRequestBudgetSeconds { get; set; } = 15;

    public DateTime UpdatedAt { get; set; } = tool.GetTaiwanNow();
    public Guid? UpdatedByUserId { get; set; }
    public string? UpdatedByUserName { get; set; }
}

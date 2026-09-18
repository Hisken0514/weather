using System.Text.Json;
using System.Text.Json.Nodes;

namespace WebAPI1.Services;

/// <summary>
/// ChatStream 被時間預算截斷、需要「續傳」時，伺服器端要保住的完整狀態——取代舊版讓客戶端
/// 保管 priorToolCalls/partialAnswer、下一輪整包送回來再信任的做法（那個做法的問題是伺服器
/// 完全沒有驗證客戶端回傳的 tool 呼叫結果是不是真的，等於讓客戶端可以偽造「文件搜尋結果」
/// 塞進 LLM 的對話歷史）。現在這份狀態只存在伺服器這邊（Redis，見 AgentController），客戶端
/// 續傳時只需要送一個「這是續傳」的旗標，不用也不能提供任何內容。
///
/// 抽成獨立類別、只做序列化/反序列化這一件事，是為了能在不用真的接 Redis/DB/HTTP 的情況下
/// 直接對這段邏輯寫單元測試——這是這次重構裡最值得鎖住行為的部分：狀態存錯、少存、或反序列化
/// 時漏欄位，都會讓續傳後的對話內容跟原本對不上。
/// </summary>
public sealed record AgentPendingLoopState
{
    public required JsonArray Messages { get; init; }
    public required JsonArray ToolCallsAcc { get; init; }
    public required string FinalText { get; init; }
    public required bool UseTier1 { get; init; }
    public string? ModelUsed { get; init; }
    public required List<string> AllowedToolKeys { get; init; }

    public string Serialize()
    {
        var obj = new JsonObject
        {
            ["messages"] = Messages.DeepClone(),
            ["toolCallsAcc"] = ToolCallsAcc.DeepClone(),
            ["finalText"] = FinalText,
            ["useTier1"] = UseTier1,
            ["modelUsed"] = ModelUsed,
            ["allowedToolKeys"] = JsonSerializer.SerializeToNode(AllowedToolKeys),
        };
        return obj.ToJsonString();
    }

    /// <summary>反序列化失敗（存進去的格式跟現在的欄位對不上、或資料損毀）時回傳 null，
    /// 呼叫端要當成「沒有可續傳的狀態」處理，不能讓整個請求炸掉。</summary>
    public static AgentPendingLoopState? TryDeserialize(string json)
    {
        try
        {
            var obj = JsonNode.Parse(json)?.AsObject();
            if (obj is null)
            {
                return null;
            }

            var messages = obj["messages"]?.AsArray();
            var toolCallsAcc = obj["toolCallsAcc"]?.AsArray();
            var finalText = obj["finalText"]?.GetValue<string>();
            var useTier1 = obj["useTier1"]?.GetValue<bool>();
            var allowedToolKeys = obj["allowedToolKeys"]?.Deserialize<List<string>>();

            if (messages is null || toolCallsAcc is null || finalText is null
                || useTier1 is null || allowedToolKeys is null)
            {
                return null;
            }

            return new AgentPendingLoopState
            {
                Messages = messages,
                ToolCallsAcc = toolCallsAcc,
                FinalText = finalText,
                UseTier1 = useTier1.Value,
                ModelUsed = obj["modelUsed"]?.GetValue<string>(),
                AllowedToolKeys = allowedToolKeys,
            };
        }
        catch (JsonException)
        {
            return null;
        }
    }
}

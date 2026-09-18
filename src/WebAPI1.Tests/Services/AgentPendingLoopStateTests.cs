using System.Text.Json.Nodes;
using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentPendingLoopState——這是「石化平台式重構」裡最關鍵的一塊：把續傳狀態的權威來源從
/// 客戶端（舊版 priorToolCalls/partialAnswer，伺服器直接信任、不驗證）搬到伺服器自己存的
/// Redis 值。這裡只測序列化/反序列化本身的正確性，不用真的接 Redis——序列化壞了、漏欄位，
/// 續傳後對話內容就會跟原本對不上，是這次重構最值得鎖住行為的部分。
/// </summary>
public class AgentPendingLoopStateTests
{
    private static AgentPendingLoopState SampleState() => new()
    {
        Messages = new JsonArray
        {
            new JsonObject { ["role"] = "system", ["content"] = "你是文件查詢小幫手" },
            new JsonObject { ["role"] = "user", ["content"] = "幫我找出風險值114年比115年高的工廠" },
            new JsonObject
            {
                ["role"] = "assistant",
                ["content"] = null,
                ["tool_calls"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["id"] = "call_1",
                        ["type"] = "function",
                        ["function"] = new JsonObject { ["name"] = "search_documents", ["arguments"] = "{\"query\":\"風險值 114年\"}" }
                    }
                }
            },
            new JsonObject { ["role"] = "tool", ["tool_call_id"] = "call_1", ["content"] = "[documentId=19 ...]" },
        },
        ToolCallsAcc = new JsonArray
        {
            new JsonObject { ["tool"] = "search_documents", ["args"] = "{\"query\":\"風險值 114年\"}", ["result"] = "[documentId=19 ...]" },
        },
        FinalText = "",
        UseTier1 = false,
        ModelUsed = "claude-sonnet-4-6",
        AllowedToolKeys = new List<string> { "search_documents", "query_document_table" },
    };

    [Fact]
    public void SerializeThenDeserialize_RoundTrips_AllFieldsIntact()
    {
        var original = SampleState();

        var json = original.Serialize();
        var restored = AgentPendingLoopState.TryDeserialize(json);

        Assert.NotNull(restored);
        Assert.Equal(original.Messages.ToJsonString(), restored!.Messages.ToJsonString());
        Assert.Equal(original.ToolCallsAcc.ToJsonString(), restored.ToolCallsAcc.ToJsonString());
        Assert.Equal(original.FinalText, restored.FinalText);
        Assert.Equal(original.UseTier1, restored.UseTier1);
        Assert.Equal(original.ModelUsed, restored.ModelUsed);
        Assert.Equal(original.AllowedToolKeys, restored.AllowedToolKeys);
    }

    [Fact]
    public void SerializeThenDeserialize_UseTier1True_RoundTrips()
    {
        var original = SampleState() with { UseTier1 = true, ModelUsed = "gemma4:26b" };
        var restored = AgentPendingLoopState.TryDeserialize(original.Serialize());

        Assert.True(restored!.UseTier1);
        Assert.Equal("gemma4:26b", restored.ModelUsed);
    }

    /// <summary>
    /// 對應「輸出最終答案文字時被截斷」的續傳情境——FinalText 有內容，AgentController 會
    /// 根據這個欄位決定要不要跳過工具呼叫迴圈、直接接著把答案講完。
    /// </summary>
    [Fact]
    public void SerializeThenDeserialize_NonEmptyFinalText_RoundTrips()
    {
        var original = SampleState() with { FinalText = "根據查到的資料，114年風險值比115年高的工廠有" };
        var restored = AgentPendingLoopState.TryDeserialize(original.Serialize());

        Assert.Equal("根據查到的資料，114年風險值比115年高的工廠有", restored!.FinalText);
    }

    [Fact]
    public void SerializeThenDeserialize_NullModelUsed_RoundTripsAsNull()
    {
        var original = SampleState() with { ModelUsed = null };
        var restored = AgentPendingLoopState.TryDeserialize(original.Serialize());

        Assert.Null(restored!.ModelUsed);
    }

    [Fact]
    public void SerializeThenDeserialize_EmptyAllowedToolKeys_RoundTripsAsEmptyList()
    {
        // 對應角色完全沒有工具權限的情境——這個清單空的時候，AgentController 續傳時重建
        // toolDeclarations 也必須是空的，不能因為反序列化把 null 當成「有工具」誤判。
        var original = SampleState() with { AllowedToolKeys = new List<string>() };
        var restored = AgentPendingLoopState.TryDeserialize(original.Serialize());

        Assert.NotNull(restored!.AllowedToolKeys);
        Assert.Empty(restored.AllowedToolKeys);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not json at all")]
    [InlineData("{}")]
    [InlineData("""{"messages": []}""")] // 缺其他必要欄位
    [InlineData("null")]
    public void TryDeserialize_InvalidOrIncompleteJson_ReturnsNullWithoutThrowing(string json)
    {
        var restored = AgentPendingLoopState.TryDeserialize(json);

        Assert.Null(restored);
    }

    [Fact]
    public void TryDeserialize_MissingUseTier1Field_ReturnsNull()
    {
        // 刻意只拿掉 useTier1 這個欄位——反序列化不能「猜」一個預設值繼續跑，寧可整包當失效、
        // 讓呼叫端退回去當一句新訊息處理，也不要用錯的 Tier 設定悄悄接續下去。
        var json = """
        {
            "messages": [],
            "toolCallsAcc": [],
            "finalText": "",
            "allowedToolKeys": []
        }
        """;

        var restored = AgentPendingLoopState.TryDeserialize(json);

        Assert.Null(restored);
    }
}

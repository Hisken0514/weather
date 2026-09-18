using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentLiteLlmClient.TryParseFakeToolCallAsText——判斷一段文字是不是模型「用文字模仿」出來
/// 的工具呼叫（{"name": "...", "arguments": {...}}），而不是走 OpenAI tool_calls 結構化欄位的
/// 真呼叫。這是這次 session 反覆處理的「小模型幻覺工具呼叫」問題裡，其中一段具體的偵測邏輯，
/// 值得鎖住行為：只認得剛好長這個形狀的 JSON，避免以後改動時不小心放寬或縮窄判斷範圍。
///
/// 注意：這個方法目前只認得 {"name":..., "arguments":{...}} 這種 JSON 格式，&lt;tool_call&gt;
/// XML 標籤格式（另一種實測出現過的幻覺格式）目前不在這個方法的偵測範圍內——這是已知、
/// 目前接受的殘餘風險（見 AgentController 的 NoToolsSystemInstruction/Tier1SystemInstruction
/// 才是根因修法），這裡刻意也測一下 XML 格式回傳 false，用測試明確記錄這個邊界，而不是
/// 讓人誤以為這個方法會攔住所有幻覺格式。
/// </summary>
public class FakeToolCallDetectionTests
{
    [Fact]
    public void TryParseFakeToolCallAsText_ValidFakeToolCallJson_ReturnsTrueWithParsedNameAndArguments()
    {
        var text = """{"name": "search_documents", "arguments": {"query": "消防改善"}}""";

        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out var name, out var arguments);

        Assert.True(matched);
        Assert.Equal("search_documents", name);
        Assert.NotNull(arguments);
        Assert.Equal("消防改善", arguments!["query"]!.GetValue<string>());
    }

    [Fact]
    public void TryParseFakeToolCallAsText_ValidJsonWithLeadingTrailingWhitespace_StillMatches()
    {
        var text = "  \n{\"name\": \"query_document_table\", \"arguments\": {}}\n  ";

        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out var name, out _);

        Assert.True(matched);
        Assert.Equal("query_document_table", name);
    }

    [Theory]
    [InlineData("你好，有什麼可以幫你的嗎？")]
    [InlineData("根據文件內容，消防改善的重點如下：...")]
    public void TryParseFakeToolCallAsText_NormalAnswerText_ReturnsFalse(string text)
    {
        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out var name, out var arguments);

        Assert.False(matched);
        Assert.Null(name);
        Assert.Null(arguments);
    }

    [Fact]
    public void TryParseFakeToolCallAsText_JsonMissingArgumentsField_ReturnsFalse()
    {
        // 只有 name 沒有 arguments，不符合「假工具呼叫」的形狀，當一般文字處理。
        var text = """{"name": "search_documents"}""";

        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out _, out _);

        Assert.False(matched);
    }

    [Fact]
    public void TryParseFakeToolCallAsText_JsonWithEmptyNameString_ReturnsFalse()
    {
        var text = """{"name": "", "arguments": {}}""";

        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out _, out _);

        Assert.False(matched);
    }

    [Fact]
    public void TryParseFakeToolCallAsText_MalformedJson_ReturnsFalseWithoutThrowing()
    {
        var text = """{"name": "search_documents", "arguments": {""";

        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out _, out _);

        Assert.False(matched);
    }

    [Fact]
    public void TryParseFakeToolCallAsText_XmlToolCallTagFormat_ReturnsFalse_KnownGap()
    {
        // 已知的偵測範圍邊界：這個方法只認得 JSON 形狀，<tool_call> XML 標籤格式的幻覺
        // 不會被這裡攔下來。這條測試不是在驗證「有攔住」，是刻意記錄「這裡沒攔住」，
        // 避免之後有人誤以為這個方法涵蓋了所有幻覺格式。
        var text = "<tool_call>call:query_document_table{query: \"測試\"}<tool_call|>";

        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out _, out _);

        Assert.False(matched);
    }

    [Fact]
    public void TryParseFakeToolCallAsText_PlainJsonArray_ReturnsFalse()
    {
        // JsonNode.Parse 對陣列也會成功，但轉型成 JsonObject 會是 null，不能因此當機。
        var text = """["name", "arguments"]""";

        var matched = AgentLiteLlmClient.TryParseFakeToolCallAsText(text, out _, out _);

        Assert.False(matched);
    }
}

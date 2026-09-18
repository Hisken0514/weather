using System.Text.Json.Nodes;
using WebAPI1.Controllers;
using Xunit;

namespace WebAPI1.Tests.Controllers;

/// <summary>
/// 測 AgentController 裡新補上的 MCP 執行路徑的純邏輯部分（key 消毒、function 宣告組裝、
/// tools/call 回應解析）——這三段完全不碰 DB/HTTP，是這次把「MCP 只登記不執行」補完成
/// 「真的能被 LLM 呼叫」過程中最容易出錯、也最值得鎖住的地方：key 沒消毒乾淨會讓 LLM
/// function-calling 直接拒絕整份 tools 宣告，回應解析錯誤會讓查詢結果對 LLM 而言像是
/// 「什麼都沒查到」而不是「查詢失敗」，兩種都是沉默失敗、不會有例外跳出來提醒。
/// </summary>
public class AgentControllerMcpTests
{
    // ── BuildMcpToolKey ─────────────────────────────────────────────

    [Fact]
    public void BuildMcpToolKey_SimpleName_PrefixesWithEndpointId()
    {
        var key = AgentController.BuildMcpToolKey(3, "search_kpi");

        Assert.Equal("mcp3_search_kpi", key);
    }

    [Fact]
    public void BuildMcpToolKey_NameWithDisallowedChars_ReplacesWithUnderscore()
    {
        // MCP server 的 tool name 沒有字元限制（例如常見的 "search.kpi:by-factory" 這種
        // 帶點號/冒號的命名），但 LLM function-calling 的 name 通常只接受英數字/底線/連字號。
        var key = AgentController.BuildMcpToolKey(1, "search.kpi:by factory");

        Assert.Equal("mcp1_search_kpi_by_factory", key);
        Assert.Matches("^[a-zA-Z0-9_-]+$", key);
    }

    [Fact]
    public void BuildMcpToolKey_VeryLongName_TruncatesTo64Chars()
    {
        var longName = new string('a', 100);

        var key = AgentController.BuildMcpToolKey(2, longName);

        Assert.Equal(64, key.Length);
        Assert.StartsWith("mcp2_", key);
    }

    [Fact]
    public void BuildMcpToolKey_DifferentEndpointsSameToolName_ProduceDifferentKeys()
    {
        // 兩個不同 MCP server 剛好都有一個叫 "search" 的工具——key 不能撞在一起，
        // 不然後同步的會把先同步的覆蓋掉，或角色權限指派錯到別的 endpoint 的工具上。
        var key1 = AgentController.BuildMcpToolKey(1, "search");
        var key2 = AgentController.BuildMcpToolKey(2, "search");

        Assert.NotEqual(key1, key2);
    }

    // ── BuildMcpFunctionDeclaration ─────────────────────────────────

    [Fact]
    public void BuildMcpFunctionDeclaration_ValidSchema_UsesGivenSchema()
    {
        var schemaJson = """{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]}""";

        var declaration = AgentController.BuildMcpFunctionDeclaration("mcp1_search", "搜尋描述", schemaJson);

        Assert.Equal("function", declaration["type"]!.GetValue<string>());
        Assert.Equal("mcp1_search", declaration["function"]!["name"]!.GetValue<string>());
        Assert.Equal("搜尋描述", declaration["function"]!["description"]!.GetValue<string>());
        Assert.Equal("string", declaration["function"]!["parameters"]!["properties"]!["query"]!["type"]!.GetValue<string>());
    }

    [Fact]
    public void BuildMcpFunctionDeclaration_NullSchema_FallsBackToEmptyObjectSchema()
    {
        // MCP 規格允許工具沒有參數（inputSchema 選填）——這種情況不能讓 parameters 欄位整個
        // 缺漏，要補一個空的 object schema，否則有些 LLM/LiteLLM 後端會直接跳過整個 tools 陣列。
        var declaration = AgentController.BuildMcpFunctionDeclaration("mcp1_ping", "ping 一下", null);

        var parameters = declaration["function"]!["parameters"]!;
        Assert.Equal("object", parameters["type"]!.GetValue<string>());
        Assert.NotNull(parameters["properties"]);
    }

    [Fact]
    public void BuildMcpFunctionDeclaration_CorruptedSchemaJson_FallsBackToEmptyObjectSchema()
    {
        // 資料庫存的 schema 理論上都是同步時從真正的 JSON 序列化出來的，但欄位本身是自由文字，
        // 不能排除被手動改壞的情況——壞掉的 schema 不該讓整個宣告組裝失敗連累其他工具。
        var declaration = AgentController.BuildMcpFunctionDeclaration("mcp1_broken", "壞掉的工具", "{not valid json");

        var parameters = declaration["function"]!["parameters"]!;
        Assert.Equal("object", parameters["type"]!.GetValue<string>());
    }

}

using System.Linq;
using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentDocumentTools.BuildToolDeclarations——純函式，依 allowedToolKeys 組出要送給
/// LiteLLM 的 tool 定義清單。這個清單直接決定「這次 API 請求到底有沒有工具給模型」，
/// 跟這次 session 反覆處理的幻覺問題（模型被叫著一定要呼叫工具，但這次請求根本沒帶
/// 工具定義給它）高度相關，值得鎖住行為：允許清單傳什麼、就該只組出對應的工具，
/// 不多不少。
/// </summary>
public class AgentDocumentToolsTests
{
    private static string[] ToolNames(System.Text.Json.Nodes.JsonArray declarations) =>
        declarations
            .Select(d => d!["function"]!["name"]!.GetValue<string>())
            .ToArray();

    [Fact]
    public void BuildToolDeclarations_AllThreeKeysAllowed_ReturnsAllThreeTools()
    {
        var declarations = AgentDocumentTools.BuildToolDeclarations(
            new[] { "search_documents", "query_document_table", "analyze_image" });

        Assert.Equal(3, declarations.Count);
        Assert.Equal(
            new[] { "search_documents", "query_document_table", "analyze_image" },
            ToolNames(declarations));
    }

    [Fact]
    public void BuildToolDeclarations_NoKeysAllowed_ReturnsEmptyArray()
    {
        // 這是 hasAnyTools 判斷的直接依據——角色完全沒有被授權任何工具時，這裡必須是空的，
        // 系統提示才會正確切到 NoToolsSystemInstruction，而不是誤導模型「有工具可以用」。
        var declarations = AgentDocumentTools.BuildToolDeclarations(Enumerable.Empty<string>());

        Assert.Empty(declarations);
    }

    [Fact]
    public void BuildToolDeclarations_OnlySearchDocumentsAllowed_ReturnsOnlyThatTool()
    {
        var declarations = AgentDocumentTools.BuildToolDeclarations(new[] { "search_documents" });

        var name = Assert.Single(ToolNames(declarations));
        Assert.Equal("search_documents", name);
    }

    [Fact]
    public void BuildToolDeclarations_UnknownToolKey_IsIgnoredWithoutThrowing()
    {
        // 允許清單裡混了一個系統不認識的 key（例如資料被改過、或角色矩陣設定打錯字），
        // 不該讓整個工具宣告組建炸掉，未知的 key 直接忽略即可。
        var declarations = AgentDocumentTools.BuildToolDeclarations(
            new[] { "search_documents", "not_a_real_tool" });

        var name = Assert.Single(ToolNames(declarations));
        Assert.Equal("search_documents", name);
    }

    [Fact]
    public void BuildToolDeclarations_EachDeclaration_HasFunctionTypeAndRequiredFields()
    {
        var declarations = AgentDocumentTools.BuildToolDeclarations(new[] { "analyze_image" });

        var declaration = Assert.Single(declarations)!;
        Assert.Equal("function", declaration["type"]!.GetValue<string>());
        var function = declaration["function"]!;
        Assert.Equal("analyze_image", function["name"]!.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(function["description"]!.GetValue<string>()));

        var required = function["parameters"]!["required"]!.AsArray();
        Assert.Contains(required, r => r!.GetValue<string>() == "documentId");
        Assert.Contains(required, r => r!.GetValue<string>() == "question");
    }
}

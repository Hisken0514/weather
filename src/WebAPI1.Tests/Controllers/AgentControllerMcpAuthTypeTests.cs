using WebAPI1.Controllers;
using WebAPI1.Entities;
using Xunit;

namespace WebAPI1.Tests.Controllers;

/// <summary>
/// 測 AgentController.ParseMcpAuthType——MCP endpoint 新增的 OAuth 驗證方式選擇，前端傳的是
/// 字串（"None"/"ApiKey"/"OAuth"），解析錯了會讓 endpoint 悄悄退回 None（沒有任何驗證），
/// 這是最容易踩雷、也最值得鎖住的地方：串接需要驗證的外部 MCP server（例如台灣法律 MCP
/// server）時，如果解析失敗又沒發現，會誤以為連線失敗，實際上是完全沒帶驗證資訊被對方拒絕。
/// </summary>
public class AgentControllerMcpAuthTypeTests
{
    [Theory]
    [InlineData("None", McpAuthType.None)]
    [InlineData("ApiKey", McpAuthType.ApiKey)]
    [InlineData("OAuth", McpAuthType.OAuth)]
    [InlineData("apikey", McpAuthType.ApiKey)] // 忽略大小寫，前端/API 呼叫端不用擔心大小寫寫錯
    [InlineData("oauth", McpAuthType.OAuth)]
    public void ParseMcpAuthType_ValidValue_ParsesCorrectly(string input, McpAuthType expected)
    {
        Assert.Equal(expected, AgentController.ParseMcpAuthType(input));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("NotARealAuthType")]
    public void ParseMcpAuthType_InvalidOrMissingValue_FallsBackToNone(string? input)
    {
        Assert.Equal(McpAuthType.None, AgentController.ParseMcpAuthType(input));
    }
}

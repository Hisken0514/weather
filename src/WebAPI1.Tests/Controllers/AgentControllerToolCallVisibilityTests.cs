using System.Security.Claims;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using StackExchange.Redis;
using WebAPI1.Context;
using WebAPI1.Controllers;
using WebAPI1.Entities;
using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Controllers;

/// <summary>
/// 測 AgentController 的 tool-call-visibility 這組端點——跟 GeminiControllerToolCallVisibilityTests
/// 是同一組產品邏輯（Get 預設 false、Put 在沒有列時要能 Upsert），分開存在 AgentPromptSettings
/// 這張表，用來控制右下角懸浮視窗（走 /api/agent/chat/stream）要不要顯示工具呼叫明細。
/// 另外多測一項 Agent 版特有的行為：PUT 要記下操作者是誰（UpdatedByUserId/UpdatedByUserName），
/// 這段是從 ClaimsPrincipal 讀的，跟 Gemini 版靠注入的 ICurrentUserService 讀法不同。
/// </summary>
public class AgentControllerToolCallVisibilityTests
{
    private static ISHAuditDbcontext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ISHAuditDbcontext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ISHAuditDbcontext(options, new ConfigurationBuilder().Build());
    }

    private static AgentController CreateController(ISHAuditDbcontext db, Guid? userId = null)
    {
        var controller = new AgentController(
            db,
            new NoopHttpClientFactory(),
            new EphemeralDataProtectionProvider(),
            callerContextService: null!, // 這兩支端點不會用到呼叫者的 org/角色資訊
            documentTools: null!,
            ingestionService: null!,
            NullLogger<AgentController>.Instance,
            new ConfigurationBuilder().Build(),
            redis: null!,
            mcpOAuthCoordinator: null!, // 這兩支端點不會用到 MCP OAuth 連接流程
            scopeFactory: null!);

        var claims = new List<Claim> { new(ClaimTypes.Name, "測試管理員") };
        if (userId is { } id)
        {
            claims.Add(new Claim("sub", id.ToString()));
        }
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test")) }
        };
        return controller;
    }

    [Fact]
    public async Task GetToolCallVisibility_NoSettingRow_DefaultsToFalse()
    {
        await using var db = CreateDb();
        var controller = CreateController(db);

        var result = Assert.IsType<OkObjectResult>(await controller.GetToolCallVisibility());

        Assert.False(GetBoolProperty(result.Value!, "showToolCallDetailsToUsers"));
    }

    [Fact]
    public async Task UpdateToolCallVisibility_NoExistingRow_CreatesRowAndPersistsValue()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();
        var controller = CreateController(db, userId);

        var updateResult = Assert.IsType<OkObjectResult>(
            await controller.UpdateToolCallVisibility(new AgentController.UpdateToolCallVisibilityRequest { ShowToolCallDetailsToUsers = true }));
        Assert.True(GetBoolProperty(updateResult.Value!, "showToolCallDetailsToUsers"));

        var setting = await db.AgentPromptSettings.AsNoTracking().SingleAsync();
        Assert.True(setting.ShowToolCallDetailsToUsers);
        Assert.Equal(userId, setting.UpdatedByUserId);
        Assert.Equal("測試管理員", setting.UpdatedByUserName);
        // Upsert 不能把既有/預設的 system prompt 欄位清空——這支端點只該動這個開關本身。
        Assert.False(string.IsNullOrWhiteSpace(setting.SystemInstruction));
    }

    [Fact]
    public async Task UpdateToolCallVisibility_ExistingRow_DoesNotOverwriteSystemInstruction()
    {
        await using var db = CreateDb();
        db.AgentPromptSettings.Add(new AgentPromptSetting { SystemInstruction = "既有的 system prompt", ShowToolCallDetailsToUsers = true });
        await db.SaveChangesAsync();
        var controller = CreateController(db, Guid.NewGuid());

        await controller.UpdateToolCallVisibility(new AgentController.UpdateToolCallVisibilityRequest { ShowToolCallDetailsToUsers = false });

        var setting = await db.AgentPromptSettings.AsNoTracking().SingleAsync();
        Assert.False(setting.ShowToolCallDetailsToUsers);
        Assert.Equal("既有的 system prompt", setting.SystemInstruction);
    }

    [Fact]
    public async Task GetToolCallVisibility_AfterUpdate_ReflectsPersistedValue()
    {
        await using var db = CreateDb();
        var controller = CreateController(db, Guid.NewGuid());

        await controller.UpdateToolCallVisibility(new AgentController.UpdateToolCallVisibilityRequest { ShowToolCallDetailsToUsers = true });
        var getResult = Assert.IsType<OkObjectResult>(await controller.GetToolCallVisibility());

        Assert.True(GetBoolProperty(getResult.Value!, "showToolCallDetailsToUsers"));
    }

    private static bool GetBoolProperty(object value, string name) =>
        (bool)value.GetType().GetProperty(name)!.GetValue(value)!;

    private sealed class NoopHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }
}

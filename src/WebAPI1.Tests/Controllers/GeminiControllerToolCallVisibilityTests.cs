using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using WebAPI1.Context;
using WebAPI1.Controllers;
using WebAPI1.Entities;
using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Controllers;

/// <summary>
/// 測 GeminiController 的 tool-call-visibility 這組端點——一般使用者的懸浮視窗（走
/// /api/Gemini/stream）要不要顯示「第 X 次呼叫工具」明細，就是靠這個開關決定。這裡鎖住
/// 兩個最容易出錯的地方：(1) 資料庫還沒存過設定列時，GET 要回預設值 false，不能丟例外或
/// 回 null 讓前端誤判；(2) PUT 在沒有既有列時要能正確補一列出來（Upsert），不能因為
/// GeminiSettings 是空表就存檔失敗。
/// </summary>
public class GeminiControllerToolCallVisibilityTests
{
    private static ISHAuditDbcontext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ISHAuditDbcontext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new ISHAuditDbcontext(options, new ConfigurationBuilder().Build());
    }

    private static GeminiController CreateController(ISHAuditDbcontext db) =>
        new(new NoopHttpClientFactory(), new ConfigurationBuilder().Build(),
            NullLogger<GeminiController>.Instance, db, new FakeCurrentUserService());

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
        var controller = CreateController(db);

        var updateResult = Assert.IsType<OkObjectResult>(
            await controller.UpdateToolCallVisibility(new GeminiController.UpdateToolCallVisibilityRequest { ShowToolCallDetailsToUsers = true }));
        Assert.True(GetBoolProperty(updateResult.Value!, "showToolCallDetailsToUsers"));

        var setting = await db.GeminiSettings.AsNoTracking().SingleAsync();
        Assert.True(setting.ShowToolCallDetailsToUsers);
        // Upsert 不能把既有/預設的 system prompt 欄位清空——這支端點只該動這個開關本身。
        Assert.False(string.IsNullOrWhiteSpace(setting.SystemInstruction));
    }

    [Fact]
    public async Task UpdateToolCallVisibility_ExistingRow_DoesNotOverwriteSystemInstruction()
    {
        await using var db = CreateDb();
        db.GeminiSettings.Add(new GeminiSetting { SystemInstruction = "既有的 system prompt", ShowToolCallDetailsToUsers = true });
        await db.SaveChangesAsync();
        var controller = CreateController(db);

        await controller.UpdateToolCallVisibility(new GeminiController.UpdateToolCallVisibilityRequest { ShowToolCallDetailsToUsers = false });

        var setting = await db.GeminiSettings.AsNoTracking().SingleAsync();
        Assert.False(setting.ShowToolCallDetailsToUsers);
        Assert.Equal("既有的 system prompt", setting.SystemInstruction);
    }

    [Fact]
    public async Task GetToolCallVisibility_AfterUpdate_ReflectsPersistedValue()
    {
        await using var db = CreateDb();
        var controller = CreateController(db);

        await controller.UpdateToolCallVisibility(new GeminiController.UpdateToolCallVisibilityRequest { ShowToolCallDetailsToUsers = true });
        var getResult = Assert.IsType<OkObjectResult>(await controller.GetToolCallVisibility());

        Assert.True(GetBoolProperty(getResult.Value!, "showToolCallDetailsToUsers"));
    }

    private static bool GetBoolProperty(object value, string name) =>
        (bool)value.GetType().GetProperty(name)!.GetValue(value)!;

    private sealed class FakeCurrentUserService : ICurrentUserService
    {
        public string? UserId => "test-user";
        public string? UserName => "測試管理員";
        public string? ClientIp => "127.0.0.1";
        public string? RequestPath => "/Gemini/tool-call-visibility";
    }

    private sealed class NoopHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new();
    }
}

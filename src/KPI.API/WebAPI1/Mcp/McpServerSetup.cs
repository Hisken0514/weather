using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Mcp;

/// <summary>
/// 對外 MCP 端點（/mcp）——掛官方 C# SDK 的 Streamable HTTP server，跟 AgentController 用來
/// 連出去的 outbound MCP client 是同一個套件系列（ModelContextProtocol.Core/.AspNetCore）。
/// 認證交給 Program.cs 註冊的 "Mcp" JwtBearer scheme（見 McpOAuthConstants）。
///
/// tools/list 只回傳工具目錄裡「啟用」且「外部存取」都打開的 in-process 文件工具（見
/// AgentTool.ExternalAccessEnabled，管理員在 AI 助理設定頁的工具目錄勾選）——目前只有
/// search_documents/query_document_table/analyze_image 這三個既有工具能被外部呼叫，
/// 執行邏輯直接重用 AgentDocumentTools，跟內部聊天用的是同一份程式碼，不重寫一份。
/// </summary>
public static class McpServerSetup
{
    public static IServiceCollection AddIshaMcpServer(this IServiceCollection services)
    {
        services.AddMcpServer(options =>
            {
                options.ServerInfo = new Implementation { Name = "ISHA-KPI", Version = "1.0.0" };
            })
            .WithHttpTransport(httpOptions =>
            {
                // 每次 tools/call 都會重新查一次 DB 權限，不需要在 session 之間保留額外狀態。
                httpOptions.Stateless = true;
            })
            .WithListToolsHandler(async (ctx, ct) =>
            {
                var userId = ResolveUserId(ctx);
                if (userId is null)
                {
                    return new ListToolsResult { Tools = new List<Tool>() };
                }

                var db = ctx.Services!.GetRequiredService<ISHAuditDbcontext>();
                var externallyAccessibleKeys = await db.AgentTools.AsNoTracking()
                    .Where(t => t.IsEnabled && t.ExternalAccessEnabled && t.Source == AgentToolSource.InProcess)
                    .Select(t => t.ToolKey)
                    .ToListAsync(ct);

                var declarations = AgentDocumentTools.BuildToolDeclarations(externallyAccessibleKeys);
                return new ListToolsResult
                {
                    Tools = declarations.Select(ToMcpTool).Where(t => t is not null).Select(t => t!).ToList(),
                };
            })
            .WithCallToolHandler(async (ctx, ct) =>
            {
                var userId = ResolveUserId(ctx);
                if (userId is null)
                {
                    return ErrorResult("找不到使用者身分");
                }

                var toolName = ctx.Params?.Name ?? string.Empty;

                var db = ctx.Services!.GetRequiredService<ISHAuditDbcontext>();
                var isAllowed = await db.AgentTools.AsNoTracking()
                    .AnyAsync(t => t.ToolKey == toolName && t.IsEnabled && t.ExternalAccessEnabled
                        && t.Source == AgentToolSource.InProcess, ct);
                if (!isAllowed)
                {
                    return ErrorResult($"工具「{toolName}」不存在，或這個使用者沒有權限透過 MCP 呼叫它");
                }

                var caller = await ctx.Services!.GetRequiredService<IAgentCallerContextService>()
                    .GetAsync(new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId) })));
                if (caller is null)
                {
                    return ErrorResult("找不到使用者身分");
                }

                var accessibleOrgIds = await ctx.Services!.GetRequiredService<IAgentCallerContextService>()
                    .GetAccessibleOrganizationIdsAsync(caller);

                var argsJson = JsonSerializer.Serialize(ctx.Params?.Arguments ?? new Dictionary<string, JsonElement>());
                var argsObject = JsonNode.Parse(argsJson) as JsonObject ?? new JsonObject();

                var tools = ctx.Services!.GetRequiredService<AgentDocumentTools>();
                var llm = await BuildLlmClientAsync(ctx.Services!, ct);
                if (llm is null)
                {
                    return ErrorResult("LiteLLM 連線設定尚未完成，請聯絡管理員設定 API Key");
                }

                var resultText = await tools.ExecuteAsync(toolName, argsObject, accessibleOrgIds, llm, ct);
                return new CallToolResult { Content = [new TextContentBlock { Text = resultText }] };
            });

        return services;
    }

    public static IEndpointRouteBuilder MapIshaMcpServer(this IEndpointRouteBuilder app)
    {
        app.MapMcp("/mcp")
            .RequireAuthorization(Common.McpOAuthConstants.AuthorizationPolicy)
            .RequireCors("McpPublic");
        return app;
    }

    private static string? ResolveUserId(MessageContext ctx) =>
        ctx.User?.FindFirst("sub")?.Value ?? ctx.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    private static CallToolResult ErrorResult(string message) =>
        new() { IsError = true, Content = [new TextContentBlock { Text = message }] };

    /// <summary>把 AgentDocumentTools.BuildToolDeclarations 用的 Gemini function-calling 格式
    /// （{type:"function", function:{name,description,parameters}}）轉成 MCP 的 Tool（name/
    /// description/inputSchema 直接扁平放，inputSchema 就是原始 JSON Schema）。</summary>
    private static Tool? ToMcpTool(JsonNode? declaration)
    {
        var function = declaration?["function"];
        var name = function?["name"]?.GetValue<string>();
        if (function is null || name is null)
        {
            return null;
        }

        var parametersJson = function["parameters"]?.ToJsonString() ?? "{\"type\":\"object\",\"properties\":{}}";
        return new Tool
        {
            Name = name,
            Description = function["description"]?.GetValue<string>() ?? string.Empty,
            InputSchema = JsonSerializer.Deserialize<JsonElement>(parametersJson),
        };
    }

    private static async Task<AgentLiteLlmClient?> BuildLlmClientAsync(IServiceProvider services, CancellationToken ct)
    {
        var db = services.GetRequiredService<ISHAuditDbcontext>();
        var setting = await db.AgentLiteLlmSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        if (setting is null || string.IsNullOrEmpty(setting.ApiKeyEncrypted) || string.IsNullOrWhiteSpace(setting.BaseUrl))
        {
            return null;
        }

        string apiKey;
        try
        {
            var protector = services.GetRequiredService<IDataProtectionProvider>()
                .CreateProtector("WebAPI1.AgentLiteLlmSetting.ApiKey");
            apiKey = protector.Unprotect(setting.ApiKeyEncrypted);
        }
        catch
        {
            return null;
        }

        var httpClient = services.GetRequiredService<IHttpClientFactory>().CreateClient();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("McpServerSetup");
        return new AgentLiteLlmClient(httpClient, apiKey, setting.BaseUrl, setting.Model,
            setting.EmbeddingModel, setting.MaxOutputTokens, logger, setting.Tier1Model);
    }
}

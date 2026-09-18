using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ModelContextProtocol.Authentication;
using ModelContextProtocol.Client;
using NPOI.XSSF.UserModel;
using NPOI.XWPF.UserModel;
using StackExchange.Redis;
using UglyToad.PdfPig;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

/// <summary>
/// AI Agent（文件 RAG + 角色×工具權限）。刻意跟 GeminiController 完全分開、獨立一支
/// controller，不共用程式碼、不互相牽動；兩者可以並存，前端要不要切過去是後話。
/// LiteLLM API Key 由管理員在畫面上填（PUT agent/settings/litellm），加密存 DB，
/// 不是寫死在 appsettings.json。
/// </summary>
[ApiController]
[Route("agent")]
[Authorize]
public class AgentController : ControllerBase
{
    private readonly ISHAuditDbcontext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDataProtector _protector;
    private readonly IDataProtector _mcpProtector;
    private readonly IAgentCallerContextService _callerContextService;
    private readonly AgentDocumentTools _documentTools;
    private readonly AgentDocumentIngestionService _ingestionService;
    private readonly ILogger<AgentController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IConnectionMultiplexer _redis;
    private readonly IMcpOAuthFlowCoordinator _mcpOAuthCoordinator;
    private readonly IServiceScopeFactory _scopeFactory;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    // 續傳狀態（見 ChatStream 裡的「石化平台式」重構說明）走 Redis，key 用 conversationId
    // 綁定，10 分鐘沒接續就自然過期——用不到額外的清理機制，使用者放著不管也不會留垃圾。
    private static string PendingLoopStateKey(Guid conversationId) => $"agent:pending-loop:{conversationId}";
    private static readonly TimeSpan PendingLoopStateTtl = TimeSpan.FromMinutes(10);

    public AgentController(
        ISHAuditDbcontext db,
        IHttpClientFactory httpClientFactory,
        IDataProtectionProvider dataProtectionProvider,
        IAgentCallerContextService callerContextService,
        AgentDocumentTools documentTools,
        AgentDocumentIngestionService ingestionService,
        ILogger<AgentController> logger,
        IConfiguration configuration,
        IConnectionMultiplexer redis,
        IMcpOAuthFlowCoordinator mcpOAuthCoordinator,
        IServiceScopeFactory scopeFactory)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _protector = dataProtectionProvider.CreateProtector("WebAPI1.AgentLiteLlmSetting.ApiKey");
        _mcpProtector = dataProtectionProvider.CreateProtector("WebAPI1.AgentMcpEndpoint.ApiKey");
        _callerContextService = callerContextService;
        _documentTools = documentTools;
        _ingestionService = ingestionService;
        _logger = logger;
        _configuration = configuration;
        _redis = redis;
        _mcpOAuthCoordinator = mcpOAuthCoordinator;
        _scopeFactory = scopeFactory;
    }

    // ── LiteLLM 連線設定 ─────────────────────────────────────────

    [HttpGet("settings/litellm")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetLiteLlmSettings()
    {
        var setting = await _db.AgentLiteLlmSettings.AsNoTracking().FirstOrDefaultAsync();
        return Ok(new
        {
            baseUrl = setting?.BaseUrl ?? "",
            model = setting?.Model ?? "claude-sonnet-4-6",
            tier1Model = setting?.Tier1Model ?? "",
            embeddingModel = setting?.EmbeddingModel ?? "text-embedding-3-large",
            maxOutputTokens = setting?.MaxOutputTokens ?? 4096,
            maxToolCalls = setting?.MaxToolCalls ?? 12,
            streamRequestBudgetSeconds = setting?.StreamRequestBudgetSeconds ?? 15,
            hasApiKey = !string.IsNullOrEmpty(setting?.ApiKeyEncrypted),
            updatedAt = setting?.UpdatedAt,
            updatedByUserName = setting?.UpdatedByUserName
        });
    }

    public class UpdateLiteLlmSettingsRequest
    {
        public string BaseUrl { get; set; } = string.Empty;
        public string Model { get; set; } = string.Empty;

        /// <summary>留空代表不分流，全部走 Model（Tier 2）——向下相容既有行為。</summary>
        public string? Tier1Model { get; set; }
        public string EmbeddingModel { get; set; } = string.Empty;
        public int MaxOutputTokens { get; set; } = 4096;
        public int MaxToolCalls { get; set; } = 12;
        public double StreamRequestBudgetSeconds { get; set; } = 15;

        /// <summary>不填/空白代表不變更既有 Key（畫面上永遠不會顯示明文，也就無法回填）。</summary>
        public string? ApiKey { get; set; }
    }

    [HttpPut("settings/litellm")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> UpdateLiteLlmSettings([FromBody] UpdateLiteLlmSettingsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.BaseUrl) || string.IsNullOrWhiteSpace(request.Model))
        {
            return BadRequest(new { error = "BaseUrl / Model 不能是空白" });
        }

        if (!Uri.TryCreate(request.BaseUrl, UriKind.Absolute, out var parsedBaseUrl)
            || (parsedBaseUrl.Scheme != Uri.UriSchemeHttp && parsedBaseUrl.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new { error = "BaseUrl 必須是完整的網址，例如 https://llm.isafe.org.tw/（不是信箱或其他格式）" });
        }

        var setting = await _db.AgentLiteLlmSettings.FirstOrDefaultAsync();
        if (setting is null)
        {
            setting = new AgentLiteLlmSetting();
            _db.AgentLiteLlmSettings.Add(setting);
        }

        setting.BaseUrl = request.BaseUrl;
        setting.Model = request.Model;
        setting.Tier1Model = string.IsNullOrWhiteSpace(request.Tier1Model) ? null : request.Tier1Model;
        setting.EmbeddingModel = request.EmbeddingModel;
        setting.MaxOutputTokens = request.MaxOutputTokens;
        setting.MaxToolCalls = request.MaxToolCalls;
        setting.StreamRequestBudgetSeconds = request.StreamRequestBudgetSeconds;
        if (!string.IsNullOrWhiteSpace(request.ApiKey))
        {
            setting.ApiKeyEncrypted = _protector.Protect(request.ApiKey);
        }
        setting.UpdatedAt = tool.GetTaiwanNow();
        setting.UpdatedByUserId = GetUserId();
        setting.UpdatedByUserName = User.FindFirst(ClaimTypes.Name)?.Value;

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpGet("models")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetAvailableModels()
    {
        var (llm, _) = await BuildLlmClientAsync();
        if (llm is null)
        {
            return BadRequest(new { error = "請先儲存 Base URL / API Key 再讀取 model 清單" });
        }

        try
        {
            var models = await llm.GetAvailableModelsAsync(HttpContext.RequestAborted);
            return Ok(models);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "讀取 LiteLLM model 清單失敗");
            return BadRequest(new { error = ex.Message });
        }
    }

    // ── 工具目錄 / 角色指派 ──────────────────────────────────────

    [HttpGet("roles")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _db.Roles.AsNoTracking().Select(r => new { r.Id, r.Name }).ToListAsync();
        return Ok(roles);
    }

    [HttpGet("tools")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetTools()
    {
        var endpointNames = await _db.AgentMcpEndpoints.AsNoTracking()
            .ToDictionaryAsync(e => e.Id, e => e.Name);

        var rawTools = await _db.AgentTools.AsNoTracking()
            .Include(t => t.AgentToolRoles)
            .Select(t => new
            {
                t.Id,
                t.ToolKey,
                t.Description,
                Source = t.Source.ToString(),
                RiskTier = t.RiskTier.ToString(),
                t.IsEnabled,
                t.McpEndpointId,
                RoleIds = t.AgentToolRoles.Select(tr => tr.RoleId).ToList()
            })
            .ToListAsync();

        // McpEndpointName 前端拿來把 MCP 工具依 endpoint 分組成手風琴收合區塊用，跟 in-process
        // 工具分開顯示，避免管理員在一大張表裡誤點到不相干的列（曾經發生過誤把 in-process 工具關掉）。
        // 這段查完 SQL 才在記憶體裡對照 dictionary，避免 EF 把 dictionary 查找硬塞進 SQL 翻譯失敗。
        var tools = rawTools.Select(t => new
        {
            t.Id,
            t.ToolKey,
            t.Description,
            t.Source,
            t.RiskTier,
            t.IsEnabled,
            t.McpEndpointId,
            McpEndpointName = t.McpEndpointId is int epId ? endpointNames.GetValueOrDefault(epId) : null,
            t.RoleIds
        });
        return Ok(tools);
    }

    public class UpdateToolRequest
    {
        public bool IsEnabled { get; set; }
        public List<int> RoleIds { get; set; } = new();
    }

    [HttpPut("tools/{toolId:int}")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> UpdateTool(int toolId, [FromBody] UpdateToolRequest request)
    {
        var tool = await _db.AgentTools.Include(t => t.AgentToolRoles).FirstOrDefaultAsync(t => t.Id == toolId);
        if (tool is null)
        {
            return NotFound();
        }

        tool.IsEnabled = request.IsEnabled;
        _db.AgentToolRoles.RemoveRange(tool.AgentToolRoles);
        foreach (var roleId in request.RoleIds.Distinct())
        {
            _db.AgentToolRoles.Add(new AgentToolRole { ToolId = toolId, RoleId = roleId });
        }

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    // ── MCP Endpoint 管理／同步工具目錄 ──────────────────────────
    //
    // 這裡改用官方 ModelContextProtocol SDK（McpClient/HttpClientTransport）連線 MCP server，
    // 取代原本手刻的 JSON-RPC over HTTP——OAuth 2.1（metadata 探索 + Dynamic Client
    // Registration + PKCE + token 自動 refresh）不是能手刻重寫的東西，SDK 內建處理。None/
    // ApiKey 這兩種既有的驗證方式也一併走 SDK，三種方式共用同一條連線邏輯（見
    // BuildMcpTransportOptions），不用維護兩套。跟 ISHAAudit（石化）同一套架構。

    // MCP OAuth 連接流程的 callback 完整網址——要登記成外部授權伺服器的 redirect_uri。
    // AppUrl 沒設定時退回 http://localhost:5013，只是方便本機開發測試，正式環境要設定 AppUrl。
    private const string McpOAuthCallbackPath = "/agent/mcp-oauth/callback";

    // 使用者真的要走完瀏覽器登入/同意畫面才會回呼，給合理的等待時間，逾時就讓
    // BeginMcpOAuthConnectAsync 回應失敗，不要無限期卡住這個 request。
    private static readonly TimeSpan McpOAuthAuthorizationUriTimeout = TimeSpan.FromSeconds(20);

    [HttpGet("mcp-endpoints")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetMcpEndpoints()
    {
        // 屬性名稱刻意用 Oauth（只有開頭一個大寫），不是 OAuth（兩個連續大寫）——踩過的坑：
        // .NET 預設的 camelCase JSON 命名規則遇到「連續兩個大寫字母開頭、後面接小寫」時，
        // 不會把整串前導大寫都轉小寫，只會轉到「下一個字母是小寫」之前那一個，所以
        // OAuthConnected 序列化出來的 JSON key 其實是 oAuthConnected（中間的 A 沒被轉成
        // 小寫），跟前端 McpEndpoint 介面裡全小寫的 oauthConnected 對不上，前端讀到的永遠是
        // undefined——不管資料庫裡 token 是不是真的有值，畫面都會顯示「尚未連接」，這正是
        // 「明明已經連上卻顯示沒連」那個 bug 的真正原因。改成 Oauth 開頭，camelCase 轉換
        // 出來就會正確變成 oauthConnected，跟前端對得上。
        var endpoints = await _db.AgentMcpEndpoints.AsNoTracking()
            .Select(e => new
            {
                e.Id,
                e.Name,
                e.Url,
                AuthType = e.AuthType.ToString(),
                e.IsEnabled,
                HasApiKey = !string.IsNullOrEmpty(e.ApiKeyEncrypted),
                OauthConnected = !string.IsNullOrEmpty(e.OAuthAccessTokenEncrypted),
                OauthConnectedAt = e.OAuthConnectedAt,
                OauthAccessTokenExpiresAt = e.OAuthAccessTokenExpiresAt,
                e.CreatedAt,
                ToolCount = _db.AgentTools.Count(t => t.McpEndpointId == e.Id)
            })
            .ToListAsync();
        return Ok(endpoints);
    }

    public class UpsertMcpEndpointRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;

        /// <summary>"None"（預設）/ "ApiKey" / "OAuth"。</summary>
        public string AuthType { get; set; } = "None";

        /// <summary>不填/空白代表新增時不設 Key、編輯時不變更既有 Key（畫面上不會回填明文）。只有 AuthType=ApiKey 時有意義。</summary>
        public string? ApiKey { get; set; }

        public bool IsEnabled { get; set; } = true;
    }

    internal static McpAuthType ParseMcpAuthType(string? value) =>
        Enum.TryParse<McpAuthType>(value, ignoreCase: true, out var parsed) ? parsed : McpAuthType.None;

    [HttpPost("mcp-endpoints")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> CreateMcpEndpoint([FromBody] UpsertMcpEndpointRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { error = "名稱／Endpoint 網址不能是空白" });
        }
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var parsedUrl)
            || (parsedUrl.Scheme != Uri.UriSchemeHttp && parsedUrl.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new { error = "Endpoint 網址必須是完整的 http(s) 網址" });
        }

        var authType = ParseMcpAuthType(request.AuthType);
        var endpoint = new AgentMcpEndpoint
        {
            Name = request.Name.Trim(),
            Url = request.Url.Trim(),
            AuthType = authType,
            IsEnabled = request.IsEnabled,
        };
        if (authType == McpAuthType.ApiKey && !string.IsNullOrWhiteSpace(request.ApiKey))
        {
            endpoint.ApiKeyEncrypted = _mcpProtector.Protect(request.ApiKey);
        }

        _db.AgentMcpEndpoints.Add(endpoint);
        await _db.SaveChangesAsync();
        return Ok(new { endpoint.Id });
    }

    [HttpPut("mcp-endpoints/{endpointId:int}")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> UpdateMcpEndpoint(int endpointId, [FromBody] UpsertMcpEndpointRequest request)
    {
        var endpoint = await _db.AgentMcpEndpoints.FirstOrDefaultAsync(e => e.Id == endpointId);
        if (endpoint is null)
        {
            return NotFound();
        }
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequest(new { error = "名稱／Endpoint 網址不能是空白" });
        }
        if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var parsedUrl)
            || (parsedUrl.Scheme != Uri.UriSchemeHttp && parsedUrl.Scheme != Uri.UriSchemeHttps))
        {
            return BadRequest(new { error = "Endpoint 網址必須是完整的 http(s) 網址" });
        }

        var authType = ParseMcpAuthType(request.AuthType);
        // 認證方式改掉的話，把不再適用的那組憑證清掉，避免殘留的 API key/OAuth token 之後
        // 誤用到別種認證方式上（例如從 OAuth 切回 None，結果舊 token 還留在 DB 裡）。
        if (endpoint.AuthType != authType)
        {
            endpoint.ApiKeyEncrypted = null;
            endpoint.OAuthClientId = null;
            endpoint.OAuthClientSecretEncrypted = null;
            endpoint.OAuthAccessTokenEncrypted = null;
            endpoint.OAuthRefreshTokenEncrypted = null;
            endpoint.OAuthTokenType = null;
            endpoint.OAuthScope = null;
            endpoint.OAuthAuthorizationServer = null;
            endpoint.OAuthAccessTokenExpiresAt = null;
            endpoint.OAuthConnectedAt = null;
        }

        endpoint.Name = request.Name.Trim();
        endpoint.Url = request.Url.Trim();
        endpoint.AuthType = authType;
        if (authType == McpAuthType.ApiKey && !string.IsNullOrWhiteSpace(request.ApiKey))
        {
            endpoint.ApiKeyEncrypted = _mcpProtector.Protect(request.ApiKey);
        }
        endpoint.IsEnabled = request.IsEnabled;

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>
    /// 開始一個 OAuth 認證的 MCP endpoint 連接流程。這個方法本身只等到「SDK 算出授權網址」就
    /// 回應（通常幾秒內，metadata 探索 + DCR 都是打對方伺服器的 HTTP request），不會等使用者
    /// 真的在瀏覽器完成授權——那一段是在背景另開的 scope 裡繼續跑，靠 IMcpOAuthFlowCoordinator
    /// 橋接，使用者授權完成、外部伺服器把瀏覽器導回 mcp-oauth/callback 之後才會真的結束。
    /// </summary>
    [HttpPost("mcp-endpoints/{endpointId:int}/oauth/connect")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> BeginMcpOAuthConnect(int endpointId, CancellationToken ct)
    {
        var endpoint = await _db.AgentMcpEndpoints.AsNoTracking().FirstOrDefaultAsync(e => e.Id == endpointId, ct);
        if (endpoint is null)
        {
            return NotFound();
        }
        if (endpoint.AuthType != McpAuthType.OAuth)
        {
            return BadRequest(new { error = "這個 endpoint 不是 OAuth 認證模式，請先把認證方式改成 OAuth 再連接" });
        }

        var (handler, waitForAuthorizationUri) = _mcpOAuthCoordinator.CreateFlow();

        // McpClient.CreateAsync 這一趟會一路等到使用者在瀏覽器完成授權才結束，不能卡在這個
        // request 裡——另外開一個 scope 在背景執行，讓它的 ITokenCache（AgentMcpTokenCache）
        // 用自己這個 scope 的 DbContext，不會因為這個 request 結束就跟著被釋放（IServiceScopeFactory
        // 開新 scope 正是官方文件建議的「從 scoped 服務啟動背景工作」標準做法）。
        //
        // 這裡把背景工作的 Task 留著（不再用 `_ =` 丟掉），跟 waitForAuthorizationUri 一起
        // race：如果 metadata 探索/DCR 在算出授權網址之前就直接丟例外，以前這裡完全看不到，
        // 前端只會在 20 秒後收到一個「逾時」的制式訊息，看不出真正原因（要嘛連不上、要嘛對方
        // 伺服器不支援 DCR、要嘛網址打錯），只能翻伺服器 log。現在讓背景工作先失敗的話直接把
        // 真正的例外訊息回給前端，不用再等滿 20 秒也不用去翻 log。
        var backgroundTask = Task.Run(async () =>
        {
            using var scope = _scopeFactory.CreateScope();
            var scopedDb = scope.ServiceProvider.GetRequiredService<ISHAuditDbcontext>();
            var scopedEndpoint = await scopedDb.AgentMcpEndpoints.FirstOrDefaultAsync(e => e.Id == endpointId);
            if (scopedEndpoint is null)
            {
                _logger.LogWarning("MCP OAuth 連接流程開始後，endpoint #{Id} 已經被刪除", endpointId);
                return;
            }

            var transportOptions = BuildMcpTransportOptions(scopedEndpoint, handler);
            var httpClient = _httpClientFactory.CreateClient();
            var transport = new HttpClientTransport(transportOptions, httpClient, ownsHttpClient: true);
            await using var mcpClient = await McpClient.CreateAsync(transport);
            _logger.LogInformation("MCP endpoint {Name}（#{Id}）OAuth 連接完成", scopedEndpoint.Name, endpointId);
        });

        var uriTask = waitForAuthorizationUri(McpOAuthAuthorizationUriTimeout);
        var completed = await Task.WhenAny(uriTask, backgroundTask);

        if (completed == backgroundTask)
        {
            if (backgroundTask.IsFaulted)
            {
                var ex = backgroundTask.Exception!.GetBaseException();
                _logger.LogError(ex, "MCP endpoint #{Id} OAuth 連接失敗", endpointId);
                return BadRequest(new { error = $"連線這個 MCP server 失敗：{ex.Message}" });
            }

            // 背景工作在算出授權網址之前就直接成功結束，有兩種可能，不能直接當成「已連接」：
            // 1. DB 裡還有沒過期的快取 token，SDK 用那組 token 就建立好連線了，真的不需要
            //    使用者重新走一次授權畫面。
            // 2. 這個 MCP server 的 initialize 交握本身根本不要求驗證（實測踩過的坑：
            //    「台灣法規」這類公開 server，建立連線這一步就算過了，SDK 完全沒有觸發 OAuth，
            //    自然也沒有任何 token 被存進 DB）——這種情況「連線建立成功」不等於「OAuth
            //    已授權」，同步工具目錄可能之後才會因為真的呼叫到受保護的方法而要求驗證。
            // 用連線完成後 DB 裡有沒有真的存到 token 來區分，不能只看「有沒有丟例外」。
            var reallyConnected = await _db.AgentMcpEndpoints.AsNoTracking()
                .Where(e => e.Id == endpointId)
                .Select(e => !string.IsNullOrEmpty(e.OAuthAccessTokenEncrypted))
                .FirstOrDefaultAsync();
            if (reallyConnected)
            {
                return Ok(new { authorizationUrl = (string?)null, alreadyConnected = true });
            }
            return Ok(new
            {
                authorizationUrl = (string?)null,
                alreadyConnected = false,
                noAuthorizationNeeded = true,
                message = "已經成功連線到這個 MCP server，但這次連線過程中它並未要求做 OAuth 授權（可能是初始化交握本身不需要驗證），所以沒有 token 需要儲存。如果之後同步工具目錄或執行工具時出現授權相關錯誤，再回來按一次「連接」。",
            });
        }

        try
        {
            var authorizationUri = await uriTask;
            return Ok(new { authorizationUrl = authorizationUri.ToString(), alreadyConnected = false });
        }
        catch (TimeoutException ex)
        {
            _logger.LogError(ex, "MCP endpoint #{Id} 取得 OAuth 授權網址逾時", endpointId);
            return BadRequest(new { error = "連線這個 MCP server 逾時，請確認 endpoint 網址是否正確、伺服器是否有支援 OAuth（metadata 探索/Dynamic Client Registration 失敗時常見這個逾時，詳見伺服器 log）" });
        }
    }

    /// <summary>
    /// 斷開一個已經連接的 OAuth endpoint——只清掉 access/refresh token 跟連接時間，不清
    /// OAuthClientId/ClientSecret/AuthorizationServer（那些是跟外部伺服器做過的 Dynamic
    /// Client Registration，不是使用者的授權；斷開後下次按「連接」只需要重新走一次授權
    /// 同意畫面，不用整個重新 DCR 註冊一個新 client）。斷開後這個 endpoint 底下同步進來的
    /// 工具在被呼叫時會直接失敗（BuildMcpTransportOptions 在沒有 interactiveAuthorizationHandler
    /// 時，缺 token 會丟例外要求管理員重新連接），不用另外去停用那些工具。
    /// </summary>
    [HttpPost("mcp-endpoints/{endpointId:int}/oauth/disconnect")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> DisconnectMcpOAuth(int endpointId)
    {
        var endpoint = await _db.AgentMcpEndpoints.FirstOrDefaultAsync(e => e.Id == endpointId);
        if (endpoint is null)
        {
            return NotFound();
        }
        if (endpoint.AuthType != McpAuthType.OAuth)
        {
            return BadRequest(new { error = "這個 endpoint 不是 OAuth 認證模式" });
        }

        endpoint.OAuthAccessTokenEncrypted = null;
        endpoint.OAuthRefreshTokenEncrypted = null;
        endpoint.OAuthTokenType = null;
        endpoint.OAuthScope = null;
        endpoint.OAuthAccessTokenExpiresAt = null;
        endpoint.OAuthConnectedAt = null;

        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>
    /// MCP OAuth 連接流程的 callback——外部授權伺服器在使用者完成授權後，把瀏覽器導回這裡
    /// （帶 code/state，或 error）。這是瀏覽器直接導向的路由，不是前端呼叫的 API，不會帶我們
    /// 自己的 JWT，所以是 AllowAnonymous；安全性靠 state 本身的高熵亂數（SDK 產生）加上
    /// IMcpOAuthFlowCoordinator 的一次性關聯（見該類別說明），不是靠登入身分。
    /// 回傳一個單純的靜態 HTML 頁面，不是 JSON——這裡收到的是瀏覽器導向，不是 API 呼叫。
    /// </summary>
    [HttpGet("mcp-oauth/callback")]
    [AllowAnonymous]
    public IActionResult McpOAuthCallback(
        [FromQuery] string? code,
        [FromQuery] string? state,
        [FromQuery] string? iss,
        [FromQuery] string? error,
        [FromQuery(Name = "error_description")] string? errorDescription)
    {
        var found = _mcpOAuthCoordinator.CompleteCallback(state, code, iss, error, errorDescription);
        var success = found && string.IsNullOrEmpty(error);
        var title = success ? "連接成功" : "連接失敗";
        var message = success
            ? "這個 MCP 連線已經完成授權，可以關閉此分頁，回到系統設定頁查看連線狀態。"
            : found
                ? $"授權伺服器回傳錯誤：{System.Net.WebUtility.HtmlEncode(error)}"
                : "找不到對應的連接流程，可能已經逾時或這個連結已經用過了。請回到系統設定頁重新點一次「連接」。";
        var html = $$"""
            <!DOCTYPE html>
            <html lang="zh-Hant">
            <head>
            <meta charset="utf-8" />
            <title>{{title}} - 績效指標資料庫</title>
            <style>
              body { font-family: -apple-system, "Noto Sans TC", "Microsoft JhengHei", sans-serif; background: #f4f4f5; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              .card { background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 32px 40px; max-width: 420px; text-align: center; }
              h1 { font-size: 20px; margin: 0 0 12px; color: {{(success ? "#0f766e" : "#b91c1c")}}; }
              p { color: #444; line-height: 1.6; margin: 0; }
            </style>
            </head>
            <body>
              <div class="card">
                <h1>{{title}}</h1>
                <p>{{message}}</p>
              </div>
            </body>
            </html>
            """;
        return Content(html, "text/html; charset=utf-8");
    }

    [HttpDelete("mcp-endpoints/{endpointId:int}")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> DeleteMcpEndpoint(int endpointId)
    {
        var endpoint = await _db.AgentMcpEndpoints.FirstOrDefaultAsync(e => e.Id == endpointId);
        if (endpoint is null)
        {
            return NotFound();
        }

        // 這個 endpoint 底下同步進來的工具（跟角色指派）一併清掉，不留孤兒資料——
        // 之後要重新接上另一個 endpoint 就是全新一批工具，不會混到舊的殘留列。
        var tools = await _db.AgentTools.Include(t => t.AgentToolRoles)
            .Where(t => t.McpEndpointId == endpointId).ToListAsync();
        foreach (var t in tools)
        {
            _db.AgentToolRoles.RemoveRange(t.AgentToolRoles);
        }
        _db.AgentTools.RemoveRange(tools);
        _db.AgentMcpEndpoints.Remove(endpoint);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>
    /// 呼叫 MCP server 標準的 tools/list JSON-RPC 方法，把回傳的工具清單同步進 AgentTool 目錄
    /// （Source=McpEndpoint），讓管理員可以在既有的「工具」表格裡對這些外部工具做
    /// 啟用/角色指派——跟 in-process 工具共用同一張表、同一套權限機制，畫面上不用分兩套邏輯。
    /// 新工具預設不啟用、不指派角色，管理員審核過風險再手動打開，外部工具沒有事先審查過
    /// 不能比照 in-process 工具直接預設開放。這份工具已經不在對方清單裡（改名/下架）的舊列
    /// 直接刪除，避免累積失效工具。
    /// </summary>
    [HttpPost("mcp-endpoints/{endpointId:int}/sync-tools")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> SyncMcpEndpointTools(int endpointId, CancellationToken ct)
    {
        var endpoint = await _db.AgentMcpEndpoints.FirstOrDefaultAsync(e => e.Id == endpointId, ct);
        if (endpoint is null)
        {
            return NotFound();
        }

        List<(string Name, string Description, string? InputSchemaJson)> remoteTools;
        try
        {
            remoteTools = await FetchMcpToolsListAsync(endpoint, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "同步 MCP endpoint {EndpointId} 工具目錄失敗", endpointId);
            return BadRequest(new { error = $"呼叫 MCP endpoint 失敗：{ex.Message}" });
        }

        var existing = await _db.AgentTools.Include(t => t.AgentToolRoles)
            .Where(t => t.McpEndpointId == endpointId).ToListAsync(ct);
        var existingByKey = existing.ToDictionary(t => t.ToolKey);

        var remoteKeys = new HashSet<string>();
        var added = 0;
        var updated = 0;
        foreach (var (name, description, inputSchemaJson) in remoteTools)
        {
            var key = BuildMcpToolKey(endpointId, name);
            var safeDescription = string.IsNullOrWhiteSpace(description) ? name : description;
            if (safeDescription.Length > 300)
            {
                safeDescription = safeDescription[..300]; // AgentTool.Description 是 MaxLength(300)
            }
            var safeMcpToolName = name.Length > 200 ? name[..200] : name; // AgentTool.McpToolName 是 MaxLength(200)
            remoteKeys.Add(key);
            if (existingByKey.TryGetValue(key, out var tool))
            {
                if (tool.Description != safeDescription || tool.ParametersSchema != inputSchemaJson)
                {
                    tool.Description = safeDescription;
                    tool.ParametersSchema = inputSchemaJson;
                    updated++;
                }
            }
            else
            {
                _db.AgentTools.Add(new AgentTool
                {
                    ToolKey = key,
                    Description = safeDescription,
                    Source = AgentToolSource.McpEndpoint,
                    McpEndpointId = endpointId,
                    McpToolName = safeMcpToolName,
                    ParametersSchema = inputSchemaJson,
                    RiskTier = AgentToolRiskTier.Medium, // 外部工具沒有事先審查，不比照 in-process 預設 Low
                    IsEnabled = false, // 同步進來先關閉，管理員審核過再手動開啟／指派角色
                });
                added++;
            }
        }

        var stale = existing.Where(t => !remoteKeys.Contains(t.ToolKey)).ToList();
        foreach (var t in stale)
        {
            _db.AgentToolRoles.RemoveRange(t.AgentToolRoles);
        }
        _db.AgentTools.RemoveRange(stale);

        await _db.SaveChangesAsync(ct);
        return Ok(new { added, updated, removed = stale.Count, total = remoteTools.Count });
    }

    /// <summary>
    /// 組 MCP transport 連線設定——同步（FetchMcpToolsListAsync）、執行（ExecuteMcpToolAsync）、
    /// OAuth 連接流程（BeginMcpOAuthConnect 的背景工作）共用。TransportMode 用 AutoDetect 不是
    /// 寫死 StreamableHttp：SDK 會先試 StreamableHttp，失敗才退回 legacy SSE（SDK 內建的
    /// fallback，不是這裡自己寫的）。
    ///
    /// interactiveAuthorizationHandler 留空（null）代表「這次呼叫不允許互動授權」——沒有快取
    /// token、或 token 過期又沒有 refresh token 可用時，直接丟例外讓這次同步/執行失敗，不要
    /// 卡住等一個不會出現的瀏覽器。只有 BeginMcpOAuthConnect 那個「使用者主動按下連接」的流程
    /// 才會帶真正的 handler。
    ///
    /// AgentMcpTokenCache 一律用 _scopeFactory 自己開短命 scope，不吃呼叫端目前的 DbContext——
    /// 早期版本直接共用呼叫端的 DbContext 實例，結果 SDK 內部驗證流程會並發呼叫
    /// ITokenCache.GetTokensAsync，兩個並行的非同步查詢共用同一個 EF Core DbContext 直接炸出
    /// 「A second operation was started on this context instance...」，改成每次都開全新短命
    /// 的 scope 之後，不管 SDK 內部怎麼並發呼叫都不會互相踩。
    /// </summary>
    private HttpClientTransportOptions BuildMcpTransportOptions(
        AgentMcpEndpoint endpoint,
        Func<AuthorizationCallbackContext, CancellationToken, Task<ModelContextProtocol.Authentication.AuthorizationResult?>>? interactiveAuthorizationHandler = null)
    {
        var options = new HttpClientTransportOptions
        {
            Endpoint = new Uri(endpoint.Url),
            Name = "KPI-Agent",
            TransportMode = HttpTransportMode.AutoDetect,
        };

        if (endpoint.AuthType == McpAuthType.ApiKey && !string.IsNullOrEmpty(endpoint.ApiKeyEncrypted))
        {
            var apiKey = _mcpProtector.Unprotect(endpoint.ApiKeyEncrypted);
            options.AdditionalHeaders = new Dictionary<string, string> { ["Authorization"] = $"Bearer {apiKey}" };
        }
        else if (endpoint.AuthType == McpAuthType.OAuth)
        {
            options.OAuth = new ClientOAuthOptions
            {
                RedirectUri = new Uri(BuildMcpOAuthRedirectUrl()),
                // 已經 DCR 過就沿用同一個 client，不用每次連線都重新註冊一個新的。
                ClientId = endpoint.OAuthClientId,
                DynamicClientRegistration = new DynamicClientRegistrationOptions
                {
                    ClientName = "KPI 績效指標資料庫",
                },
                TokenCache = new AgentMcpTokenCache(endpoint.Id, _scopeFactory, _mcpProtector),
                AuthorizationCallbackHandler = interactiveAuthorizationHandler
                    ?? ((_, _) => throw new InvalidOperationException(
                        $"MCP endpoint「{endpoint.Name}」的 OAuth 授權已失效或尚未連接，請到「MCP 連線設定」重新連接")),
            };
        }
        return options;
    }

    private string BuildMcpOAuthRedirectUrl()
    {
        var appUrl = _configuration["AppUrl"]?.TrimEnd('/');
        var baseUrl = string.IsNullOrEmpty(appUrl) ? "http://localhost:5013" : appUrl;
        return $"{baseUrl}{McpOAuthCallbackPath}";
    }

    /// <summary>透過官方 MCP C# SDK 呼叫 MCP server 的 tools/list，取代原本手刻的 JSON-RPC。</summary>
    private async Task<List<(string Name, string Description, string? InputSchemaJson)>> FetchMcpToolsListAsync(
        AgentMcpEndpoint endpoint, CancellationToken ct)
    {
        var transportOptions = BuildMcpTransportOptions(endpoint);
        var httpClient = _httpClientFactory.CreateClient();
        var transport = new HttpClientTransport(transportOptions, httpClient, ownsHttpClient: true);
        await using var mcpClient = await McpClient.CreateAsync(transport, cancellationToken: ct);
        var tools = await mcpClient.ListToolsAsync(cancellationToken: ct);
        return tools.Select(t => (t.Name, t.Description ?? "", t.JsonSchema.GetRawText())).ToList();
    }

    /// <summary>
    /// 用 endpoint id 當前綴組出這個 MCP 工具在 AgentTool.ToolKey 的唯一識別碼，同時把工具原始
    /// 名稱裡不合法的字元換成底線——LLM function-calling 的 function name 通常只接受英數字/底線/
    /// 連字號（OpenAI 相容 API 上限 64 字元），MCP server 回傳的 tool name 沒有這個限制，直接
    /// 拿來當 function name 可能被 LiteLLM/LLM 那層拒絕或截斷成不可預期的樣子，所以在這裡先
    /// 統一消毒、統一截長度，而不是等實際呼叫 LLM 時才踩到。
    /// </summary>
    internal static string BuildMcpToolKey(int endpointId, string rawToolName)
    {
        var sanitizedChars = rawToolName.Select(c => char.IsLetterOrDigit(c) || c is '_' or '-' ? c : '_');
        var sanitized = new string(sanitizedChars.ToArray());
        var key = $"mcp{endpointId}_{sanitized}";
        return key.Length > 64 ? key[..64] : key;
    }

    /// <summary>
    /// 組出這個 MCP 工具給 LLM function-calling 用的宣告。ParametersSchema 是同步時原封不動
    /// 存下來的 MCP inputSchema JSON；沒有存到（工具本身沒有參數，或同步時 MCP server 沒給）
    /// 就補一個空的 object schema，不能讓 parameters 欄位整個缺漏——有些 LLM/LiteLLM 後端遇到
    /// 缺 parameters 的 function 宣告會直接跳過整個 tools 陣列，不是只跳過這一個工具。
    /// </summary>
    internal static JsonObject BuildMcpFunctionDeclaration(string toolKey, string description, string? parametersSchemaJson)
    {
        JsonNode parameters;
        try
        {
            parameters = !string.IsNullOrWhiteSpace(parametersSchemaJson)
                ? JsonNode.Parse(parametersSchemaJson)!
                : new JsonObject { ["type"] = "object", ["properties"] = new JsonObject() };
        }
        catch (JsonException)
        {
            // 存進資料庫的 schema 壞掉（理論上不會，因為存的時候就是從 JsonNode 序列化出來的，
            // 但資料庫內容還是可能被手動改壞）——用空 schema 頂著，不要讓整個工具宣告組不出來
            // 連累其他工具也送不出去。
            parameters = new JsonObject { ["type"] = "object", ["properties"] = new JsonObject() };
        }

        return new JsonObject
        {
            ["type"] = "function",
            ["function"] = new JsonObject
            {
                ["name"] = toolKey,
                ["description"] = description,
                ["parameters"] = parameters,
            }
        };
    }

    /// <summary>
    /// 查這個呼叫者這次允許使用的 MCP 工具（只挑 Source=McpEndpoint 且 IsEnabled 的），組成
    /// function-calling 宣告陣列。跟 AgentDocumentTools.BuildToolDeclarations 回傳同樣的格式，
    /// 呼叫端直接把兩份陣列串起來送給 LLM，LLM 不需要知道也不需要在乎這個工具背後是 in-process
    /// 還是外部 MCP server。
    /// </summary>
    private sealed record AllowedToolLite(string ToolKey, AgentToolSource Source, string Description, string? ParametersSchema);

    /// <summary>
    /// 這個呼叫者這次允許使用的完整工具清單（含 Description/ParametersSchema）——一次查詢
    /// 同時拿到「有哪些工具」跟「MCP 工具的宣告內容」，取代原本「先查一次 ToolKey 清單、
    /// 再查一次 MCP 工具明細」兩趟 DB round trip 的寫法（新訊息才需要走這條路；pendingState
    /// 續傳那條路只有 ToolKey 清單、沒有這份明細，還是得走 BuildMcpToolDeclarationsAsync
    /// 另外查一次，這裡沒辦法、也不用取代那條路）。
    /// </summary>
    private async Task<List<AllowedToolLite>> GetAllowedToolsAsync(AgentCallerContext caller, CancellationToken ct)
    {
        return caller.IsSuperAdmin
            ? await _db.AgentTools.AsNoTracking()
                .Where(t => t.IsEnabled)
                .Select(t => new AllowedToolLite(t.ToolKey, t.Source, t.Description, t.ParametersSchema))
                .ToListAsync(ct)
            : await _db.AgentToolRoles.AsNoTracking()
                .Where(tr => caller.RoleIds.Contains(tr.RoleId) && tr.Tool.IsEnabled)
                .Select(tr => new AllowedToolLite(tr.Tool.ToolKey, tr.Tool.Source, tr.Tool.Description, tr.Tool.ParametersSchema))
                .Distinct()
                .ToListAsync(ct);
    }

    private async Task<List<JsonObject>> BuildMcpToolDeclarationsAsync(IEnumerable<string> allowedToolKeys, CancellationToken ct)
    {
        var allowedSet = new HashSet<string>(allowedToolKeys);
        var mcpTools = await _db.AgentTools.AsNoTracking()
            .Where(t => t.Source == AgentToolSource.McpEndpoint && t.IsEnabled)
            .ToListAsync(ct);

        var declarations = new List<JsonObject>();
        foreach (var tool in mcpTools)
        {
            if (!allowedSet.Contains(tool.ToolKey))
            {
                continue;
            }
            declarations.Add(BuildMcpFunctionDeclaration(tool.ToolKey, tool.Description, tool.ParametersSchema));
        }
        return declarations;
    }

    /// <summary>把這個呼叫者允許使用的 MCP 工具宣告，接到既有的 in-process 工具宣告陣列後面——
    /// LLM 拿到的是同一份 tools 陣列，不會分辨得出哪些是 in-process、哪些是外部 MCP。</summary>
    private async Task AppendMcpToolDeclarationsAsync(JsonArray toolDeclarations, IEnumerable<string> allowedToolKeys, CancellationToken ct)
    {
        foreach (var declaration in await BuildMcpToolDeclarationsAsync(allowedToolKeys, ct))
        {
            toolDeclarations.Add(declaration);
        }
    }

    /// <summary>
    /// 透過官方 MCP C# SDK 呼叫 MCP server 的 tools/call，執行一個已經通過權限檢查的 MCP 工具。
    /// tool 必須是 Source=McpEndpoint 的列（呼叫端負責保證），McpEndpointId/McpToolName 缺一個
    /// 都代表資料損壞或同步流程有 bug，直接丟例外讓外層 catch 統一處理成「查詢時發生錯誤」，
    /// 不在這裡吞掉細節。
    /// </summary>
    private async Task<string> ExecuteMcpToolAsync(AgentTool tool, JsonObject arguments,
        Dictionary<int, McpClient> clientCache, CancellationToken ct)
    {
        if (tool.McpEndpointId is not int endpointId || string.IsNullOrEmpty(tool.McpToolName))
        {
            throw new InvalidOperationException($"MCP 工具 {tool.ToolKey} 缺少 McpEndpointId/McpToolName，資料可能損壞，請重新同步這個 endpoint 的工具目錄");
        }

        if (!clientCache.TryGetValue(endpointId, out var mcpClient))
        {
            var endpoint = await _db.AgentMcpEndpoints.AsNoTracking().FirstOrDefaultAsync(e => e.Id == endpointId, ct);
            if (endpoint is null || !endpoint.IsEnabled)
            {
                return "（這個工具所屬的 MCP endpoint 已被停用或刪除，請聯絡管理員）";
            }

            var transportOptions = BuildMcpTransportOptions(endpoint);
            var httpClient = _httpClientFactory.CreateClient();
            var transport = new HttpClientTransport(transportOptions, httpClient, ownsHttpClient: true);
            mcpClient = await McpClient.CreateAsync(transport, cancellationToken: ct);
            clientCache[endpointId] = mcpClient;
        }

        var argDict = new Dictionary<string, object?>();
        foreach (var (key, value) in arguments)
        {
            argDict[key] = value;
        }

        var result = await mcpClient.CallToolAsync(tool.McpToolName, argDict, cancellationToken: ct);
        var textParts = result.Content
            .OfType<ModelContextProtocol.Protocol.TextContentBlock>()
            .Select(c => c.Text)
            .ToList();

        // 查詢類工具（例如依條件搜尋）找不到任何符合的資料時，MCP server 常常回傳空的 content
        // 陣列（沒有任何 TextContentBlock），join 出來會是空字串——這種空字串一路傳到前端
        // 「展開查看結果」會顯示成看起來像是 bug 的「此工具沒有回傳結果內容」，實際上是工具
        // 正常執行完、只是查詢結果剛好是空的。改成明確的訊息，LLM 跟前端都看得懂這是「查了，
        // 沒有資料」而不是「工具沒有回傳任何東西」。
        return textParts.Count > 0
            ? string.Join("\n", textParts)
            : "（查詢完成，但沒有回傳內容）";
    }

    // ── System Prompt ─────────────────────────────────────────────

    private const string DefaultSystemInstruction =
        "你是一個文件查詢小幫手，協助使用者從已上傳的文件（PDF/Word/Excel）中找答案。\n" +
        "使用者這輪訊息裡如果有以「【附件：檔名】」開頭的區塊，那是使用者這輪直接附加的檔案全文，" +
        "已經直接放在對話裡給你看了——這種情況請直接根據這段附件文字回答，不要呼叫 search_documents，" +
        "因為這份臨時附件根本沒有被存進後台知識庫，呼叫 search_documents 只會查到別份文件、答非所問。\n" +
        "只有使用者問的是「後台知識庫」裡既有的文件（沒有在這輪訊息附加、之前上傳過的檔案）時，" +
        "才需要呼叫 search_documents 或 query_document_table 查證，不得自行推測或編造。\n" +
        "涉及數字加總/平均/計數等計算，若資料來自後台知識庫，一律呼叫 query_document_table 讓資料庫算，" +
        "不要自己讀文字心算；若資料來自這輪附件，直接讀附件文字計算即可。\n" +
        "涉及圖片細節（讀數、日期、現場狀況），若圖片是這輪附加的，直接看圖回答；若是要查後台知識庫裡的圖片，" +
        "用 search_documents 找到候選圖片後，呼叫 analyze_image 重新精確判讀。\n" +
        "查無相關資料要明確告知使用者，不得杜撰內容。";

    /// <summary>
    /// 這個角色這次完全沒有被授權用任何工具時的系統提示——不能沿用 DefaultSystemInstruction，
    /// 那份會叫模型「一定要呼叫工具查證」，但這次 API 請求根本沒帶任何工具定義給模型，等於叫
    /// 模型做一件它做不到的事。實測發現不夠可靠的模型遇到這種矛盾指令，會用文字「假裝」呼叫
    /// 工具、甚至連查詢結果都一起編出來（看起來像真的查過，其實整段都是編的）。這份提示明確
    /// 告知模型「你這次沒有任何工具可以用」，要求誠實回覆使用者沒有權限，不要假裝或編造。
    /// </summary>
    private const string NoToolsSystemInstruction =
        "你是文件查詢小幫手，但這次對話你完全沒有被授權使用任何查詢工具（沒有 search_documents、" +
        "query_document_table、analyze_image 這些工具可以呼叫）。\n" +
        "如果使用者的問題需要查詢文件/資料庫才能回答，必須誠實告知：「您目前的帳號沒有文件查詢的權限，請聯絡管理員開通」。\n" +
        "絕對不能假裝自己呼叫了工具、絕對不能編造任何查詢結果或文件內容，也不要輸出任何看起來像工具呼叫格式的文字（例如 JSON 或 <tool_call> 標籤）。\n" +
        "只能就一般常識或使用者提供的資訊做回覆，不牽涉文件內容的閒聊問題可以正常回答。";

    /// <summary>
    /// Tier1（便宜/快模型）判斷這一輪要不要升級到 Tier2 用的暗號——Tier1 這次沒有任何工具，
    /// 判斷到「這題需要查文件/資料庫」時，一律只回這個字串，不要附加任何其他文字。伺服器看到
    /// 這個字串會直接丟掉這次嘗試、改用 Tier2＋工具重跑，使用者完全不會看到這個暗號本身。
    /// </summary>
    private const string Tier1EscalateMarker = "[[NEEDS_DOCUMENT_TOOLS]]";

    /// <summary>
    /// Tier1（便宜/快模型）這一輪的系統提示。這裡使用者「有」工具權限，只是先讓便宜模型自己
    /// 判斷這題需不需要查文件——如果系統提示還是沿用 DefaultSystemInstruction 那份「一定要
    /// 呼叫工具查證」，小模型會出現幻覺（實測 gemma4 遇到沒有工具卻被要求一定要查證的矛盾
    /// 指令，會輸出 &lt;tool_call&gt; 格式的假指令文字）。這份提示明確告知模型「這輪沒有工具」，
    /// 判斷到需要查文件時改用固定暗號（Tier1EscalateMarker）讓伺服器接手升級，而不是像舊版
    /// 那樣直接跟使用者說「請換個方式問」——使用者完全不用自己重問，系統會自動接著用 Tier2
    /// 查完給出真正的答案。
    /// </summary>
    private static readonly string Tier1SystemInstruction =
        "你是一個聊天小幫手，這一輪對話沒有提供任何查詢工具給你" +
        "（沒有 search_documents、query_document_table、analyze_image 這些工具可以呼叫）。\n" +
        $"如果使用者這句話（包含接續前面對話脈絡的追問，例如「試看看」「再確認一次」這種簡短回應）" +
        $"其實是要你查詢文件內容、做統計計算、或分析圖片/附件，你只能回覆這個固定字串，不要附加任何其他文字、不要加引號、不要翻譯：{Tier1EscalateMarker}\n" +
        "絕對不能假裝自己呼叫了工具、絕對不能編造任何查詢結果或文件內容，也不要輸出任何看起來像工具呼叫格式的文字（例如 JSON 或 <tool_call> 標籤）。\n" +
        "只有真正的一般常識或閒聊問題，才直接正常回答；只要有一絲不確定使用者是不是要查文件，一律回上面那個固定字串，不要自己猜著回答。";

    // Model 分流（Tier 1/Tier 2）用的關鍵字判斷——命中任一個就當作「這句話需要查文件/資料」，
    // 一律用 Tier 2（帶工具）處理；沒中的才考慮用 Tier 1（便宜、不帶工具）。寧可判斷過度保守
    // （多花一點成本用 Tier 2），也不要漏判讓真正需要查資料的問題掉到 Tier 1 去憑空編答案。
    private static readonly string[] DataQuestionKeywords =
    {
        "查", "搜尋", "找", "文件", "檔案", "報告", "報表", "表格", "圖片", "照片", "銘牌",
        "指標", "達標", "多少", "幾筆", "幾份", "到期", "excel", "pdf", "word", "分析", "統計", "資料",
        // 化學品資料庫（GovDataMcp）跟法規/判決查詢工具接上之後補的——沒有這批關鍵字，
        // 問「甲苯的 CAS No.」這種完全不含上面那批文件關鍵字的問題，會被誤判成閒聊、
        // 白白多打一次 Tier1 試答才升級（甚至可能被 Tier1 誤判成不需要查證，直接憑訓練
        // 資料編答案——法規/化學品資料修法/異動頻繁，比一般閒聊誤判後果更嚴重）。
        "化學品", "化學物質", "cas", "毒性", "管制濃度", "列管", "危險物品", "管制量",
        "法規", "法條", "法律", "條文", "罰則", "罰鍰", "函釋", "判決", "判例", "法院", "違反", "違規", "裁罰"
    };

    // internal（非 private）只是讓 WebAPI1.Tests 能直接測這個判斷邏輯，不是要對外公開。
    internal static bool NeedsDocumentTools(string text) =>
        DataQuestionKeywords.Any(k => text.Contains(k, StringComparison.OrdinalIgnoreCase));

    [HttpGet("prompt-settings")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetPromptSettings()
    {
        var setting = await _db.AgentPromptSettings.AsNoTracking().FirstOrDefaultAsync();
        return Ok(new
        {
            systemInstruction = setting?.SystemInstruction ?? DefaultSystemInstruction,
            isDefault = setting is null
        });
    }

    public class UpdatePromptRequest
    {
        public string SystemInstruction { get; set; } = string.Empty;
    }

    [HttpPut("prompt-settings")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> UpdatePromptSettings([FromBody] UpdatePromptRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SystemInstruction))
        {
            return BadRequest(new { error = "System prompt 不能是空白" });
        }

        var setting = await _db.AgentPromptSettings.FirstOrDefaultAsync();
        if (setting is null)
        {
            setting = new AgentPromptSetting();
            _db.AgentPromptSettings.Add(setting);
        }
        setting.SystemInstruction = request.SystemInstruction;
        setting.UpdatedAt = tool.GetTaiwanNow();
        setting.UpdatedByUserId = GetUserId();
        setting.UpdatedByUserName = User.FindFirst(ClaimTypes.Name)?.Value;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>
    /// AgentChatConversation 要不要對一般使用者顯示工具呼叫明細——公開端點（只要登入就能呼叫，
    /// 不限 agent-admin），跟 GeminiController 的 tool-call-visibility 同一個設計理由：一般
    /// 使用者的聊天畫面要讀這個值決定要不要顯示編號/參數/查詢結果。
    /// </summary>
    [HttpGet("tool-call-visibility")]
    [Authorize]
    public async Task<IActionResult> GetToolCallVisibility()
    {
        var setting = await _db.AgentPromptSettings.AsNoTracking().FirstOrDefaultAsync();
        return Ok(new { showToolCallDetailsToUsers = setting?.ShowToolCallDetailsToUsers ?? false });
    }

    public class UpdateToolCallVisibilityRequest
    {
        public bool ShowToolCallDetailsToUsers { get; set; }
    }

    [HttpPut("tool-call-visibility")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> UpdateToolCallVisibility([FromBody] UpdateToolCallVisibilityRequest request)
    {
        var setting = await _db.AgentPromptSettings.FirstOrDefaultAsync();
        if (setting is null)
        {
            setting = new AgentPromptSetting { SystemInstruction = DefaultSystemInstruction };
            _db.AgentPromptSettings.Add(setting);
        }

        setting.ShowToolCallDetailsToUsers = request.ShowToolCallDetailsToUsers;
        setting.UpdatedAt = tool.GetTaiwanNow();
        setting.UpdatedByUserId = GetUserId();
        setting.UpdatedByUserName = User.FindFirst(ClaimTypes.Name)?.Value;
        await _db.SaveChangesAsync();
        return Ok(new { showToolCallDetailsToUsers = setting.ShowToolCallDetailsToUsers });
    }

    // ── 文件管理 ─────────────────────────────────────────────────

    [HttpGet("documents")]
    public async Task<IActionResult> GetDocuments()
    {
        var caller = await _callerContextService.GetAsync(User);
        if (caller is null) return Unauthorized();

        var accessibleOrgIds = await _callerContextService.GetAccessibleOrganizationIdsAsync(caller);

        var query = _db.AgentDocuments.AsNoTracking().AsQueryable();
        if (accessibleOrgIds is not null)
        {
            query = query.Where(d => d.OrganizationId == null || accessibleOrgIds.Contains(d.OrganizationId.Value));
        }

        var docs = await query
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                d.Id,
                d.FileName,
                FileType = d.FileType.ToString(),
                Status = d.Status.ToString(),
                d.FailureReason,
                FailureCategory = d.FailureCategory.HasValue ? d.FailureCategory.Value.ToString() : null,
                d.OrganizationId,
                OrganizationName = d.Organization != null ? d.Organization.Name : null,
                d.UploadedAt,
                d.IndexedAt
            })
            .ToListAsync();

        return Ok(docs);
    }

    [HttpGet("documents/status")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetDocumentIndexStatus()
    {
        // 先把還沒鏡射過的工廠歷史檔案（SuggestFile）補進 AgentDocuments，
        // 這樣就算管理員還沒按「重新同步向量」，這裡看到的總數也是準的。
        await _ingestionService.MirrorSuggestFilesAsync();

        var counts = await _db.AgentDocuments.AsNoTracking()
            .GroupBy(d => d.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        int CountOf(AgentDocumentStatus status) => counts.FirstOrDefault(c => c.Status == status)?.Count ?? 0;

        var lastIndexedAt = await _db.AgentDocuments.AsNoTracking()
            .Where(d => d.IndexedAt != null)
            .MaxAsync(d => (DateTime?)d.IndexedAt);

        // 失敗原因分類統計，讓管理員在面板上就能看出「大部分是檔案遺失還是格式問題」，
        // 不用逐筆點開 FailureReason 看例外訊息。
        var failureBreakdown = await _db.AgentDocuments.AsNoTracking()
            .Where(d => d.Status == AgentDocumentStatus.Failed && d.FailureCategory != null)
            .GroupBy(d => d.FailureCategory)
            .Select(g => new { Category = g.Key!.Value.ToString(), Count = g.Count() })
            .ToListAsync();

        return Ok(new
        {
            total = counts.Sum(c => c.Count),
            indexed = CountOf(AgentDocumentStatus.Indexed),
            pending = CountOf(AgentDocumentStatus.Pending),
            processing = CountOf(AgentDocumentStatus.Processing),
            failed = CountOf(AgentDocumentStatus.Failed),
            failureBreakdown,
            lastIndexedAt
        });
    }

    [HttpPost("documents/sync")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> SyncDocuments()
    {
        // Embedding 現在走本機模型（見 IAgentEmbeddingService），不需要 LiteLLM 設定；
        // 只有 analyze_image（圖片判讀）跟聊天本身才需要 LiteLLM。
        var summary = await _ingestionService.SyncPendingAsync();
        return Ok(new { summary.Processed, summary.Succeeded, summary.Failed });
    }

    [HttpDelete("documents/{id:int}")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> DeleteDocument(int id, [FromServices] IAgentVectorStoreService vectorStore)
    {
        var doc = await _db.AgentDocuments.FirstOrDefaultAsync(d => d.Id == id);
        if (doc is null) return NotFound();

        await vectorStore.DeleteDocumentDataAsync(id);

        var storageRoot = _configuration["AgentDocuments:StorageRoot"] ?? "agent-documents";
        var fullPath = Path.Combine(storageRoot, doc.StoragePath);
        if (System.IO.File.Exists(fullPath))
        {
            System.IO.File.Delete(fullPath);
        }

        _db.AgentDocuments.Remove(doc);
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>
    /// 重新索引一份已經 Indexed/Failed 的文件——SyncDocuments（documents/sync）只處理
    /// Status=Pending/Failed 的文件，已經索引過的文件不會被重新處理，導致切 chunk 邏輯
    /// 改版後（例如新增合併報告的廠別偵測）既有文件吃不到新邏輯，只能刪除重傳很麻煩。
    /// 這裡清掉舊的向量資料、把狀態撥回 Pending，管理員接著按「同步向量」就會用最新的
    /// 切分/偵測邏輯重新處理，不用重新上傳原始檔案（本來就還留在磁碟上）。
    /// </summary>
    [HttpPost("documents/{id:int}/reindex")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> ReindexDocument(int id, [FromServices] IAgentVectorStoreService vectorStore)
    {
        var doc = await _db.AgentDocuments.FirstOrDefaultAsync(d => d.Id == id);
        if (doc is null) return NotFound();

        await vectorStore.DeleteDocumentDataAsync(id);

        doc.Status = AgentDocumentStatus.Pending;
        doc.FailureReason = null;
        doc.FailureCategory = null;
        doc.IndexedAt = null;
        await _db.SaveChangesAsync();

        return Ok(new { success = true });
    }

    /// <summary>
    /// 知識庫稽核：找出「殭屍 chunk」——語意上孤立、沒有任何其他段落會把它當近鄰的段落，
    /// 通常代表切分策略（chunk 大小/overlap）沒切好，或內容本身破碎到無法被一般提問搜尋到。
    /// 不指定 documentId 時稽核呼叫者權限範圍內的全部文件；k 值要跟 search_documents 實際
    /// 用的 topK 概念一致（同一個 chunk 如果連「被誰的前 k 名近鄰選中」都做不到，代表在
    /// 真實使用情境下 search_documents topK 抓不到它的機率也很高）。O(n²) 比對，chunk 數
    /// 多時會慢，建議搭配 documentId 縮小範圍或平時不要太常跑。
    /// </summary>
    [HttpGet("documents/orphan-chunks")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> GetOrphanChunks([FromServices] IAgentVectorStoreService vectorStore,
        [FromQuery] int? documentId, [FromQuery] int k = 5)
    {
        var caller = await _callerContextService.GetAsync(User);
        if (caller is null) return Unauthorized();

        var accessibleOrgIds = await _callerContextService.GetAccessibleOrganizationIdsAsync(caller);
        List<AgentOrphanChunkHit> orphans;
        try
        {
            orphans = await vectorStore.FindOrphanChunksAsync(accessibleOrgIds, documentId, Math.Clamp(k, 1, 20));
        }
        catch (InvalidOperationException ex)
        {
            // 稽核範圍太大時 FindOrphanChunksAsync 會主動擋掉（見該方法內的說明），
            // 不要讓使用者看到裸的 500，直接把可讀的原因回傳給前端。
            return BadRequest(new { error = ex.Message });
        }

        var documentNames = await _db.AgentDocuments.AsNoTracking()
            .Where(d => orphans.Select(o => o.DocumentId).Distinct().Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.FileName);

        return Ok(new
        {
            k,
            orphanCount = orphans.Count,
            orphans = orphans.Select(o => new
            {
                o.Id,
                o.DocumentId,
                FileName = documentNames.GetValueOrDefault(o.DocumentId, "（文件已刪除）"),
                o.SourcePage,
                o.SourceSheet,
                ChunkPreview = o.ChunkText.Length > 200 ? o.ChunkText[..200] + "…" : o.ChunkText
            })
        });
    }

    /// <summary>
    /// 調 topK 用的診斷端點：直接跑 search_documents 底層的向量檢索，把每一筆結果的 cosine
    /// distance 一起回傳——平常 search_documents 給 LLM 看的格式化文字裡沒有這個分數（模型
    /// 不需要、也不該看到這種實作細節）。管理員可以拿同一句問題把 topK 開到 20，觀察 distance
    /// 在第幾名開始出現明顯斷層（例如前 3 名都 &lt;0.3、第 4 名跳到 0.6+），藉此判斷正式
    /// 用的 topK 該設多少才不會查不夠、也不會查太多浪費 token。完全繞過 LLM，不會產生任何
    /// LiteLLM 花費，可以放心反覆試。
    /// </summary>
    [HttpGet("documents/search-debug")]
    [Authorize(Policy = "Permission:agent-admin")]
    public async Task<IActionResult> SearchDocumentsDebug(
        [FromQuery] string query, [FromQuery] string? organizationName, [FromQuery] int topK = 20)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new { error = "query 不能是空白" });
        }

        var caller = await _callerContextService.GetAsync(User);
        if (caller is null) return Unauthorized();

        var accessibleOrgIds = await _callerContextService.GetAccessibleOrganizationIdsAsync(caller);
        var (hits, docInfos, error) = await _documentTools.SearchRawAsync(
            query, organizationName, Math.Clamp(topK, 1, 20), accessibleOrgIds, HttpContext.RequestAborted);

        if (error is not null)
        {
            return BadRequest(new { error });
        }

        return Ok(new
        {
            query,
            organizationName,
            hitCount = hits.Count,
            hits = hits.Select((h, i) =>
            {
                var (fileName, orgName) = docInfos.TryGetValue(h.DocumentId, out var info)
                    ? info
                    : ($"文件#{h.DocumentId}", null);
                return new
                {
                    rank = i + 1,
                    distance = h.Distance,
                    documentId = h.DocumentId,
                    fileName,
                    organizationName = orgName,
                    sourcePage = h.SourcePage,
                    sourceSheet = h.SourceSheet,
                    detectedPlantName = h.DetectedPlantName,
                    chunkPreview = h.ChunkText.Length > 200 ? h.ChunkText[..200] + "…" : h.ChunkText
                };
            })
        });
    }

    // ── 對話歷史 ─────────────────────────────────────────────────

    private const int DefaultConversationPageSize = 30;

    /// <summary>
    /// 分頁回傳對話紀錄清單，給前端側欄做無限捲動用——使用者累積夠多對話之後，一次把全部
    /// 撈回來沒必要（大多數時候只看得到最上面那幾則），改成捲到底才載下一頁。
    /// 排序刻意用「IsPinned 先、LastMessageAt 次之」（不是單純 LastMessageAt），確保已釘選的
    /// 對話一定會落在前幾頁——前端側欄會把已釘選的另外分一組顯示在最上面，如果排序只看
    /// 時間，一則很久以前釘選的舊對話要捲到很後面的分頁才會被載進來，「已釘選」那組會長期
    /// 顯示不全，這裡直接在查詢層保證不會發生。
    /// </summary>
    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations([FromQuery] int skip = 0, [FromQuery] int take = DefaultConversationPageSize)
    {
        if (GetUserId() is not { } userId) return Unauthorized();

        take = Math.Clamp(take, 1, 100);
        skip = Math.Max(skip, 0);

        var query = _db.AgentConversations.AsNoTracking()
            .Where(c => c.UserId == userId && !c.IsArchived)
            .OrderByDescending(c => c.IsPinned)
            .ThenByDescending(c => c.LastMessageAt);

        // 多拿一筆才知道「後面還有沒有」，不用另外下一次 COUNT 查詢。
        var page = await query.Skip(skip).Take(take + 1)
            .Select(c => new { c.Id, c.Title, c.IsPinned, c.LastMessageAt })
            .ToListAsync();

        var hasMore = page.Count > take;
        return Ok(new { items = hasMore ? page.Take(take) : page, hasMore });
    }

    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<IActionResult> GetConversationMessages(Guid conversationId)
    {
        if (GetUserId() is not { } userId) return Unauthorized();

        var owns = await _db.AgentConversations.AnyAsync(c => c.Id == conversationId && c.UserId == userId);
        if (!owns) return NotFound();

        var messages = await _db.AgentConversationMessages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new { m.Id, m.Role, m.Content, m.ToolCallsJson, m.CreatedAt })
            .ToListAsync();
        return Ok(messages);
    }

    [HttpDelete("conversations/{conversationId:guid}")]
    public async Task<IActionResult> DeleteConversation(Guid conversationId)
    {
        if (GetUserId() is not { } userId) return Unauthorized();

        var conversation = await _db.AgentConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
        if (conversation is null) return NotFound();

        _db.AgentConversations.Remove(conversation); // Messages 走 Cascade 一起刪
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    /// <summary>
    /// 使用者在懸浮視窗「對話紀錄」清單裡按刪除——只是不想再看到它，不是真的要把對話內容
    /// 從資料庫清掉（例如之後客服/稽核可能還要查得到）。所以這裡不動 AgentConversations 那一列
    /// 本身，只把 IsArchived 設 true；GetConversations 本來就會過濾掉 IsArchived 的對話，
    /// 清單上就看不到了，訊息紀錄原封不動留在 DB。跟上面真的會 cascade 刪掉整段對話的
    /// DeleteConversation 是兩個不同語意，先留著那支給之後可能需要的「真的清除」情境用。
    /// </summary>
    [HttpPost("conversations/{conversationId:guid}/archive")]
    public async Task<IActionResult> ArchiveConversation(Guid conversationId)
    {
        if (GetUserId() is not { } userId) return Unauthorized();

        var conversation = await _db.AgentConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
        if (conversation is null) return NotFound();

        conversation.IsArchived = true;
        await _db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    public class RenameConversationRequest
    {
        public string Title { get; set; } = string.Empty;
    }

    [HttpPut("conversations/{conversationId:guid}/title")]
    public async Task<IActionResult> RenameConversation(Guid conversationId, [FromBody] RenameConversationRequest request)
    {
        if (GetUserId() is not { } userId) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { error = "標題不能是空白" });
        }

        var conversation = await _db.AgentConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
        if (conversation is null) return NotFound();

        conversation.Title = request.Title.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { success = true, title = conversation.Title });
    }

    /// <summary>單純切換釘選狀態（不用帶 body）——跟前端選單「釘選／取消釘選」是同一顆按鈕，
    /// 點下去就是跟目前狀態相反，不用先查詢目前狀態再決定要傳 true 還是 false。</summary>
    [HttpPost("conversations/{conversationId:guid}/pin")]
    public async Task<IActionResult> TogglePinConversation(Guid conversationId)
    {
        if (GetUserId() is not { } userId) return Unauthorized();

        var conversation = await _db.AgentConversations.FirstOrDefaultAsync(c => c.Id == conversationId && c.UserId == userId);
        if (conversation is null) return NotFound();

        conversation.IsPinned = !conversation.IsPinned;
        await _db.SaveChangesAsync();
        return Ok(new { success = true, isPinned = conversation.IsPinned });
    }

    // ── 聊天附件（先抽取內容，再由前端連同訊息一起送到 chat/stream） ──────────

    private const int MaxAttachmentTextChars = 8000;

    /// <summary>
    /// 上傳一個聊天附件，回傳可以直接放進 AgentChatRequest.Attachments 的內容——圖片轉 base64
    /// （直接嵌進送給 model 的多模態內容，讓 Tier2 用視覺能力看圖回答，不用先存檔案），
    /// PDF/DOCX/XLSX 則抽出純文字（截斷到 <see cref="MaxAttachmentTextChars"/> 字元，避免一次
    /// 塞爆單輪對話的 token 用量）。這裡是「當下這輪聊天用的臨時附件」，不會存進 AgentDocuments
    /// （那個是給文件 RAG 長期索引用的，語意不一樣）。
    /// </summary>
    [HttpPost("chat/attachment")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> ExtractAttachment(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { error = "請選擇檔案" });
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

        try
        {
            if (ext is ".png" or ".jpg" or ".jpeg" or ".webp")
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                var mimeType = ext switch
                {
                    ".png" => "image/png",
                    ".webp" => "image/webp",
                    _ => "image/jpeg",
                };
                return Ok(new AgentAttachmentDto
                {
                    Kind = "image",
                    FileName = file.FileName,
                    MimeType = mimeType,
                    Base64 = Convert.ToBase64String(ms.ToArray()),
                });
            }

            if (ext == ".pdf")
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                ms.Position = 0;
                using var pdf = PdfDocument.Open(ms);
                var sb = new StringBuilder();
                foreach (var page in pdf.GetPages())
                {
                    sb.AppendLine(page.Text);
                }
                return Ok(new AgentAttachmentDto { Kind = "text", FileName = file.FileName, ExtractedText = TruncateAttachmentText(sb.ToString()) });
            }

            if (ext == ".docx")
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                ms.Position = 0;
                var wordDoc = new XWPFDocument(ms);
                var sb = new StringBuilder();
                foreach (var paragraph in wordDoc.Paragraphs)
                {
                    sb.AppendLine(paragraph.Text);
                }
                return Ok(new AgentAttachmentDto { Kind = "text", FileName = file.FileName, ExtractedText = TruncateAttachmentText(sb.ToString()) });
            }

            if (ext == ".xlsx")
            {
                using var ms = new MemoryStream();
                await file.CopyToAsync(ms);
                ms.Position = 0;
                var workbook = new XSSFWorkbook(ms);
                var sb = new StringBuilder();
                for (var s = 0; s < workbook.NumberOfSheets; s++)
                {
                    var sheet = workbook.GetSheetAt(s);
                    sb.AppendLine($"工作表：{sheet.SheetName}");
                    for (var r = sheet.FirstRowNum; r <= sheet.LastRowNum; r++)
                    {
                        var row = sheet.GetRow(r);
                        if (row is null) continue;
                        var cells = new List<string>();
                        for (var c = 0; c < row.LastCellNum; c++)
                        {
                            cells.Add(row.GetCell(c)?.ToString() ?? "");
                        }
                        sb.AppendLine(string.Join(" | ", cells));
                    }
                }
                return Ok(new AgentAttachmentDto { Kind = "text", FileName = file.FileName, ExtractedText = TruncateAttachmentText(sb.ToString()) });
            }

            return BadRequest(new { error = "不支援的檔案類型，僅接受圖片（png/jpg/webp）或 PDF/DOCX/XLSX" });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "附件 {FileName} 抽取內容失敗", file.FileName);
            return BadRequest(new { error = "檔案讀取失敗，請確認檔案沒有損毀" });
        }
    }

    private static string TruncateAttachmentText(string text)
    {
        text = text.Trim();
        return text.Length <= MaxAttachmentTextChars ? text : text[..MaxAttachmentTextChars] + "\n…（內容過長，已截斷）";
    }

    // ── 聊天（SSE 串流） ─────────────────────────────────────────

    public class AgentChatRequest
    {
        public Guid? ConversationId { get; set; }
        public string Text { get; set; } = string.Empty;

        /// <summary>
        /// true 代表這次是接續前一次被時間預算截斷的回應——伺服器會忽略 Text/Attachments，
        /// 改讀自己存在 Redis 的續傳狀態（見 ChatStream 裡的說明）。這只是一個「這是不是續傳」
        /// 的意圖旗標，不帶任何實際內容，跟舊版 PriorToolCalls/PartialAnswer 直接把工具結果/
        /// 部分答案內容交給客戶端保管、下一輪再整包信任送回來的做法不同——真正決定 LLM 看到
        /// 什麼內容的那份狀態，一律只信任伺服器自己存的，不接受客戶端提供。
        /// </summary>
        public bool Continue { get; set; }

        /// <summary>這一輪使用者附加的檔案（已經先呼叫 chat/attachment 抽取過內容），只在第一次
        /// 送出（非「繼續」）時有意義，「繼續」時不會重複附加。</summary>
        public List<AgentAttachmentDto>? Attachments { get; set; }
    }

    public class AgentAttachmentDto
    {
        /// <summary>"image" 或 "text"——由 chat/attachment 端點判斷檔案類型後回傳，前端原樣帶回來。</summary>
        public string Kind { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public string? MimeType { get; set; }
        /// <summary>Kind=image 時有值，圖片本身的 base64（不含 data: 前綴）。</summary>
        public string? Base64 { get; set; }
        /// <summary>Kind=text 時有值，PDF/DOCX/XLSX 抽出來的純文字內容。</summary>
        public string? ExtractedText { get; set; }
    }

    [HttpPost("chat/stream")]
    public async Task ChatStream([FromBody] AgentChatRequest request)
    {
        var requestId = Guid.NewGuid().ToString("N")[..8];

        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        async Task WriteEventAsync(object payload)
        {
            await Response.WriteAsync($"data: {JsonSerializer.Serialize(payload, JsonOptions)}\n\n");
            await Response.Body.FlushAsync();
        }

        var caller = await _callerContextService.GetAsync(User);
        if (caller is null)
        {
            Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var (llm, setting) = await BuildLlmClientAsync();
        if (llm is null)
        {
            await WriteEventAsync(new { error = "LiteLLM 連線設定尚未完成，請聯絡管理員設定 API Key" });
            return;
        }

        var maxToolCalls = setting?.MaxToolCalls ?? 12;
        var requestBudget = TimeSpan.FromSeconds(setting?.StreamRequestBudgetSeconds ?? 15);

        // 對話：沒帶 conversationId 就新建一個；帶了就要確認真的是自己的對話。
        AgentConversation conversation;
        if (request.ConversationId is Guid existingId)
        {
            var existing = await _db.AgentConversations.FirstOrDefaultAsync(c => c.Id == existingId && c.UserId == caller.UserId);
            if (existing is null)
            {
                await WriteEventAsync(new { error = "找不到這個對話" });
                return;
            }
            conversation = existing;
        }
        else
        {
            conversation = new AgentConversation
            {
                UserId = caller.UserId,
                Title = request.Text.Length > 30 ? request.Text[..30] : request.Text
            };
            _db.AgentConversations.Add(conversation);
            await _db.SaveChangesAsync();
        }
        await WriteEventAsync(new { conversationId = conversation.Id });

        var redisDb = _redis.GetDatabase();
        var pendingStateKey = PendingLoopStateKey(conversation.Id);

        // 續傳的真實內容一律只信任伺服器自己存在 Redis 的狀態，不接受客戶端提供——這是跟舊版
        // 最關鍵的差異（見 AgentChatRequest.Continue 的說明）。request.Continue 只是「這是不是
        // 續傳」的意圖旗標，不是內容來源；旗標講了「是續傳」但 Redis 已經沒有對應狀態（過期、
        // 或本來就沒有這回事），就視為錯誤，不要落回去憑空繼續，也不要誤把它當成一句新訊息
        // 直接回答（那樣等於忽略使用者真正想問的是「接續上一輪」）。
        AgentPendingLoopState? pendingState = null;
        if (request.Continue)
        {
            var raw = await redisDb.StringGetAsync(pendingStateKey);
            pendingState = raw.HasValue ? AgentPendingLoopState.TryDeserialize(raw!) : null;
            if (pendingState is null)
            {
                await WriteEventAsync(new { error = "續傳逾時或狀態已遺失，請重新提問一次" });
                return;
            }
        }
        else
        {
            // 使用者送的是新問題，不是接續——如果剛好前一輪還留著沒消化完的續傳狀態（使用者
            // 放著不管、直接改問別的），這裡順手清掉，避免變成孤兒狀態一直留到自然過期。
            await redisDb.KeyDeleteAsync(pendingStateKey);
        }

        var isContinuation = pendingState is not null;

        JsonArray messages;
        JsonArray toolCallsAccJson;
        string finalText;
        bool useTier1;
        HashSet<string> allowedToolKeySet;
        JsonArray? toolDeclarations;
        string? modelUsed;

        // 從這裡就開始算時間預算（含 Tier1 試答的那次呼叫），不能等下面組完 Tier2 訊息才起算，
        // 不然「Tier1 試答 + Tier2 正式回答」兩次呼叫的時間會沒被算進同一個預算裡。
        var requestSw = System.Diagnostics.Stopwatch.StartNew();
        var stoppedForBudget = false;

        if (pendingState is not null)
        {
            messages = pendingState.Messages;
            toolCallsAccJson = pendingState.ToolCallsAcc;
            finalText = pendingState.FinalText;
            useTier1 = pendingState.UseTier1;
            modelUsed = pendingState.ModelUsed;
            allowedToolKeySet = new HashSet<string>(pendingState.AllowedToolKeys);
            toolDeclarations = AgentDocumentTools.BuildToolDeclarations(pendingState.AllowedToolKeys);
            await AppendMcpToolDeclarationsAsync(toolDeclarations, pendingState.AllowedToolKeys, HttpContext.RequestAborted);

            await WriteEventAsync(new { modelUsed, tier = useTier1 ? "Tier1" : "Tier2" });
        }
        else
        {
            // 角色可用工具：管理員拿全部已啟用工具，一般角色依 AgentToolRole 矩陣過濾。提早在這裡算，
            // 是因為系統提示要依照「這個人這次到底有沒有工具可以用」動態調整（見下面 hasAnyTools）。
            // 一次查詢拿齊 ToolKey + MCP 工具的 Description/ParametersSchema，不用像 pendingState
            // 續傳那條路一樣分兩次查（見 GetAllowedToolsAsync 的說明）。
            var allowedTools = await GetAllowedToolsAsync(caller, HttpContext.RequestAborted);
            var allowedToolKeys = allowedTools.Select(t => t.ToolKey).ToList();
            allowedToolKeySet = new HashSet<string>(allowedToolKeys);
            toolDeclarations = AgentDocumentTools.BuildToolDeclarations(allowedToolKeys);
            foreach (var mcpTool in allowedTools.Where(t => t.Source == AgentToolSource.McpEndpoint))
            {
                toolDeclarations.Add(BuildMcpFunctionDeclaration(mcpTool.ToolKey, mcpTool.Description, mcpTool.ParametersSchema));
            }
            var hasAnyTools = toolDeclarations is not null && toolDeclarations.Count > 0;

            var history = await _db.AgentConversationMessages.AsNoTracking()
                .Where(m => m.ConversationId == conversation.Id)
                .OrderBy(m => m.CreatedAt)
                .ToListAsync();

            // 附件（圖片/PDF/DOCX/XLSX）只在這一輪新訊息時附加，不管最後走 Tier1 還是 Tier2 都
            // 只組一次、只存一次歷史紀錄。PDF/DOCX/XLSX 抽出來的文字直接串在訊息文字前面一起
            // 送給 model；圖片則是另外組成多模態內容（文字 + image_url）。
            var textBlocks = new List<string>();
            var imageParts = new JsonArray();
            foreach (var a in request.Attachments ?? new List<AgentAttachmentDto>())
            {
                if (a.Kind == "image" && !string.IsNullOrEmpty(a.Base64))
                {
                    imageParts.Add(new JsonObject
                    {
                        ["type"] = "image_url",
                        ["image_url"] = new JsonObject { ["url"] = $"data:{a.MimeType ?? "image/jpeg"};base64,{a.Base64}" }
                    });
                }
                else if (a.Kind == "text" && !string.IsNullOrEmpty(a.ExtractedText))
                {
                    textBlocks.Add($"【附件：{a.FileName}】\n{a.ExtractedText}");
                }
            }
            var hasImageAttachment = imageParts.Count > 0;

            var fullText = textBlocks.Count > 0
                ? string.Join("\n\n", textBlocks) + "\n\n" + request.Text
                : request.Text;

            // 存進對話歷史的一律是純文字（含附件抽出來的文字），圖片本身不長期保存——
            // 之後這段對話續接時，模型只看得到「這輪附了一張圖」的文字紀錄，看不到圖片本身，
            // 這是刻意的取捨：不用另外設計圖片的長期儲存/權限，只在當下這輪真的看得到圖。
            var historyText = hasImageAttachment ? $"{fullText}\n\n（此訊息附加了 {imageParts.Count} 張圖片）" : fullText;
            _db.AgentConversationMessages.Add(new AgentConversationMessage
            {
                ConversationId = conversation.Id,
                Role = "user",
                Content = historyText
            });
            await _db.SaveChangesAsync();

            JsonNode userMessageContent;
            if (hasImageAttachment)
            {
                var contentArray = new JsonArray { new JsonObject { ["type"] = "text", ["text"] = fullText } };
                foreach (var part in imageParts)
                {
                    contentArray.Add(part!.DeepClone());
                }
                userMessageContent = contentArray;
            }
            else
            {
                userMessageContent = fullText;
            }

            // system prompt 之外的訊息（歷史 + 這輪使用者訊息）Tier1/Tier2 共用，各自只差
            // 最前面那則 system 訊息內容。
            JsonArray BuildMessages(string systemInstruction)
            {
                var msgs = new JsonArray { new JsonObject { ["role"] = "system", ["content"] = systemInstruction } };
                foreach (var h in history)
                {
                    msgs.Add(new JsonObject { ["role"] = h.Role, ["content"] = h.Content });
                }
                msgs.Add(new JsonObject { ["role"] = "user", ["content"] = userMessageContent.DeepClone() });
                return msgs;
            }

            var promptSetting = await _db.AgentPromptSettings.AsNoTracking().FirstOrDefaultAsync();
            var tier2SystemInstruction = hasAnyTools
                ? (promptSetting?.SystemInstruction ?? DefaultSystemInstruction)
                : NoToolsSystemInstruction;

            // Model 分流 v2：關鍵字命中、或上一輪就已經在 Tier2（sticky）時，直接跳過 Tier1
            // 試答，省掉一次完整生成的往返——這兩種情況已經有足夠信心判斷「一定要查資料」，
            // 讓 Tier1 再判斷一次純粹是浪費一次呼叫（Tier1 對這種明確案例幾乎必定判斷需要
            // 升級，等於白花一次生成 token 的成本跟延遲）。真正的價值在於「不確定」的情況才
            // 讓 Tier1 用完整對話語境自己判斷，那條路完全不動（見下面 if (canAttemptTier1)）：
            // 關鍵字比對抓不到像「試看看」這種不含關鍵字、但依語境明顯是接續查詢的追問，這種
            // 情況兩層都沒命中，才會落到 Tier1 自己判斷（讀得懂完整對話歷史，比猜字串準）。
            var stickyTier2 = conversation.LastTier == "Tier2";
            var keywordMatch = NeedsDocumentTools(request.Text);
            // 有附件時（圖片/文件）Tier1 小模型不一定支援視覺輸入，直接跳過試答，一律用 Tier2。
            var canAttemptTier1 = llm.HasTier1Model && !(request.Attachments?.Count > 0)
                && !stickyTier2 && !keywordMatch;
            if (canAttemptTier1)
            {
                var tier1Messages = BuildMessages(Tier1SystemInstruction);
                var probeText = new StringBuilder();
                bool tier1Truncated;
                bool tier1CallFailed;
                try
                {
                    (_, tier1Truncated) = await llm.StreamChatAsync(
                        tier1Messages, null, true, requestSw, requestBudget,
                        chunk => { if (TryGetDelta(chunk, out var d)) probeText.Append(d); return Task.CompletedTask; },
                        useTier1: true);
                    tier1CallFailed = false;
                }
                catch (Exception ex)
                {
                    // Tier1 模型本身這時候不健康（例如 LiteLLM 回「no healthy deployments」）時，
                    // 這裡會直接丟例外——絕對不能讓它把整個請求炸掉，跟「Tier1 判斷需要升級」
                    // 一樣的處理方式：吞掉，直接往下改用 Tier2。這是 Tier1 試答唯一可能失敗的
                    // 地方，跟後面 Tier2 真正跑失敗要不要中斷請求（外層 try/catch）是分開的兩件事。
                    _logger.LogWarning(ex, "[{RequestId}] Tier1 試答失敗，改用 Tier2", requestId);
                    tier1Truncated = false;
                    tier1CallFailed = true;
                }

                var probeResult = probeText.ToString().Trim();
                if (!tier1CallFailed && !tier1Truncated && probeResult != Tier1EscalateMarker)
                {
                    // Tier1 自己判斷不需要查文件——這就是真正的答案，直接回傳，不進入下面的
                    // 工具呼叫迴圈，也不用另外組 Tier2 訊息。
                    var tier1ModelUsed = setting?.Tier1Model ?? setting?.Model;
                    await WriteEventAsync(new { modelUsed = tier1ModelUsed, tier = "Tier1" });
                    await WriteEventAsync(new { delta = probeResult });
                    await redisDb.KeyDeleteAsync(pendingStateKey);
                    await SaveAssistantMessageAsync(conversation.Id, probeResult, new JsonArray(), "Tier1");
                    await WriteEventAsync(new { done = true });
                    return;
                }
                // 不然就是 Tier1 判斷需要升級（回傳暗號），或它自己的試答被時間預算打斷
                // （truncated——這種殘缺、連是不是真的要查文件都還不確定的回答，直接當作
                // 需要升級處理，簡單、安全優先，不嘗試續傳一個不確定的判斷）。往下走 Tier2。
            }

            useTier1 = false;
            messages = BuildMessages(tier2SystemInstruction);
            toolCallsAccJson = new JsonArray();
            finalText = "";
            modelUsed = setting?.Model;
            await WriteEventAsync(new { modelUsed, tier = "Tier2" });
        }

        var accessibleOrgIds = await _callerContextService.GetAccessibleOrganizationIdsAsync(caller);

        // 續傳狀態存到 Redis 再回傳 needContinue——下一次呼叫端帶著 Continue=true 回來時，
        // 就是從這裡存的狀態原封不動接回去，跟客戶端這次到底傳了什麼內容無關。
        Task SavePendingStateAsync() => redisDb.StringSetAsync(
            pendingStateKey,
            new AgentPendingLoopState
            {
                Messages = messages,
                ToolCallsAcc = toolCallsAccJson,
                FinalText = finalText,
                UseTier1 = useTier1,
                ModelUsed = modelUsed,
                AllowedToolKeys = allowedToolKeySet.ToList(),
            }.Serialize(),
            PendingLoopStateTtl);

        // 同一輪對話常常對同一個 MCP endpoint 連續呼叫兩次工具（例如先 search 再 get_detail，
        // 兩個工具的使用時機正是 System Prompt 裡明確教模型這樣做的）——ExecuteMcpToolAsync
        // 原本每次呼叫都重新 McpClient.CreateAsync（完整 initialize 握手，OAuth 模式還會
        // 多打一次 token cache 的 DB 查詢），同一個 endpoint 在同一輪裡重複握手是白白浪費。
        // 這裡在單一次 ChatStream 請求範圍內快取、重用同一個 McpClient，finally 統一釋放。
        var mcpClientCache = new Dictionary<int, McpClient>();
        try
        {
            if (!string.IsNullOrEmpty(finalText))
            {
                // finalText 有內容代表上一輪是被時間預算截斷在「輸出最終答案文字」這個階段
                // （不是還在等工具呼叫結果——工具呼叫本身不會產生 finalText），這裡要做的只是
                // 接著把答案講完，不用再跑一次工具呼叫迴圈。跟原本判斷邏輯一致：只要有累積到
                // 一部分答案文字，就一律走「接續講完」而不是「繼續呼叫工具」。
                messages.Add(new JsonObject { ["role"] = "assistant", ["content"] = finalText });
                messages.Add(new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = "你上面的回答被系統中斷了，只講到一半。請直接接著把剩下的部分講完，不要重複前面說過的話，也不要有開場白。"
                });

                var (_, truncatedAgain) = await llm.StreamChatAsync(
                    messages, toolDeclarations, true, requestSw, requestBudget,
                    chunk => { if (TryGetDelta(chunk, out var d)) finalText += d; return WriteEventAsync(chunk); },
                    useTier1: useTier1);

                if (truncatedAgain)
                {
                    await SavePendingStateAsync();
                    await WriteEventAsync(new { needContinue = true });
                }
                else
                {
                    await redisDb.KeyDeleteAsync(pendingStateKey);
                    await SaveAssistantMessageAsync(conversation.Id, finalText, toolCallsAccJson, "Tier2");
                    await WriteEventAsync(new { done = true });
                }
                return;
            }

            for (var callIndex = toolCallsAccJson.Count; callIndex <= maxToolCalls; callIndex++)
            {
                if (callIndex > toolCallsAccJson.Count && requestSw.Elapsed > requestBudget)
                {
                    await SavePendingStateAsync();
                    await WriteEventAsync(new { needContinue = true });
                    stoppedForBudget = true;
                    break;
                }

                // 每一輪呼叫都重設 finalText，不要讓它跨輪累積——模型常常會在真的呼叫工具「之前」
                // 先吐一小段開場白文字（例如「我來幫您查詢...」）跟 tool_calls 一起回在同一輪，
                // 如果 finalText 一路往下疊加，等到真的被時間預算打斷、要判斷「這輪是不是正在
                // 生成最終答案」時，就會被前面幾輪工具呼叫附帶的開場白污染，誤判成「已經在講
                // 最終答案，只是被截斷」，讓下一輪續傳走錯分支（叫模型接著把一句開場白講完，
                // 而不是繼續原本該做的工具呼叫）。只有真正沒有 tool_calls 的那一輪（純粹在生成
                // 最終答案）的文字才有意義保留下去給續傳用。
                finalText = "";
                var forceFinalAnswer = callIndex == maxToolCalls;
                var (toolCall, truncated) = await llm.StreamChatAsync(
                    messages, toolDeclarations, forceFinalAnswer, requestSw, requestBudget,
                    chunk => { if (TryGetDelta(chunk, out var d)) finalText += d; return WriteEventAsync(chunk); },
                    useTier1: useTier1);

                if (truncated)
                {
                    await SavePendingStateAsync();
                    await WriteEventAsync(new { needContinue = true });
                    stoppedForBudget = true;
                    break;
                }

                if (toolCall is null)
                {
                    break; // 沒有工具呼叫，內容已經串流出去了
                }

                if (!allowedToolKeySet.Contains(toolCall.ToolName))
                {
                    // 雙重關卡的第二關：即使模型嘗試呼叫沒被授權的工具，這裡再擋一次。
                    _logger.LogWarning("[{RequestId}] 呼叫者嘗試呼叫未授權工具 {Tool}", requestId, toolCall.ToolName);
                    messages.Add(BuildAssistantToolCallMessage(toolCall));
                    messages.Add(new JsonObject { ["role"] = "tool", ["tool_call_id"] = toolCall.ToolCallId, ["content"] = "（此工具不在你的權限範圍內，無法呼叫）" });
                    continue;
                }

                await WriteEventAsync(new { status = $"正在查詢：{toolCall.ToolName}..." });

                string toolResultText;
                try
                {
                    // ToolName 對到 AgentDocumentTools 認得的三個固定 key 就走 in-process，否則
                    // 一定是同步進來的 MCP 工具（前面已經通過 allowedToolKeySet 授權檢查，不可能
                    // 是完全沒登記過的名字）——查 AgentTools 表拿 Source/McpEndpointId 決定要
                    // 呼叫哪一條執行路徑，兩種工具對 LLM 來說是同一份 tools 陣列，不需要特殊處理。
                    if (AgentDocumentTools.KnownToolKeys.Contains(toolCall.ToolName))
                    {
                        toolResultText = await _documentTools.ExecuteAsync(toolCall.ToolName, toolCall.Arguments, accessibleOrgIds, llm);
                    }
                    else
                    {
                        var mcpTool = await _db.AgentTools.AsNoTracking()
                            .FirstOrDefaultAsync(t => t.ToolKey == toolCall.ToolName && t.Source == AgentToolSource.McpEndpoint);
                        toolResultText = mcpTool is not null
                            ? await ExecuteMcpToolAsync(mcpTool, toolCall.Arguments, mcpClientCache, HttpContext.RequestAborted)
                            : "（找不到這個工具，可能已被管理員移除）";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[{RequestId}] 工具 {Tool} 執行失敗", requestId, toolCall.ToolName);
                    toolResultText = "（查詢時發生錯誤，請告知使用者稍後再試）";
                }

                messages.Add(BuildAssistantToolCallMessage(toolCall));
                messages.Add(new JsonObject { ["role"] = "tool", ["tool_call_id"] = toolCall.ToolCallId, ["content"] = toolResultText });

                var toolCallRecord = new JsonObject
                {
                    ["tool"] = toolCall.ToolName,
                    ["args"] = toolCall.Arguments.ToJsonString(),
                    ["result"] = toolResultText
                };
                toolCallsAccJson.Add(toolCallRecord.DeepClone());
                await WriteEventAsync(new { toolCall = new { tool = toolCall.ToolName, args = toolCall.Arguments.ToJsonString(), result = toolResultText } });
            }

            if (!stoppedForBudget)
            {
                await redisDb.KeyDeleteAsync(pendingStateKey);
                await SaveAssistantMessageAsync(conversation.Id, finalText, toolCallsAccJson, "Tier2");
                await WriteEventAsync(new { done = true });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{RequestId}] Agent 聊天串流發生錯誤", requestId);
            // 發生錯誤就不留半殘的續傳狀態——下次使用者重問，不該接回一段連伺服器自己都不確定
            // 走到哪裡、為什麼失敗的舊狀態。
            await redisDb.KeyDeleteAsync(pendingStateKey);
            await WriteEventAsync(new { error = ex.Message });
        }
        finally
        {
            foreach (var client in mcpClientCache.Values)
            {
                await client.DisposeAsync();
            }
        }
    }

    private async Task SaveAssistantMessageAsync(Guid conversationId, string text, JsonArray toolCallsAcc, string tier)
    {
        _db.AgentConversationMessages.Add(new AgentConversationMessage
        {
            ConversationId = conversationId,
            Role = "assistant",
            Content = text,
            ToolCallsJson = toolCallsAcc.Count > 0 ? toolCallsAcc.ToJsonString() : null
        });
        var conversation = await _db.AgentConversations.FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation is not null)
        {
            conversation.LastMessageAt = tool.GetTaiwanNow();
            conversation.LastTier = tier; // Tier1/Tier2 分流 sticky 規則要用，見 AgentConversation.LastTier 的說明
        }
        await _db.SaveChangesAsync();
    }

    private static JsonObject BuildAssistantToolCallMessage(AgentToolCallResult toolCall) => new()
    {
        ["role"] = "assistant",
        ["content"] = null,
        ["tool_calls"] = new JsonArray
        {
            new JsonObject
            {
                ["id"] = toolCall.ToolCallId,
                ["type"] = "function",
                ["function"] = new JsonObject { ["name"] = toolCall.ToolName, ["arguments"] = toolCall.Arguments.ToJsonString() }
            }
        }
    };

    private static bool TryGetDelta(object chunk, out string delta)
    {
        delta = "";
        var json = JsonSerializer.SerializeToElement(chunk);
        if (json.TryGetProperty("delta", out var d) && d.ValueKind == JsonValueKind.String)
        {
            delta = d.GetString() ?? "";
            return true;
        }
        return false;
    }

    /// <summary>
    /// 連帶回傳讀到的 AgentLiteLlmSetting——呼叫端（ChatStream）自己還要讀 MaxToolCalls/
    /// StreamRequestBudgetSeconds 等欄位，原本各自查一次，同一個請求裡把同一張單列設定表
    /// 查兩次是白白浪費一趟 DB round trip，這裡查一次共用。
    /// </summary>
    private async Task<(AgentLiteLlmClient? Client, AgentLiteLlmSetting? Setting)> BuildLlmClientAsync()
    {
        var setting = await _db.AgentLiteLlmSettings.AsNoTracking().FirstOrDefaultAsync();
        if (setting is null || string.IsNullOrEmpty(setting.ApiKeyEncrypted) || string.IsNullOrWhiteSpace(setting.BaseUrl))
        {
            return (null, setting);
        }

        string apiKey;
        try
        {
            apiKey = _protector.Unprotect(setting.ApiKeyEncrypted);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AgentLiteLlmSetting.ApiKey 解密失敗");
            return (null, setting);
        }

        var httpClient = _httpClientFactory.CreateClient();
        var client = new AgentLiteLlmClient(httpClient, apiKey, setting.BaseUrl, setting.Model,
            setting.EmbeddingModel, setting.MaxOutputTokens, _logger, setting.Tier1Model);
        return (client, setting);
    }

    private Guid? GetUserId()
    {
        var raw = User.FindFirst("sub")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(raw, out var id) ? id : null;
    }
}

using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[ApiController]
[Route("[controller]")]
public class GeminiController : ControllerBase
{
    // 預設的 JSON 逃逸規則會把中文字轉成 \uXXXX，資料被序列化兩層時（例如
    // toolArgs 先轉字串、再包進外層信封）前端只會解開外層，內層的逃逸序列
    // 就會以原始文字顯示。改用寬鬆逃逸規則，讓中文直接輸出原始字元。
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiController> _logger;
    private readonly ISHAuditDbcontext _db;
    private readonly ICurrentUserService _currentUser;

    public GeminiController(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<GeminiController> logger,
        ISHAuditDbcontext db,
        ICurrentUserService currentUser)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        _db = db;
        _currentUser = currentUser;
    }

    public class GeminiRequest
    {
        public string Text { get; set; } = string.Empty;

        /// <summary>
        /// 前一次請求已經查詢過、但因為單次請求時間預算或連線中斷而沒把答案生完的工具結果。
        /// 前端「繼續」時會把目前為止累積到的工具結果整包帶回來，後端據此接續對話，
        /// 不用重新查一次已經查過的資料。
        /// </summary>
        public List<PriorToolCallDto>? PriorToolCalls { get; set; }

        /// <summary>
        /// 前一次請求在「生成最終答案」這一輪被時間預算截斷時，目前為止已經吐出來的文字。
        /// 「繼續」時會把這段文字當作一則已完成的 assistant 回合塞回對話歷史，後面再接一則
        /// user 訊息明確指示模型接著講、不要重講，而不是每次都整段重新生成——不然如果
        /// 完整答案本身生成時間就超過單次請求預算，每次「繼續」都重來會永遠生不完、
        /// 變成無限迴圈。
        /// </summary>
        public string? PartialAnswer { get; set; }

        /// <summary>
        /// 自訂 system prompt，目前只有 /admin 的「AI 聊天測試」頁會帶這個欄位，用來讓
        /// 系統管理員試不同的 prompt 寫法；沒帶或空白就用 DefaultSystemInstruction。
        /// </summary>
        public string? SystemInstruction { get; set; }
    }

    public class PriorToolCallDto
    {
        public string Tool { get; set; } = string.Empty;
        public string Args { get; set; } = string.Empty;
        public string Result { get; set; } = string.Empty;
    }

    private const string DefaultSystemInstruction =
        "你是一個專業的績效指標平台小幫手，主要協助使用者查詢公司資料、KPI 績效指標、督導案件，以及製程安全相關法規與規範。\n\n" +
        "若使用者的問題涉及公司、KPI 指標或督導案件的實際資料，請使用提供的內部資料查詢工具取得資料後，再依查詢結果回答，不得自行推測或編造資料。\n\n" +
        "若使用者詢問製程安全相關的外部法規、標準、指引或主管機關規定，請使用提供的外部資料查詢工具，優先查詢政府機關、法規資料庫或具公信力的官方來源，並依查詢結果回答。" +
        "回答時應清楚說明法規名稱、適用範圍、重點要求及資料來源；若涉及法規版本或施行日期，應確認資料是否為現行有效版本。\n\n" +
        "若查無相關資料，請明確告知使用者目前無法取得足夠資訊，不得自行杜撰內容。\n\n" +
        "若問題與公司資料、KPI 績效指標、督導案件或製程安全相關法規無關，請婉拒回答，並說明你僅能協助上述範圍內的資料查詢問題。\n\n" +
        "回覆請保持專業、友善、清楚且具體。";

    // 對外公開聊天機器人可用的 MCP 工具白名單（未在 appsettings 設定 Mcp:AllowedTools 時的保守預設值）。
    // 含委員建議（Suggest）查詢工具，其中 list_suggest_reports_by_org／list_unresolved_suggestions／
    // list_unadopted_suggestions／get_org_suggest_history 會回傳委員姓名（Committee 欄位），
    // 已與產品確認為預期行為，非疏漏。
    private static readonly string[] DefaultAllowedTools =
    {
        "kpi_test_connection", "list_organizations", "list_kpi_fields", "list_kpi_items",
        "list_kpi_detail_items", "list_available_years", "overall_summary", "summary_by_field",
        "summary_by_organization", "summary_by_year", "summary_by_period", "kpi_summary_by_org",
        "kpi_detail_by_org", "kpi_trend_by_org", "list_unmet_kpis", "list_achieved_kpis",
        "find_detail_status", "rank_organizations", "rank_fields", "rank_detail_items",
        "compare_organizations", "compare_years", "compare_detail_across_orgs",
        "get_detail_history", "get_organization_profile", "get_field_profile",
        "list_suggestion_types", "list_suggest_event_types", "suggest_summary_by_org",
        "suggest_status_breakdown_by_org", "list_suggest_dates_by_org", "list_suggest_reports_by_org",
        "list_unresolved_suggestions", "list_unadopted_suggestions", "rank_organizations_by_suggestion_count",
        "suggest_summary_by_field", "suggest_summary_by_year", "get_org_suggest_history"
    };

    /// <summary>
    /// 取得目前正式生效的 system prompt（GeminiSettings 表裡存的值；沒存過就回內建預設值）。
    /// 給 /admin 的 AI 聊天測試頁載入用，讓管理員看到的是「現在真的在用的版本」。
    /// </summary>
    [HttpGet("system-instruction")]
    public async Task<IActionResult> GetSystemInstruction()
    {
        var setting = await _db.GeminiSettings.AsNoTracking().FirstOrDefaultAsync();
        return Ok(new
        {
            systemInstruction = setting?.SystemInstruction ?? DefaultSystemInstruction,
            isDefault = setting is null,
            updatedAt = setting?.UpdatedAt,
            updatedByUserName = setting?.UpdatedByUserName
        });
    }

    public class UpdateSystemInstructionRequest
    {
        public string SystemInstruction { get; set; } = string.Empty;
    }

    /// <summary>
    /// 把管理員在測試頁編輯好的 system prompt 存成正式預設值，之後所有沒有另外帶
    /// systemInstruction 的請求（包含一般使用者的「AI 查詢助理」）都會套用這個版本。
    /// 僅限有 setting-audit 權限的角色（跟能不能進 /admin 用同一個權限）才能呼叫。
    /// </summary>
    [HttpPut("system-instruction")]
    [Authorize(Policy = "Permission:setting-audit")]
    public async Task<IActionResult> UpdateSystemInstruction([FromBody] UpdateSystemInstructionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SystemInstruction))
        {
            return BadRequest(new { error = "System prompt 不能是空白" });
        }

        var setting = await _db.GeminiSettings.FirstOrDefaultAsync();
        if (setting is null)
        {
            setting = new GeminiSetting();
            _db.GeminiSettings.Add(setting);
        }

        setting.SystemInstruction = request.SystemInstruction;
        setting.UpdatedAt = tool.GetTaiwanNow();
        setting.UpdatedByUserId = _currentUser.UserId;
        setting.UpdatedByUserName = _currentUser.UserName;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Gemini system prompt 已更新，操作者 {UserName}（{UserId}）",
            _currentUser.UserName, _currentUser.UserId);

        return Ok(new
        {
            systemInstruction = setting.SystemInstruction,
            updatedAt = setting.UpdatedAt,
            updatedByUserName = setting.UpdatedByUserName
        });
    }

    /// <summary>
    /// 一般使用者的聊天視窗要不要顯示「第 X 次呼叫工具」透明化區塊——公開端點（只要登入就能
    /// 呼叫，不限管理員），因為懸浮視窗（AiChatConversation）每個一般使用者都要讀這個值來
    /// 決定畫面要不要顯示編號/參數/查詢結果。跟 system-instruction 分開兩支端點，避免管理員
    /// 只是想切這個開關，卻被迫連同 PUT system-instruction 那份必填的 prompt 文字一起送。
    /// </summary>
    [HttpGet("tool-call-visibility")]
    [Authorize]
    public async Task<IActionResult> GetToolCallVisibility()
    {
        var setting = await _db.GeminiSettings.AsNoTracking().FirstOrDefaultAsync();
        return Ok(new { showToolCallDetailsToUsers = setting?.ShowToolCallDetailsToUsers ?? false });
    }

    public class UpdateToolCallVisibilityRequest
    {
        public bool ShowToolCallDetailsToUsers { get; set; }
    }

    [HttpPut("tool-call-visibility")]
    [Authorize(Policy = "Permission:setting-audit")]
    public async Task<IActionResult> UpdateToolCallVisibility([FromBody] UpdateToolCallVisibilityRequest request)
    {
        var setting = await _db.GeminiSettings.FirstOrDefaultAsync();
        if (setting is null)
        {
            setting = new GeminiSetting { SystemInstruction = DefaultSystemInstruction };
            _db.GeminiSettings.Add(setting);
        }

        setting.ShowToolCallDetailsToUsers = request.ShowToolCallDetailsToUsers;
        setting.UpdatedAt = tool.GetTaiwanNow();
        setting.UpdatedByUserId = _currentUser.UserId;
        setting.UpdatedByUserName = _currentUser.UserName;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "Gemini 工具呼叫透明化開關已更新為 {Value}，操作者 {UserName}（{UserId}）",
            request.ShowToolCallDetailsToUsers, _currentUser.UserName, _currentUser.UserId);

        return Ok(new { showToolCallDetailsToUsers = setting.ShowToolCallDetailsToUsers });
    }

    /// <summary>
    /// 決定這次請求實際要用的 system prompt：請求裡明確帶的（測試頁還沒存檔前的暫時
    /// 覆蓋）優先；沒帶就用資料庫裡存的正式預設值；資料庫也沒有就用內建常數兜底。
    /// </summary>
    private async Task<string> ResolveSystemInstructionAsync(string? requestOverride)
    {
        if (!string.IsNullOrWhiteSpace(requestOverride))
        {
            return requestOverride;
        }

        var setting = await _db.GeminiSettings.AsNoTracking().FirstOrDefaultAsync();
        return setting?.SystemInstruction ?? DefaultSystemInstruction;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] GeminiRequest request)
    {
        var apiKey = _configuration["LiteLlm:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("LiteLlm ApiKey 未設定");
            return StatusCode(500, new { error = "LiteLLM API Key 未設定" });
        }

        var baseUrl = _configuration["LiteLlm:BaseUrl"];
        if (string.IsNullOrEmpty(baseUrl))
        {
            _logger.LogError("LiteLlm BaseUrl 未設定");
            return StatusCode(500, new { error = "LiteLLM Base URL 未設定" });
        }

        var model = _configuration["LiteLlm:Model"] ?? "claude-sonnet-4-6";
        var mcpEndpoint = _configuration["Mcp:Endpoint"];
        var userText = request.Text ?? string.Empty;
        var llmHttpClient = _httpClientFactory.CreateClient();

        var allowedTools = _configuration.GetSection("Mcp:AllowedTools").Get<string[]>();
        if (allowedTools is null || allowedTools.Length == 0)
        {
            allowedTools = DefaultAllowedTools;
        }

        try
        {
            JsonArray? toolDeclarations = null;
            McpClient? mcp = null;

            if (!string.IsNullOrEmpty(mcpEndpoint))
            {
                var mcpHttpClient = _httpClientFactory.CreateClient("mcp");
                mcp = new McpClient(mcpHttpClient, mcpEndpoint, new HashSet<string>(allowedTools), _logger);
                try
                {
                    await mcp.InitializeAsync();
                    toolDeclarations = await mcp.ListToolFunctionDeclarationsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "MCP 工具清單取得失敗，改以純對話模式回應");
                    mcp = null;
                    toolDeclarations = null;
                }
            }

            var messages = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] = await ResolveSystemInstructionAsync(request.SystemInstruction) },
                new JsonObject { ["role"] = "user", ["content"] = userText }
            };

            var firstResponse = await CallLlmAsync(llmHttpClient, apiKey, baseUrl, model, messages, toolDeclarations);
            var toolCall = ExtractToolCall(firstResponse);

            if (mcp is null || toolCall is null)
            {
                return Ok(new
                {
                    response = ExtractResponseText(firstResponse),
                    toolUsed = (string?)null,
                    toolArgs = (string?)null,
                    toolResult = (string?)null
                });
            }

            var (toolCallId, toolName, toolArgs) = toolCall.Value;

            _logger.LogInformation("LLM 要求呼叫 MCP 工具 {Tool}，參數：{Args}", toolName, toolArgs.ToJsonString(JsonOptions));

            string toolResultText;
            try
            {
                toolResultText = await mcp.CallToolAsync(toolName, toolArgs);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MCP 工具 {Tool} 呼叫失敗或逾時", toolName);
                toolResultText = "（查詢逾時或發生錯誤，請告知使用者稍後再試）";
            }

            messages.Add(new JsonObject
            {
                ["role"] = "assistant",
                ["content"] = null,
                ["tool_calls"] = new JsonArray
                {
                    new JsonObject
                    {
                        ["id"] = toolCallId,
                        ["type"] = "function",
                        ["function"] = new JsonObject
                        {
                            ["name"] = toolName,
                            ["arguments"] = toolArgs.ToJsonString(JsonOptions)
                        }
                    }
                }
            });
            messages.Add(new JsonObject
            {
                ["role"] = "tool",
                ["tool_call_id"] = toolCallId,
                ["content"] = toolResultText
            });

            var secondResponse = await CallLlmAsync(llmHttpClient, apiKey, baseUrl, model, messages, toolDeclarations);
            return Ok(new
            {
                response = ExtractResponseText(secondResponse),
                toolUsed = toolName,
                toolArgs = toolArgs.ToJsonString(JsonOptions),
                toolResult = toolResultText
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LiteLLM API 錯誤");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// 串流版本：以 Server-Sent Events 逐段回傳文字，讓聊天介面能邊生成邊顯示。
    /// 第一輪（帶 tools）也是串流，邊收 content delta 邊往外送，同時邊收 tool_calls delta 邊組裝；
    /// 若最終判斷模型是要呼叫工具，才在第二輪（不帶 tools）串流出根據查詢結果生成的最終答案。
    /// </summary>
    [HttpPost("stream")]
    public async Task StreamPost([FromBody] GeminiRequest request)
    {
        // 短請求編號：同一個容器裡可能同時處理多個聊天請求（例如使用者不小心連點兩次），
        // 每個請求的 log 各自帶編號，避免多個請求的 log 交錯在一起時分不清楚是哪一個。
        var requestId = Guid.NewGuid().ToString("N")[..8];

        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        async Task WriteEventAsync(object payload)
        {
            await Response.WriteAsync($"data: {JsonSerializer.Serialize(payload, JsonOptions)}\n\n");
            await Response.Body.FlushAsync();
        }

        _logger.LogInformation("[{RequestId}] 開始處理聊天串流請求", requestId);

        var apiKey = _configuration["LiteLlm:ApiKey"];
        if (string.IsNullOrEmpty(apiKey))
        {
            _logger.LogError("LiteLlm ApiKey 未設定");
            await WriteEventAsync(new { error = "LiteLLM API Key 未設定" });
            return;
        }

        var baseUrl = _configuration["LiteLlm:BaseUrl"];
        if (string.IsNullOrEmpty(baseUrl))
        {
            _logger.LogError("LiteLlm BaseUrl 未設定");
            await WriteEventAsync(new { error = "LiteLLM Base URL 未設定" });
            return;
        }

        var model = _configuration["LiteLlm:Model"] ?? "claude-sonnet-4-6";
        var mcpEndpoint = _configuration["Mcp:Endpoint"];
        var userText = request.Text ?? string.Empty;
        var llmHttpClient = _httpClientFactory.CreateClient();

        var allowedTools = _configuration.GetSection("Mcp:AllowedTools").Get<string[]>();
        if (allowedTools is null || allowedTools.Length == 0)
        {
            allowedTools = DefaultAllowedTools;
        }

        try
        {
            JsonArray? toolDeclarations = null;
            McpClient? mcp = null;

            if (!string.IsNullOrEmpty(mcpEndpoint))
            {
                var mcpHttpClient = _httpClientFactory.CreateClient("mcp");
                mcp = new McpClient(mcpHttpClient, mcpEndpoint, new HashSet<string>(allowedTools), _logger);
                try
                {
                    await mcp.InitializeAsync();
                    toolDeclarations = await mcp.ListToolFunctionDeclarationsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "MCP 工具清單取得失敗，改以純對話模式回應");
                    mcp = null;
                    toolDeclarations = null;
                }
            }

            var effectiveSystemInstruction = await ResolveSystemInstructionAsync(request.SystemInstruction);

            var messages = new JsonArray
            {
                new JsonObject { ["role"] = "system", ["content"] = effectiveSystemInstruction },
                new JsonObject { ["role"] = "user", ["content"] = userText }
            };

            // 「繼續」請求會把之前已經查過的工具結果整包帶回來，這裡原樣接回對話歷史，
            // 讓模型當作這些查詢本來就做過了，不用重查，直接接著判斷下一步。
            var priorToolCalls = request.PriorToolCalls ?? new List<PriorToolCallDto>();
            foreach (var prior in priorToolCalls)
            {
                var priorToolCallId = $"prior_{messages.Count}";
                messages.Add(new JsonObject
                {
                    ["role"] = "assistant",
                    ["content"] = null,
                    ["tool_calls"] = new JsonArray
                    {
                        new JsonObject
                        {
                            ["id"] = priorToolCallId,
                            ["type"] = "function",
                            ["function"] = new JsonObject
                            {
                                ["name"] = prior.Tool,
                                ["arguments"] = prior.Args
                            }
                        }
                    }
                });
                messages.Add(new JsonObject
                {
                    ["role"] = "tool",
                    ["tool_call_id"] = priorToolCallId,
                    ["content"] = prior.Result
                });
            }
            if (priorToolCalls.Count > 0)
            {
                _logger.LogInformation("[{RequestId}] 接續請求，帶入 {Count} 筆先前已查詢的工具結果", requestId, priorToolCalls.Count);
            }

            // 允許模型連續呼叫工具「一層一層查下去」（例如先查排名、再依排名結果查細項），
            // 而不是只認第一次工具呼叫。MaxToolCalls 是安全上限，避免模型陷入無限查詢迴圈、
            // 也控制 LiteLLM 額度消耗。到達上限那一輪改用 tool_choice=none 強制模型只能用
            // 現有資訊回答文字（仍要保留 tools 定義，理由見下方 StreamLlmAsync 呼叫處註解）。
            var maxToolCalls = _configuration.GetValue<int?>("LiteLlm:MaxToolCalls") ?? 8;

            // 正式站前面有一層外部逾時（觀測到是 30 秒，且無法從這個 repo 調整），多輪工具
            // 呼叫的長對話很容易超過。與其硬跑到被外部強制斷線、讓使用者只看到 network error、
            // 什麼都拿不到，改成每次請求只在這個時間預算內做事，一旦超過就主動停下來、
            // 明確告訴前端「還沒做完，可以按繼續」，讓使用者能接續，而不是無預警斷在半路。
            // 這裡「準備開始下一輪前」的檢查只擋得住「工具呼叫輪數疊加超過預算」的情況；
            // 若是單一輪本身（尤其是生成最終答案、逐字串流那一輪）就跑很久，得靠傳進
            // StreamLlmAsync 的同一個 requestSw/requestBudget 在串流讀取迴圈內部再檢查一次，
            // 見該方法內的中途中斷處理。
            var requestBudget = TimeSpan.FromSeconds(_configuration.GetValue<double?>("LiteLlm:StreamRequestBudgetSeconds") ?? 15);
            var requestSw = System.Diagnostics.Stopwatch.StartNew();
            var stoppedForBudget = false;

            // 帶了 partialAnswer：代表上次已經進到「生成最終答案」這一輪、被時間預算截斷。
            // 原本想用 Claude 的 assistant prefill 機制接續（把已生成內容塞成對話最後一則
            // assistant 訊息），但這個部署是走 Vertex AI，經實測 Vertex AI 上的 Claude
            // 不支援 prefill（LiteLLM 會回 400：This model does not support assistant
            // message prefill. The conversation must end with a user message.）。
            // 改成：把已生成的內容當一則正常的 assistant 回合放進歷史（不是對話的最後一則），
            // 後面再接一則 user 訊息明確指示「接著講、不要重講」，滿足「必須以 user 訊息
            // 結尾」的限制。這不是逐字精確接續（模型可能措辭跟直接接續略有不同），但至少
            // 能讓對話繼續往前推進，不會卡在無法送出請求。這裡不再走下面工具呼叫的 for
            // 迴圈——已經確定沒有更多工具要查了，只是單純把答案講完，所以強制
            // tool_choice=none，直接呼叫一次就結束這個請求。
            if (!string.IsNullOrEmpty(request.PartialAnswer))
            {
                messages.Add(new JsonObject
                {
                    ["role"] = "assistant",
                    ["content"] = request.PartialAnswer
                });
                messages.Add(new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = "你上面的回答被系統中斷了，只講到一半。請直接接著把剩下的部分講完，" +
                        "自然銜接前面已經講的內容，不要重複前面說過的話，也不要說「好的，我接著說」" +
                        "之類的開場白，直接從中斷處繼續寫下去就好。"
                });

                _logger.LogInformation(
                    "[{RequestId}] 接續請求，指示模型接著把最終答案講完（已有 {Length} 字）",
                    requestId, request.PartialAnswer.Length);

                var (_, _, _, continuedTruncated) = await StreamLlmAsync(
                    llmHttpClient, apiKey, baseUrl, model, messages, toolDeclarations, true,
                    requestId, requestSw, requestBudget, WriteEventAsync);

                if (continuedTruncated)
                {
                    _logger.LogInformation("[{RequestId}] 接續生成仍未在預算內講完，再次暫停等待前端續傳", requestId);
                    await WriteEventAsync(new { needContinue = true });
                }
                else
                {
                    await WriteEventAsync(new { done = true });
                    _logger.LogInformation("[{RequestId}] 聊天串流請求結束（接續生成完成）", requestId);
                }
                return;
            }

            for (var callIndex = priorToolCalls.Count; callIndex <= maxToolCalls; callIndex++)
            {
                if (callIndex > priorToolCalls.Count && requestSw.Elapsed > requestBudget)
                {
                    _logger.LogInformation(
                        "[{RequestId}] 已達單次請求時間預算（{Elapsed}ms），暫停等待前端續傳（第 {Round} 輪前）",
                        requestId, requestSw.ElapsedMilliseconds, callIndex + 1);
                    await WriteEventAsync(new { needContinue = true });
                    stoppedForBudget = true;
                    break;
                }

                var forceFinalAnswer = callIndex == maxToolCalls;
                var (toolCallId, toolName, rawToolArgs, truncated) = await StreamLlmAsync(
                    llmHttpClient, apiKey, baseUrl, model, messages, toolDeclarations, forceFinalAnswer,
                    requestId, requestSw, requestBudget, WriteEventAsync);

                if (truncated)
                {
                    // 這一輪（很可能是生成最終答案、正在逐字串流那一輪）跑到一半就碰到時間
                    // 預算，主動中斷。已經送出去的文字前端會留著，「繼續」時帶回來接著講
                    // （見上面 partialAnswer 那段），不會整段重講、也不會因為完整答案本身
                    // 就講不完 15 秒而卡在無限重來的迴圈。
                    _logger.LogInformation(
                        "[{RequestId}] 這一輪內容生成到一半就達到時間預算，暫停等待前端續傳（第 {Round} 輪）",
                        requestId, callIndex + 1);
                    await WriteEventAsync(new { needContinue = true });
                    stoppedForBudget = true;
                    break;
                }

                if (mcp is null || toolName is null || rawToolArgs is null)
                {
                    // 沒有（或不再允許）工具呼叫：內容已經在這次 StreamLlmAsync 呼叫裡即時串流出去了。
                    _logger.LogInformation("[{RequestId}] 沒有工具呼叫，結束迴圈（第 {Round} 輪）", requestId, callIndex + 1);
                    break;
                }

                var toolArgs = rawToolArgs;
                var safeToolCallId = string.IsNullOrEmpty(toolCallId) ? $"call_{callIndex + 1}" : toolCallId;

                _logger.LogInformation(
                    "[{RequestId}] LLM 要求呼叫 MCP 工具 {Tool}（第 {Round} 次），參數：{Args}",
                    requestId, toolName, callIndex + 1, toolArgs.ToJsonString(JsonOptions));

                // 查詢期間完全沒有 delta 事件送出，畫面上會像卡住，先送一個狀態事件
                // 讓前端能顯示「查詢中」而不是整段靜默。
                await WriteEventAsync(new { status = $"正在查詢：{toolName}..." });

                string toolResultText;
                try
                {
                    toolResultText = await mcp.CallToolAsync(toolName, toolArgs);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "MCP 工具 {Tool} 呼叫失敗或逾時", toolName);
                    toolResultText = "（查詢逾時或發生錯誤，請告知使用者稍後再試）";
                }

                messages.Add(new JsonObject
                {
                    ["role"] = "assistant",
                    ["content"] = null,
                    ["tool_calls"] = new JsonArray
                    {
                        new JsonObject
                        {
                            ["id"] = safeToolCallId,
                            ["type"] = "function",
                            ["function"] = new JsonObject
                            {
                                ["name"] = toolName,
                                ["arguments"] = toolArgs.ToJsonString(JsonOptions)
                            }
                        }
                    }
                });
                messages.Add(new JsonObject
                {
                    ["role"] = "tool",
                    ["tool_call_id"] = safeToolCallId,
                    ["content"] = toolResultText
                });

                // 每完成一次工具呼叫就立刻通知前端，讓「已呼叫工具」清單能即時一筆一筆顯示，
                // 不用等到整段對話結束才一次看到。
                await WriteEventAsync(new
                {
                    toolCall = new
                    {
                        tool = toolName,
                        args = toolArgs.ToJsonString(JsonOptions),
                        result = toolResultText
                    }
                });
            }

            if (!stoppedForBudget)
            {
                await WriteEventAsync(new { done = true });
                _logger.LogInformation("[{RequestId}] 聊天串流請求結束", requestId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{RequestId}] LiteLLM API 錯誤（串流）", requestId);
            await WriteEventAsync(new { error = ex.Message });
        }
    }

    /// <summary>
    /// 診斷用端點：確認 MCP endpoint 連線、initialize、tools/list 是否正常，
    /// 並比對伺服器實際回傳的工具名稱與 Mcp:AllowedTools 白名單是否一致。
    /// 部署後用 GET 打一次即可，不用特地想一句會觸發查資料的聊天內容。
    /// </summary>
    [HttpGet("mcp-health")]
    public async Task<IActionResult> McpHealth()
    {
        var mcpEndpoint = _configuration["Mcp:Endpoint"];
        if (string.IsNullOrEmpty(mcpEndpoint))
        {
            return Ok(new { configured = false, reachable = false, message = "Mcp:Endpoint 未設定" });
        }

        var allowedTools = _configuration.GetSection("Mcp:AllowedTools").Get<string[]>();
        if (allowedTools is null || allowedTools.Length == 0)
        {
            allowedTools = DefaultAllowedTools;
        }
        var allowedSet = new HashSet<string>(allowedTools);

        var mcpHttpClient = _httpClientFactory.CreateClient("mcp");
        var mcp = new McpClient(mcpHttpClient, mcpEndpoint, allowedSet, _logger);

        try
        {
            await mcp.InitializeAsync();
            var serverTools = await mcp.ListAllToolNamesAsync();

            if (serverTools is null)
            {
                return Ok(new
                {
                    configured = true,
                    reachable = true,
                    endpoint = mcpEndpoint,
                    message = "initialize 成功，但 tools/list 沒有回傳 tools 陣列"
                });
            }

            string? dbConnectionResult = null;
            string? dbConnectionError = null;
            if (serverTools.Contains("kpi_test_connection"))
            {
                try
                {
                    dbConnectionResult = await mcp.CallToolAsync("kpi_test_connection", new JsonObject());
                }
                catch (Exception ex)
                {
                    dbConnectionError = ex.Message;
                }
            }

            return Ok(new
            {
                configured = true,
                reachable = true,
                endpoint = mcpEndpoint,
                serverToolCount = serverTools.Count,
                serverTools,
                allowedToolCount = allowedSet.Count,
                matchedAllowedTools = serverTools.Where(allowedSet.Contains).ToList(),
                allowedToolsNotFoundOnServer = allowedSet.Except(serverTools).ToList(),
                dbConnectionResult,
                dbConnectionError
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "MCP health check 失敗");
            return StatusCode(503, new
            {
                configured = true,
                reachable = false,
                endpoint = mcpEndpoint,
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// 呼叫 LiteLLM proxy（OpenAI 相容的 /v1/chat/completions），底層實際模型由 LiteLlm:Model 決定。
    /// </summary>
    private async Task<JsonNode?> CallLlmAsync(
        HttpClient client, string apiKey, string baseUrl, string model, JsonArray messages, JsonArray? toolDeclarations)
    {
        var maxTokens = _configuration.GetValue<int?>("LiteLlm:MaxOutputTokens") ?? 4096;
        var payload = new JsonObject
        {
            ["model"] = model,
            ["messages"] = messages.DeepClone(),
            ["max_tokens"] = maxTokens
        };
        if (toolDeclarations is not null && toolDeclarations.Count > 0)
        {
            payload["tools"] = toolDeclarations.DeepClone();
            payload["tool_choice"] = "auto";
        }

        var url = $"{baseUrl.TrimEnd('/')}/v1/chat/completions";
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(payload.ToJsonString(JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Authorization", $"Bearer {apiKey}");

        var response = await client.SendAsync(request);
        var responseJson = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("LiteLLM API 回傳錯誤: {StatusCode} {Body}", response.StatusCode, responseJson);
            throw new InvalidOperationException($"LiteLLM API 呼叫失敗：{response.StatusCode} {Truncate(responseJson, 300)}");
        }

        var result = JsonNode.Parse(responseJson);
        var finishReason = result?["choices"]?[0]?["finish_reason"]?.GetValue<string>();
        if (finishReason == "length")
        {
            _logger.LogWarning(
                "LiteLLM 回應因達到 token 上限被截斷，maxOutputTokens={MaxOutputTokens}",
                maxTokens);
        }

        return result;
    }

    /// <summary>
    /// 串流呼叫 LiteLLM proxy（stream: true）。content delta 會即時透過 onChunk 往外送；
    /// 若有帶 tools 且模型決定呼叫工具，tool_calls delta（含分段送來的 arguments 字串）會邊收邊組，
    /// 组好後以 (ToolCallId, ToolName, ToolArgs) 回傳；沒有工具呼叫則三者皆為 null。
    /// forceFinalAnswer 為 true 時會設定 tool_choice=none，強制模型只能用現有資訊回答文字，
    /// 但仍保留 tools 定義（Anthropic API 規定：對話歷史出現過 tool_use 就必須持續帶 tools，
    /// 否則 LiteLLM 會塞入佔位用的 dummy_tool，可能讓模型誤呼叫它而生不出文字）。
    /// requestSw/requestBudget 是跟呼叫端共用的同一個計時器：外層迴圈只在「輪與輪之間」擋得住
    /// 預算超支，若正在生成的這一輪本身（尤其是最終答案逐字串流）就跑很久，得在這裡逐行檢查，
    /// 一旦超過就主動中斷，回傳 Truncated=true，讓呼叫端知道這輪沒有正常結束、內容要整個丟棄。
    /// </summary>
    private async Task<(string? ToolCallId, string? ToolName, JsonObject? ToolArgs, bool Truncated)> StreamLlmAsync(
        HttpClient client, string apiKey, string baseUrl, string model, JsonArray messages,
        JsonArray? toolDeclarations, bool forceFinalAnswer, string requestId,
        System.Diagnostics.Stopwatch requestSw, TimeSpan requestBudget, Func<object, Task> onChunk)
    {
        var maxTokens = _configuration.GetValue<int?>("LiteLlm:MaxOutputTokens") ?? 4096;
        var payload = new JsonObject
        {
            ["model"] = model,
            ["messages"] = messages.DeepClone(),
            ["max_tokens"] = maxTokens,
            ["stream"] = true
        };
        if (toolDeclarations is not null && toolDeclarations.Count > 0)
        {
            payload["tools"] = toolDeclarations.DeepClone();
            payload["tool_choice"] = forceFinalAnswer ? "none" : "auto";
        }

        var url = $"{baseUrl.TrimEnd('/')}/v1/chat/completions";
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(payload.ToJsonString(JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Authorization", $"Bearer {apiKey}");

        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            _logger.LogError("[{RequestId}] LiteLLM API 回傳錯誤（串流）: {StatusCode} {Body}", requestId, response.StatusCode, body);
            throw new InvalidOperationException($"LiteLLM API 呼叫失敗：{response.StatusCode} {Truncate(body, 300)}");
        }

        await using var stream = await response.Content.ReadAsStreamAsync();
        using var reader = new StreamReader(stream);

        string? toolCallId = null;
        string? toolName = null;
        var toolArgsRaw = new StringBuilder();
        var sawToolCall = false;
        int? activeToolCallIndex = null;
        var contentChunkCount = 0;

        // LiteLLM/模型是照 token 切段送出 content，emoji 等需要 UTF-16 surrogate pair
        // 表示的字元，pair 的前半段可能剛好落在某個 chunk 結尾。這裡扣住不完整的前半段，
        // 跟下一個 chunk 接起來再送，避免序列化成無效字元（顯示為 U+FFFD 亂碼）。
        char? pendingHighSurrogate = null;

        // 保險用的整體逾時：避免上游串流卡住不結束、也不報錯時，讓使用者永遠卡在「思考中」。
        using var readCts = new CancellationTokenSource(TimeSpan.FromSeconds(90));
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var truncatedForBudget = false;
        _logger.LogInformation("[{RequestId}] [串流讀取] 開始讀取 LiteLLM 回應本體", requestId);

        while (!reader.EndOfStream)
        {
            // 正式站前面的外部逾時管不到、也調不了，這裡是唯一能在「內容還在逐字吐出來」
            // 這種情況下即時煞車的地方——每讀一行就檢查一次，一旦超過單次請求的時間預算，
            // 立刻停止繼續讀取，把這一輪整個標記為截斷，交回呼叫端處理（丟棄、讓前端繼續）。
            if (requestSw.Elapsed > requestBudget)
            {
                _logger.LogInformation(
                    "[{RequestId}] [串流讀取] 已達單次請求時間預算，主動中斷這一輪的內容生成，經過 {Elapsed}ms",
                    requestId, sw.ElapsedMilliseconds);
                truncatedForBudget = true;
                break;
            }

            string? line;
            try
            {
                line = await reader.ReadLineAsync(readCts.Token);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("[{RequestId}] [串流讀取] 讀取逾時（90秒），提前中斷，經過 {Elapsed}ms", requestId, sw.ElapsedMilliseconds);
                break;
            }

            if (string.IsNullOrEmpty(line) || !line.StartsWith("data:"))
            {
                continue;
            }

            var jsonPart = line["data:".Length..].Trim();
            if (jsonPart.Length == 0 || jsonPart == "[DONE]")
            {
                continue;
            }

            JsonNode? chunk;
            try
            {
                chunk = JsonNode.Parse(jsonPart);
            }
            catch (JsonException)
            {
                continue;
            }

            var delta = chunk?["choices"]?[0]?["delta"];

            var content = delta?["content"]?.GetValue<string>();
            if (!string.IsNullOrEmpty(content))
            {
                if (pendingHighSurrogate is char leadSurrogate)
                {
                    content = leadSurrogate + content;
                    pendingHighSurrogate = null;
                }

                if (content.Length > 0 && char.IsHighSurrogate(content[^1]))
                {
                    pendingHighSurrogate = content[^1];
                    content = content[..^1];
                }

                if (content.Length > 0)
                {
                    contentChunkCount++;
                    await onChunk(new { delta = content });
                }
            }

            var toolCallDelta = delta?["tool_calls"]?.AsArray()?.FirstOrDefault();

            if (toolCallDelta is not null)
            {
                // 模型可能平行呼叫多個工具，每個片段用 index 區分屬於哪一個 tool call。
                // 我們的設計只支援單一工具查詢（跟非串流版本的 ExtractToolCall 只取
                // tool_calls[0] 一致），所以只累積「第一個出現的 index」的片段，
                // 忽略其他 index，避免不同工具的 arguments 字串被誤接在一起。
                var index = toolCallDelta["index"]?.GetValue<int>() ?? 0;
                activeToolCallIndex ??= index;

                if (index == activeToolCallIndex)
                {
                    sawToolCall = true;

                    var id = toolCallDelta["id"]?.GetValue<string>();
                    if (!string.IsNullOrEmpty(id))
                    {
                        toolCallId = id;
                    }

                    var name = toolCallDelta["function"]?["name"]?.GetValue<string>();
                    if (!string.IsNullOrEmpty(name))
                    {
                        toolName = name;
                    }

                    var argsPiece = toolCallDelta["function"]?["arguments"]?.GetValue<string>();
                    if (!string.IsNullOrEmpty(argsPiece))
                    {
                        toolArgsRaw.Append(argsPiece);
                    }
                }
            }
        }

        if (truncatedForBudget)
        {
            // 不管截斷當下已經收到多少 content 或 tool_calls 片段，都當作不完整、不能用：
            // 半截的答案文字已經請前端整段丟棄，半截的 tool_calls 參數也可能不是合法 JSON，
            // 與其冒險去解析可能不完整的資料，不如整輪重做比較穩妥。
            return (null, null, null, true);
        }

        if (pendingHighSurrogate is char danglingSurrogate)
        {
            // 串流結束時還扣著一個沒等到下半段的 surrogate，正常不該發生，
            // 送出去總比默默丟掉好（極端邊界情況的保底處理）。
            await onChunk(new { delta = danglingSurrogate.ToString() });
        }

        _logger.LogInformation(
            "[{RequestId}] [串流讀取] LiteLLM 回應本體讀取結束，經過 {Elapsed}ms，內容片段數 {ContentChunks}，有工具呼叫 {SawToolCall}",
            requestId, sw.ElapsedMilliseconds, contentChunkCount, sawToolCall);

        if (!sawToolCall || string.IsNullOrEmpty(toolName))
        {
            return (null, null, null, false);
        }

        JsonObject toolArgs;
        try
        {
            toolArgs = JsonNode.Parse(toolArgsRaw.ToString()) as JsonObject ?? new JsonObject();
        }
        catch (JsonException)
        {
            toolArgs = new JsonObject();
        }

        return (toolCallId, toolName, toolArgs, false);
    }

    private static string ExtractResponseText(JsonNode? response)
    {
        return response?["choices"]?[0]?["message"]?["content"]?.GetValue<string>() ?? "";
    }

    /// <summary>
    /// LiteLLM 回傳的錯誤 body 有時很長（完整 stack trace 或一長串 JSON），直接整包送給前端
    /// 顯示不實用，截斷到一個看得出原因但不會把聊天視窗塞爆的長度。
    /// </summary>
    private static string Truncate(string text, int maxLength)
    {
        return text.Length <= maxLength ? text : text[..maxLength] + "…";
    }

    /// <summary>
    /// 取出第一個 tool call（OpenAI 相容格式的 arguments 是 JSON 字串，需另外解析）。
    /// 目前設計上一次只處理一個 tool call，符合現有的單工具查詢流程。
    /// </summary>
    private static (string Id, string Name, JsonObject Arguments)? ExtractToolCall(JsonNode? response)
    {
        var toolCalls = response?["choices"]?[0]?["message"]?["tool_calls"]?.AsArray();
        var first = toolCalls?.FirstOrDefault();
        if (first is null)
        {
            return null;
        }

        var id = first["id"]?.GetValue<string>() ?? "";
        var name = first["function"]?["name"]?.GetValue<string>() ?? "";
        var argumentsRaw = first["function"]?["arguments"]?.GetValue<string>() ?? "{}";

        JsonObject arguments;
        try
        {
            arguments = JsonNode.Parse(argumentsRaw) as JsonObject ?? new JsonObject();
        }
        catch (JsonException)
        {
            arguments = new JsonObject();
        }

        return (id, name, arguments);
    }

    /// <summary>
    /// 對 MCP (Model Context Protocol) server 的最小 JSON-RPC 客戶端。
    /// 只實作串接 function calling 所需的 initialize / tools/list / tools/call。
    /// </summary>
    private sealed class McpClient
    {
        private readonly HttpClient _http;
        private readonly string _endpoint;
        private readonly HashSet<string> _allowedTools;
        private readonly ILogger _logger;
        private string? _sessionId;
        private int _nextId = 1;

        public McpClient(HttpClient http, string endpoint, HashSet<string> allowedTools, ILogger logger)
        {
            _http = http;
            _endpoint = endpoint;
            _allowedTools = allowedTools;
            _logger = logger;
        }

        public async Task InitializeAsync()
        {
            var initParams = new JsonObject
            {
                ["protocolVersion"] = "2025-03-26",
                ["capabilities"] = new JsonObject(),
                ["clientInfo"] = new JsonObject { ["name"] = "kpi-gemini-bridge", ["version"] = "1.0.0" }
            };
            await SendRequestAsync("initialize", initParams);
            await SendNotificationAsync("notifications/initialized", null);
        }

        private async Task<JsonArray?> FetchToolsAsync()
        {
            var result = await SendRequestAsync("tools/list", null);
            return result?["tools"]?.AsArray();
        }

        public async Task<List<string>?> ListAllToolNamesAsync()
        {
            var mcpTools = await FetchToolsAsync();
            return mcpTools
                ?.Select(t => t?["name"]?.GetValue<string>())
                .Where(n => !string.IsNullOrEmpty(n))
                .Select(n => n!)
                .ToList();
        }

        /// <summary>
        /// 轉成 OpenAI 相容的 tools 格式：[{ type: "function", function: { name, description, parameters } }]。
        /// MCP 的 inputSchema 本來就是標準 JSON Schema（小寫 type），可直接沿用，不需要像 Gemini 那樣轉大寫。
        /// </summary>
        public async Task<JsonArray?> ListToolFunctionDeclarationsAsync()
        {
            var mcpTools = await FetchToolsAsync();
            if (mcpTools is null)
            {
                return null;
            }

            var declarations = new JsonArray();
            foreach (var tool in mcpTools)
            {
                var name = tool?["name"]?.GetValue<string>();
                if (string.IsNullOrEmpty(name) || !_allowedTools.Contains(name))
                {
                    continue;
                }

                var function = new JsonObject
                {
                    ["name"] = name,
                    ["description"] = tool?["description"]?.GetValue<string>() ?? ""
                };

                var inputSchema = tool?["inputSchema"]?.DeepClone();
                if (inputSchema is not null)
                {
                    function["parameters"] = inputSchema;
                }

                declarations.Add(new JsonObject
                {
                    ["type"] = "function",
                    ["function"] = function
                });
            }

            return declarations;
        }

        public async Task<string> CallToolAsync(string name, JsonObject arguments)
        {
            if (!_allowedTools.Contains(name))
            {
                _logger.LogWarning("LLM 嘗試呼叫不在白名單內的 MCP 工具 {Tool}，已拒絕", name);
                return "（此工具不在允許清單內，無法查詢）";
            }

            var @params = new JsonObject { ["name"] = name, ["arguments"] = arguments.DeepClone() };
            var result = await SendRequestAsync("tools/call", @params);

            var sb = new StringBuilder();
            if (result?["content"]?.AsArray() is JsonArray contentArray)
            {
                foreach (var item in contentArray)
                {
                    var text = item?["text"]?.GetValue<string>();
                    if (text is not null)
                    {
                        sb.AppendLine(text);
                    }
                }
            }

            if (result?["isError"]?.GetValue<bool>() == true)
            {
                _logger.LogWarning("MCP 工具 {Tool} 回傳錯誤：{Content}", name, sb.ToString());
            }

            return sb.ToString();
        }

        private async Task<JsonNode?> SendRequestAsync(string method, JsonObject? @params)
        {
            var requestBody = new JsonObject
            {
                ["jsonrpc"] = "2.0",
                ["id"] = _nextId++,
                ["method"] = method
            };
            if (@params is not null)
            {
                requestBody["params"] = @params;
            }

            var responseBody = await PostAsync(requestBody);
            var node = ParseJsonRpcBody(responseBody);

            if (node?["error"] is not null)
            {
                throw new InvalidOperationException($"MCP 錯誤 ({method})：{node["error"]!.ToJsonString(JsonOptions)}");
            }

            return node?["result"];
        }

        private async Task SendNotificationAsync(string method, JsonObject? @params)
        {
            var requestBody = new JsonObject { ["jsonrpc"] = "2.0", ["method"] = method };
            if (@params is not null)
            {
                requestBody["params"] = @params;
            }

            await PostAsync(requestBody);
        }

        private async Task<string> PostAsync(JsonObject requestBody)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, _endpoint)
            {
                Content = new StringContent(requestBody.ToJsonString(JsonOptions), Encoding.UTF8, "application/json")
            };
            request.Headers.Add("Accept", "application/json, text/event-stream");
            if (_sessionId is not null)
            {
                request.Headers.Add("Mcp-Session-Id", _sessionId);
            }

            var response = await _http.SendAsync(request);

            if (response.Headers.TryGetValues("Mcp-Session-Id", out var sessionValues))
            {
                _sessionId = sessionValues.FirstOrDefault();
            }

            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                var method = requestBody["method"]?.GetValue<string>();
                throw new InvalidOperationException($"MCP 呼叫失敗 ({method})：{response.StatusCode} {body}");
            }

            return body;
        }

        // Streamable HTTP transport 回應可能是純 JSON，也可能是 text/event-stream
        // 格式（多行 "data: {...}"），兩種都要能解析出最後一段 JSON-RPC 訊息。
        private static JsonNode? ParseJsonRpcBody(string body)
        {
            if (!body.TrimStart().StartsWith("data:"))
            {
                return string.IsNullOrWhiteSpace(body) ? null : JsonNode.Parse(body);
            }

            JsonNode? last = null;
            foreach (var rawLine in body.Split('\n'))
            {
                var line = rawLine.TrimEnd('\r');
                if (!line.StartsWith("data:"))
                {
                    continue;
                }

                var jsonPart = line[5..].Trim();
                if (jsonPart.Length > 0)
                {
                    last = JsonNode.Parse(jsonPart);
                }
            }

            return last;
        }
    }
}

using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace WebAPI1.Services;

public record AgentToolCallResult(string ToolCallId, string ToolName, JsonObject Arguments);

/// <summary>
/// LiteLLM（OpenAI-compatible /v1/chat/completions、/v1/embeddings）呼叫封裝，AgentController 專用。
/// 跟 GeminiController 內部的 StreamLlmAsync/CallLlmAsync 是同樣的協定、刻意各自維護一份
/// （見架構計畫：不做成兩個 controller 共用的 helper，換取兩條路完全不互相牽動）。
/// </summary>
public class AgentLiteLlmClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly string _baseUrl;
    private readonly string _model;
    private readonly string? _tier1Model;
    private readonly string _embeddingModel;
    private readonly int _maxOutputTokens;
    private readonly ILogger _logger;

    /// <summary>Tier 1 model 有沒有設定——設定畫面/router 用來判斷要不要分流。</summary>
    public bool HasTier1Model => !string.IsNullOrWhiteSpace(_tier1Model);

    public AgentLiteLlmClient(HttpClient http, string apiKey, string baseUrl, string model,
        string embeddingModel, int maxOutputTokens, ILogger logger, string? tier1Model = null)
    {
        _http = http;
        _apiKey = apiKey;
        _baseUrl = baseUrl.TrimEnd('/');
        _model = model;
        _tier1Model = tier1Model;
        _embeddingModel = embeddingModel;
        _maxOutputTokens = maxOutputTokens;
        _logger = logger;
    }

    /// <summary>呼叫 LiteLLM 的 /v1/models，列出目前可用的 model id，給設定畫面做下拉選單用。</summary>
    public async Task<List<string>> GetAvailableModelsAsync(CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/v1/models");
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");

        var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"LiteLLM /v1/models 呼叫失敗：{response.StatusCode} {Truncate(body, 300)}");
        }

        var result = JsonNode.Parse(body);
        var data = result?["data"]?.AsArray();
        if (data is null)
        {
            return new List<string>();
        }

        return data
            .Select(m => m?["id"]?.GetValue<string>())
            .Where(id => !string.IsNullOrEmpty(id))
            .Select(id => id!)
            .OrderBy(id => id)
            .ToList();
    }

    public async Task<float[]> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        var payload = new JsonObject
        {
            ["model"] = _embeddingModel,
            ["input"] = text
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v1/embeddings")
        {
            Content = new StringContent(payload.ToJsonString(JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");

        var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"LiteLLM embeddings 呼叫失敗：{response.StatusCode} {Truncate(body, 300)}");
        }

        var result = JsonNode.Parse(body);
        var vectorNode = result?["data"]?[0]?["embedding"]?.AsArray();
        if (vectorNode is null)
        {
            throw new InvalidOperationException("LiteLLM embeddings 回應格式不符預期");
        }

        return vectorNode.Select(n => (float)n!.GetValue<double>()).ToArray();
    }

    /// <summary>把圖片（連同問題）丟給帶視覺能力的 chat model，回傳純文字判讀結果。</summary>
    public async Task<string> AnalyzeImageAsync(byte[] imageBytes, string mimeType, string question, CancellationToken ct = default)
    {
        var base64 = Convert.ToBase64String(imageBytes);
        var payload = new JsonObject
        {
            ["model"] = _model,
            ["max_tokens"] = _maxOutputTokens,
            ["messages"] = new JsonArray
            {
                new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = new JsonArray
                    {
                        new JsonObject { ["type"] = "text", ["text"] = question },
                        new JsonObject
                        {
                            ["type"] = "image_url",
                            ["image_url"] = new JsonObject { ["url"] = $"data:{mimeType};base64,{base64}" }
                        }
                    }
                }
            }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v1/chat/completions")
        {
            Content = new StringContent(payload.ToJsonString(JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");

        var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"LiteLLM 圖片判讀呼叫失敗：{response.StatusCode} {Truncate(body, 300)}");
        }

        var result = JsonNode.Parse(body);
        return result?["choices"]?[0]?["message"]?["content"]?.GetValue<string>() ?? "";
    }

    /// <summary>
    /// 串流呼叫 chat completions。content delta 即時透過 onChunk 送出；若模型決定呼叫工具，
    /// 回傳工具呼叫資訊（呼叫端自己執行工具，這裡不做任何工具派發）。
    /// forceFinalAnswer 為 true 時 tool_choice=none，仍保留 tools 定義（Anthropic 規則：
    /// 對話歷史出現過 tool_use 就必須持續帶 tools，否則可能塞入 dummy tool 干擾輸出）。
    /// </summary>
    public async Task<(AgentToolCallResult? ToolCall, bool Truncated)> StreamChatAsync(
        JsonArray messages, JsonArray? tools, bool forceFinalAnswer,
        System.Diagnostics.Stopwatch requestSw, TimeSpan requestBudget,
        Func<object, Task> onChunk, CancellationToken ct = default, bool useTier1 = false)
    {
        // Tier 1（便宜/快）刻意在這裡強制不帶工具，不看呼叫端傳了什麼 tools 進來——
        // 小模型對「該不該呼叫工具、把結果整理成文字」不穩定，實測會出現假造工具呼叫格式、
        // 停不下來一直呼叫等問題，所以 Tier 1 一律當純聊天模型用，工具權限只給 Tier 2。
        var effectiveTools = useTier1 ? null : tools;

        // Anthropic prompt caching：只套在 Tier 2（貴的模型）——Tier 1 對話短、model 也便宜，
        // 加這層沒有實益。工具呼叫迴圈每多一輪，就是在 messages 陣列後面疊 assistant tool_call
        // + tool 結果，同一段內容被原封不動重送好幾輪；把 system prompt（全站幾乎每次呼叫都
        // 完全相同）跟「這一輪送出前」的陣列尾端都標成 ephemeral cache breakpoint，LiteLLM 會
        // 原樣轉給 Anthropic——前綴跟上次快取的內容一致時，讀取價格只要原價的一折左右，不用
        // 改動任何工具呼叫/回答邏輯。只是標記 payload 要送出去的複本，不動呼叫端持有的原始
        // messages（呼叫端後續還要繼續往這個陣列疊東西）。
        var payloadMessages = (JsonArray)messages.DeepClone();
        if (!useTier1)
        {
            if (payloadMessages.Count > 0 && payloadMessages[0]?["role"]?.GetValue<string>() == "system")
            {
                payloadMessages[0]!["content"] = AddCacheBreakpoint(payloadMessages[0]!["content"]);
            }
            var lastIndex = payloadMessages.Count - 1;
            if (lastIndex > 0 && payloadMessages[lastIndex]?["content"] is not null)
            {
                payloadMessages[lastIndex]!["content"] = AddCacheBreakpoint(payloadMessages[lastIndex]!["content"]);
            }
        }

        var payload = new JsonObject
        {
            ["model"] = useTier1 ? (_tier1Model ?? _model) : _model,
            ["messages"] = payloadMessages,
            ["max_tokens"] = _maxOutputTokens,
            ["stream"] = true
        };
        if (effectiveTools is not null && effectiveTools.Count > 0)
        {
            payload["tools"] = effectiveTools.DeepClone();
            payload["tool_choice"] = forceFinalAnswer ? "none" : "auto";
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v1/chat/completions")
        {
            Content = new StringContent(payload.ToJsonString(JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");

        using var response = await _http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errBody = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"LiteLLM API 呼叫失敗：{response.StatusCode} {Truncate(errBody, 300)}");
        }

        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        string? toolCallId = null;
        string? toolName = null;
        var toolArgsRaw = new StringBuilder();
        var sawToolCall = false;
        int? activeToolCallIndex = null;
        char? pendingHighSurrogate = null;

        // 有些小模型（例如 gemma）不支援真正的 OpenAI tool_calls 結構化欄位，被要求呼叫工具時
        // 會把工具呼叫的 JSON 直接當成普通文字吐出來（例如 {"name":"search_documents",...}），
        // 不會出現在 delta.tool_calls 裡。這種內容如果照常即時逐字轉發給前端，使用者會看到一段
        // 假 JSON，工具也沒有真的被呼叫。判斷方式：內容第一個非空白字元如果是 '{'，先扣住不轉發，
        // 等收完整段再判斷是不是這種偽工具呼叫；不是的話再把整段一次補送出去（不影響一般正常
        // 回答的即時逐字體感，因為正常回答幾乎不會以 '{' 開頭）。
        // Tier 1 一律不帶工具（見上面 effectiveTools），不會有偽工具呼叫的疑慮，這個判斷邏輯
        // 直接跳過，避免 Tier 1 純聊天答案裡剛好長得像 JSON 時被誤判、白白扣住不即時顯示。
        StringBuilder? fakeToolCallBuffer = null;
        var fakeToolCallSuspicionDecided = useTier1;

        using var readCts = new CancellationTokenSource(TimeSpan.FromSeconds(90));
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, readCts.Token);

        while (!reader.EndOfStream)
        {
            if (requestSw.Elapsed > requestBudget)
            {
                return (null, true);
            }

            string? line;
            try
            {
                line = await reader.ReadLineAsync(linkedCts.Token);
            }
            catch (OperationCanceledException)
            {
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
                    if (!fakeToolCallSuspicionDecided)
                    {
                        var trimmed = content.TrimStart();
                        if (trimmed.Length == 0)
                        {
                            // 還不確定，先扣著（有可能是「{」前面的空白）
                            (fakeToolCallBuffer ??= new StringBuilder()).Append(content);
                        }
                        else
                        {
                            fakeToolCallSuspicionDecided = true;
                            if (trimmed[0] == '{')
                            {
                                (fakeToolCallBuffer ??= new StringBuilder()).Append(content);
                            }
                            else
                            {
                                if (fakeToolCallBuffer is not null)
                                {
                                    await onChunk(new { delta = fakeToolCallBuffer.ToString() });
                                    fakeToolCallBuffer = null;
                                }
                                await onChunk(new { delta = content });
                            }
                        }
                    }
                    else if (fakeToolCallBuffer is not null)
                    {
                        fakeToolCallBuffer.Append(content);
                    }
                    else
                    {
                        await onChunk(new { delta = content });
                    }
                }
            }

            var toolCallDelta = delta?["tool_calls"]?.AsArray()?.FirstOrDefault();
            if (toolCallDelta is not null)
            {
                var index = toolCallDelta["index"]?.GetValue<int>() ?? 0;
                activeToolCallIndex ??= index;

                if (index == activeToolCallIndex)
                {
                    sawToolCall = true;
                    var id = toolCallDelta["id"]?.GetValue<string>();
                    if (!string.IsNullOrEmpty(id)) toolCallId = id;

                    var name = toolCallDelta["function"]?["name"]?.GetValue<string>();
                    if (!string.IsNullOrEmpty(name)) toolName = name;

                    var argsPiece = toolCallDelta["function"]?["arguments"]?.GetValue<string>();
                    if (!string.IsNullOrEmpty(argsPiece)) toolArgsRaw.Append(argsPiece);
                }
            }
        }

        if (pendingHighSurrogate is char danglingSurrogate)
        {
            await onChunk(new { delta = danglingSurrogate.ToString() });
        }

        if (fakeToolCallBuffer is not null)
        {
            var suspectedJson = fakeToolCallBuffer.ToString();
            if (!sawToolCall && TryParseFakeToolCallAsText(suspectedJson, out var fakeName, out var fakeArgs))
            {
                var syntheticId = $"call_{Guid.NewGuid():N}";
                return (new AgentToolCallResult(syntheticId, fakeName!, fakeArgs!), false);
            }

            // 判斷結果不是偽工具呼叫（或已經有真的 tool_calls 了），把扣住的內容原樣補送出去，
            // 不能就這樣憑空消失不見。
            await onChunk(new { delta = suspectedJson });
        }

        if (!sawToolCall || string.IsNullOrEmpty(toolName))
        {
            return (null, false);
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

        var safeId = string.IsNullOrEmpty(toolCallId) ? $"call_{Guid.NewGuid():N}" : toolCallId;
        return (new AgentToolCallResult(safeId, toolName, toolArgs), false);
    }

    /// <summary>
    /// 判斷一段文字是不是模型「用文字模仿」出來的工具呼叫（{"name": "...", "arguments": {...}}），
    /// 而不是真正走 OpenAI tool_calls 結構化欄位的呼叫。只認得剛好長這個形狀的 JSON，一般正常
    /// 回答不會恰好符合這個結構，誤判機率極低。
    /// </summary>
    // internal（非 private）只是讓 WebAPI1.Tests 能直接測這個判斷邏輯，不是要對外公開。
    internal static bool TryParseFakeToolCallAsText(string text, out string? name, out JsonObject? arguments)
    {
        name = null;
        arguments = null;
        try
        {
            if (JsonNode.Parse(text.Trim()) is JsonObject obj
                && obj["name"] is JsonValue nameVal
                && nameVal.TryGetValue<string>(out var parsedName)
                && !string.IsNullOrWhiteSpace(parsedName)
                && obj["arguments"] is JsonObject argsObj)
            {
                name = parsedName;
                arguments = argsObj;
                return true;
            }
        }
        catch (JsonException)
        {
            // 不是合法 JSON，就不是偽工具呼叫，當一般文字處理即可。
        }
        return false;
    }

    private static string Truncate(string text, int maxLength) =>
        text.Length <= maxLength ? text : text[..maxLength] + "…";

    /// <summary>
    /// 把一則訊息目前的 content（可能是純字串，也可能已經是多模態的 content-block 陣列）轉成
    /// Anthropic prompt caching 要求的 content-block 陣列形式，並在最後一個 block 上標記
    /// cache_control:ephemeral——cache_control 的語意是「連同它之前的內容一起快取」，所以
    /// 標在最後一個 block 上就等於整段訊息都被圈進快取範圍。
    /// </summary>
    private static JsonArray AddCacheBreakpoint(JsonNode? content)
    {
        var blocks = content is JsonArray existingArray
            ? (JsonArray)existingArray.DeepClone()
            : new JsonArray { new JsonObject { ["type"] = "text", ["text"] = content?.GetValue<string>() ?? "" } };

        if (blocks.Count > 0)
        {
            blocks[^1]!["cache_control"] = new JsonObject { ["type"] = "ephemeral" };
        }
        return blocks;
    }
}

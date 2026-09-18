using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using WebAPI1.Context;
using WebAPI1.Entities;

namespace WebAPI1.Services;

/// <summary>
/// 三個 in-process 文件工具：search_documents（語意檢索）、query_document_table（表格精確
/// 計算，交給 SQL 做，不讓 LLM 自己心算）、analyze_image（原始圖片重新判讀）。
/// 每個工具入口都用呼叫者的 org 範圍（null=不過濾/管理員，否則限定清單）做權限下推查詢，
/// 不是查完再篩——這是先前架構討論定案的原則。
/// </summary>
public class AgentDocumentTools
{
    private readonly ISHAuditDbcontext _db;
    private readonly IAgentVectorStoreService _vectorStore;
    private readonly IAgentEmbeddingService _embeddingService;
    private readonly IMemoryCache _cache;
    private readonly string _storageRoot;

    public AgentDocumentTools(ISHAuditDbcontext db, IAgentVectorStoreService vectorStore,
        IAgentEmbeddingService embeddingService, IMemoryCache cache, IConfiguration configuration)
    {
        _db = db;
        _vectorStore = vectorStore;
        _embeddingService = embeddingService;
        _cache = cache;
        _storageRoot = configuration["AgentDocuments:StorageRoot"] ?? "agent-documents";
    }

    /// <summary>這三個固定名字是唯一由這個類別執行的工具——AgentController 拿 LLM 回傳的
    /// tool call name 對這份清單，命中就走 in-process 執行路徑，沒命中就當成 MCP 工具去
    /// AgentTools 表查，不需要每次都真的打一次 DB 才能判斷該走哪條路。</summary>
    public static readonly IReadOnlySet<string> KnownToolKeys =
        new HashSet<string> { "search_documents", "query_document_table", "analyze_image" };

    public static JsonArray BuildToolDeclarations(IEnumerable<string> allowedToolKeys)
    {
        var allowed = new HashSet<string>(allowedToolKeys);
        var all = new JsonArray();

        if (allowed.Contains("search_documents"))
        {
            all.Add(new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = "search_documents",
                    ["description"] = "在已上傳的文件（PDF/Word/Excel）中做語意向量搜尋，找出跟問題相關的內容片段，每筆結果會標明來源工廠。只回傳呼叫者有權限看到的文件（自己廠商上傳的 + 公版文件）。" +
                        "問題裡如果有提到具體的公司/工廠名稱（例如「南帝」「東聯」「台達化」），一定要填 organizationName 參數限定範圍，" +
                        "不要只把公司名稱寫進 query 文字裡——向量語意搜尋對公司名稱這種專有名詞的辨識力很弱，" +
                        "光靠 query 裡提到公司名稱常常會混進其他工廠不相關的結果，還要多次改關鍵字重查。" +
                        "同一個問題通常呼叫一次就夠，不要因為換個說法或關鍵字就重複呼叫——" +
                        "如果第一次的結果裡確實找不到答案，才需要換不同的關鍵字再查一次；已經有相關結果時，直接根據這些結果回答，不用為了「求保險」再查一次。",
                    ["parameters"] = new JsonObject
                    {
                        ["type"] = "object",
                        ["properties"] = new JsonObject
                        {
                            ["query"] = new JsonObject { ["type"] = "string", ["description"] = "要搜尋的問題或關鍵字，不需要重複寫公司/工廠名稱（那個交給 organizationName）" },
                            ["organizationName"] = new JsonObject { ["type"] = "string", ["description"] = "限定只查這家公司/工廠的文件（例如「南帝」「東聯」，符合名稱裡包含這段文字的工廠即可，不用打全名）。問題裡提到具體公司/工廠時務必填這個參數" },
                            ["topK"] = new JsonObject { ["type"] = "integer", ["description"] = "回傳筆數，預設 6" }
                        },
                        ["required"] = new JsonArray("query")
                    }
                }
            });
        }

        if (allowed.Contains("query_document_table"))
        {
            all.Add(new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = "query_document_table",
                    ["description"] = "對文件裡的表格資料做精確查詢/加總/平均/計數，不要用 search_documents 找到的文字自己心算數字，涉及計算一律呼叫這個工具。",
                    ["parameters"] = new JsonObject
                    {
                        ["type"] = "object",
                        ["properties"] = new JsonObject
                        {
                            ["documentId"] = new JsonObject { ["type"] = "integer", ["description"] = "限定某份文件,不填則查全部有權限的文件" },
                            ["sheetName"] = new JsonObject { ["type"] = "string", ["description"] = "限定某個工作表/表格名稱" },
                            ["filterColumn"] = new JsonObject { ["type"] = "string", ["description"] = "篩選欄位名稱" },
                            ["filterValue"] = new JsonObject { ["type"] = "string", ["description"] = "篩選欄位要等於的值" },
                            ["aggregateColumn"] = new JsonObject { ["type"] = "string", ["description"] = "要計算的欄位名稱,不填則只回傳符合條件的原始列" },
                            ["aggregateFn"] = new JsonObject { ["type"] = "string", ["description"] = "SUM/AVG/MAX/MIN/COUNT 其中一個" }
                        },
                        ["required"] = new JsonArray()
                    }
                }
            });
        }

        if (allowed.Contains("analyze_image"))
        {
            all.Add(new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = "analyze_image",
                    ["description"] = "重新讀取某份圖片類文件的原始檔案並針對具體問題精確判讀（例如讀取設備銘牌上的日期、儀表讀數），比 search_documents 找到的事先描述更準確。",
                    ["parameters"] = new JsonObject
                    {
                        ["type"] = "object",
                        ["properties"] = new JsonObject
                        {
                            ["documentId"] = new JsonObject { ["type"] = "integer", ["description"] = "圖片文件的 documentId（通常先用 search_documents 找到)" },
                            ["question"] = new JsonObject { ["type"] = "string", ["description"] = "要針對這張圖片問的具體問題" }
                        },
                        ["required"] = new JsonArray("documentId", "question")
                    }
                }
            });
        }

        return all;
    }

    public async Task<string> ExecuteAsync(string toolName, JsonObject args, List<int>? accessibleOrgIds,
        AgentLiteLlmClient llm, CancellationToken ct = default)
    {
        return toolName switch
        {
            "search_documents" => await SearchDocumentsAsync(args, accessibleOrgIds, llm, ct),
            "query_document_table" => await QueryDocumentTableAsync(args, accessibleOrgIds, ct),
            "analyze_image" => await AnalyzeImageAsync(args, accessibleOrgIds, llm, ct),
            _ => "（此工具不存在或不在允許清單內）"
        };
    }

    private async Task<string> SearchDocumentsAsync(JsonObject args, List<int>? accessibleOrgIds,
        AgentLiteLlmClient llm, CancellationToken ct)
    {
        var query = args["query"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(query))
        {
            return "（缺少 query 參數）";
        }
        var topK = args["topK"]?.GetValue<int>() ?? 6;
        var organizationName = args["organizationName"]?.GetValue<string>();

        var (hits, docInfos, error) = await SearchRawAsync(query, organizationName, topK, accessibleOrgIds, ct);
        if (error is not null)
        {
            return error;
        }
        if (hits.Count == 0)
        {
            return "（沒有找到相關文件內容）";
        }

        var lines = hits.Select(h =>
        {
            var (fileName, orgName) = docInfos.TryGetValue(h.DocumentId, out var info)
                ? info
                : ($"文件#{h.DocumentId}", null);
            return FormatSearchResultLine(h, fileName, orgName);
        });
        return string.Join("\n\n---\n\n", lines);
    }

    /// <summary>
    /// search_documents 的原始檢索邏輯（權限/公司名稱過濾 + embedding + 向量檢索），抽出來給
    /// 兩個呼叫端共用：一個是給 LLM 看的 <see cref="SearchDocumentsAsync"/>（格式化成純文字，
    /// 不含 distance 分數，模型不需要、也不該看到這種實作細節）；另一個是後台調 topK 用的
    /// debug 端點（AgentController 的 documents/search-debug，直接把每筆的 distance 顯示
    /// 出來，繞過 LLM 整輪對話，方便快速反覆測不同 topK/問法的檢索品質）。
    /// error 非 null 時代表查詢沒有真的執行（例如公司名稱找不到、沒有權限），呼叫端應該直接
    /// 把這個訊息當結果回傳，不用再檢查 hits。
    /// </summary>
    public async Task<(List<AgentDocumentChunkHit> Hits, Dictionary<int, (string FileName, string? OrganizationName)> DocInfos, string? Error)>
        SearchRawAsync(string query, string? organizationName, int topK, List<int>? accessibleOrgIds, CancellationToken ct = default)
    {
        // 公司/工廠名稱另外走精確的名稱比對，不塞進向量查詢文字裡——向量語意搜尋對專有名詞
        // 辨識力弱，光靠語意常常混進不相關工廠的結果（實測「南帝」查詢混進「東聯」「台達化」）。
        // 這裡把 organizationName 解析成符合的 OrganizationId 清單，再跟呼叫者原本的權限範圍
        // 取交集，確保「只查這家工廠」跟「只能查有權限的工廠」兩個限制同時成立，不會互相繞過。
        var orgFilter = accessibleOrgIds;
        if (!string.IsNullOrWhiteSpace(organizationName))
        {
            var matchedOrgIds = await ResolveOrganizationIdsAsync(organizationName, ct);
            if (matchedOrgIds.Count == 0)
            {
                return (new(), new(), $"（找不到名稱包含「{organizationName}」的工廠）");
            }
            orgFilter = accessibleOrgIds is null ? matchedOrgIds : accessibleOrgIds.Intersect(matchedOrgIds).ToList();
            if (orgFilter.Count == 0)
            {
                return (new(), new(), $"（沒有權限查詢「{organizationName}」的文件，或這家工廠沒有已上傳的文件）");
            }
        }

        // 純向量語意搜尋（cosine KNN），拿掉原本 pg_trgm 關鍵字混合 + RRF 合併排序那條路——
        // 每次查詢少一趟關鍵字 SQL、少一次 C# 端排序合併，換取查詢更快；中文專有名詞/編號
        // 查不準的問題改由使用者換關鍵字重查解決，不在檢索路徑裡用額外複雜度補償。
        var embedding = _embeddingService.Embed(query);
        var hits = await _vectorStore.SearchChunksAsync(embedding, orgFilter, Math.Clamp(topK, 1, 20), ct);
        if (hits.Count == 0)
        {
            return (hits, new(), null);
        }

        var docIds = hits.Select(h => h.DocumentId).Distinct().ToList();
        var docInfos = await _db.AgentDocuments
            .Where(d => docIds.Contains(d.Id))
            .Select(d => new { d.Id, d.FileName, OrganizationName = d.Organization != null ? d.Organization.Name : null })
            .ToDictionaryAsync(d => d.Id, d => (d.FileName, d.OrganizationName), ct);

        return (hits, docInfos, null);
    }

    // 每筆結果的內容截斷到一個上限，不要整個 chunk 全文（現在改成指標切法後單一 chunk
    // 可以到 2000 字，topK 筆數乘起來 context 會爆量）。石化平台同類設計是截到 600 字，
    // 這裡抓 700 字——比對過真的需要更多細節的情況，模型還是可以指名 documentId 再用
    // query_document_table 精確查，不用整段全文一次塞完。
    private const int MaxChunkPreviewChars = 700;

    private const string OrgListCacheKey = "AgentDocumentTools:OrgList";
    private static readonly TimeSpan OrgListCacheTtl = TimeSpan.FromSeconds(60);

    /// <summary>
    /// 組織清單（Id/Name/ParentId）短 TTL 快取——search_documents 只要有帶 organizationName
    /// 就會呼叫 ResolveOrganizationIdsAsync，原本每次都整表重撈，組織資料變動頻率很低（新增
    /// 工廠不會天天發生），沒必要每次查詢都重新掃全表。60 秒 TTL：新增/改名組織後最多晚 60 秒
    /// 才反映到搜尋結果，換來大幅減少熱路徑上的 DB 查詢次數，這個延遲對這個場景可以接受。
    /// </summary>
    private async Task<List<OrgLite>> GetOrgListAsync(CancellationToken ct)
    {
        if (_cache.TryGetValue(OrgListCacheKey, out List<OrgLite>? cached) && cached is not null)
        {
            return cached;
        }

        var orgs = await _db.Organizations
            .Select(o => new OrgLite(o.Id, o.Name, o.ParentId))
            .ToListAsync(ct);
        _cache.Set(OrgListCacheKey, orgs, OrgListCacheTtl);
        return orgs;
    }

    private sealed record OrgLite(int Id, string Name, int? ParentId);

    /// <summary>
    /// 把 organizationName 比對到的組織 ID 往下展開所有子組織——Organizations 是集團/工廠的
    /// 樹狀結構（見 Organization.ParentId），使用者/LLM 問的常常是集團層級名稱（例如「台化」），
    /// 但文件實際掛在底下各廠的 OrganizationId，子廠名稱通常不含集團名稱字樣，光比對
    /// Name.Contains 只會命中集團自己的 Id，查不到任何文件（誤判成「沒有這家公司的資料」）。
    /// </summary>
    private async Task<List<int>> ResolveOrganizationIdsAsync(string organizationName, CancellationToken ct)
    {
        var allOrgs = await GetOrgListAsync(ct);

        var matched = new HashSet<int>(allOrgs
            .Where(o => o.Name.Contains(organizationName))
            .Select(o => o.Id));
        if (matched.Count == 0)
        {
            return new List<int>();
        }

        var childrenByParent = allOrgs
            .Where(o => o.ParentId.HasValue)
            .GroupBy(o => o.ParentId!.Value)
            .ToDictionary(g => g.Key, g => g.Select(o => o.Id).ToList());

        var result = new HashSet<int>(matched);
        var queue = new Queue<int>(matched);
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            if (!childrenByParent.TryGetValue(current, out var kids)) continue;
            foreach (var kidId in kids)
            {
                if (result.Add(kidId)) queue.Enqueue(kidId);
            }
        }

        return result.ToList();
    }

    /// <summary>
    /// 把一筆向量搜尋結果格式化成給 LLM 看的文字行：標出 documentId、來源工廠、檔名/位置，
    /// 內容過長時截斷。抽成純函式（不碰 DB/HTTP）方便單元測試鎖住格式行為。
    /// </summary>
    internal static string FormatSearchResultLine(AgentDocumentChunkHit hit, string fileName, string? organizationName)
    {
        var factory = organizationName ?? "公版文件";
        var location = hit.SourceSheet ?? (hit.SourcePage is int p ? $"第 {p} 頁" : "");
        var text = hit.ChunkText.Length > MaxChunkPreviewChars
            ? hit.ChunkText[..MaxChunkPreviewChars] + "…（內容過長，已截斷）"
            : hit.ChunkText;
        // 有些文件其實是好幾個廠處的報告合併成一份 PDF（見 AgentDocumentIngestionService 的
        // DetectPlantNameByPage 說明），這種情況下光靠檔案層級的「工廠」欄位不夠準——那欄
        // 對應的是 AgentDocument.OrganizationId，是整份檔案共用一個值，沒辦法反映「這一段
        // 其實是合併報告裡另一個廠的內容」。DetectedPlantName 非 null 時額外標出來，讓 LLM
        // 自己判斷這段是不是真的跟使用者問的廠一致，不要不加分辨地當成同一家工廠的資料引用。
        var plantWarning = hit.DetectedPlantName is { } plant
            ? $" ⚠️合併報告偵測到本段落所屬廠別:{plant}"
            : "";
        return $"[documentId={hit.DocumentId} 工廠:{factory} 來源:{fileName} {location}{plantWarning}]\n{text}";
    }

    private async Task<string> QueryDocumentTableAsync(JsonObject args, List<int>? accessibleOrgIds, CancellationToken ct)
    {
        var documentId = args["documentId"]?.GetValue<int>();
        var sheetName = args["sheetName"]?.GetValue<string>();
        var filterColumn = args["filterColumn"]?.GetValue<string>();
        var filterValue = args["filterValue"]?.GetValue<string>();
        var aggregateColumn = args["aggregateColumn"]?.GetValue<string>();
        var aggregateFn = args["aggregateFn"]?.GetValue<string>();

        try
        {
            if (!string.IsNullOrWhiteSpace(aggregateColumn) && !string.IsNullOrWhiteSpace(aggregateFn))
            {
                var (result, rowCount) = await _vectorStore.AggregateTableRowsAsync(
                    documentId, accessibleOrgIds, sheetName, filterColumn, filterValue,
                    aggregateColumn, aggregateFn, ct);
                return $"{aggregateFn.ToUpperInvariant()}({aggregateColumn}) = {result?.ToString() ?? "null"}（符合條件 {rowCount} 列）";
            }

            var rows = await _vectorStore.QueryTableRowsAsync(
                documentId, accessibleOrgIds, sheetName, filterColumn, filterValue, 50, ct);
            if (rows.Count == 0)
            {
                return "（沒有符合條件的表格資料）";
            }
            return string.Join("\n", rows.Select(r => $"[documentId={r.DocumentId} {r.SheetName} 第{r.RowIndex}列] {r.RowDataJson}"));
        }
        catch (ArgumentException ex)
        {
            return $"（參數錯誤：{ex.Message}）";
        }
    }

    private async Task<string> AnalyzeImageAsync(JsonObject args, List<int>? accessibleOrgIds,
        AgentLiteLlmClient llm, CancellationToken ct)
    {
        var documentId = args["documentId"]?.GetValue<int>();
        var question = args["question"]?.GetValue<string>();
        if (documentId is null || string.IsNullOrWhiteSpace(question))
        {
            return "（缺少 documentId 或 question 參數）";
        }

        var doc = await _db.AgentDocuments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == documentId, ct);
        if (doc is null)
        {
            return "（找不到這份文件）";
        }

        var hasAccess = accessibleOrgIds is null // 管理員
            || doc.OrganizationId is null // 公版文件
            || accessibleOrgIds.Contains(doc.OrganizationId.Value);
        if (!hasAccess)
        {
            return "（沒有權限存取這份文件）";
        }

        var fullPath = Path.Combine(_storageRoot, doc.StoragePath);
        if (!System.IO.File.Exists(fullPath))
        {
            return "（原始檔案不存在，可能已被移除）";
        }

        var bytes = await System.IO.File.ReadAllBytesAsync(fullPath, ct);
        var mimeType = Path.GetExtension(doc.StoragePath).ToLowerInvariant() switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            _ => "image/png"
        };

        return await llm.AnalyzeImageAsync(bytes, mimeType, question, ct);
    }
}

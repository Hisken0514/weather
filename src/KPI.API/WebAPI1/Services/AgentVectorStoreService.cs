using Npgsql;
using Pgvector;

namespace WebAPI1.Services;

public record AgentDocumentChunkHit(
    long Id,
    int DocumentId,
    string ChunkText,
    int? SourcePage,
    string? SourceSheet,
    double Distance,
    string? DetectedPlantName = null);

public record AgentDocumentTableRowHit(
    int DocumentId,
    string SheetName,
    int RowIndex,
    string RowDataJson);

/// <summary>
/// 知識庫稽核用：一個從未被「任何其他 chunk」選進自己 Top-K 近鄰的孤立段落（殭屍文件）。
/// 切分策略（chunk 大小/overlap）不佳、或內容本身語意破碎時容易出現這種段落——它在向量
/// 空間裡離所有東西都很遠，代表也很難被一般使用者的提問語意搜尋命中。
/// </summary>
public record AgentOrphanChunkHit(
    long Id,
    int DocumentId,
    string ChunkText,
    int? SourcePage,
    string? SourceSheet);

/// <summary>
/// 文件 RAG 的向量庫存取層。刻意不用 EF Core 的 Npgsql provider（省一層 DbContext
/// 樣板碼），直接用 Npgsql 下參數化 SQL——查詢量不大，這樣寫更直接、依賴也更少。
/// 所有查詢方法都吃一個可為 null 的 orgIds：null 代表不過濾（管理員），
/// 非 null 時一律加 "WHERE organization_id = ANY(@orgIds) OR organization_id IS NULL"
/// （IS NULL＝公版文件），這是把權限下推到 SQL 查詢層，而不是查完再篩的落地方式。
/// </summary>
public interface IAgentVectorStoreService
{
    Task EnsureSchemaAsync(CancellationToken ct = default);

    Task InsertChunkAsync(int documentId, int? organizationId, string chunkText, float[] embedding,
        int? sourcePage, string? sourceSheet, string? detectedPlantName = null, CancellationToken ct = default);

    Task<List<AgentDocumentChunkHit>> SearchChunksAsync(float[] queryEmbedding, List<int>? orgIds, int topK,
        CancellationToken ct = default);

    /// <summary>
    /// 知識庫稽核：找出「殭屍 chunk」——在整個知識庫裡，把每個 chunk 輪流當一次查詢向量，
    /// 去問其他所有 chunk 誰的 Top-K 近鄰裡有它；從頭到尾都沒被任何其他 chunk 選中的，
    /// 就代表它在語意空間裡孤立，一般使用者的提問幾乎不可能語意搜尋到它。
    /// 這是真正的 Reverse Nearest Neighbor（RNN）稽核，不是單純把 ORDER BY 反過來。
    /// orgIds 為 null 時稽核全部（管理員專用，效能上是 O(n²) 比對，chunk 數量大時會慢，
    /// 建議搭配 documentId 或 orgIds 縮小範圍）。
    /// </summary>
    Task<List<AgentOrphanChunkHit>> FindOrphanChunksAsync(List<int>? orgIds, int? documentId, int k,
        CancellationToken ct = default);

    Task InsertTableRowAsync(int documentId, int? organizationId, string sheetName, int rowIndex,
        string rowDataJson, CancellationToken ct = default);

    Task<List<AgentDocumentTableRowHit>> QueryTableRowsAsync(int? documentId, List<int>? orgIds,
        string? sheetName, string? filterColumn, string? filterValue, int limit, CancellationToken ct = default);

    Task<(decimal? Result, int RowCount)> AggregateTableRowsAsync(int? documentId, List<int>? orgIds,
        string? sheetName, string? filterColumn, string? filterValue,
        string aggregateColumn, string aggregateFn, CancellationToken ct = default);

    Task DeleteDocumentDataAsync(int documentId, CancellationToken ct = default);
}

public class AgentVectorStoreService : IAgentVectorStoreService
{
    private readonly NpgsqlDataSource _dataSource;
    private readonly ILogger<AgentVectorStoreService> _logger;

    public AgentVectorStoreService(IConfiguration configuration, ILogger<AgentVectorStoreService> logger)
    {
        var connectionString = configuration.GetConnectionString("AgentVectorDatabase")
            ?? throw new InvalidOperationException("ConnectionStrings:AgentVectorDatabase 未設定");
        var builder = new NpgsqlDataSourceBuilder(connectionString);
        builder.UseVector();
        _dataSource = builder.Build();
        _logger = logger;
    }

    private async Task<NpgsqlConnection> OpenAsync(CancellationToken ct) =>
        await _dataSource.OpenConnectionAsync(ct);

    public async Task EnsureSchemaAsync(CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE EXTENSION IF NOT EXISTS vector;
            CREATE EXTENSION IF NOT EXISTS pg_trgm;

            CREATE TABLE IF NOT EXISTS agent_document_chunks (
                id BIGSERIAL PRIMARY KEY,
                document_id INT NOT NULL,
                organization_id INT NULL,
                chunk_text TEXT NOT NULL,
                embedding VECTOR(384) NOT NULL,
                source_page INT NULL,
                source_sheet TEXT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_agent_document_chunks_document_id ON agent_document_chunks(document_id);
            CREATE INDEX IF NOT EXISTS ix_agent_document_chunks_organization_id ON agent_document_chunks(organization_id);
            -- trigram 索引：逐字元三連組比對，不需要中文分詞就能對「指標16」「芳香烴三廠」這類
            -- 專有名詞/編號做精準的關鍵字比對，補足向量搜尋對這類字詞不準的弱點。
            CREATE INDEX IF NOT EXISTS ix_agent_document_chunks_trgm ON agent_document_chunks USING gin (chunk_text gin_trgm_ops);
            -- HNSW 向量索引：沒有這個索引，SearchChunksAsync/HybridSearchChunksAsync 每次查詢都是
            -- 全表 Seq Scan 算 cosine distance，O(n) 隨資料量線性變慢；有索引是 O(log n)，查詢
            -- 改走 Index Scan。實測用正式站真實索引過的 9,351 筆 chunk 比較：沒索引 21.6ms、
            -- HNSW 0.43ms（約快 50 倍），且同一批真實資料上 HNSW 比 IVFFlat 快（真實語意向量的
            -- 分布是聚集的，不是均勻散開，這點跟合成隨機向量測出來的結果相反，IVFFlat 在均勻分布
            -- 資料上反而較快）。現在資料量小、使用者感受不到差異，但這是「越晚加越痛」的技術債，
            -- 現在加幾乎零成本（不用改任何查詢邏輯，ORDER BY embedding <=> @query 自動吃到索引）。
            CREATE INDEX IF NOT EXISTS ix_agent_document_chunks_embedding_hnsw ON agent_document_chunks USING hnsw (embedding vector_cosine_ops);

            -- 有些文件其實是「好幾個廠的報告合併成一份 PDF」（例如台化的督導報告書，一份檔案
            -- 165 頁裡塞了 10 個廠處，每個廠處的段落標題長得一模一樣），向量檢索分不出這些
            -- 段落屬於哪個廠，topK 常常混進隔壁廠的內容、被 LLM 誤植進答案（實測踩過：問
            -- PC 廠查到 PTA 廠的數字）。AgentDocumentIngestionService 切 chunk 時會嘗試從
            -- 頁首偵測「OO公司XX廠」這種樣式，偵測到就記在這欄；平常單一廠的文件這欄會是
            -- NULL（沒有偵測到多廠混合的訊號，不強行套用）。
            ALTER TABLE agent_document_chunks ADD COLUMN IF NOT EXISTS detected_plant_name TEXT NULL;

            CREATE TABLE IF NOT EXISTS agent_document_table_rows (
                id BIGSERIAL PRIMARY KEY,
                document_id INT NOT NULL,
                organization_id INT NULL,
                sheet_name TEXT NOT NULL,
                row_index INT NOT NULL,
                row_data JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS ix_agent_document_table_rows_document_id ON agent_document_table_rows(document_id);
            CREATE INDEX IF NOT EXISTS ix_agent_document_table_rows_organization_id ON agent_document_table_rows(organization_id);
            """;
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task InsertChunkAsync(int documentId, int? organizationId, string chunkText, float[] embedding,
        int? sourcePage, string? sourceSheet, string? detectedPlantName = null, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO agent_document_chunks (document_id, organization_id, chunk_text, embedding, source_page, source_sheet, detected_plant_name)
            VALUES (@documentId, @organizationId, @chunkText, @embedding, @sourcePage, @sourceSheet, @detectedPlantName)
            """;
        cmd.Parameters.AddWithValue("documentId", documentId);
        cmd.Parameters.AddWithValue("organizationId", (object?)organizationId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("chunkText", chunkText);
        cmd.Parameters.AddWithValue("embedding", new Vector(embedding));
        cmd.Parameters.AddWithValue("sourcePage", (object?)sourcePage ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sourceSheet", (object?)sourceSheet ?? DBNull.Value);
        cmd.Parameters.AddWithValue("detectedPlantName", (object?)detectedPlantName ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    public async Task<List<AgentDocumentChunkHit>> SearchChunksAsync(float[] queryEmbedding, List<int>? orgIds,
        int topK, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        var orgFilter = orgIds is null ? "" : "WHERE (organization_id = ANY(@orgIds) OR organization_id IS NULL)";
        cmd.CommandText = $"""
            SELECT id, document_id, chunk_text, source_page, source_sheet, embedding <=> @query AS distance, detected_plant_name
            FROM agent_document_chunks
            {orgFilter}
            ORDER BY distance ASC
            LIMIT @topK
            """;
        cmd.Parameters.AddWithValue("query", new Vector(queryEmbedding));
        cmd.Parameters.AddWithValue("topK", topK);
        if (orgIds is not null)
        {
            cmd.Parameters.AddWithValue("orgIds", orgIds.ToArray());
        }

        var results = new List<AgentDocumentChunkHit>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            results.Add(new AgentDocumentChunkHit(
                reader.GetInt64(0),
                reader.GetInt32(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetInt32(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetDouble(5),
                reader.IsDBNull(6) ? null : reader.GetString(6)));
        }
        return results;
    }

    public async Task<List<AgentOrphanChunkHit>> FindOrphanChunksAsync(List<int>? orgIds, int? documentId, int k,
        CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();

        // scope 決定「哪些 chunk 互相拿來當彼此的候選近鄰池」——一律限定在同一個 org 範圍
        // （或指定的單一文件）內比較，不跨公司互相當鄰居：既符合權限隔離，語意上也才合理
        // （拿別家公司的文件內容來判斷這份文件的段落是不是孤立，沒有意義）。
        var scopeFilter = documentId is not null
            ? "c.document_id = @documentId"
            : orgIds is null
                ? "TRUE"
                : "(c.organization_id = ANY(@orgIds) OR c.organization_id IS NULL)";

        // 這是 O(n²) 比對（沒建向量索引，逐筆算 cosine distance），範圍沒縮小的話，全知識庫
        // 隨便就是幾千筆 chunk（實測 9428 筆直接爆掉，30 秒 command timeout 直接炸開）。
        // 沒指定 documentId 時，先數一下範圍內有多少筆，超過上限就直接擋掉、請呼叫端縮小範圍，
        // 不要讓查詢默默 timeout（那樣使用者只會看到 500，不知道發生什麼事）。
        if (documentId is null)
        {
            await using (var countCmd = conn.CreateCommand())
            {
                countCmd.CommandText = $"SELECT count(*) FROM agent_document_chunks c WHERE {scopeFilter}";
                if (orgIds is not null)
                {
                    countCmd.Parameters.AddWithValue("orgIds", orgIds.ToArray());
                }
                var scopedCount = (long)(await countCmd.ExecuteScalarAsync(ct))!;
                const int maxUnscoped = 1500;
                if (scopedCount > maxUnscoped)
                {
                    throw new InvalidOperationException(
                        $"稽核範圍內有 {scopedCount} 個 chunk，超過單次稽核上限（{maxUnscoped}），" +
                        "請指定 documentId 縮小範圍到單一文件再稽核。");
                }
            }
        }

        // 核心邏輯：對每個 chunk（c），用 LATERAL 找出「跟它最像的其他 K 個 chunk」（nn），
        // 收集所有 (c, nn) 配對後，反過來看每個 chunk 有沒有出現在別人的 nn 名單裡——
        // 從頭到尾都沒出現過的，就是沒有任何 chunk 會把它當近鄰的孤立段落（殭屍 chunk）。
        // 這就是 Reverse Nearest Neighbor：不是查「誰離我最近」，是查「誰認得我是它的近鄰」。
        cmd.CommandTimeout = 120; // 這個稽核查詢比較重，給比預設 30 秒更長的時間
        cmd.CommandText = $"""
            WITH scoped AS (
                SELECT c.id, c.document_id, c.chunk_text, c.source_page, c.source_sheet, c.embedding
                FROM agent_document_chunks c
                WHERE {scopeFilter}
            ),
            neighbor_pairs AS (
                SELECT nn.id AS neighbor_id
                FROM scoped src
                CROSS JOIN LATERAL (
                    SELECT s2.id
                    FROM scoped s2
                    WHERE s2.id <> src.id
                    ORDER BY src.embedding <=> s2.embedding
                    LIMIT @k
                ) AS nn
            )
            SELECT scoped.id, scoped.document_id, scoped.chunk_text, scoped.source_page, scoped.source_sheet
            FROM scoped
            LEFT JOIN neighbor_pairs np ON np.neighbor_id = scoped.id
            WHERE np.neighbor_id IS NULL
            ORDER BY scoped.document_id, scoped.id
            """;
        cmd.Parameters.AddWithValue("k", k);
        if (documentId is not null)
        {
            cmd.Parameters.AddWithValue("documentId", documentId.Value);
        }
        else if (orgIds is not null)
        {
            cmd.Parameters.AddWithValue("orgIds", orgIds.ToArray());
        }

        var results = new List<AgentOrphanChunkHit>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            results.Add(new AgentOrphanChunkHit(
                reader.GetInt64(0),
                reader.GetInt32(1),
                reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetInt32(3),
                reader.IsDBNull(4) ? null : reader.GetString(4)));
        }
        return results;
    }

    public async Task InsertTableRowAsync(int documentId, int? organizationId, string sheetName, int rowIndex,
        string rowDataJson, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            INSERT INTO agent_document_table_rows (document_id, organization_id, sheet_name, row_index, row_data)
            VALUES (@documentId, @organizationId, @sheetName, @rowIndex, @rowData::jsonb)
            """;
        cmd.Parameters.AddWithValue("documentId", documentId);
        cmd.Parameters.AddWithValue("organizationId", (object?)organizationId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("sheetName", sheetName);
        cmd.Parameters.AddWithValue("rowIndex", rowIndex);
        cmd.Parameters.AddWithValue("rowData", rowDataJson);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private static (string Sql, Action<NpgsqlCommand> BindParams) BuildFilterClause(
        int? documentId, List<int>? orgIds, string? sheetName, string? filterColumn, string? filterValue)
    {
        var clauses = new List<string>();
        var binders = new List<Action<NpgsqlCommand>>();

        if (documentId is not null)
        {
            clauses.Add("document_id = @documentId");
            binders.Add(c => c.Parameters.AddWithValue("documentId", documentId.Value));
        }
        if (orgIds is not null)
        {
            clauses.Add("(organization_id = ANY(@orgIds) OR organization_id IS NULL)");
            binders.Add(c => c.Parameters.AddWithValue("orgIds", orgIds.ToArray()));
        }
        if (!string.IsNullOrWhiteSpace(sheetName))
        {
            clauses.Add("sheet_name = @sheetName");
            binders.Add(c => c.Parameters.AddWithValue("sheetName", sheetName));
        }
        if (!string.IsNullOrWhiteSpace(filterColumn) && !string.IsNullOrWhiteSpace(filterValue))
        {
            // 表格欄位存在 JSONB 裡，用 ->> 取文字值比對；欄位名稱只接受字母數字/底線，避免注入。
            if (filterColumn.Any(ch => !char.IsLetterOrDigit(ch) && ch != '_'))
            {
                throw new ArgumentException("filterColumn 只能是字母數字或底線");
            }
            clauses.Add($"row_data ->> '{filterColumn}' = @filterValue");
            binders.Add(c => c.Parameters.AddWithValue("filterValue", filterValue));
        }

        var sql = clauses.Count == 0 ? "" : "WHERE " + string.Join(" AND ", clauses);
        return (sql, cmd => { foreach (var bind in binders) bind(cmd); });
    }

    public async Task<List<AgentDocumentTableRowHit>> QueryTableRowsAsync(int? documentId, List<int>? orgIds,
        string? sheetName, string? filterColumn, string? filterValue, int limit, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        var (whereClause, bind) = BuildFilterClause(documentId, orgIds, sheetName, filterColumn, filterValue);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT document_id, sheet_name, row_index, row_data::text
            FROM agent_document_table_rows
            {whereClause}
            ORDER BY document_id, row_index
            LIMIT @limit
            """;
        bind(cmd);
        cmd.Parameters.AddWithValue("limit", limit);

        var results = new List<AgentDocumentTableRowHit>();
        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            results.Add(new AgentDocumentTableRowHit(
                reader.GetInt32(0), reader.GetString(1), reader.GetInt32(2), reader.GetString(3)));
        }
        return results;
    }

    public async Task<(decimal? Result, int RowCount)> AggregateTableRowsAsync(int? documentId, List<int>? orgIds,
        string? sheetName, string? filterColumn, string? filterValue,
        string aggregateColumn, string aggregateFn, CancellationToken ct = default)
    {
        if (aggregateColumn.Any(ch => !char.IsLetterOrDigit(ch) && ch != '_'))
        {
            throw new ArgumentException("aggregateColumn 只能是字母數字或底線");
        }
        var fn = aggregateFn.ToUpperInvariant();
        if (fn is not ("SUM" or "AVG" or "MAX" or "MIN" or "COUNT"))
        {
            throw new ArgumentException("aggregateFn 只能是 SUM/AVG/MAX/MIN/COUNT");
        }

        await using var conn = await OpenAsync(ct);
        var (whereClause, bind) = BuildFilterClause(documentId, orgIds, sheetName, filterColumn, filterValue);

        var aggExpr = fn == "COUNT"
            ? "COUNT(*)"
            : $"{fn}((row_data ->> '{aggregateColumn}')::numeric)";

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            SELECT {aggExpr}, COUNT(*)
            FROM agent_document_table_rows
            {whereClause}
            """;
        bind(cmd);

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        if (await reader.ReadAsync(ct))
        {
            var result = reader.IsDBNull(0) ? (decimal?)null : Convert.ToDecimal(reader.GetValue(0));
            var rowCount = reader.GetInt32(1);
            return (result, rowCount);
        }
        return (null, 0);
    }

    public async Task DeleteDocumentDataAsync(int documentId, CancellationToken ct = default)
    {
        await using var conn = await OpenAsync(ct);
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            DELETE FROM agent_document_chunks WHERE document_id = @documentId;
            DELETE FROM agent_document_table_rows WHERE document_id = @documentId;
            """;
        cmd.Parameters.AddWithValue("documentId", documentId);
        await cmd.ExecuteNonQueryAsync(ct);
    }
}

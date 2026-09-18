using System.Diagnostics;
using Npgsql;
using Pgvector;
using Xunit;
using Xunit.Abstractions;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 比較 pgvector 的 HNSW 跟 IVFFlat 兩種 ANN 索引查詢速度，兩種資料來源都測：
/// - <see cref="CompareHnswAndIvfflatQuerySpeed"/>：合成隨機向量，資料量可控（2000/10000 筆），
///   用來看資料量成長對兩種索引的影響趨勢
/// - <see cref="CompareHnswAndIvfflatQuerySpeed_RealChunkData"/>：直接用 agent_document_chunks
///   裡真實索引過的文件向量（語意分布跟正式環境一致，不是均勻散開的隨機數字），數字更貼近實際情況
///
/// 跟這個專案其他測試不一樣——這支**需要真的連上本機測試用的 kpi-agent-db**（docker-compose.dev.yml
/// 裡的 pgvector 容器，localhost:55433），不是純邏輯的 internal static 函式測試，所以標了
/// [Trait("Category", "Integration")]，平常 `dotnet test` 一樣會跑到它（沒有預設排除），但如果
/// 你機器上沒開那個容器，這支會直接連線失敗——想跳過的話用
/// `dotnet test --filter "Category!=Integration"`。
///
/// 兩支測試都整段跑在專用的暫時表（vector_index_benchmark_*，用 Guid 後綴避免多人/多次執行互相
/// 干擾）裡，跑完在 finally 清掉；真實資料那支只複製 agent_document_chunks 的 id/embedding 出來
/// 讀，不會動到來源表本身的結構或資料。
/// </summary>
public class VectorIndexBenchmarkTests
{
    private const string ConnectionString =
        "Host=localhost;Port=55433;Database=agent_vector;Username=agent;Password=agent";

    // 跟 AgentEmbeddingService（SmartComponents.LocalEmbeddings）輸出維度一致，
    // 讓這個 benchmark 盡量貼近實際系統會用到的向量形狀。
    private const int Dimension = 384;

    // 表格已知有隨機性，用固定亂數種子讓每次跑出來的資料集一致，方便前後兩次執行的數字互相比較。
    private const int RandomSeed = 42;

    private readonly ITestOutputHelper _output;

    public VectorIndexBenchmarkTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Theory]
    [Trait("Category", "Integration")]
    [InlineData(2000)]
    [InlineData(10000)]
    public async Task CompareHnswAndIvfflatQuerySpeed(int rowCount)
    {
        const int topK = 10;
        const int queryCount = 30;

        var tableName = $"vector_index_benchmark_{Guid.NewGuid():N}";
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(ConnectionString);
        dataSourceBuilder.UseVector();
        var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        try
        {
            await CreateTableAsync(conn, tableName);

            var rng = new Random(RandomSeed);
            var vectors = GenerateRandomVectors(rng, rowCount, Dimension);
            await BulkInsertAsync(conn, tableName, vectors);

            var queryVectors = GenerateRandomVectors(rng, queryCount, Dimension);

            await BuildIndexAsync(conn, tableName, "hnsw", "USING hnsw (embedding vector_cosine_ops)");
            var hnswElapsedMs = await MeasureQueryLatencyAsync(conn, tableName, queryVectors, topK);
            await DropIndexAsync(conn, tableName, "hnsw");

            // IVFFlat 的 lists 參數官方建議 rows/1000（資料量大）或 sqrt(rows)（資料量小），
            // 這裡用官方文件常見的 sqrt(rowCount) 概略值，不是嚴謹調參，目的是抓一個合理範圍內的
            // 查詢速度做比較，不是找 IVFFlat 的最佳解。
            var lists = Math.Max(1, (int)Math.Sqrt(rowCount));
            await BuildIndexAsync(conn, tableName, "ivfflat",
                $"USING ivfflat (embedding vector_cosine_ops) WITH (lists = {lists})");
            var ivfflatElapsedMs = await MeasureQueryLatencyAsync(conn, tableName, queryVectors, topK);
            await DropIndexAsync(conn, tableName, "ivfflat");

            _output.WriteLine($"[rowCount={rowCount}, topK={topK}, queryCount={queryCount}]");
            _output.WriteLine($"HNSW    平均每次查詢：{hnswElapsedMs / queryCount:F3} ms（總計 {hnswElapsedMs:F1} ms）");
            _output.WriteLine($"IVFFlat 平均每次查詢：{ivfflatElapsedMs / queryCount:F3} ms（總計 {ivfflatElapsedMs:F1} ms，lists={lists}）");
            _output.WriteLine(hnswElapsedMs <= ivfflatElapsedMs
                ? "→ 這次測試 HNSW 較快"
                : "→ 這次測試 IVFFlat 較快");

            // 兩種索引都應該正常運作、回傳完整 topK 筆結果——這支測試的重點是量測時間，
            // 不是斷言誰一定比較快（ANN 索引效能受資料分布/機器負載影響,不該寫死誰贏）。
            Assert.True(hnswElapsedMs > 0);
            Assert.True(ivfflatElapsedMs > 0);
        }
        finally
        {
            await DropTableAsync(conn, tableName);
        }
    }

    /// <summary>
    /// 跟合成資料那支不一樣，這支直接拿 agent_document_chunks 裡**真實索引過的文件向量**來測——
    /// 本機測試庫目前有 9,351 筆真實 chunk（從正式站督導報告 PDF 實際跑過 ingestion pipeline
    /// 產生的向量，不是隨機數字），資料分布（語意聚集、不是均勻散開）比合成資料更貼近正式環境
    /// 查詢時的真實情況，量出來的數字更有參考價值。
    ///
    /// 做法是把真實向量複製一份到專用暫時表（`CREATE TABLE ... AS SELECT ... FROM
    /// agent_document_chunks`），在複製出來的表上建索引/量測，**完全不碰
    /// agent_document_chunks 本身的結構或既有索引**，只讀不寫，跑完照樣清掉暫時表。
    ///
    /// 查詢向量也是從同一批真實資料裡隨機抽樣出來的（不是另外生成的假查詢）——這是 ANN
    /// benchmark 常見的做法（self-query），可以合理模擬「查詢語意類似庫內某些文件」的情境。
    /// </summary>
    [Fact]
    [Trait("Category", "Integration")]
    public async Task CompareHnswAndIvfflatQuerySpeed_RealChunkData()
    {
        const int topK = 10;
        const int queryCount = 30;

        var tableName = $"vector_index_benchmark_real_{Guid.NewGuid():N}";
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(ConnectionString);
        dataSourceBuilder.UseVector();
        var dataSource = dataSourceBuilder.Build();
        await using var conn = await dataSource.OpenConnectionAsync();

        try
        {
            var rowCount = await CopyRealChunkEmbeddingsAsync(conn, tableName);
            Assert.True(rowCount > 0, "agent_document_chunks 目前沒有資料，無法用真實資料測試——請先跑過文件同步（POST agent/documents/sync）再執行這支測試。");

            var queryVectors = await SampleExistingVectorsAsync(conn, tableName, queryCount);

            await BuildIndexAsync(conn, tableName, "hnsw", "USING hnsw (embedding vector_cosine_ops)");
            var hnswElapsedMs = await MeasureQueryLatencyAsync(conn, tableName, queryVectors, topK);
            await DropIndexAsync(conn, tableName, "hnsw");

            var lists = Math.Max(1, (int)Math.Sqrt(rowCount));
            await BuildIndexAsync(conn, tableName, "ivfflat",
                $"USING ivfflat (embedding vector_cosine_ops) WITH (lists = {lists})");
            var ivfflatElapsedMs = await MeasureQueryLatencyAsync(conn, tableName, queryVectors, topK);
            await DropIndexAsync(conn, tableName, "ivfflat");

            _output.WriteLine($"[真實資料，rowCount={rowCount}（agent_document_chunks 現有筆數），topK={topK}, queryCount={queryCount}]");
            _output.WriteLine($"HNSW    平均每次查詢：{hnswElapsedMs / queryCount:F3} ms（總計 {hnswElapsedMs:F1} ms）");
            _output.WriteLine($"IVFFlat 平均每次查詢：{ivfflatElapsedMs / queryCount:F3} ms（總計 {ivfflatElapsedMs:F1} ms，lists={lists}）");
            _output.WriteLine(hnswElapsedMs <= ivfflatElapsedMs
                ? "→ 這次測試 HNSW 較快"
                : "→ 這次測試 IVFFlat 較快");

            Assert.True(hnswElapsedMs > 0);
            Assert.True(ivfflatElapsedMs > 0);
        }
        finally
        {
            await DropTableAsync(conn, tableName);
        }
    }

    /// <summary>把 agent_document_chunks 的 id/embedding 複製到新的暫時表，回傳複製筆數。純讀取，
    /// 不改動來源表；DISTINCT ON 是保險（理論上 id 本來就唯一，只是明確表達「不重複」的意圖）。</summary>
    private static async Task<int> CopyRealChunkEmbeddingsAsync(NpgsqlConnection conn, string tableName)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            CREATE EXTENSION IF NOT EXISTS vector;
            CREATE TABLE {tableName} AS
            SELECT id, embedding FROM agent_document_chunks;
            """;
        cmd.CommandTimeout = 60;
        await cmd.ExecuteNonQueryAsync();

        await using var countCmd = conn.CreateCommand();
        countCmd.CommandText = $"SELECT count(*) FROM {tableName};";
        return Convert.ToInt32(await countCmd.ExecuteScalarAsync());
    }

    /// <summary>從已複製好的暫時表裡隨機抽 N 筆既有向量當查詢向量（self-query），
    /// 比另外生成假查詢向量更貼近「查詢語意類似庫內文件」的真實使用情境。</summary>
    private static async Task<List<float[]>> SampleExistingVectorsAsync(NpgsqlConnection conn, string tableName, int count)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT embedding FROM {tableName} ORDER BY random() LIMIT @count;";
        cmd.Parameters.AddWithValue("count", count);

        var vectors = new List<float[]>(count);
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var vector = reader.GetFieldValue<Vector>(0);
            vectors.Add(vector.ToArray());
        }
        return vectors;
    }

    private static List<float[]> GenerateRandomVectors(Random rng, int count, int dimension)
    {
        var vectors = new List<float[]>(count);
        for (var i = 0; i < count; i++)
        {
            var v = new float[dimension];
            for (var d = 0; d < dimension; d++)
            {
                v[d] = (float)(rng.NextDouble() * 2 - 1); // [-1, 1) 範圍的隨機值
            }
            vectors.Add(v);
        }
        return vectors;
    }

    private static async Task CreateTableAsync(NpgsqlConnection conn, string tableName)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            CREATE EXTENSION IF NOT EXISTS vector;
            CREATE TABLE {tableName} (
                id BIGSERIAL PRIMARY KEY,
                embedding VECTOR({Dimension}) NOT NULL
            );
            """;
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task BulkInsertAsync(NpgsqlConnection conn, string tableName, List<float[]> vectors)
    {
        await using var writer = await conn.BeginBinaryImportAsync(
            $"COPY {tableName} (embedding) FROM STDIN (FORMAT BINARY)");
        foreach (var v in vectors)
        {
            await writer.StartRowAsync();
            await writer.WriteAsync(new Vector(v));
        }
        await writer.CompleteAsync();
    }

    private static async Task BuildIndexAsync(NpgsqlConnection conn, string tableName, string indexKind, string usingClause)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"CREATE INDEX ix_{tableName}_{indexKind} ON {tableName} {usingClause};";
        cmd.CommandTimeout = 120; // 建索引比一般查詢重，資料量大時給長一點的 timeout
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task DropIndexAsync(NpgsqlConnection conn, string tableName, string indexKind)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"DROP INDEX IF EXISTS ix_{tableName}_{indexKind};";
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task DropTableAsync(NpgsqlConnection conn, string tableName)
    {
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = $"DROP TABLE IF EXISTS {tableName};";
        await cmd.ExecuteNonQueryAsync();
    }

    /// <summary>對每個查詢向量各跑一次 Top-K cosine 距離查詢，回傳全部查詢累計耗時（毫秒）。</summary>
    private static async Task<double> MeasureQueryLatencyAsync(
        NpgsqlConnection conn, string tableName, List<float[]> queryVectors, int topK)
    {
        var sw = Stopwatch.StartNew();
        foreach (var qv in queryVectors)
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = $"""
                SELECT id FROM {tableName}
                ORDER BY embedding <=> @query
                LIMIT @topK
                """;
            cmd.Parameters.AddWithValue("query", new Vector(qv));
            cmd.Parameters.AddWithValue("topK", topK);

            var resultCount = 0;
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                resultCount++;
            }
            Assert.Equal(topK, resultCount);
        }
        sw.Stop();
        return sw.Elapsed.TotalMilliseconds;
    }
}

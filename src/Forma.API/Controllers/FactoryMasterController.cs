using System.Text;
using ClosedXML.Excel;
using Forma.Application.Common.Authorization;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

[ApiController]
[Route("api/factory-master")]
[Authorize(Policy = Policies.RequireSystemAdmin)]
public class FactoryMasterController : ControllerBase
{
    private readonly IFactoryMasterService _service;
    private readonly ILogger<FactoryMasterController> _logger;

    public FactoryMasterController(IFactoryMasterService service, ILogger<FactoryMasterController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// 上傳工廠清冊（CSV 或 Excel），進行批次 upsert
    /// </summary>
    [HttpPost("import")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50 MB
    public async Task<IActionResult> Import(IFormFile file, [FromForm] string? dataSource, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "請上傳檔案" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext is not (".csv" or ".xlsx" or ".xls"))
            return BadRequest(new { message = "僅支援 CSV、XLSX、XLS 格式" });

        var source = dataSource ?? Path.GetFileNameWithoutExtension(file.FileName);

        try
        {
            using var stream = file.OpenReadStream();
            var rows = ext == ".csv"
                ? ParseCsv(stream)
                : ParseExcel(stream);

            // 批次 import 不受 HTTP request timeout 控制，避免大檔案因連線逾時觸發 pg 57014
            var result = await _service.ImportAsync(rows, source, CancellationToken.None);

            _logger.LogInformation("工廠清冊匯入完成：新增 {I}，更新 {U}，略過 {S}，來源 {Src}",
                result.Inserted, result.Updated, result.Skipped, result.DataSource);

            return Ok(new
            {
                message    = $"匯入完成：新增 {result.Inserted} 筆，更新 {result.Updated} 筆，略過 {result.Skipped} 筆",
                inserted   = result.Inserted,
                updated    = result.Updated,
                skipped    = result.Skipped,
                dataSource = result.DataSource,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "工廠清冊匯入失敗");
            return StatusCode(500, new { message = $"匯入失敗：{ex.Message}" });
        }
    }

    /// <summary>取得目前資料統計</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var (total, counties) = await _service.GetStatsAsync(ct);
        return Ok(new { total, counties });
    }

    /// <summary>各縣市工廠數量（地圖用）</summary>
    [HttpGet("county-summary")]
    public async Task<IActionResult> GetCountySummary(CancellationToken ct)
    {
        var data = await _service.GetCountySummaryAsync(ct);
        return Ok(data);
    }

    /// <summary>
    /// 匯出全部工廠主資料為 CSV（依登記編號排序，串流輸出避免十幾萬筆一次塞進記憶體）。
    /// 前 13 欄的欄位順序跟「上傳清冊」解析的欄位位置完全對應，改一改可以直接匯入回來；
    /// lat／lng 是依表頭名稱比對，資料來源／最後匯入時間只是給人看的參考欄位，匯入時會被忽略。
    /// </summary>
    [HttpGet("export")]
    public async Task Export(CancellationToken ct)
    {
        Response.ContentType = "text/csv; charset=utf-8";
        // Content-Disposition 這個 HTTP header 只能放 ASCII，中文檔名要用 RFC 5987 的
        // filename* 編碼，不能直接把中文塞進 header 字串（會導致 Kestrel 500）
        var contentDisposition = new Microsoft.Net.Http.Headers.ContentDispositionHeaderValue("attachment");
        contentDisposition.SetHttpFileName($"工廠清冊匯出_{DateTime.UtcNow:yyyyMMdd}.csv");
        Response.Headers.Append("Content-Disposition", contentDisposition.ToString());

        await using var writer = new StreamWriter(Response.Body, new UTF8Encoding(encoderShouldEmitUTF8Identifier: true));
        await writer.WriteLineAsync(string.Join(',', new[]
        {
            "工廠名稱", "工廠登記編號", "（備用，匯入時未使用）", "工廠地址", "工廠市鎮鄉村里（縣市+鄉鎮）",
            "負責人", "統一編號", "組織別", "（備用，匯入時未使用）", "（備用，匯入時未使用）",
            "登記狀態", "產業類別", "主要產品", "lat", "lng", "資料來源（僅供參考）", "最後匯入時間（僅供參考）",
        }));

        await foreach (var f in _service.StreamAllAsync(ct))
        {
            var fields = new[]
            {
                f.FactoryName, f.FactoryRegistrationNo, "", f.Address ?? "", $"{f.County}{f.Township}",
                f.OwnerName ?? "", f.UnifiedBusinessNo ?? "", f.OrganizationType ?? "", "", "",
                f.RegistrationStatus ?? "", f.IndustryCategory ?? "", f.MainProducts ?? "",
                f.Lat?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "",
                f.Lng?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? "",
                f.DataSource ?? "", f.LastImportedAt.ToString("yyyy-MM-dd HH:mm"),
            };
            await writer.WriteLineAsync(string.Join(',', fields.Select(CsvEscape)));
        }
    }

    /// <summary>刪除全部工廠主資料，不可復原</summary>
    [HttpDelete("all")]
    public async Task<IActionResult> DeleteAll(CancellationToken ct)
    {
        var deletedCount = await _service.DeleteAllAsync(ct);
        return Ok(new { deletedCount });
    }

    private static string CsvEscape(string value)
    {
        if (value.IndexOfAny(new[] { ',', '"', '\n', '\r' }) < 0) return value;
        return $"\"{value.Replace("\"", "\"\"")}\"";
    }

    // ── CSV 解析 ────────────────────────────────────────────────────
    private static List<RawFactoryRow> ParseCsv(Stream stream)
    {
        var result = new List<RawFactoryRow>();
        using var reader = new StreamReader(stream, System.Text.Encoding.UTF8, detectEncodingFromByteOrderMarks: true);

        var headerLine = reader.ReadLine() ?? string.Empty;
        var headers = SplitCsvLine(headerLine).Select(h => h.Trim('"', ' ').ToLowerInvariant()).ToArray();
        int latIdx = Array.IndexOf(headers, "lat");
        int lngIdx = Array.IndexOf(headers, "lng");

        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            if (string.IsNullOrWhiteSpace(line)) continue;
            var cols = SplitCsvLine(line);
            if (cols.Length < 8) continue;
            result.Add(MapColumns(cols, latIdx, lngIdx));
        }
        return result;
    }

    private static List<RawFactoryRow> ParseExcel(Stream stream)
    {
        var result = new List<RawFactoryRow>();
        using var wb = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();
        bool first = true;
        int latIdx = -1, lngIdx = -1;
        foreach (var row in ws.RowsUsed())
        {
            if (first)
            {
                first = false;
                var lastCol = row.LastCellUsed()?.Address.ColumnNumber ?? 13;
                for (int i = 1; i <= lastCol; i++)
                {
                    var h = row.Cell(i).GetString().Trim().ToLowerInvariant();
                    if (h == "lat") latIdx = i - 1;
                    if (h == "lng") lngIdx = i - 1;
                }
                continue;
            }
            var maxCol = Math.Max(13, Math.Max(latIdx, lngIdx) + 1);
            var cols = Enumerable.Range(1, maxCol).Select(i => row.Cell(i).GetString().Trim()).ToArray();
            if (cols.Length < 8) continue;
            result.Add(MapColumns(cols, latIdx, lngIdx));
        }
        return result;
    }

    private static RawFactoryRow MapColumns(string[] c, int latIdx = -1, int lngIdx = -1)
    {
        var (county, township) = ParseCountyTownship(c[4].Trim('"', ' '));

        double? lat = null, lng = null;
        if (latIdx >= 0 && latIdx < c.Length && double.TryParse(c[latIdx].Trim('"', ' '), out var parsedLat))
            lat = parsedLat;
        if (lngIdx >= 0 && lngIdx < c.Length && double.TryParse(c[lngIdx].Trim('"', ' '), out var parsedLng))
            lng = parsedLng;

        return new RawFactoryRow(
            FactoryRegistrationNo: c[1].Trim('"', ' '),
            FactoryName:           c[0].Trim('"', ' '),
            UnifiedBusinessNo:     c[6].Trim('"', ' '),
            Address:               c[3].Trim('"', ' '),
            County:                county,
            Township:              township,
            OwnerName:             c[5].Trim('"', ' '),
            OrganizationType:      c[7].Trim('"', ' '),
            RegistrationStatus:    c.Length > 10 ? c[10].Trim('"', ' ') : null,
            IndustryCategory:      c.Length > 11 ? c[11].Trim('"', ' ') : null,
            MainProducts:          c.Length > 12 ? c[12].Trim('"', ' ') : null,
            Lat:                   lat,
            Lng:                   lng
        );
    }

    /// <summary>從「桃園市龜山區嶺頂里」解析縣市與鄉鎮</summary>
    private static (string? County, string? Township) ParseCountyTownship(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return (null, null);

        var countyEndIdx = -1;
        for (int i = 0; i < raw.Length; i++)
        {
            if ((raw[i] == '市' || raw[i] == '縣') && i >= 1)
            { countyEndIdx = i; break; }
        }
        if (countyEndIdx < 0) return (null, null);

        var county = raw[..(countyEndIdx + 1)].Replace("臺", "台");
        var rest = raw[(countyEndIdx + 1)..];
        var townshipEndIdx = -1;
        for (int i = 0; i < rest.Length; i++)
        {
            if (rest[i] is '區' or '鄉' or '鎮') { townshipEndIdx = i; break; }
            if (rest[i] == '市' && i > 0) { townshipEndIdx = i; break; }
        }
        var township = townshipEndIdx >= 0 ? rest[..(townshipEndIdx + 1)] : null;
        return (county, township);
    }

    private static string[] SplitCsvLine(string line)
    {
        var result = new List<string>();
        bool inQuote = false;
        var cur = new System.Text.StringBuilder();
        for (int i = 0; i < line.Length; i++)
        {
            char c = line[i];
            if (c == '"')
            {
                if (inQuote && i + 1 < line.Length && line[i + 1] == '"') { cur.Append('"'); i++; }
                else inQuote = !inQuote;
            }
            else if (c == ',' && !inQuote) { result.Add(cur.ToString()); cur.Clear(); }
            else cur.Append(c);
        }
        result.Add(cur.ToString());
        return result.ToArray();
    }
}

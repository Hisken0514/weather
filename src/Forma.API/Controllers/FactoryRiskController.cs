using ClosedXML.Excel;
using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.FactoryRisk.DTOs;
using Forma.Application.Features.RiskScoring.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>全台工廠風險排名（歷史資料匯入 → 套用評分標準公式現場算排名）</summary>
[ApiController]
[Route("api/factory-risk")]
[Authorize(Policy = Policies.RequireSystemAdmin)]
public class FactoryRiskController : ControllerBase
{
    private readonly IFactoryRiskRankingService _rankingService;
    private readonly IFactoryRiskImportService _importService;
    private readonly IRiskScoringService _scoringService;
    private readonly IFactoryRiskDataService _dataService;

    public FactoryRiskController(
        IFactoryRiskRankingService rankingService,
        IFactoryRiskImportService importService,
        IRiskScoringService scoringService,
        IFactoryRiskDataService dataService)
    {
        _rankingService = rankingService;
        _importService = importService;
        _scoringService = scoringService;
        _dataService = dataService;
    }

    // ─── 原始資料維護（瀏覽／新增／編輯／刪除個別工廠） ─────────────────────

    /// <summary>
    /// 分頁瀏覽已匯入的原始資料（一筆＝一家工廠的一個資料年度），可依工廠名稱／登記編號
    /// 搜尋、依資料年度篩選
    /// </summary>
    [HttpGet("factories")]
    public async Task<ActionResult<PagedFactoryRiskRawDataResponse>> GetFactories(
        [FromQuery] int page, [FromQuery] int pageSize, [FromQuery] string? search,
        [FromQuery] int? dataYear, CancellationToken ct)
        => Ok(await _dataService.GetFactoriesAsync(page <= 0 ? 1 : page, pageSize <= 0 ? 50 : pageSize, search, dataYear, ct));

    /// <summary>取得單一筆原始資料（riskInputId＝某家工廠某個資料年度的那一筆）</summary>
    [HttpGet("factories/{riskInputId:guid}")]
    public async Task<ActionResult<FactoryRiskRawDataDto>> GetFactory(Guid riskInputId, CancellationToken ct)
    {
        try
        {
            return Ok(await _dataService.GetFactoryAsync(riskInputId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>手動新增一筆原始資料（不用透過 Excel 匯入）</summary>
    [HttpPost("factories")]
    public async Task<ActionResult> CreateFactory([FromBody] UpsertFactoryRiskRawDataRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _dataService.CreateFactoryAsync(request, ct);
            return CreatedAtAction(nameof(GetFactory), new { riskInputId = id }, new { id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>編輯一筆原始資料（指標值整批覆蓋，比照 Excel 重新匯入同一筆資料的邏輯）</summary>
    [HttpPut("factories/{riskInputId:guid}")]
    public async Task<ActionResult> UpdateFactory(Guid riskInputId, [FromBody] UpsertFactoryRiskRawDataRequest request, CancellationToken ct)
    {
        try
        {
            await _dataService.UpdateFactoryAsync(riskInputId, request, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>刪除一筆原始資料</summary>
    [HttpDelete("factories/{riskInputId:guid}")]
    public async Task<ActionResult> DeleteFactory(Guid riskInputId, CancellationToken ct)
    {
        try
        {
            await _dataService.DeleteFactoryAsync(riskInputId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>批次刪除多筆原始資料</summary>
    [HttpPost("factories/bulk-delete")]
    public async Task<ActionResult> BulkDeleteFactories([FromBody] List<Guid> riskInputIds, CancellationToken ct)
    {
        var deletedCount = await _dataService.BulkDeleteFactoriesAsync(riskInputIds, ct);
        return Ok(new { deletedCount });
    }

    /// <summary>刪除所有工廠的原始資料（含所有年度），不可復原</summary>
    [HttpDelete("factories/all")]
    public async Task<ActionResult> DeleteAllFactories(CancellationToken ct)
    {
        var deletedCount = await _dataService.DeleteAllFactoriesAsync(ct);
        return Ok(new { deletedCount });
    }

    /// <summary>取得所有已匯入資料裡出現過的資料年度（distinct，新到舊排序），給前端年度選單用</summary>
    [HttpGet("data-years")]
    public async Task<ActionResult<List<int>>> GetAvailableDataYears(CancellationToken ct)
        => Ok(await _rankingService.GetAvailableDataYearsAsync(ct));

    /// <summary>
    /// 比較兩個資料年度的工廠名單差異：兩年度都有的、只有 year1 有的、只有 year2 有的
    /// （依 FactoryId 判斷是不是同一家工廠，不是看名稱字串）
    /// </summary>
    [HttpGet("year-comparison")]
    public async Task<ActionResult<FactoryYearComparisonDto>> CompareYears(
        [FromQuery] int year1, [FromQuery] int year2, CancellationToken ct)
    {
        try
        {
            return Ok(await _dataService.CompareYearsAsync(year1, year2, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 單一工廠跨資料年度的風險值走勢。schemeId 有給就全部年度套用同一個標準；
    /// 不給的話每個資料年度各自套用「Year 相同」的標準。
    /// </summary>
    [HttpGet("factories/{factoryId:guid}/trend")]
    public async Task<ActionResult<FactoryTrendResultDto>> GetFactoryTrend(
        Guid factoryId, [FromQuery] Guid? schemeId, CancellationToken ct)
    {
        try
        {
            return Ok(await _rankingService.GetFactoryTrendAsync(factoryId, schemeId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>依指定評分標準取得全台工廠風險排名（現場算，不是存死的分數）</summary>
    [HttpGet("schemes/{schemeId:guid}/ranking")]
    public async Task<ActionResult<FactoryRiskRankingResultDto>> GetRanking(
        Guid schemeId, [FromQuery] int? dataYear, CancellationToken ct)
    {
        try
        {
            return Ok(await _rankingService.GetRankingAsync(schemeId, dataYear, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 比對指定標準「設定的對應資料欄位」跟匯入資料「實際存在的欄位」，排查指標／
    /// 化學品類型的對應資料欄位設錯、或匯入範本表頭打錯字，不用再去看後端 log。
    /// </summary>
    [HttpGet("schemes/{schemeId:guid}/data-coverage")]
    public async Task<ActionResult<SchemeDataCoverageDto>> GetDataCoverage(
        Guid schemeId, [FromQuery] int? dataYear, CancellationToken ct)
    {
        try
        {
            return Ok(await _rankingService.GetDataCoverageAsync(schemeId, dataYear, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 下載匯入範本：固定欄位 + 依指定標準目前的指標（表頭＝對應資料欄位）動態產生。
    /// 範本本身跟年度無關，只是拿這個標準目前的指標名稱當表頭方便你填寫。
    /// </summary>
    [HttpGet("schemes/{schemeId:guid}/import-template")]
    public async Task<IActionResult> DownloadImportTemplate(Guid schemeId, CancellationToken ct)
    {
        SchemeDetailDto scheme;
        try
        {
            scheme = await _scoringService.GetSchemeByIdAsync(schemeId, ct);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }

        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("匯入資料");

        string[] fixedHeaders =
        {
            "工廠登記編號", "工廠名稱", "地址", "產業類別", "產業園區", "轄區", "縣市",
            "最大危害化學品類型", "最大使用量物質名稱", "最大使用量",
        };
        var col = 1;
        foreach (var header in fixedHeaders)
            sheet.Cell(1, col++).Value = header;
        foreach (var indicator in scheme.Indicators.OrderBy(i => i.DisplayOrder))
            sheet.Cell(1, col++).Value = indicator.CanonicalKey;

        sheet.Row(1).Style.Font.Bold = true;
        sheet.Row(1).Style.Fill.BackgroundColor = XLColor.LightBlue;
        sheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var bytes = stream.ToArray();

        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"全台工廠風險排名匯入範本_{scheme.Year}年.xlsx");
    }

    /// <summary>
    /// 上傳歷史資料 Excel，匯入工廠風險原始輸入值。原始資料跟評分標準無關，匯入時不用
    /// 指定標準，套用哪一年的公式是看排名時才決定的。但要指定這份資料的「資料年度」
    /// （dataYear，跟評分標準的年度是兩件事）：同一家工廠、同一個資料年度重新匯入是
    /// 整份覆蓋；不同資料年度各自保留一份快照，全都會留在資料庫裡。
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult<ImportFactoryRiskDataResult>> Import(
        IFormFile file, [FromQuery] int dataYear, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "請上傳 Excel 檔案" });

        if (dataYear <= 0)
            return BadRequest(new { message = "請指定這份資料的資料年度" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx")
            return BadRequest(new { message = "僅支援 .xlsx 格式" });

        try
        {
            using var stream = file.OpenReadStream();
            var result = await _importService.ImportAsync(dataYear, stream, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

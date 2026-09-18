using ClosedXML.Excel;
using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.FactoryRisk.DTOs;
using Forma.Application.Features.Supervision.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 年度督導管理 API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.RequireUser)]
public class SupervisionController : ControllerBase
{
    private readonly ISupervisionService _supervisionService;
    private readonly ICurrentUserService _currentUser;
    private readonly IFactoryRiskRankingService _rankingService;

    public SupervisionController(
        ISupervisionService supervisionService,
        ICurrentUserService currentUser,
        IFactoryRiskRankingService rankingService)
    {
        _supervisionService = supervisionService;
        _currentUser = currentUser;
        _rankingService = rankingService;
    }

    // ─── 年度督導計畫 ───

    /// <summary>
    /// 取得所有督導計畫
    /// </summary>
    [HttpGet("campaigns")]
    public async Task<ActionResult<List<CampaignDto>>> GetCampaigns(CancellationToken ct)
    {
        return Ok(await _supervisionService.GetCampaignsAsync(ct));
    }

    /// <summary>
    /// 取得督導計畫詳情
    /// </summary>
    [HttpGet("campaigns/{id:guid}")]
    public async Task<ActionResult<CampaignDto>> GetCampaign(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await _supervisionService.GetCampaignByIdAsync(id, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得督導計畫的工廠地圖資料（含座標、風險分數）；使用者有綁定產業園區時自動過濾
    /// </summary>
    [HttpGet("campaigns/{id:guid}/map-factories")]
    public async Task<ActionResult<List<CampaignMapFactoryDto>>> GetMapFactories(Guid id, [FromQuery] Guid? schemeId, [FromQuery] int? dataYear, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? Guid.Empty;
        return Ok(await _supervisionService.GetMapFactoriesAsync(id, userId, schemeId, dataYear, ct));
    }

    /// <summary>全台所有風險工廠地圖資料（不限督導計畫）</summary>
    [HttpGet("map-factories")]
    public async Task<ActionResult<List<CampaignMapFactoryDto>>> GetAllRiskMapFactories([FromQuery] int? dataYear, [FromQuery] Guid? schemeId, CancellationToken ct)
        => Ok(await _supervisionService.GetAllRiskMapFactoriesAsync(dataYear, schemeId, ct));

    /// <summary>
    /// 建立督導計畫（Admin）
    /// </summary>
    [HttpPost("campaigns")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<Guid>> CreateCampaign([FromBody] CreateCampaignRequest request, CancellationToken ct)
    {
        var userId = _currentUser.UserId!.Value;
        var id = await _supervisionService.CreateCampaignAsync(request, userId, ct);
        return CreatedAtAction(nameof(GetCampaign), new { id }, new { id });
    }

    /// <summary>
    /// 更新督導計畫（Admin）
    /// </summary>
    [HttpPut("campaigns/{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<CampaignDto>> UpdateCampaign(Guid id, [FromBody] UpdateCampaignRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _supervisionService.UpdateCampaignAsync(id, request, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 刪除督導計畫（Admin）— 會一併刪除所有業者與督導任務，不可復原
    /// </summary>
    [HttpDelete("campaigns/{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<IActionResult> DeleteCampaign(Guid id, CancellationToken ct)
    {
        try
        {
            await _supervisionService.DeleteCampaignAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 上傳 Excel 匯入業者清冊（Admin）
    /// </summary>
    [HttpPost("campaigns/{id:guid}/import")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<ImportResult>> ImportFromExcel(Guid id, IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "請上傳 Excel 檔案" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".xlsx")
            return BadRequest(new { message = "僅支援 .xlsx 格式" });

        try
        {
            using var stream = file.OpenReadStream();
            var result = await _supervisionService.ImportFactoriesFromExcelAsync(id, stream, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 下載 Excel 匯入範本（Admin）
    /// </summary>
    [HttpGet("campaigns/template")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public IActionResult DownloadImportTemplate()
    {
        using var workbook = new XLWorkbook();

        // ── Sheet 1：說明 ──
        var infoSheet = workbook.Worksheets.Add("說明");
        infoSheet.Cell(1, 1).Value = "督導清冊匯入範本說明";
        infoSheet.Cell(1, 1).Style.Font.Bold = true;
        infoSheet.Cell(1, 1).Style.Font.FontSize = 14;
        infoSheet.Cell(2, 1).Value = "請依照以下兩個工作表的格式填寫資料，不可更改工作表名稱。";
        infoSheet.Cell(4, 1).Value = "工作表「02. 督導業者」欄位說明：";
        infoSheet.Cell(4, 1).Style.Font.Bold = true;
        string[,] infoRows1 = {
            { "A", "業者名稱", "必填" },
            { "B", "工廠登記編號", "選填，填入後可確保改名時地圖仍能正確顯示點位" },
            { "C", "督導年分", "民國年，例如 115" },
            { "D", "工業園區", "選填" },
            { "E", "所屬轄區", "選填" },
            { "F", "縣市", "選填" },
            { "G", "督導機關", "必填，多個以逗號分隔，例如：桃園市政府消防局,環保局" }
        };
        for (int i = 0; i < 7; i++)
        {
            infoSheet.Cell(5 + i, 1).Value = infoRows1[i, 0];
            infoSheet.Cell(5 + i, 2).Value = infoRows1[i, 1];
            infoSheet.Cell(5 + i, 3).Value = infoRows1[i, 2];
        }
        infoSheet.Cell(12, 1).Value = "工作表「03. 公單位對應表單」欄位說明：";
        infoSheet.Cell(12, 1).Style.Font.Bold = true;
        infoSheet.Cell(13, 1).Value = "A";
        infoSheet.Cell(13, 2).Value = "（保留）";
        infoSheet.Cell(14, 1).Value = "B";
        infoSheet.Cell(14, 2).Value = "機關名稱";
        infoSheet.Cell(14, 3).Value = "必填";
        infoSheet.Cell(15, 1).Value = "C";
        infoSheet.Cell(15, 2).Value = "表單名稱";
        infoSheet.Cell(15, 3).Value = "必填，需與系統中已建立的表單名稱完全相符";
        infoSheet.Columns().AdjustToContents();

        // ── Sheet 2：督導業者 ──
        var factorySheet = workbook.Worksheets.Add("02. 督導業者");
        string[] factoryHeaders = { "業者名稱", "工廠登記編號", "督導年分", "工業園區", "所屬轄區", "縣市", "督導機關（逗號分隔）" };
        for (int i = 0; i < factoryHeaders.Length; i++)
        {
            factorySheet.Cell(1, i + 1).Value = factoryHeaders[i];
            factorySheet.Cell(1, i + 1).Style.Font.Bold = true;
            factorySheet.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.LightBlue;
        }
        // 範例資料
        factorySheet.Cell(2, 1).Value = "範例工廠股份有限公司";
        factorySheet.Cell(2, 2).Value = "12345678";
        factorySheet.Cell(2, 3).Value = 115;
        factorySheet.Cell(2, 4).Value = "桃園工業區";
        factorySheet.Cell(2, 5).Value = "臺北分局";
        factorySheet.Cell(2, 6).Value = "桃園市";
        factorySheet.Cell(2, 7).Value = "桃園市政府消防局,桃園市政府環境保護局";
        factorySheet.Columns().AdjustToContents();

        // ── Sheet 3：公單位對應表單 ──
        var agencySheet = workbook.Worksheets.Add("03. 公單位對應表單");
        agencySheet.Cell(1, 1).Value = "（保留）";
        agencySheet.Cell(1, 2).Value = "機關名稱";
        agencySheet.Cell(1, 3).Value = "表單名稱";
        agencySheet.Row(1).Style.Font.Bold = true;
        agencySheet.Row(1).Style.Fill.BackgroundColor = XLColor.LightBlue;
        // 範例資料
        agencySheet.Cell(2, 2).Value = "桃園市政府消防局";
        agencySheet.Cell(2, 3).Value = "公共危險物品等場所管理督導檢核項目";
        agencySheet.Cell(3, 2).Value = "桃園市政府環境保護局";
        agencySheet.Cell(3, 3).Value = "毒性及關注化學物質管理督導檢核項目";
        agencySheet.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        var bytes = stream.ToArray();

        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "督導清冊匯入範本.xlsx");
    }

    // ─── 督導任務 ───

    /// <summary>
    /// 取得目前使用者的督導任務清單（分頁）
    /// </summary>
    [HttpGet("my-tasks")]
    public async Task<ActionResult<PagedMyTasksResponse>> GetMyTasks(
        [FromQuery] Guid? campaignId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? status = null,
        [FromQuery] string? search = null,
        [FromQuery] Guid? agencyId = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        var userId = _currentUser.UserId!.Value;
        return Ok(await _supervisionService.GetMyTasksPagedAsync(
            userId, campaignId, _currentUser.IsSystemAdmin,
            page, pageSize, status, search, agencyId, ct));
    }

    /// <summary>
    /// 取得計畫進度總覽（Admin）
    /// </summary>
    [HttpGet("campaigns/{id:guid}/progress")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<CampaignProgressDto>> GetProgress(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await _supervisionService.GetCampaignProgressAsync(id, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 將表單 Submission 連結到督導任務（填表完成後呼叫）
    /// </summary>
    [HttpPut("tasks/{taskId:guid}/link-submission/{submissionId:guid}")]
    public async Task<ActionResult> LinkSubmission(Guid taskId, Guid submissionId, CancellationToken ct)
    {
        try
        {
            await _supervisionService.LinkSubmissionAsync(taskId, submissionId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得計畫內所有已完成任務的實際填寫數據（Admin）
    /// </summary>
    [HttpGet("campaigns/{campaignId:guid}/responses")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<SupervisionResponseDto>>> GetCampaignResponses(
        Guid campaignId,
        [FromQuery] Guid? formId,
        CancellationToken ct)
    {
        var responses = await _supervisionService.GetCampaignResponsesAsync(campaignId, formId, ct);
        return Ok(responses);
    }

    /// <summary>
    /// 取得計畫內有督導任務的機關清單（Admin，distinct、不受分頁筆數限制，給篩選下拉選單用）
    /// </summary>
    [HttpGet("campaigns/{campaignId:guid}/agencies")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<SupervisionAgencyOptionDto>>> GetCampaignAgencies(
        Guid campaignId, CancellationToken ct)
        => Ok(await _supervisionService.GetCampaignAgenciesAsync(campaignId, ct));

    /// <summary>
    /// 依工廠為主體彙整此計畫的督導結果：每家工廠一列，欄位是計畫內每張表單各自的督導結果（Admin）
    /// </summary>
    [HttpGet("campaigns/{campaignId:guid}/factory-summary")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<CampaignFactorySummaryDto>> GetCampaignFactorySummary(
        Guid campaignId, CancellationToken ct)
        => Ok(await _supervisionService.GetCampaignFactorySummaryAsync(campaignId, ct));

    /// <summary>
    /// 退回督導任務（Admin），重置為待填寫狀態
    /// </summary>
    [HttpPut("tasks/{taskId:guid}/reject")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> RejectTask(Guid taskId, CancellationToken ct)
    {
        try
        {
            await _supervisionService.RejectTaskAsync(taskId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 預覽將被重置的任務清單
    /// </summary>
    [HttpGet("tasks/reset/preview")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> GetResetTasksPreview(
        [FromQuery] Guid campaignId,
        [FromQuery] Guid? formId,
        [FromQuery] string? factorySearch,
        [FromQuery] string? status,
        CancellationToken ct)
    {
        var items = await _supervisionService.GetResetTasksPreviewAsync(campaignId, formId, factorySearch, status, ct);
        return Ok(items);
    }

    /// <summary>
    /// 批次重置任務為初始未填寫狀態（依計畫/表單，或精準指定任務 ID）
    /// </summary>
    [HttpPost("tasks/reset")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> ResetTasks(
        [FromQuery] Guid? campaignId,
        [FromQuery] Guid? formId,
        [FromBody] Guid[]? taskIds,
        CancellationToken ct)
    {
        try
        {
            var count = await _supervisionService.ResetTasksAsync(campaignId, formId, taskIds, ct);
            return Ok(new { resetCount = count });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 同步督導任務的 FormId（將 AgencyFormType 的綁定補回歷史任務）
    /// </summary>
    [HttpPost("campaigns/{campaignId:guid}/sync-form-ids")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> SyncFormIds(Guid campaignId, CancellationToken ct)
    {
        var updated = await _supervisionService.SyncTaskFormIdsAsync(campaignId, ct);
        return Ok(new { updated });
    }

    // ─── 工廠管理 ───

    /// <summary>
    /// 取得計畫內所有工廠
    /// </summary>
    [HttpGet("campaigns/{campaignId:guid}/factories")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<SupervisedFactoryDto>>> GetFactories(Guid campaignId, CancellationToken ct)
    {
        return Ok(await _supervisionService.GetFactoriesAsync(campaignId, ct));
    }

    /// <summary>
    /// 取得工廠詳情
    /// </summary>
    [HttpGet("factories/{factoryId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<SupervisedFactoryDto>> GetFactory(Guid factoryId, CancellationToken ct)
    {
        try
        {
            return Ok(await _supervisionService.GetFactoryByIdAsync(factoryId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 新增工廠
    /// </summary>
    [HttpPost("campaigns/{campaignId:guid}/factories")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<Guid>> CreateFactory(Guid campaignId, [FromBody] CreateFactoryRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _supervisionService.CreateFactoryAsync(campaignId, request, ct);
            return CreatedAtAction(nameof(GetFactory), new { factoryId = id }, new { id });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 更新工廠
    /// </summary>
    [HttpPut("factories/{factoryId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<SupervisedFactoryDto>> UpdateFactory(Guid factoryId, [FromBody] UpdateFactoryRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _supervisionService.UpdateFactoryAsync(factoryId, request, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 刪除工廠
    /// </summary>
    [HttpDelete("factories/{factoryId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> DeleteFactory(Guid factoryId, CancellationToken ct)
    {
        try
        {
            await _supervisionService.DeleteFactoryAsync(factoryId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 找出所有缺登記編號的工廠管理資料，依名稱在全台工廠主資料（FactoryMaster）比對可能
    /// 的候選項，讓使用者人工確認後補上登記編號。
    /// </summary>
    [HttpGet("factories/registration-no-suggestions")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<FactoryRegistrationNoSuggestionDto>>> GetRegistrationNoSuggestions(CancellationToken ct)
        => Ok(await _supervisionService.GetRegistrationNoSuggestionsAsync(ct));

    /// <summary>人工確認候選項後，補上這筆工廠的登記編號（會觸發全資料庫工廠名稱同步）</summary>
    [HttpPost("factories/{factoryId:guid}/registration-no")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> ApplyRegistrationNo(Guid factoryId, [FromBody] ApplyRegistrationNoRequest request, CancellationToken ct)
    {
        try
        {
            await _supervisionService.ApplyRegistrationNoAsync(factoryId, request.RegistrationNo, ct);
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

    // ─── 機關綁定工廠 ───

    /// <summary>
    /// 取得機關在某計畫中已綁定的工廠
    /// </summary>
    [HttpGet("agencies/{agencyId:guid}/factories")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<SupervisedFactoryDto>>> GetAgencyFactories(
        Guid agencyId, [FromQuery] Guid campaignId, CancellationToken ct)
    {
        return Ok(await _supervisionService.GetAgencyFactoriesAsync(agencyId, campaignId, ct));
    }

    /// <summary>
    /// 綁定工廠到機關
    /// </summary>
    [HttpPost("agencies/{agencyId:guid}/factories/{factoryId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<BindFactoryResult>> BindFactory(Guid agencyId, Guid factoryId, CancellationToken ct)
    {
        try
        {
            return Ok(await _supervisionService.BindFactoryToAgencyAsync(agencyId, factoryId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 解除機關與工廠的綁定
    /// </summary>
    [HttpDelete("agencies/{agencyId:guid}/factories/{factoryId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<UnbindFactoryResult>> UnbindFactory(Guid agencyId, Guid factoryId, CancellationToken ct)
    {
        return Ok(await _supervisionService.UnbindFactoryFromAgencyAsync(agencyId, factoryId, ct));
    }

    // ─── 產業園區管理 ───

    /// <summary>
    /// 取得所有督導計畫中出現的產業園區名稱（distinct，供下拉選單使用）
    /// </summary>
    [HttpGet("industrial-parks")]
    public async Task<ActionResult<List<string>>> GetIndustrialParks(CancellationToken ct)
    {
        return Ok(await _supervisionService.GetDistinctIndustrialParksAsync(ct));
    }

    /// <summary>
    /// 取得指定使用者綁定的產業園區清單（Admin）
    /// </summary>
    [HttpGet("users/{userId:guid}/industrial-parks")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<string>>> GetUserIndustrialParks(Guid userId, CancellationToken ct)
    {
        return Ok(await _supervisionService.GetUserIndustrialParksAsync(userId, ct));
    }

    /// <summary>
    /// 設定使用者綁定的產業園區（Admin，替換整組）
    /// </summary>
    [HttpPut("users/{userId:guid}/industrial-parks")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<IActionResult> SetUserIndustrialParks(Guid userId, [FromBody] SetUserIndustrialParksRequest request, CancellationToken ct)
    {
        await _supervisionService.SetUserIndustrialParksAsync(userId, request.ParkNames, ct);
        return NoContent();
    }

    /// <summary>
    /// 取得督導計畫工廠的風險排名（與 FactoryRiskController.GetRanking 相同計算邏輯，
    /// 結果過濾至此計畫內的工廠，回傳格式完全相同）
    /// </summary>
    [HttpGet("campaigns/{campaignId:guid}/risk-ranking")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<FactoryRiskRankingResultDto>> GetCampaignRiskRanking(
        Guid campaignId, [FromQuery] Guid schemeId, [FromQuery] int? dataYear, CancellationToken ct)
    {
        try
        {
            // 1. 用完全相同的方式計算全台排名
            var fullResult = await _rankingService.GetRankingAsync(schemeId, dataYear, ct);

            // 2. 取得此計畫的工廠登記編號集合（用來過濾）
            var campaignRegNos = await _supervisionService.GetCampaignFactoryRegNosAsync(campaignId, ct);

            // 3. 過濾出屬於此計畫的工廠，保留原始全台 rank（方便比較排名），重新計算計畫內排名
            var filteredItems = fullResult.Items
                .Where(i => i.FactoryRegistrationNo != null && campaignRegNos.Contains(i.FactoryRegistrationNo))
                .Select((item, idx) => item with { Rank = idx + 1 })
                .ToList();

            return Ok(new FactoryRiskRankingResultDto(filteredItems, fullResult.IncompleteFactories, fullResult.ResolvedDataYear));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

public record SetUserIndustrialParksRequest(List<string> ParkNames);

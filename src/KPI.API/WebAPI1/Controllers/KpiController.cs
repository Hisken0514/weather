using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[Route("[controller]")]
public class KpiController: ControllerBase
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<KpiController> _logger;
    private readonly IKpiService _kpiService;

    public KpiController(ISHAuditDbcontext db, ILogger<KpiController> logger, IKpiService kpiService)
    {
        _db = db;
        _logger = logger;
        _kpiService = kpiService;
    }
    
    [HttpPost("create-kpi-field")]
    public async Task<IActionResult> CreateKpiField([FromBody] CreateKpiFieldDto dto)
    {
        var userId = User.FindFirst("sub")?.Value 
                     ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                     ?? "anonymous";
        var userName = User.FindFirst(ClaimTypes.Name)?.Value 
                       ?? User.FindFirst("name")?.Value 
                       ?? "unknown";
        _logger.LogInformation("使用者 {userName} ({userId}) 呼叫 CreateKpiField，資料：{@Dto}", userName, userId, dto);
        try
        {
            var result = await _kpiService.CreateKpiFieldAsync(dto);
            _logger.LogInformation("使用者 {userName} ({userId}) 成功建立 KPI Field：{@Result}", userName, userId, result);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "使用者 {userName} ({userId}) 建立 KPI Field 失敗", userName, userId);
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    
    [HttpPost("import-single")]
    public async Task<IActionResult> InsertKpiData([FromBody] KpisingleRow row)
    {
        var userId = User.FindFirst("sub")?.Value 
                     ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                     ?? "anonymous";
        var userName = User.FindFirst(ClaimTypes.Name)?.Value 
                       ?? User.FindFirst("name")?.Value 
                       ?? "unknown";
        _logger.LogInformation("使用者 {userName} ({userId}) 嘗試匯入單筆 KPI 資料：{@Row}", userName, userId, row);

        if (!ModelState.IsValid)
        {
            _logger.LogWarning("使用者 {userName} ({userId}) 匯入資料驗證失敗", userName, userId);
            return BadRequest(new { success = false, message = "資料驗證失敗" });
        }

        try
        {
            var (success, message) = await _kpiService.InsertKpiData(row);

            if (!success)
            {
                _logger.LogWarning("使用者 {userName} ({userId}) 匯入失敗：{Message}", userName, userId, message);
                return BadRequest(new { success = false, message });
            }

            _logger.LogInformation("使用者 {userName} ({userId}) 匯入成功：{Message}", userName, userId, message);
            return Ok(new { success = true, message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "使用者 {userName} ({userId}) 匯入單筆 KPI 發生例外", userName, userId);
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    
    
    [HttpGet("display")]
    [Authorize]
    public async Task<IActionResult> GetKpiDisplayAsync(
        [FromQuery] int? organizationId,
        [FromQuery] int? startYear,
        [FromQuery] int? endYear,
        [FromQuery] string? startQuarter,
        [FromQuery] string? endQuarter,
        [FromQuery] string? keyword)
    {
        var userId = User.FindFirst("sub")?.Value
                     ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                     ?? "anonymous";
        var userName = User.FindFirst(ClaimTypes.Name)?.Value
                       ?? User.FindFirst("name")?.Value
                       ?? "unknown";

        try
        {
            var result = await _kpiService.GetKpiDisplayAsync(organizationId, startYear, endYear, startQuarter, endQuarter, keyword);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            // 把完整的例外鏈串起來回傳，前端才看得到實際卡在哪一筆資料，不用只憑「查詢失敗」猜
            var detail = ex.Message;
            var inner = ex.InnerException;
            while (inner != null)
            {
                detail += " → " + inner.Message;
                inner = inner.InnerException;
            }
            _logger.LogError(ex, "使用者 {userName} ({userId}) 查詢 KPI Display 失敗", userName, userId);
            return BadRequest(new { success = false, message = detail });
        }
    }
    
    [HttpGet("displayPage")]
    public async Task<IActionResult> GetKpiDisplayPagedAsync(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] int? organizationId = null,
        [FromQuery] string? categoryName = null,
        [FromQuery] string? fieldName = null)
    {
        try
        {
            var result = await _kpiService.GetKpiDisplayPagedAsync(
                page: page,
                pageSize: pageSize,
                organizationId: organizationId,
                categoryName: categoryName,
                fieldName: fieldName
            );

            return Ok(new
            {
                success = true,
                data = result
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new
            {
                success = false,
                message = "查詢發生錯誤",
                detail = ex.Message
            });
        }
    }
 
    [HttpGet("kpidata-for-report")]
    public async Task<IActionResult> GetKpiDataDtoByOrganizationIdAsync(int organizationId, int year, string quarter)
    {
        var kpiDataList = await _kpiService.GetKpiDataDtoByOrganizationIdAsync(organizationId, year, quarter);
    
        if (kpiDataList.Count == 0)
            return Ok(new { success = false, message = "該單位目前無 KPI 可填報", data = new List<KpiDataDto>() });

        return Ok(new { success = true, data = kpiDataList });
    }
    
    [HttpPost("submit-kpi-report")]
    public async Task<IActionResult> SubmitKpiReportsAsync([FromBody] List<KpiReportInsertDto> reports)
    {
        Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId);
        var userName = User.FindFirst(ClaimTypes.Name)?.Value;
        var result = await _kpiService.SubmitKpiReportsAsync(reports, userId == Guid.Empty ? null : userId, userName);
        return Ok(new { success = result.Success, message = result.Message });
    }

    [HttpGet("submission-history")]
    [Authorize]
    public async Task<IActionResult> GetSubmissionHistory([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] string quarter)
    {
        var result = await _kpiService.GetKpiReportHistoryAsync(organizationId, year, quarter);
        return Ok(new { success = true, data = result });
    }
    [HttpPost("self-return")]
    [Authorize]
    public async Task<IActionResult> SelfReturnKpiReports([FromBody] SelfReturnDto dto)
    {
        var result = await _kpiService.SelfReturnKpiReportsAsync(dto.OrganizationId, dto.Year, dto.Quarter);
        return Ok(new { success = result.Success, message = result.Message });
    }

    [HttpPost("save-kpi-report")]
    public async Task<IActionResult> SaveDraft([FromBody] List<KpiReportInsertDto> reports)
    {
        var (success, message) = await _kpiService.SaveDraftReportsAsync(reports);
        return Ok(new { success, message });
    }
    
    [HttpGet("load-kpi-draft")]
    public async Task<IActionResult> LoadKpiDraft(int organizationId, int year, string quarter)
    {
        var result = await _kpiService.LoadDraftReportsAsync(organizationId, year, quarter);
        return Ok(new { success = true, data = result });
    }
    
    // 上傳Excel並預覽前五筆
    [HttpPost("import-preview")]
    public async Task<IActionResult> ImportPreview([FromForm] IFormFile file, [FromForm] int organizationId)
    {
        if (file == null || file.Length == 0)
            return BadRequest("請上傳檔案。");
        
        using var stream = file.OpenReadStream();
        
        var previewData = await _kpiService.ParseExcelAsync(stream, organizationId);
        return Ok(previewData);
    }
    
    /// <summary>
    /// 批次匯入KPI資料
    /// </summary>
    [HttpPost("import-confirm")]
    public async Task<IActionResult> ImportConfirm([FromBody] KpiImportConfirmDto dto)
    {
        if (dto.Rows == null || dto.Rows.Count == 0)
            return BadRequest(new { message = "請提供匯入資料。" });

        var (success, msg) = await _kpiService.BatchInsertKpiDataAsync(dto.OrganizationId, dto.Rows);
        return success ? Ok(new { message = msg }) : BadRequest(new { message = msg });
    }
    
    
    // 系統管理員上傳Excel並預覽前五筆
    [HttpPost("full-import-preview")]
    public async Task<IActionResult> ParseFullImportExcel([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("請上傳檔案。");

        var previewData = _kpiService.ParseFullImportExcel(file.OpenReadStream());
        return Ok(previewData);
    }
    
    /// <summary>
    /// 系統管理員批次匯入KPI資料
    /// </summary>
    [HttpPost("full-import-confirm")]
    public async Task<IActionResult> BatchFullKpiDataAsync([FromBody] List<KpiimportexcelDto> rows)
    {
        if (rows == null || rows.Count == 0)
        {
            return BadRequest("匯入資料為空！");
        }

        var (success, message) = await _kpiService.BatchFullKpiDataAsync(rows);

        if (success)
        {
            return Ok(new
            {
                success = true,
                message
            });
        }
        else
        {
            return BadRequest(new
            {
                success = false,
                message
            });
        }
    }
    
    [HttpDelete("delete-kpidata-by-organization/{organizationId}")]
    public async Task<IActionResult> DeleteKpiDataByOrganization(int organizationId)
    {
        try
        {
            var targetData = await _db.KpiDatas
                .Where(d => d.OrganizationId == organizationId)
                .ToListAsync();

            if (!targetData.Any())
            {
                return NotFound($"找不到 OrganizationId = {organizationId} 的資料。");
            }

            _db.KpiDatas.RemoveRange(targetData);
            await _db.SaveChangesAsync();

            return Ok($"✅ 成功刪除 {targetData.Count} 筆 KpiData 資料。");
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"❌ 刪除失敗，原因：{ex.Message}");
        }
    }
    
    [HttpGet("report-pdf")]
    [Authorize]
    public async Task<IActionResult> DownloadKpiReportPdf(
        [FromQuery] int organizationId,
        [FromQuery] int year,
        [FromQuery] string quarter)
    {
        var bytes = await _kpiService.GenerateKpiReportPdfAsync(organizationId, year, quarter);
        if (bytes == null || bytes.Length == 0)
            return NotFound(new { success = false, message = "無可下載的核准報告" });

        return File(bytes, "application/pdf",
            $"KPI_Report_{organizationId}_{year}_{quarter}.pdf");
    }

    [HttpGet("report-history")]
    public async Task<IActionResult> GetReportHistory([FromQuery] int kpiDataId)
    {
        var reports = await _db.KpiReports
            .Where(r => r.KpiDataId == kpiDataId)
            .OrderByDescending(r => r.Year)
            .ThenByDescending(r => r.Period)
            .ToListAsync();

        return Ok(reports);
    }
    
    [HttpGet("kpiCycle-list")]
    public async Task<IActionResult> GetCycleOptions()
    {
        var cycles = await _kpiService.GetAllCyclesAsync();
        return Ok(cycles);
    }
    
    [HttpGet("download-template")]
    public async Task<IActionResult> DownloadTemplate(
        [FromQuery] int organizationId,
        [FromQuery] int? year,
        [FromQuery] string? quarter)
    {
        if (organizationId <= 0)
            return BadRequest("缺少有效的 organizationId");

        var now = DateTime.Now;
        var resolvedYear    = year    ?? (now.Year - 1911);
        var resolvedQuarter = quarter ?? "Q2";

        var (fileName, content) = await _kpiService.GenerateTemplateAsync(organizationId, resolvedYear, resolvedQuarter);

        return File(content,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }
    
    [HttpPost("fullpreview-for-report")]
    [Authorize]
    public async Task<IActionResult> PreviewImportAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "未上傳檔案" });

        var previewList = await _kpiService.ReadPreviewAsync(file);

        var errorList = previewList
            .Where(p => p.ErrorMessages?.Any() == true)
            .Select(p => $"第 {p.RowIndex} 列：{string.Join("、", p.ErrorMessages)}")
            .ToList();

        if (errorList.Any())
        {
            return BadRequest(new
            {
                message = "檔案格式錯誤，請修正後重新匯入。",
                errors = errorList
            });
        }
        return Ok(previewList); // 如果沒錯就正常回傳預覽資料
    }
    
    [HttpPost("fullsubmit-for-report")]
    [Authorize]
    public async Task<IActionResult> FullImportAsync(IFormFile file, int organizationId, int year, string quarter)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "未上傳檔案" });

        Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId);
        var userName = User.FindFirst(ClaimTypes.Name)?.Value;
        var (inserted, updated, skipped) = await _kpiService.ImportAsync(
            file, organizationId, year, quarter,
            userId == Guid.Empty ? null : userId, userName);
        return Ok(new { inserted, updated, skipped });
    }
}
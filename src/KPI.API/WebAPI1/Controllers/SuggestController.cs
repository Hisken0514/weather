using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[Route("[controller]")]
public class SuggestController: ControllerBase
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<SuggestController> _logger;
    private readonly ISuggestService _suggestService;
    private readonly IUserService _userService;
    private readonly IKpiService _kpiService;
    private readonly IOrganizationService _organizationService;

    public SuggestController(ILogger<SuggestController> logger,ISHAuditDbcontext db,ISuggestService suggestService,IUserService userService, IKpiService kpiService, IOrganizationService organizationService)
    {
        _db = db;
        _suggestService = suggestService;
        _logger = logger;
        _userService = userService;
        _kpiService = kpiService;
        _organizationService = organizationService;
    }

    
    [HttpGet("GetAllSuggest")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<SuggestDto>>> GetAll([FromQuery] int? organizationId, [FromQuery] int? startYear, [FromQuery] int? endYear, [FromQuery] string? keyword)
    {
        var suggests = await _suggestService.GetAllSuggestsAsync(organizationId, startYear, endYear, keyword);
        return Ok(suggests);
    }
    
    [HttpGet("GetAllSuggestData")]
    [Authorize]  // 確保有登入
    public async Task<ActionResult<IEnumerable<SuggestDto>>> GetAllSuggestData([FromQuery] int? organizationId, [FromQuery] string? keyword)
    {
        // 從 JWT 取得 userId
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return Unauthorized("無效的使用者身份");

        // 查出這位使用者的所屬組織與類型
        var user = await _db.Users
            .Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound("找不到使用者資料");

        var orgTypeId = user.Organization.TypeId;

        // TypeId 2/3/4 為公司階層，其餘（政府型）皆為 admin
        int[] companyTypeIds = { 2, 3, 4 };
        bool isAdmin = !companyTypeIds.Contains(orgTypeId);
        int? finalOrgId = isAdmin
            ? organizationId    // admin：有傳就查指定，沒傳就查全部
            : user.OrganizationId;

        var suggests = await _suggestService.GetAllSuggestDatesAsync(finalOrgId, keyword);
        return Ok(suggests);
    }
    
    [HttpGet("GetSuggestDetail/{id}")]
    [Authorize]
    public async Task<IActionResult> GetSuggestDetail(int id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound();

        var result = await _suggestService.GetSuggestDetailAsync(id);
        if (result == null)
            return NotFound();

        // 🔐 權限驗證：公司角色只能看自己組織（含下層工廠子組織）
        int[] companyTypeIds = { 2, 3, 4 };
        if (companyTypeIds.Contains(user.Organization.TypeId))
        {
            var allowedOrgIds = _organizationService.GetDescendantOrganizationIds(user.OrganizationId);
            if (!allowedOrgIds.Contains(result.OrganizationId ?? 0))
                return Forbid();
        }

        return Ok(result);
    }
    
    [HttpGet("GetCommitteeUsers")]
    public async Task<ActionResult<IEnumerable<SuggestDto>>> GetCommitteeUsers()
    {
        var suggests = await _userService.GetCommitteeUsers();
        return Ok(suggests);
    }
    
    [HttpGet("GetAllCategories")]
    public async Task<IActionResult> GetAllCategories()
    {
        var fields = await _kpiService.GetAllFieldsAsync();
        return Ok(fields);
    }
    
    [HttpPost("import-singleSuggest")]
    public async Task<IActionResult> ImportSingleSuggest([FromBody] AddSuggestDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { success = false, message = "資料驗證失敗" });

        var result = await _suggestService.ImportSingleSuggestAsync(dto);
        if (result.Success)
            return Ok(new { success = true, message = result.Message });

        return BadRequest(new { success = false, message = result.Message });
    }
    
    // 上傳Excel並預覽前五筆
    [HttpPost("import-preview")]
    public async Task<IActionResult> ImportPreview([FromForm] IFormFile file, [FromForm] int organizationId)
    {
        if (file == null || file.Length == 0)
            return BadRequest("請上傳檔案。");

        using var stream = file.OpenReadStream();
        
        var previewData = await _suggestService.ParseExcelAsync(stream, organizationId);
        return Ok(previewData);
    }
    
    /// <summary>
    /// 批次匯入委員建議資料
    /// </summary>
    [HttpPost("import-confirm")]
    public async Task<IActionResult> BatchImportConfirm([FromBody] SuggestImportConfirmDto dto)
    {
        if (dto.Rows == null || dto.Rows.Count == 0)
            return BadRequest(new { message = "請提供匯入資料。" });

        var (success, msg)= await _suggestService.BatchInsertSuggestAsync(dto.OrganizationId, dto.Rows);
        return success ? Ok(new { message = msg }) : BadRequest(new { message = msg });
    }
    
    [HttpGet("download-template")]
    public async Task<IActionResult> DownloadTemplate([FromQuery] int organizationId)
    {
        var (fileName, content) = await _suggestService.GenerateTemplateAsync(organizationId);
        return File(content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }
    
    [HttpPost("fullpreview-for-report")]
    public async Task<IActionResult> PreviewFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "請上傳檔案" });

        try
        {
            var previewData = await _suggestService.PreviewAsync(file);
            return Ok(previewData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Suggest 預覽解析失敗");
            return BadRequest(new { message = $"檔案解析失敗：{ex.Message}" });
        }
    }
    
    [HttpPost("fullsubmit-for-report")]
    public async Task<IActionResult> ImportFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("請上傳檔案");

        var (success, message) = await _suggestService.ImportAsync(file);

        if (success)
            return Ok(new { message });

        return StatusCode(500, new { message });
    }
    
    [HttpGet("selectOrg-for-report")]
    public async Task<IActionResult> GetReportsByOrganization(int organizationId)
    {
        var data = await _suggestService.GetReportsByOrganizationAsync(organizationId);
        return Ok(data);
    }
    
    [HttpGet("report-pdf")]
    public async Task<IActionResult> DownloadSuggestReportPdf([FromQuery] int organizationId)
    {
        if (organizationId <= 0)
            return BadRequest(new { message = "缺少有效的 organizationId" });

        var bytes = await _suggestService.GenerateSuggestReportPdfAsync(organizationId);
        if (bytes == null || bytes.Length == 0)
            return NotFound(new { message = "該組織目前無委員建議報告資料" });

        return File(bytes, "application/pdf",
            $"委員建議報告_{organizationId}_{DateTime.Now:yyyyMMdd}.pdf");
    }

    [HttpPut("update-report")]
    public async Task<IActionResult> UpdateReport([FromBody] List<SuggestDto> reports)
    {
        _logger.LogInformation("收到更新筆數：{count}", reports.Count);
        if (reports == null || !reports.Any())
            return BadRequest(new { success = false, message = "請提供要更新的報告資料" });

        var result = await _suggestService.UpdateSuggestReportsAsync(reports);

        if (!result)
            return BadRequest(new { success = false, message = "更新失敗，可能找不到對應的報告資料" });

        return Ok(new { success = true });
    }

    [HttpPut("{suggestDateId}/organization")]
    [Authorize]
    public async Task<IActionResult> UpdateOrganization(int suggestDateId, [FromBody] UpdateSuggestOrganizationDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        int[] companyTypeIds = { 2, 3, 4 };
        if (companyTypeIds.Contains(user.Organization.TypeId))
            return Forbid();

        var (success, message) = await _suggestService.UpdateSuggestDateOrganizationAsync(suggestDateId, dto.NewOrganizationId);
        return success ? Ok(new { message }) : BadRequest(new { message });
    }

    [HttpPut("fix-organization")]
    [Authorize]
    public async Task<IActionResult> FixReportsOrganization([FromBody] FixReportsOrganizationDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        int[] companyTypeIds = { 2, 3, 4 };
        if (companyTypeIds.Contains(user.Organization.TypeId))
            return Forbid();

        var (success, message) = await _suggestService.FixReportsOrganizationAsync(dto.ReportIds, dto.NewOrganizationId);
        return success ? Ok(new { message }) : BadRequest(new { message });
    }

    [HttpGet("submission-status")]
    [Authorize]
    public async Task<IActionResult> GetSubmissionStatus([FromQuery] int organizationId, [FromQuery] int year, [FromQuery] string quarter)
    {
        var status = await _suggestService.CheckSubmissionStatusAsync(organizationId, year, quarter);
        return Ok(new { submitted = status == SuggestSubmissionStatus.Submitted, status = status?.ToString() });
    }

    [HttpPost("record-submission")]
    [Authorize]
    public async Task<IActionResult> RecordSubmission([FromBody] SuggestSubmissionDto dto)
    {
        Guid.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId);
        var userName = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
        var (success, message) = await _suggestService.RecordSubmissionAsync(
            dto.OrganizationId, dto.Year, dto.Quarter,
            userId == Guid.Empty ? null : userId, userName);
        return Ok(new { success, message });
    }

    [HttpPost("self-return")]
    [Authorize]
    public async Task<IActionResult> SelfReturn([FromBody] SuggestSubmissionDto dto)
    {
        var (success, message) = await _suggestService.SelfReturnSuggestAsync(dto.OrganizationId, dto.Year, dto.Quarter);
        return Ok(new { success, message });
    }

    /// <summary>
    /// 委員建議修改歷程：以 SuggestSubmissions 為時間基準，
    /// 找出每次送出前後在 DataChangeLogs 中改動了哪些欄位。
    /// </summary>
    [HttpGet("change-history")]
    [Authorize]
    public async Task<IActionResult> GetChangeHistory([FromQuery] int organizationId)
    {
        // 1. 只取 Submitted 事件作為時間窗口端點（退回事件不切窗口）
        var submissions = await _db.SuggestSubmissions
            .Where(s => s.OrganizationId == organizationId && s.Status == SuggestSubmissionStatus.Submitted)
            .OrderBy(s => s.SubmittedAt)
            .ToListAsync();

        if (!submissions.Any())
            return Ok(new { success = true, data = Array.Empty<object>() });

        // 2. 取得該廠商所有 SuggestReport（不限年份，可能在115年更新114年的資料）
        var suggestDateIds = await _db.SuggestDates
            .Where(d => d.OrganizationId == organizationId)
            .Select(d => d.Id)
            .ToListAsync();

        var reportInfos = await _db.SuggestReports
            .Include(r => r.SuggestionType)
            .Where(r => suggestDateIds.Contains(r.SuggestDateId))
            .Select(r => new {
                r.Id,
                r.SuggestionContent,
                SuggestType = r.SuggestionType != null ? r.SuggestionType.Name : "",
            })
            .ToListAsync();

        if (!reportInfos.Any())
            return Ok(new { success = true, data = Array.Empty<object>() });

        var reportIdStrings = reportInfos.Select(r => r.Id.ToString()).ToHashSet();
        var reportDict = reportInfos.ToDictionary(r => r.Id.ToString());

        // 3. 取得所有 DataChangeLog（Update），依時間排序
        var allLogs = await _db.DataChangeLogs
            .Where(l => l.EntityName == "SuggestReport"
                        && l.EntityId != null
                        && reportIdStrings.Contains(l.EntityId)
                        && l.Action == "Update")
            .OrderBy(l => l.OccurredAtUtc)
            .ToListAsync();

        var trackedFields = new[]
        {
            new { Key = "IsAdopted",      Label = "是否參採" },
            new { Key = "ImproveDetails", Label = "改善對策/辦理情形" },
            new { Key = "Manpower",       Label = "投入人力" },
            new { Key = "Budget",         Label = "投入經費" },
            new { Key = "Completed",      Label = "是否完成改善" },
            new { Key = "DoneYear",       Label = "預計完成年份" },
            new { Key = "DoneMonth",      Label = "預計完成月份" },
            new { Key = "ParallelExec",   Label = "平行展開" },
            new { Key = "ExecPlan",       Label = "展開計畫" },
            new { Key = "Remark",         Label = "備註" },
        };

        // 4. 以每次 Submission 為時間窗口，計算本次送出前後的欄位差異
        var result = new List<object>();
        for (int i = 0; i < submissions.Count; i++)
        {
            var sub = submissions[i];
            var windowStart = i > 0 ? submissions[i - 1].SubmittedAt : DateTime.MinValue;
            var windowEnd   = sub.SubmittedAt;

            // 本窗口內有異動的 logs
            var windowLogs = allLogs
                .Where(l => l.OccurredAtUtc > windowStart && l.OccurredAtUtc <= windowEnd)
                .ToList();

            if (!windowLogs.Any()) continue;

            var changes = windowLogs
                .GroupBy(l => l.EntityId!)
                .Where(g => reportDict.ContainsKey(g.Key))
                .Select(g => {
                    var info = reportDict[g.Key];

                    // 本窗口最終狀態（最新一筆 log）
                    var latestPayload = ParsePayload(g.OrderByDescending(l => l.OccurredAtUtc).First().PayloadJson);

                    // 上次送出時的狀態（窗口開始前最近一筆 log）
                    var prevLog = allLogs
                        .Where(l => l.EntityId == g.Key && l.OccurredAtUtc <= windowStart)
                        .OrderByDescending(l => l.OccurredAtUtc)
                        .FirstOrDefault();
                    var prevPayload = prevLog != null ? ParsePayload(prevLog.PayloadJson) : null;

                    var changedFields = trackedFields
                        .Select(f => new {
                            field = f.Key,
                            label = f.Label,
                            from  = StrField(prevPayload,   f.Key),
                            to    = StrField(latestPayload, f.Key),
                        })
                        .Where(x => x.from != x.to)
                        .ToList<object>();

                    return new {
                        suggestReportId = int.Parse(g.Key),
                        suggestContent  = info.SuggestionContent,
                        suggestType     = info.SuggestType,
                        changedFields,
                    };
                })
                .Where(x => x.changedFields.Any())
                .ToList<object>();

            if (!changes.Any()) continue;

            result.Add(new {
                year                = sub.Year,
                quarter             = sub.Period,
                submittedAt         = sub.SubmittedAt,
                submittedByUserName = sub.SubmittedByUserName,
                changes,
            });
        }

        return Ok(new { success = true, data = result });
    }

    private static Dictionary<string, JsonElement>? ParsePayload(string? json)
    {
        if (string.IsNullOrEmpty(json)) return null;
        try { return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json); }
        catch { return null; }
    }

    private static string? StrField(Dictionary<string, JsonElement>? payload, string key)
    {
        if (payload == null || !payload.TryGetValue(key, out var val)) return null;
        return val.ValueKind == JsonValueKind.Null ? null : val.ToString();
    }
}

public class SuggestSubmissionDto
{
    public int OrganizationId { get; set; }
    public int Year { get; set; }
    public string Quarter { get; set; } = "";
}

public class UpdateSuggestOrganizationDto
{
    public int NewOrganizationId { get; set; }
}

public class FixReportsOrganizationDto
{
    public List<int> ReportIds { get; set; } = new();
    public int NewOrganizationId { get; set; }
}
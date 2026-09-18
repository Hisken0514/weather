using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[Route("[controller]")]
public class ReportController: ControllerBase
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<ReportController> _logger;
    private readonly IReportService _reportService;
    
    public ReportController(ILogger<ReportController> logger,ISHAuditDbcontext db,IReportService reportService)
    {
        _db = db;
        _logger = logger;
        _reportService = reportService;
    }
    
    /// <summary>取得使用者所在組織及所有下層組織 ID（廣度優先）</summary>
    private async Task<List<int>> GetSelfAndDescendantOrgIdsAsync(int rootOrgId)
    {
        var allOrgs = await _db.Organizations
            .AsNoTracking()
            .Select(o => new { o.Id, o.ParentId })
            .ToListAsync();

        var result = new List<int>();
        var queue = new Queue<int>();
        queue.Enqueue(rootOrgId);
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            result.Add(current);
            foreach (var child in allOrgs.Where(o => o.ParentId == current))
                queue.Enqueue(child.Id);
        }
        return result;
    }

    [HttpGet("GetCompletionRates")]
    [Authorize]
    public async Task<IActionResult> GetCompletionRates([FromQuery] int? organizationId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _db.Users.Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound();

        // TypeId 2/3/4 為公司階層，需限制在自身 org 樹內
        int[] companyTypeIds = { 2, 3, 4 };
        List<int>? orgIds = null;
        if (companyTypeIds.Contains(user.Organization.TypeId))
        {
            var selfAndDescendants = await GetSelfAndDescendantOrgIdsAsync(user.OrganizationId);
            if (organizationId.HasValue)
            {
                if (!selfAndDescendants.Contains(organizationId.Value))
                    return Forbid();
                orgIds = new List<int> { organizationId.Value };
            }
            else
            {
                orgIds = selfAndDescendants;
            }
        }

        var result = await _reportService.GetKpiCompletionRatesAsync(orgIds);
        return Ok(new { success = true, data = result });
    }
    
    [HttpGet("GetOrganizationsWithSuggestData")]
    public async Task<IActionResult> GetOrganizationsWithSuggestData()
    {
        var result = await _reportService.GetOrganizationIdsWithSuggestDataAsync();
        return Ok(new { success = true, data = result });
    }
    
    [HttpGet("GetKpiFieldSuggestionCount")]
    public async Task<IActionResult> GetKpiFieldSuggestionCount([FromQuery] int? organizationId)
    {
        var result = await _reportService.GetSuggestionKpiFieldCountsAsync(organizationId);
        return Ok(new { success = true, data = result });
    }
    
    [HttpGet("GetTop10CompanySuggestionStats")]
    public async Task<IActionResult> GetTop10CompanySuggestionStats([FromQuery] int? year, [FromQuery] int? suggestionTypeId)
    {
        var result = await _reportService.GetTop10CompanySuggestionStatsAsync(year, suggestionTypeId);
        return Ok(new { success = true, data = result });
    }
    
    [HttpGet("suggestion-category-stats")]
    [Authorize]
    public async Task<IActionResult> GetSuggestionCategoryStats([FromQuery] int? organizationId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdStr, out var userId))
            return Unauthorized();

        var user = await _db.Users.Include(u => u.Organization)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound();

        int[] companyTypeIds = { 2, 3, 4 };
        List<int>? orgIds = null;
        if (companyTypeIds.Contains(user.Organization.TypeId))
        {
            var selfAndDescendants = await GetSelfAndDescendantOrgIdsAsync(user.OrganizationId);
            if (organizationId.HasValue)
            {
                if (!selfAndDescendants.Contains(organizationId.Value))
                    return Forbid();
                orgIds = new List<int> { organizationId.Value };
            }
            else
            {
                orgIds = selfAndDescendants;
            }
        }

        var result = await _reportService.GetSuggestionCategoryStatsAsync(orgIds);
        return Ok(new { success = true, data = result });
    }

    /// <summary>
    /// 取得改善建議完成率排名（依公司分類，完成率低者排前）
    /// </summary>
    /// <param name="topN">可選參數，指定只取前 N 名</param>
    /// <returns></returns>
    [HttpGet("completion-ranking")]
    [HasPermission("view-ranking")]
    public async Task<ActionResult<List<CompanyCompletionRankingDto>>> GetCompletionRanking([FromQuery] int? topN = null)
    {
        var result = await _reportService.GetCompletionRankingAsync(topN);
        return Ok(result);
    }
    
    [HttpGet("uncompleted-suggestions")]
    [HasPermission("view-ranking")]
    public async Task<ActionResult<List<SuggestUncompletedDto>>> GetUncompletedSuggestions([FromQuery] int organizationId)
    {
        var result = await _reportService.GetUncompletedSuggestionsAsync(organizationId);
        return Ok(result);
    }
    
    /// <summary>
    /// 取得公司 KPI 達成率排行榜
    /// </summary>
    [Authorize]
    [HttpGet("kpi-ranking")]
    [HasPermission("view-ranking")]
    public async Task<IActionResult> GetKpiRanking(
        [FromQuery] int? startYear,
        [FromQuery] int? endYear,
        [FromQuery] string? startQuarter,
        [FromQuery] string? endQuarter,
        [FromQuery] string? fieldName
    )
    {
        var result = await _reportService.GetKpiRankingAsync(
            startYear: startYear,
            endYear: endYear,
            startQuarter: startQuarter,
            endQuarter: endQuarter,
            fieldName: fieldName
        );

        return Ok(result);
    }
    
    [HttpGet("unmet-kpi")]
    [HasPermission("view-ranking")]
    public async Task<IActionResult> GetUnmetKpis(
        int organizationId,
        int? startYear = null,
        int? endYear = null,
        string? startQuarter = null,
        string? endQuarter = null,
        string? fieldName = null)
    {
        var result = await _reportService.GetUnmetKpisAsync(
            organizationId, startYear, endYear, startQuarter, endQuarter, fieldName);

        return Ok(result);
    }
    
    // [HttpGet("kpi-trend")]
    // public async Task<ActionResult<List<KpiTrendDto>>> GetKpiTrend([FromQuery] int? organizationId, [FromQuery] int startYear = 111, [FromQuery] int endYear = 113)
    // {
    //     var data = await _reportService.GetTrendDataAsync(organizationId, startYear, endYear);
    //     return Ok(data);
    // }
    
    [HttpGet("kpi-trend")]
    public async Task<IActionResult> GetTestKpiDisplayAsync(
        [FromQuery] int? organizationId,
        [FromQuery] int? startYear,
        [FromQuery] int? endYear,
        [FromQuery] string? startQuarter,
        [FromQuery] string? endQuarter,
        [FromQuery] string? fieldName)
    {
        var result = await _reportService.GetTrendDataAsync(
            organizationId,
            startYear,
            endYear,
            startQuarter,
            endQuarter,
            fieldName
        );

        return Ok(result);
    }
}
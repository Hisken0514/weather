using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using WebAPI1.Context;
using WebAPI1.Entities;

namespace WebAPI1.Services;

public class KpiReportStatDto
{
    public string Field { get; set; } = "";  // 如 PSM、EP、FR
    public int Year { get; set; }
    public string Period { get; set; } = "";
    public int TotalCount { get; set; }
    public int MetCount { get; set; }
}
public class KpiTrendDto
{
    public string Period { get; set; }    // 例如 114Q1
    public string Field { get; set; }     // 例如 "PSM"
    public decimal Percentage { get; set; } // 例如 87.5 (%)
}

public class UnmetKpiDto
{
    public int Id { get; set; }
    public int Year { get; set; }
    public string Period { get; set; }
    public string KpiName { get; set; }
    public string KpiDetialName { get; set; }
    public decimal Actual { get; set; }
    public decimal Target { get; set; }
    public string Unit { get; set; }
    public string Field { get; set; }
}

public class CompanyKpiRateDto
{
    public int? OrganizationId { get; set; }
    public string OrganizationName { get; set; }
    public int MetCount { get; set; }
    public int TotalCount { get; set; }
    public double Rate { get; set; } // 比例 0~1
    
    public string Field { get; set; }
    public int Year { get; set; }
    public string Quarter { get; set; }
}

public class KpiCompletionRateDto
{
    public int KpiFieldId { get; set; }
    public string KpiFieldName { get; set; } // e.g. 製程安全管理 (PSM)
    public double CompletionRate { get; set; }
}
public class CompanySuggestionStatsDto
{
    public string CompanyName { get; set; }
    public int SuggestionCount { get; set; }
}
public class KpiFieldSuggestionCountDto
{
    public string Category { get; set; } = string.Empty;
    public int Count { get; set; }
}
public class CompanyCompletionRankingDto
{
    public int OrganizationId { get; set; }

    public string OrganizationName { get; set; } = string.Empty;

    public int CompletedYes { get; set; }   // Completed == 是

    public int CompletedNo { get; set; }    // Completed == 否

    public int Total => CompletedYes + CompletedNo;

    /// <summary>完成率 (0–1)，若沒有可計算的資料則為 0</summary>
    public decimal CompletionRate { get; set; }
}

public class SuggestionCategoryStatsDto
{
    public int OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Total { get; set; }
    public int Adopted { get; set; }
    public int CompletedYes { get; set; }
    public int CompletedNo { get; set; }
}

public class SuggestUncompletedDto
{
    public int Id { get; set; }
    [Column(TypeName = "date")]
    [JsonConverter(typeof(DateOnlyJsonConverter))]
    public DateTime Date { get; set; }
    public string SuggestionContent { get; set; }
    public string KpiField { get; set; }
    public string EventType { get; set; }
    public string RespDept { get; set; }
    public string Remark { get; set; }
    public string IsAdopted { get; set; }
    public string Completed { get; set; }
}
public interface IReportService
{
    Task<List<KpiCompletionRateDto>> GetKpiCompletionRatesAsync(List<int>? orgIds);
    Task<List<int>> GetOrganizationIdsWithSuggestDataAsync();
    Task<List<KpiFieldSuggestionCountDto>> GetSuggestionKpiFieldCountsAsync(int? organizationId);

    Task<List<CompanySuggestionStatsDto>> GetTop10CompanySuggestionStatsAsync(int? year = null,
        int? suggestionTypeId = null);
    
    /// <summary>
    /// 取得各公司改善建議完成率排名  
    /// 預設全部列出，可透過 <paramref name="topN"/> 只取前 N 名
    /// </summary>
    Task<IReadOnlyList<CompanyCompletionRankingDto>> GetCompletionRankingAsync(int? topN = null);
    Task<List<SuggestUncompletedDto>> GetUncompletedSuggestionsAsync(int organizationId);

    Task<List<CompanyKpiRateDto>> GetKpiRankingAsync(
        int? startYear = null,
        int? endYear = null,
        string? startQuarter = null,
        string? endQuarter = null,
        string? fieldName = null);
    Task<List<SuggestionCategoryStatsDto>> GetSuggestionCategoryStatsAsync(List<int>? orgIds);
    Task<List<UnmetKpiDto>> GetUnmetKpisAsync(
        int organizationId,
        int? startYear = null,
        int? endYear = null,
        string? startQuarter = null,
        string? endQuarter = null,
        string? fieldName = null);

    // Task<List<KpiTrendDto>> GetTrendDataAsync(int? organizationId, int startYear, int endYear);

    Task<List<KpiReportStatDto>> GetTrendDataAsync(
        int? organizationId = null,
        int? startYear = null,
        int? endYear = null,
        string? startQuarter = null,
        string? endQuarter = null,
        string? fieldName = null);
}

public class ReportService:IReportService
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<ReportService> _logger;
    
    public ReportService(ISHAuditDbcontext context,ILogger<ReportService> logger)
    {
        _db = context;
        _logger = logger;
    }
    private bool IsMet(decimal? actual, decimal? target, string? op)
    {
        if (!actual.HasValue || !target.HasValue || string.IsNullOrEmpty(op))
            return false;

        return op switch
        {
            ">=" => actual < target,
            "<=" => actual > target,
            ">"  => actual <= target,
            "<"  => actual >= target,
            "=" or "==" => actual != target,
            _ => false
        };
    }
    public async Task<List<int>> GetOrganizationIdsWithSuggestDataAsync()
    {
        var orgIds = await _db.SuggestDates
            .Where(s => s.OrganizationId != null)
            .Select(s => s.OrganizationId.Value)
            .Distinct()
            .ToListAsync();

        return orgIds;
    }
    
    public async Task<List<KpiCompletionRateDto>> GetKpiCompletionRatesAsync(List<int>? orgIds)
    {
        var query = _db.SuggestReports
            .Include(s => s.KpiField)
            .Include(s => s.SuggestDate)
            .Where(s => s.KpiFieldId != null && s.KpiField != null);

        if (orgIds != null)
        {
            query = query.Where(s => s.SuggestDate.OrganizationId != null && orgIds.Contains(s.SuggestDate.OrganizationId.Value));
        }

        // 篩出只要 IsAdopted == 是 的資料，才列入分母
        var filtered = await query
            .Where(s => s.IsAdopted == IsAdopted.是)
            .ToListAsync();

        var result = filtered
            .GroupBy(s => new
            {
                Id = s.KpiField.Id,
                Field = s.KpiField.field ?? "未知類型",
                EnField = s.KpiField.enfield ?? "Unknown"
            })
            .Select(g =>
            {
                var total = g.Count(); // 分母：已採納的總數
                var adoptedAndCompleted = g.Count(s => s.Completed == IsAdopted.是); // 分子：已採納且完成

                var rate = total == 0 ? 0 : Math.Round((double)adoptedAndCompleted / total * 100, 1);

                return new KpiCompletionRateDto
                {
                    KpiFieldId = g.Key.Id,
                    KpiFieldName = $"{g.Key.Field} ({g.Key.EnField})",
                    CompletionRate = rate
                };
            })
            .ToList();

        return result;
    }
    
    public async Task<List<KpiFieldSuggestionCountDto>> GetSuggestionKpiFieldCountsAsync(int? organizationId)
    {
        var query = _db.SuggestReports
            .Include(s => s.KpiField)
            .Include(s => s.SuggestDate)
            .Where(s => s.KpiFieldId != null && s.KpiField != null);

        if (organizationId.HasValue)
        {
            query = query.Where(s => s.SuggestDate.OrganizationId == organizationId.Value);
        }

        var result = await query
            .GroupBy(s => new {
                Field = s.KpiField.field ?? "未知類型",
                EnField = s.KpiField.enfield ?? "Unknown"
            })
            .Select(g => new KpiFieldSuggestionCountDto
            {
                Category = $"{g.Key.Field} ({g.Key.EnField})",
                Count = g.Count()
            })
            .ToListAsync();

        return result;
    }
    
    public async Task<List<CompanySuggestionStatsDto>> GetTop10CompanySuggestionStatsAsync(int? year = null, int? suggestionTypeId = null)
    {
        var query = _db.SuggestReports
            .Include(r => r.SuggestDate)
            .ThenInclude(d => d.Organization)
            .Where(r => r.SuggestDate.Organization != null);

        if (year.HasValue)
        {
            query = query.Where(r => r.SuggestDate.Date.Year == year.Value);
        }

        if (suggestionTypeId.HasValue)
        {
            query = query.Where(r => r.SuggestionTypeId == suggestionTypeId.Value);
        }

        var result = await query
            .GroupBy(r => new { r.SuggestDate.Organization.Id, r.SuggestDate.Organization.Name })
            .Select(g => new CompanySuggestionStatsDto
            {
                CompanyName = g.Key.Name,
                SuggestionCount = g.Count()
            })
            .OrderByDescending(x => x.SuggestionCount)
            .Take(10)
            .ToListAsync();

        return result;
    }
    
    public async Task<IReadOnlyList<CompanyCompletionRankingDto>> GetCompletionRankingAsync(int? topN = null)
    {
        var groupedQuery =
            from report in _db.SuggestReports.AsNoTracking()
            join date in _db.SuggestDates.AsNoTracking()
                on report.SuggestDateId equals date.Id
            join org in _db.Organizations.AsNoTracking()
                on date.OrganizationId equals org.Id
            where report.IsAdopted == IsAdopted.是
                  && (report.Completed == IsAdopted.是 || report.Completed == IsAdopted.否)
            group new { report, org } by new { org.Id, org.Name } into g
            select new
            {
                g.Key.Id,
                g.Key.Name,
                CompletedYes = g.Count(x => x.report.Completed == IsAdopted.是),
                CompletedNo = g.Count(x => x.report.Completed == IsAdopted.否)
            };

        var ordered = groupedQuery
            .AsEnumerable()
            .Select(x => new CompanyCompletionRankingDto
            {
                OrganizationId = x.Id,
                OrganizationName = x.Name,
                CompletedYes = x.CompletedYes,
                CompletedNo = x.CompletedNo,
                CompletionRate = (x.CompletedYes + x.CompletedNo) == 0
                    ? 0
                    : (decimal)x.CompletedYes / (x.CompletedYes + x.CompletedNo)
            })
            .OrderBy(r => r.CompletionRate)
            .ThenByDescending(r => r.CompletedNo);

        return (topN.HasValue ? ordered.Take(topN.Value) : ordered).ToList();
    }
    
    public async Task<List<SuggestUncompletedDto>> GetUncompletedSuggestionsAsync(int organizationId)
    {
        return await _db.SuggestReports
            .AsNoTracking()
            .Include(r => r.SuggestDate)
            .Include(r => r.SuggestDate.Organization)
            .Include(r => r.SuggestDate.SuggestEventType)
            .Include(r => r.KpiField)
            .Where(r =>
                r.SuggestDate.OrganizationId == organizationId &&
                r.Completed == IsAdopted.否)
            .Select(r => new SuggestUncompletedDto
            {
                Id = r.Id,
                Date = r.SuggestDate.Date,
                SuggestionContent = r.SuggestionContent,
                KpiField = r.KpiField.field,
                EventType = r.SuggestDate.SuggestEventType.Name,
                RespDept = r.RespDept,
                Remark = r.Remark,
                IsAdopted = r.IsAdopted.ToString(),
                Completed = r.Completed.ToString(),
                
            })
            .OrderByDescending(r => r.Date)
            .ToListAsync();
    }
    
    public async Task<List<CompanyKpiRateDto>> GetKpiRankingAsync(
    int? startYear = null,
    int? endYear = null,
    string? startQuarter = null,
    string? endQuarter = null,
    string? fieldName = null)
    {
        int QuarterOrder(string q) => q switch
        {
            "Q1" => 1, "Q2" => 2, "Q3" => 3, "Q4" => 4, "Y" => 5, _ => 0
        };

        bool IsReportInRange(KpiReport r) =>
            r.Status == ReportStatus.Finalized &&
            (!startYear.HasValue || r.Year > startYear ||
                (r.Year == startYear && (string.IsNullOrEmpty(startQuarter) || QuarterOrder(r.Period) >= QuarterOrder(startQuarter)))) &&
            (!endYear.HasValue || r.Year < endYear ||
                (r.Year == endYear && (string.IsNullOrEmpty(endQuarter) || QuarterOrder(r.Period) <= QuarterOrder(endQuarter))));

        var query = _db.KpiDatas
            .Include(d => d.DetailItem.KpiItem.KpiField)
            .Include(d => d.KpiReports)
            .Include(d => d.Organization)
            .Include(d => d.KpiCycle)
            .Include(d => d.DetailItem.KpiItem.KpiItemNames)
            .Include(d => d.DetailItem.KpiDetailItemNames)
            .Where(d => d.DetailItem != null && d.DetailItem.IsIndicator == true);

        if (!string.IsNullOrWhiteSpace(fieldName))
        {
            query = query.Where(d => d.DetailItem.KpiItem.KpiField.field == fieldName);
        }

        var rawData = await query.ToListAsync();
        
        var filtered = rawData
            .Where(d => d.KpiReports.Any(IsReportInRange)) // 先過濾出至少有一筆報告符合區間的
            .GroupBy(d => new { d.OrganizationId, d.DetailItemId }) // ✅ 加上 OrganizationId
            .Select(g =>
            {
                // 該組織該指標的最新循環資料
                var latestCycleData = g
                    .OrderByDescending(d => d.KpiCycle.StartYear)
                    .FirstOrDefault();

                var latestReport = latestCycleData?.KpiReports
                    .Where(IsReportInRange)
                    .OrderByDescending(r => r.Year)
                    .ThenByDescending(r => QuarterOrder(r.Period))
                    .FirstOrDefault();

                if (latestCycleData == null || latestReport == null)
                    return null;

                return new
                {
                    Data = latestCycleData,
                    LatestReport = latestReport
                };
            })
            .Where(x => x != null)
            .ToList();
        
        var companyGroups = filtered.Select(x =>
        {
            var d = x.Data;
            var latestReport = x.LatestReport;

            var itemName = d.DetailItem.KpiItem.KpiItemNames
                .OrderByDescending(n => n.StartYear)
                .FirstOrDefault()?.Name ?? "(無名稱)";

            var detailItemName = d.DetailItem.KpiDetailItemNames
                .OrderByDescending(n => n.StartYear)
                .FirstOrDefault()?.Name ?? "(無名稱)";

            return new
            {
                d.Id,
                d.DetailItemId,
                d.OrganizationId,
                Company = d.Organization.Name,
                Field = d.DetailItem.KpiItem.KpiField.field,
                IndicatorName = itemName,
                DetailItemName = detailItemName,
                Year = latestReport?.Year,
                Quarter = latestReport?.Period,
                Actual = latestReport?.KpiReportValue,
                Target = d.TargetValue,
                Operator = d.DetailItem.ComparisonOperator,
                IsIndicator = d.DetailItem.IsIndicator
            };
        }).ToList();
        
        var result = filtered
            .GroupBy(x => new { x.Data.OrganizationId, x.Data.Organization.Name })
            .Select(g =>
            {
                int total = g.Count();

                int unmet = g.Count(x =>
                {
                    var actual = x.LatestReport?.KpiReportValue;
                    var target = x.Data.TargetValue;
                    var op = x.Data.DetailItem.ComparisonOperator;

                    if (!actual.HasValue || !target.HasValue) return false;

                    return op switch
                    {
                        ">=" => actual < target,
                        "<=" => actual > target,
                        ">" => actual <= target,
                        "<" => actual >= target,
                        "=" or "==" => actual != target,
                        _ => false
                    };
                });

                Console.WriteLine($"\n📊 OrgId={g.Key.OrganizationId}：Total={total}, Unmet={unmet}");

                return new CompanyKpiRateDto
                {
                    OrganizationId = g.Key.OrganizationId,
                    OrganizationName = g.Key.Name,
                    MetCount = total - unmet,          // ✅ 若你還是想看達標筆數，可保留這行
                    TotalCount = total,
                    Rate = total > 0 ? Math.Round((double)(total - unmet) / total, 4) : 0.0, // ✅ 未達標比例
                    
                    Field = g.First().Data.DetailItem.KpiItem.KpiField.field,
                    Year = g.First().LatestReport.Year,
                    Quarter = g.First().LatestReport.Period
                };
            })
            .OrderBy(x => x.Rate) // 🔁 若你想看到達標多的排前面，可改成 ascending
            .ToList();

        return result;
    }

    
    public async Task<List<UnmetKpiDto>> GetUnmetKpisAsync(
    int organizationId,
    int? startYear = null,
    int? endYear = null,
    string? startQuarter = null,
    string? endQuarter = null,
    string? fieldName = null)
    {
        int QuarterOrder(string q) => q switch
        {
            "Q1" => 1, "Q2" => 2, "Q3" => 3, "Q4" => 4, "Y" => 5, _ => 0
        };

        bool IsReportInRange(KpiReport r) =>
            r.Status == ReportStatus.Finalized &&
            (!startYear.HasValue || r.Year > startYear ||
                (r.Year == startYear && (string.IsNullOrEmpty(startQuarter) || QuarterOrder(r.Period) >= QuarterOrder(startQuarter)))) &&
            (!endYear.HasValue || r.Year < endYear ||
                (r.Year == endYear && (string.IsNullOrEmpty(endQuarter) || QuarterOrder(r.Period) <= QuarterOrder(endQuarter))));

        var query = _db.KpiDatas
            .Include(d => d.DetailItem.KpiItem.KpiField)
            .Include(d => d.DetailItem.KpiItem.KpiItemNames)
            .Include(d => d.DetailItem.KpiDetailItemNames)
            .Include(d => d.Organization)
            .Include(d => d.KpiCycle)
            .Include(d => d.KpiReports)
            .Where(d =>
                d.OrganizationId == organizationId &&
                d.DetailItem.IsIndicator == true &&
                d.KpiReports.Any(r => r.Status == ReportStatus.Finalized));

        if (!string.IsNullOrWhiteSpace(fieldName))
        {
            query = query.Where(d => d.DetailItem.KpiItem.KpiField.field == fieldName);
        }

        var rawData = await query.ToListAsync();
        
        var latestData = rawData
            .GroupBy(d => d.DetailItemId)
            .Select(g =>
            {
                var latestCycle = g.OrderByDescending(x => x.KpiCycle.StartYear).FirstOrDefault();
                var latestReport = latestCycle?.KpiReports
                    .Where(IsReportInRange)
                    .OrderByDescending(r => r.Year)
                    .ThenByDescending(r => QuarterOrder(r.Period))
                    .FirstOrDefault();

                return new
                {
                    Data = latestCycle,
                    Report = latestReport
                };
            })
            .Where(x => x.Data != null && x.Report != null)
            .ToList();

        var unmet = latestData
            .Where(x =>
            {
                var actual = x.Report.KpiReportValue;
                var target = x.Data.TargetValue;
                var op = x.Data.DetailItem.ComparisonOperator;

                if (!actual.HasValue || !target.HasValue) return false;

                return op switch
                {
                    ">=" => actual < target,
                    "<=" => actual > target,
                    ">" => actual <= target,
                    "<" => actual >= target,
                    "=" or "==" => actual != target,
                    _ => false
                };
            })
            .Select(x => new UnmetKpiDto
            {
                Id = x.Data.Id,
                Year = x.Report.Year,
                Period = x.Report.Period,
                KpiName = x.Data.DetailItem.KpiItem.KpiItemNames
                    .OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "(無名稱)",
                KpiDetialName = x.Data.DetailItem.KpiDetailItemNames
                    .OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "(無名稱)",
                Actual = x.Report.KpiReportValue ?? 0,
                Target = x.Data.TargetValue ?? 0,
                Unit = x.Data.DetailItem.Unit ?? "",
                Field = x.Data.DetailItem.KpiItem.KpiField.field ?? "(未分類)"
            })
            .ToList();

        return unmet;
    }
    
    public async Task<List<SuggestionCategoryStatsDto>> GetSuggestionCategoryStatsAsync(List<int>? orgIds)
    {
        var query = _db.SuggestReports
            .AsNoTracking()
            .Include(s => s.SuggestDate)
                .ThenInclude(sd => sd.Organization)
            .Include(s => s.KpiField)
            .Where(s => s.KpiFieldId != null && s.KpiField != null && s.SuggestDate.OrganizationId != null);

        if (orgIds != null)
            query = query.Where(s => orgIds.Contains(s.SuggestDate.OrganizationId!.Value));

        var data = await query.ToListAsync();

        var result = data
            .GroupBy(s => new {
                OrgId = s.SuggestDate.OrganizationId!.Value,
                OrgName = s.SuggestDate.Organization?.Name ?? "未知廠商",
                Category = $"{s.KpiField!.field} ({s.KpiField.enfield})"
            })
            .Select(g => new SuggestionCategoryStatsDto
            {
                OrganizationId = g.Key.OrgId,
                OrganizationName = g.Key.OrgName,
                Category = g.Key.Category,
                Total = g.Count(),
                Adopted = g.Count(s => s.IsAdopted == IsAdopted.是),
                CompletedYes = g.Count(s => s.IsAdopted == IsAdopted.是 && s.Completed == IsAdopted.是),
                CompletedNo = g.Count(s => s.IsAdopted == IsAdopted.是 && s.Completed == IsAdopted.否)
            })
            .OrderBy(x => x.OrganizationName)
            .ThenBy(x => x.Category)
            .ToList();

        return result;
    }

    // public async Task<List<KpiTrendDto>> GetTrendDataAsync(int? organizationId, int startYear, int endYear)
    // {
    //     var kpiDatasQuery = _db.KpiDatas
    //         .Include(d => d.KpiReports)
    //         .Include(d => d.DetailItem.KpiItem.KpiField)
    //         .Where(d =>
    //             d.DetailItem.IsIndicator &&
    //             d.KpiReports.Any(r =>
    //                 r.Status == ReportStatus.Finalized &&
    //                 r.Year >= startYear &&
    //                 r.Year <= endYear));
    //
    //     // ✅ 加上組織篩選（只比對自身，不展開子組織）
    //     if (organizationId.HasValue)
    //     {
    //         kpiDatasQuery = kpiDatasQuery.Where(d => d.OrganizationId == organizationId.Value);
    //     }
    //
    //     var kpiDatas = await kpiDatasQuery.ToListAsync();
    //
    //     var allEntries = new List<(string Period, string Field, bool IsMet)>();
    //
    //     foreach (var data in kpiDatas)
    //     {
    //         var field = data.DetailItem.KpiItem.KpiField.enfield;
    //         var target = data.TargetValue;
    //         var op = data.DetailItem.ComparisonOperator;
    //
    //         if (!target.HasValue || string.IsNullOrEmpty(op)) continue;
    //
    //         foreach (var report in data.KpiReports
    //                      .Where(r => r.Status == ReportStatus.Finalized &&
    //                                  r.Year >= startYear &&
    //                                  r.Year <= endYear))
    //         {
    //             var actual = report.KpiReportValue;
    //             if (!actual.HasValue) continue;
    //
    //             var met = op switch
    //             {
    //                 ">=" => actual < target,
    //                 "<=" => actual > target,
    //                 ">"  => actual <= target,
    //                 "<"  => actual >= target,
    //                 "=" or "==" => actual != target,
    //                 _ => true
    //             };
    //
    //             var period = $"{report.Year}{report.Period}";
    //             allEntries.Add((period, field, met));
    //            
    //         }
    //     }
    //     Console.WriteLine($"✅ {allEntries}");
    //     var result = allEntries
    //         .GroupBy(e => new { e.Period, e.Field })
    //         .Select(g =>
    //         {
    //             var total = g.Count();
    //             var met = g.Count(x => x.IsMet);
    //             var percentage = total > 0 ? Math.Round((decimal)met / total * 100, 2) : 0;
    //
    //             return new KpiTrendDto
    //             {
    //                 Period = g.Key.Period,
    //                 Field = g.Key.Field,
    //                 Percentage = percentage
    //             };
    //         })
    //         .OrderBy(x => x.Period)
    //         .ThenBy(x => x.Field)
    //         .ToList();
    //
    //     return result;
    // }
    
    public async Task<List<KpiReportStatDto>> GetTrendDataAsync(
    int? organizationId = null,
    int? startYear = null,
    int? endYear = null,
    string? startQuarter = null,
    string? endQuarter = null,
    string? fieldName = null)
{
    int QuarterOrder(string q) => q switch
    {
        "Q1" => 1,
        "Q2" => 2,
        "Q3" => 3,
        "Q4" => 4,
        "Y" => 5,
        _ => 0
    };

    var query = _db.KpiDatas
        .Include(d => d.DetailItem)
            .ThenInclude(di => di.KpiItem)
                .ThenInclude(i => i.KpiField)
        .Include(d => d.KpiReports)
        .AsQueryable();

    if (organizationId.HasValue)
    {
        query = query.Where(d => d.Organization.Id == organizationId.Value);
    }

    if (!string.IsNullOrWhiteSpace(fieldName))
    {
        query = query.Where(d => d.DetailItem.KpiItem.KpiField.field == fieldName);
    }

    if (startYear.HasValue || endYear.HasValue)
    {
        query = query.Where(d => d.KpiReports.Any(r =>
            (!startYear.HasValue || r.Year >= startYear) &&
            (!endYear.HasValue || r.Year <= endYear)));
    }

    var rawData = await query.ToListAsync();

    var allReports = rawData
        .Where(d => d.DetailItem.IsIndicator)
        .SelectMany(d =>
            d.KpiReports
                .Where(r =>
                    r.Status == ReportStatus.Finalized &&
                    (!startYear.HasValue || r.Year > startYear || (r.Year == startYear && (
                        string.IsNullOrEmpty(startQuarter) || QuarterOrder(r.Period) >= QuarterOrder(startQuarter)
                    ))) &&
                    (!endYear.HasValue || r.Year < endYear || (r.Year == endYear && (
                        string.IsNullOrEmpty(endQuarter) || QuarterOrder(r.Period) <= QuarterOrder(endQuarter)
                    )))
                )
                .Select(r => new
                {
                    FieldName = d.DetailItem.KpiItem.KpiField.field,
                    r.Year,
                    r.Period,
                    Actual = r.KpiReportValue,
                    Target = d.TargetValue,
                    Operator = d.DetailItem.ComparisonOperator,
                    IsMet = IsMet(r.KpiReportValue, d.TargetValue, d.DetailItem.ComparisonOperator)
                })
        );

    var grouped = allReports
        .GroupBy(r => new { r.FieldName, r.Year, r.Period })
        .Select(g => new KpiReportStatDto
        {
            Field = g.Key.FieldName,
            Year = g.Key.Year,
            Period = g.Key.Period,
            TotalCount = g.Count(),
            MetCount = g.Count(r => r.IsMet)
        })
        .OrderBy(s => s.Year)
        .ThenBy(s => QuarterOrder(s.Period))
        .ToList();

    return grouped;
}
}
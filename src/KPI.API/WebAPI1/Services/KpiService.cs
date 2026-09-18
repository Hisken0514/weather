using ISHAuditAPI.Services;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Helpers;

namespace WebAPI1.Services;


public class KpiImportConfirmDto
{
    public int OrganizationId { get; set; }
    public List<KpimanyRow> Rows { get; set; }
}

public class KpiFieldOptionDto
{
    public int Id { get; set; }
    public string Field { get; set; }
}

public class KpiDisplayGroupedDto
{
    public int Id { get; set; }
    public string Company { get; set; }
    public string? ProductionSite { get; set; }
    public string Category { get; set; }
    public string Field { get; set; }
    public int? IndicatorNumber { get; set; }
    public int DetailItemId { get; set; }
    public string IndicatorName { get; set; }
    public string DetailItemName { get; set; }
    public string Unit { get; set; }
    public bool IsIndicator { get; set; }
    
    // 新增：最新一筆 KpiData 資訊
    public string? LastKpiCycleName { get; set; }
    public string? LastBaselineYear { get; set; }
    public decimal? LastBaselineValue { get; set; }
    public decimal? LastTargetValue { get; set; }
    public string? LastComparisonOperator { get; set; }
    public string? LastRemarks { get; set; }

    // 新增：該 KpiData 中最新的執行狀況
    public int? LastReportYear { get; set; }
    public string? LastReportPeriod { get; set; }
    public decimal? LastReportValue { get; set; }
    public List<KpiDataCycleDto> KpiDatas { get; set; }
}

public class KpiDataCycleDto
{
    public int KpiDataId { get; set; }
    public string OrganizationName { get; set; }
    public string KpiCycleName { get; set; }
    public string BaselineYear { get; set; }
    public int KpiCycleStartYear { get; set; }
    public int KpiCycleEndYear { get; set; }
    public decimal? BaselineValue { get; set; }
    public string ComparisonOperator { get; set; }
    public decimal? TargetValue { get; set; }
    public string? Remarks { get; set; }
    
    public bool IsIndicator { get; set; } // ✅ 暫時加上這個

    // 該筆資料當年（KpiCycleStartYear）實際生效的名稱/單位，可能跟上層 KpiDisplayGroupedDto
    // 顯示的「最新」名稱不同（政策改名/換單位對照合併進來的舊資料，維持當年原貌）
    public string? IndicatorName { get; set; }
    public string? DetailItemName { get; set; }
    public string? Unit { get; set; }
    public List<KpiReportDto> Reports { get; set; }
}

public class KpiReportInsertDto
{
    public int KpiDataId { get; set; }
    public int Year { get; set; }
    public string Quarter { get; set; } // Q1, Q2, Q3, Q4, Y
    public decimal? Value { get; set; }
    public bool IsSkipped { get; set; }
    public string? Remark { get; set; }
    public ReportStatus Status { get; set; }
}
public class KpiReportSnapshotDto
{
    public int Version { get; set; }
    public decimal? Value { get; set; }
    public bool IsSkipped { get; set; }
    public string? Remarks { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string? SubmittedByUserName { get; set; }
}

public class KpiReportHistoryDto
{
    public int KpiDataId { get; set; }
    public string Field { get; set; } = "";
    public string IndicatorName { get; set; } = "";
    public string DetailItemName { get; set; } = "";
    public string Unit { get; set; } = "";
    public List<KpiReportSnapshotDto> Versions { get; set; } = new();
}

public class SelfReturnDto
{
    public int OrganizationId { get; set; }
    public int Year { get; set; }
    public string Quarter { get; set; } = "";
}

public class CreateKpiFieldDto
{
    public string Field { get; set; }
}

public class KpiDataDto
{
    public int KpiDataId { get; set; }
    public string Company { get; set; }
    public string Field { get; set; }
    public string EnField { get; set; }
    public string ProductionSite { get; set; }
    public string KpiCategoryName { get; set; }
    public string IndicatorName { get; set; }
    public string DetailItemName { get; set; }
    public string Unit { get; set; }
    public string BaselineYear { get; set; }
    public decimal? BaselineValue { get; set; }
    public decimal? TargetValue { get; set; }
    public int? Status { get; set; }
    public double? ReportValue { get; set; }  // ✅ 新增：填報值
    public DateTime? ReportUpdateAt { get; set; }  // 可選：更新時間
    public string? Remarks { get; set; }
    
}

public class KpisingleRow
{
    public int OrganizationId { get; set; }
    public string ProductionSite { get; set; } // ✅ 這個名字要對
    public string KpiCategoryName { get; set; }
    public string FieldName { get; set; }
    public string IndicatorName { get; set; }
    public string DetailItemName { get; set; }
    public string Unit { get; set; }
    public string? ComparisonOperator { get; set; }
    public string IsIndicator { get; set; }
    public bool IsApplied { get; set; }
    public string BaselineYear { get; set; }
    public decimal BaselineValue { get; set; }
    public decimal TargetValue { get; set; }
    public string Remarks { get; set; }
    public int KpiCycleId { get; set; }
}

public class KpimanyRow
{
    public int OrganizationId { get; set; }
    public string Organization { get; set; }
    public string ProductionSite { get; set; } // ✅ 這個名字要對
    public string KpiCategoryName { get; set; }
    public string FieldName { get; set; }
    public string IndicatorName { get; set; }
    public string DetailItemName { get; set; }
    public string Unit { get; set; }
    public bool IsIndicator { get; set; }
    public bool IsApplied { get; set; }
    public string KpiCycleName { get; set; }
    public string BaselineYear { get; set; }
    public decimal? BaselineValue { get; set; }
    public string? ComparisonOperator { get; set; }
    public decimal? TargetValue { get; set; }
    public string Remarks { get; set; }
}

public class KpiReportDto
{
    public int Year { get; set; }
    public string Period { get; set; }
    public decimal? KpiReportValue { get; set; }
    public bool IsMet { get; set; } // ✅ 暫時新增的欄位
}
public class KpiDisplayDto
{
    public int Id { get; set; }
    public string Company { get; set; }
    public string? ProductionSite { get; set; }
    public string Category { get; set; }
    public string Field { get; set; }
    public int IndicatorNumber { get; set; }
    public string IndicatorName { get; set; }
    public string DetailItemName { get; set; }
    public string Unit { get; set; }
    public bool IsApplied { get; set; }
    public string BaselineYear { get; set; }
    public decimal? BaselineValue { get; set; }
    public string? ComparisonOperator { get; set; }
    public decimal? TargetValue { get; set; }
    
    public int? LatestReportYear { get; set; }
    public string? LatestReportPeriod { get; set; }
    public decimal? LatestReportValue { get; set; }
    
    public string? KpiCycleName { get; set; }
    public int? KpiCycleStartYear { get; set; }
    public int? KpiCycleEndYear { get; set; }
    public string? Remarks { get; set; }
    public List<KpiReportDto> Reports { get; set; } = new();
}

public class KpiimportexcelDto
{
    public int Id { get; set; }
    public string Company { get; set; }
    public string? ProductionSite { get; set; }
    public string Category { get; set; }
    public string Field { get; set; }
    public string IndicatorName { get; set; }
    public string DetailItemName { get; set; }
    public string Unit { get; set; }
    public bool IsIndicator { get; set; }
    public bool IsApplied { get; set; }
    public string BaselineYear { get; set; }
    public decimal? BaselineValue { get; set; }
    public string? ComparisonOperator { get; set; }
    public decimal? TargetValue { get; set; }
    public string? NewBaselineYear { get; set; }
    public decimal? NewBaselineValue { get; set; }
    public decimal? NewExecutionValue { get; set; }
    public decimal? NewTargetValue { get; set; }
    public string? NewRemarks { get; set; }
    public string? Remarks { get; set; }
    
    public int KpiCycleId { get; set; }
    public List<KpiReportDto> Reports { get; set; } = new();
}

public class KpiPreviewDto
{
    public string IndicatorName { get; set; }
    public string DetailItemName { get; set; }
    public double? ReportValue { get; set; }
    public string Remarks { get; set; }
    public int RowIndex { get; set; }                  // 第幾列
    public List<string> ErrorMessages { get; set; }
}

public interface IKpiService
{
    
    Task<KpiField> CreateKpiFieldAsync(CreateKpiFieldDto dto);
   
    //匯入單一筆指標資料
    Task<(bool Success, string Message)> InsertKpiData(KpisingleRow row);
    //填寫執行狀況第一步(選擇公司跟年季度)
    Task<List<KpiDataDto>> GetKpiDataDtoByOrganizationIdAsync(int organizationId, int year, string quarter);
    
    //輸入執行狀況送出
    Task<(bool Success, string Message)> SubmitKpiReportsAsync(List<KpiReportInsertDto> reports, Guid? submittedByUserId = null, string? submittedByUserName = null);
    //查詢填報修改歷程
    Task<List<KpiReportHistoryDto>> GetKpiReportHistoryAsync(int organizationId, int year, string quarter);
    //廠商自行退回重填（Finalized → Returned）
    Task<(bool Success, string Message)> SelfReturnKpiReportsAsync(int organizationId, int year, string quarter);
    //輸入執行狀況暫存
    Task<(bool Success, string Message)> SaveDraftReportsAsync(List<KpiReportInsertDto> reports);
    //顯示暫存資料
    Task<List<KpiReportInsertDto>> LoadDraftReportsAsync(int organizationId, int year, string quarter);
    //績效指標顯示功能
    Task<List<KpiDisplayGroupedDto>> GetKpiDisplayAsync(int? organizationId = null, int? startYear = null, int? endYear = null, string? startQuarter = null,
        string? endQuarter = null, string? keyword = null, string? categoryName = null, string? fieldName = null);
    //想做延遲分頁顯示功能但未完成
    Task<KpiService.PagedResult<KpiDisplayDto>> GetKpiDisplayPagedAsync(
        int page = 1,
        int pageSize = 50,
        int? organizationId = null,
        string? categoryName = null,
        string? fieldName = null);
    
    //使用者匯入績效指標資料前顯示使用
    Task<List<KpimanyRow>> ParseExcelAsync(Stream fileStream, int organizationId);
    //使用者匯入績效指標資料
    Task<(bool Success, string Message)> BatchInsertKpiDataAsync(int organizationId, List<KpimanyRow> rows);

    //系統使用者匯入所有資料前顯示使用
    List<KpiimportexcelDto> ParseFullImportExcel(Stream fileStream);
    //系統使用者匯入所有資料使用
    Task<(bool Success, string Message)> BatchFullKpiDataAsync(List<KpiimportexcelDto> rows);
    //讀取field資料
    Task<List<KpiFieldOptionDto>> GetAllFieldsAsync();
    //讀取cycle資料
    Task<List<KpiCycle>> GetAllCyclesAsync();
    
    /// <summary>
    /// 產生 KPI Excel 範本
    /// </summary>
    /// <param name="organizationId">公司／工廠 OrgId</param>
    /// <returns>檔名與 Excel 位元組</returns>
    Task<(string FileName, byte[] Content)> GenerateTemplateAsync(int organizationId, int year, string quarter);

    //預覽excel匯入廠商上傳的績效指標報告
    Task<List<KpiPreviewDto>> ReadPreviewAsync(IFormFile file);
    //送出excel匯入廠商上傳的績效指標報告
    Task<(int inserted, int updated, int skipped)> ImportAsync(IFormFile file, int organizationId, int year, string quarter, Guid? submittedByUserId = null, string? submittedByUserName = null);
    /// <summary>產生 KPI 核准報告 PDF</summary>
    Task<byte[]> GenerateKpiReportPdfAsync(int organizationId, int year, string quarter);
}

public class KpiService:IKpiService
{
private readonly ISHAuditDbcontext _db;
    private readonly ILogger<KpiService> _logger;
    private readonly IOrganizationService _organizationService;
    private static int GetPeriodOrder(string? period)
    {
        return period switch
        {
            "Q1" => 1,
            "Q2" => 2,
            "Q3" => 3,
            "Q4" => 4,
            "Y" => 5,
            _ => 0
        };
    }
    public KpiService(
        ISHAuditDbcontext db,
        ILogger<KpiService> logger,
        IOrganizationService organizationService)
    {
        _db = db;
        _logger = logger;
        _organizationService = organizationService;
    }

    public async Task<PublicDto.ApiResponse<dynamic>> Test()
    {
        var query = _db.Organizations.AsQueryable()
            .ToListAsync<dynamic>();


        return new PublicDto.ApiResponse<dynamic>
        {
            Success = true,
            Message = "OK",
            Data = query
        };

    }
    public async Task<List<KpiFieldOptionDto>> GetAllFieldsAsync()
    {
        return await _db.KpiFields
            .OrderBy(f => f.field)
            .Select(f => new KpiFieldOptionDto
            {
                Id = f.Id,
                Field = f.field
            })
            .ToListAsync();
    }
    
    public async Task<KpiField> CreateKpiFieldAsync(CreateKpiFieldDto dto)
    {
        try
        {
            // 避免重複欄位名稱
            var exists = await _db.KpiFields
                .AnyAsync(k => k.field == dto.Field);

            if (exists)
            {
                _logger.LogWarning("欄位已存在: {Field}", dto.Field);
                throw new Exception("欄位名稱重複，無法新增");
            }

            var newField = new KpiField
            {
                field = dto.Field,
                CreatedAt = tool.GetTaiwanNow(),
                UpdateAt = tool.GetTaiwanNow()
            };

            _db.KpiFields.Add(newField);
            await _db.SaveChangesAsync();

            _logger.LogInformation("成功新增欄位: {Field}", dto.Field);

            return newField;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "新增 KPI 欄位失敗");
            throw;
        }
    }

    //匯入績效指標資料
    public async Task<(bool Success, string Message)> InsertKpiData(KpisingleRow row)
    {
        var now = tool.GetTaiwanNow();
        var userEmail = "idsl5397@mail.isha.org.tw";
        var currentYear = 113;

        // 1. 公司
        var organization = await _db.Organizations.FindAsync(row.OrganizationId);

        
        // 2. 領域
        var field = await _db.KpiFields.FirstOrDefaultAsync(f => f.enfield == row.FieldName);

        // 3. 指標類型
        int categoryId = row.KpiCategoryName == "客製型" ? 1 : 0;

        // 4. KpiItem（含名稱判斷）
        var item = await _db.KpiItems
            .Include(i => i.KpiItemNames)
            .FirstOrDefaultAsync(i =>
                i.KpiFieldId == field.Id &&
                i.KpiCategoryId == categoryId &&
                i.OrganizationId == (categoryId == 1 ? organization.Id : null) &&
                i.KpiItemNames.Any(n => n.Name == row.IndicatorName && n.StartYear == currentYear));

        if (item == null)
        {
            // 動態產生下一個編號
            var maxNumber = await _db.KpiItems
                .Where(i => i.KpiFieldId == field.Id &&
                            i.KpiCategoryId == categoryId &&
                            i.OrganizationId == (categoryId == 1 ? organization.Id : null))
                .MaxAsync(i => (int?)i.IndicatorNumber) ?? 0;

            item = new KpiItem
            {
                IndicatorNumber = maxNumber + 1,
                KpiFieldId = field.Id,
                KpiCategoryId = categoryId,
                OrganizationId = (categoryId == 1 ? organization.Id : null),
                CreateTime = now,
                UploadTime = now
            };

            _db.KpiItems.Add(item);
            await _db.SaveChangesAsync();

            // 直接新增對應名稱
            _db.KpiItemNames.Add(new KpiItemName
            {
                KpiItemId = item.Id,
                Name = row.IndicatorName,
                StartYear = currentYear,
                UserEmail = userEmail,
                CreatedAt = now
            });
            await _db.SaveChangesAsync();
        }

        // 6. DetailItem
        var detailItem = await _db.KpiDetailItems
            .Include(d => d.KpiDetailItemNames)
            .FirstOrDefaultAsync(d =>
                d.KpiItemId == item.Id &&
                d.KpiDetailItemNames.Any(n => n.Name == row.DetailItemName && n.StartYear == currentYear));

        if (detailItem == null)
        {
            // 新增一筆 detailItem
            detailItem = new KpiDetailItem
            {
                KpiItemId = item.Id,
                Unit = row.Unit,
                ComparisonOperator = row.ComparisonOperator,
                IsIndicator = bool.TryParse(row.IsIndicator, out var isIndicator) && isIndicator,
                CreateTime = now,
                UploadTime = now
            };

            var detailItemName = new KpiDetailItemName
            {
                Name = row.DetailItemName,
                StartYear = currentYear,
                CreatedAt = now,
                UserEmail = userEmail
            };

            detailItem.KpiDetailItemNames.Add(detailItemName);

            _db.KpiDetailItems.Add(detailItem);
            await _db.SaveChangesAsync();
        }

        // 7. KpiDetailItemName
        bool hasDetailName = await _db.KpiDetailItemNames.AnyAsync(n =>
                n.KpiDetailItemId == detailItem.Id &&
                n.StartYear == currentYear &&
                n.Name == row.DetailItemName // ✅ 加上名稱比對
        );

        if (!hasDetailName)
        {
            _db.KpiDetailItemNames.Add(new KpiDetailItemName
            {
                KpiDetailItemId = detailItem.Id,
                Name = row.DetailItemName,
                StartYear = currentYear,
                UserEmail = userEmail,
                CreatedAt = now
            });
            await _db.SaveChangesAsync();
        }

        // 8. KpiData
        var existsData = await _db.KpiDatas.AnyAsync(d =>
            d.OrganizationId == organization.Id &&
            d.DetailItemId == detailItem.Id &&
            d.ProductionSite == row.ProductionSite &&
            d.KpiCycleId == row.KpiCycleId);
        
        if (existsData)
        {
            return (false, "已存在相同指標資料");
        }
        
        var kpiData = new KpiData
        {
            OrganizationId = organization.Id,
            ProductionSite = row.ProductionSite,
            DetailItemId = detailItem.Id,
            IsApplied = row.IsApplied,
            BaselineYear = row.BaselineYear,
            BaselineValue = row.BaselineValue,
            TargetValue = row.TargetValue,
            Remarks = row.Remarks,
            CreatedAt = now,
            UpdateAt = now,
            KpiCycleId = row.KpiCycleId,
        };
        _db.KpiDatas.Add(kpiData);
        await _db.SaveChangesAsync();
        
        return (true, $"✅ 匯入成功：{row.OrganizationId} / {row.IndicatorName} / {row.DetailItemName}");
    }
    
    //舊的display
    // public async Task<List<KpiDisplayDto>> GetKpiDisplayAsync(int? organizationId = null , int? startYear = null, int? endYear = null, string? categoryName = null, string? fieldName = null)
    // {
    //     var query = _db.KpiDatas
    //         .Include(d => d.DetailItem)
    //             .ThenInclude(di => di.KpiItem)
    //                 .ThenInclude(i => i.KpiItemNames)
    //         .Include(d => d.DetailItem.KpiDetailItemNames)
    //         .Include(d => d.KpiReports)
    //         .Include(d => d.Organization)
    //         .Include(d => d.DetailItem.KpiItem.KpiField)
    //         .Include(d => d.KpiCycle)
    //         .AsQueryable();
    //
    //     if (organizationId.HasValue)
    //     {
    //         var orgIds = _organizationService.GetDescendantOrganizationIds(organizationId.Value);
    //         query = query.Where(d => orgIds.Contains(d.Organization.Id));
    //     }
    //
    //     if (!string.IsNullOrWhiteSpace(categoryName))
    //     {
    //         int categoryId = categoryName == "客製型" ? 1 : 0;
    //         query = query.Where(d => d.DetailItem.KpiItem.KpiCategoryId == categoryId);
    //     }
    //
    //     if (!string.IsNullOrWhiteSpace(fieldName))
    //         query = query.Where(d => d.DetailItem.KpiItem.KpiField.field == fieldName);
    //
    //     // ✅ 關鍵：報表內需至少有一筆符合條件
    //     if (startYear.HasValue || endYear.HasValue)
    //     {
    //         query = query.Where(d => d.KpiReports.Any(r =>
    //             (!startYear.HasValue || r.Year >= startYear) &&
    //             (!endYear.HasValue || r.Year <= endYear)
    //         ));
    //     }
    //     
    //     var result = await query.Select(d => new KpiDisplayDto
    //     {
    //         Id = d.Id,
    //         Company = d.Organization.Name,
    //         ProductionSite = d.ProductionSite,
    //         Category = d.DetailItem.KpiItem.KpiCategoryId == 1 ? "客製型" : "基礎型",
    //         Field = d.DetailItem.KpiItem.KpiField.field,
    //         IndicatorNumber = d.DetailItem.KpiItem.IndicatorNumber,
    //         IndicatorName = d.DetailItem.KpiItem.KpiItemNames
    //             .OrderByDescending(n => n.StartYear).FirstOrDefault().Name,
    //         DetailItemName = d.DetailItem.KpiDetailItemNames
    
    //             .OrderByDescending(n => n.StartYear).FirstOrDefault().Name,
    //         Unit = d.DetailItem.Unit,
    //         IsApplied = d.IsApplied,
    //         BaselineYear = d.BaselineYear,
    //         BaselineValue = d.BaselineValue,
    //         ComparisonOperator = d.DetailItem.ComparisonOperator,
    //         TargetValue = d.TargetValue,
    //         KpiCycleName = d.KpiCycle.CycleName,
    //         KpiCycleStartYear = d.KpiCycle.StartYear,
    //         KpiCycleEndYear = d.KpiCycle.EndYear,
    //         Remarks = d.Remarks,
    //
    //         // ➕ 新增：最新報表欄位
    //         LatestReportYear = d.KpiReports
    //             .OrderByDescending(r => r.Year)
    //             .ThenByDescending(r => 
    //                 r.Period == "Y" ? 5 :
    //                 r.Period == "Q4" ? 4 :
    //                 r.Period == "Q3" ? 3 :
    //                 r.Period == "Q2" ? 2 :
    //                 r.Period == "Q1" ? 1 : 0)
    //             .Select(r => r.Year)
    //             .FirstOrDefault(),
    //
    //         LatestReportPeriod = d.KpiReports
    //             .OrderByDescending(r => r.Year)
    //             .ThenByDescending(r => 
    //                 r.Period == "Y" ? 5 :
    //                 r.Period == "Q4" ? 4 :
    //                 r.Period == "Q3" ? 3 :
    //                 r.Period == "Q2" ? 2 :
    //                 r.Period == "Q1" ? 1 : 0)
    //             .Select(r => r.Period)
    //             .FirstOrDefault(),
    //
    //         LatestReportValue = d.KpiReports
    //             .OrderByDescending(r => r.Year)
    //             .ThenByDescending(r => 
    //                 r.Period == "Y" ? 5 :
    //                 r.Period == "Q4" ? 4 :
    //                 r.Period == "Q3" ? 3 :
    //                 r.Period == "Q2" ? 2 :
    //                 r.Period == "Q1" ? 1 : 0)
    //             .Select(r => r.KpiReportValue)
    //             .FirstOrDefault(),
    //
    //         Reports = d.KpiReports
    //             .Where(r => !startYear.HasValue || r.Year >= startYear)
    //             .Where(r => !endYear.HasValue || r.Year <= endYear)
    //             .OrderBy(r => r.Year).ThenBy(r => r.Period)
    //             .Select(r => new KpiReportDto
    //             {
    //                 Year = r.Year,
    //                 Period = r.Period,
    //                 KpiReportValue = r.KpiReportValue
    //             }).ToList()
    //     }).ToListAsync();
    //
    //     return result;
    // }
    
    public async Task<List<KpiDisplayGroupedDto>> GetKpiDisplayAsync(
        int? organizationId = null,
        int? startYear = null,
        int? endYear = null,
        string? startQuarter = null,
        string? endQuarter = null,
        string? keyword = null,
        string? categoryName = null,
        string? fieldName = null)
    {
        var query = _db.KpiDatas
            .Include(d => d.DetailItem)
                .ThenInclude(di => di.KpiItem)
                    .ThenInclude(i => i.KpiItemNames)
            .Include(d => d.DetailItem.KpiDetailItemNames)
            .Include(d => d.KpiReports)
            .Include(d => d.KpiCycle)
            .Include(d => d.Organization)
            .Include(d => d.DetailItem.KpiItem.KpiField)
            .AsQueryable();

        // 組織篩選
        if (organizationId.HasValue)
        {
            var orgIds = _organizationService.GetDescendantOrganizationIds(organizationId.Value);
            query = query.Where(d => orgIds.Contains(d.Organization.Id));
        }

        // 分類與領域篩選
        if (!string.IsNullOrWhiteSpace(categoryName))
        {
            int categoryId = categoryName == "客製型" ? 1 : 0;
            query = query.Where(d => d.DetailItem.KpiItem.KpiCategoryId == categoryId);
        }

        if (!string.IsNullOrWhiteSpace(fieldName))
        {
            query = query.Where(d => d.DetailItem.KpiItem.KpiField.field == fieldName);
        }

        // 年度篩選（僅找有報告的）
        if (startYear.HasValue || endYear.HasValue)
        {
            query = query.Where(d => d.KpiReports.Any(r =>
                (!startYear.HasValue || r.Year >= startYear) &&
                (!endYear.HasValue || r.Year <= endYear)));
        }

        // ✅ 關鍵字搜尋條件（不限欄位）
        if (!string.IsNullOrWhiteSpace(keyword))
        {
            query = query.Where(d =>
                d.DetailItem.KpiItem.KpiItemNames.Any(n => n.Name.Contains(keyword)) ||
                d.DetailItem.KpiDetailItemNames.Any(n => n.Name.Contains(keyword)) ||
                (d.DetailItem.KpiItem.KpiField.field ?? "").Contains(keyword) ||
                (d.Organization.Name ?? "").Contains(keyword) ||
                (d.ProductionSite ?? "").Contains(keyword) ||
                (d.Remarks ?? "").Contains(keyword));
        }

        // 季度排序轉換函式
        int QuarterOrder(string q) => q switch
        {
            "Q1" => 1,
            "Q2" => 2,
            "Q3" => 3,
            "Q4" => 4,
            "Y"  => 5,
            _    => 0
        };

        var rawData = await query.ToListAsync();

        // 政策改名/換單位對照：把「舊指標」的資料併入「新指標」一起顯示。
        // 對照分兩種：
        //  1. 指定細項（OldDetailItemId/NewDetailItemId 都有值）：精確一對一，可鏈式解析（A→B、B→C）
        //  2. 沒指定細項：涵蓋整個舊指標項目底下全部細項，查詢時用「名稱」在新指標項目底下找對應細項
        var mappingRows = await _db.KpiDetailItemMappings
            .Select(m => new { m.OldKpiItemId, m.NewKpiItemId, m.OldDetailItemId, m.NewDetailItemId })
            .ToListAsync();

        var directDict = mappingRows
            .Where(m => m.OldDetailItemId.HasValue && m.NewDetailItemId.HasValue)
            .ToDictionary(m => m.OldDetailItemId!.Value, m => m.NewDetailItemId!.Value);

        var itemLevelDict = mappingRows
            .Where(m => m.OldDetailItemId == null)
            .ToDictionary(m => m.OldKpiItemId, m => m.NewKpiItemId);

        // 「全部細項」對照要用名稱比對，先把涉及到的新指標項目底下所有細項的最新名稱撈出來。
        // 同一個指標項目底下可能因為之前的重複建立 bug，同名細項不只一筆（例如兩個工廠各自的 TSP），
        // 所以要以「名稱 + 組織」一起當比對鍵——組織別是看哪個細項底下已經有那個組織的 KpiData 決定的。
        var newKpiItemIds = itemLevelDict.Values.Distinct().ToList();
        var newItemDetailByOrg = newKpiItemIds.Count == 0
            ? new List<(int KpiItemId, string Name, int? OrganizationId, int DetailItemId)>()
            : (await _db.KpiDatas
                .Where(d => newKpiItemIds.Contains(d.DetailItem.KpiItemId))
                .Select(d => new
                {
                    KpiItemId = d.DetailItem.KpiItemId,
                    d.OrganizationId,
                    Name = d.DetailItem.KpiDetailItemNames.OrderByDescending(n => n.StartYear).Select(n => n.Name).FirstOrDefault(),
                    DetailItemId = d.DetailItemId
                })
                .Distinct()
                .ToListAsync())
                .Where(x => x.Name != null)
                .Select(x => (x.KpiItemId, Name: x.Name!, x.OrganizationId, x.DetailItemId))
                .ToList();

        var newItemNameOrgToDetailId = newItemDetailByOrg
            .GroupBy(x => (x.KpiItemId, x.Name, x.OrganizationId))
            .ToDictionary(g => g.Key, g => g.First().DetailItemId);

        // 備援：如果這個組織在新指標底下還沒有任何資料（例如今年剛換、還沒填報），
        // 但這個名稱在新指標項目底下就只有唯一一筆，不會有歧義，直接採用。
        var newItemNameUniqueFallback = newItemDetailByOrg
            .GroupBy(x => (x.KpiItemId, x.Name))
            .Where(g => g.Select(x => x.DetailItemId).Distinct().Count() == 1)
            .ToDictionary(g => g.Key, g => g.First().DetailItemId);

        int ResolveCanonicalDetailItemId(KpiDetailItem detailItem, int? organizationId)
        {
            var current = detailItem.Id;
            var visited = new HashSet<int>();
            while (directDict.TryGetValue(current, out var next) && visited.Add(current))
            {
                current = next;
            }
            if (current != detailItem.Id) return current;

            if (itemLevelDict.TryGetValue(detailItem.KpiItemId, out var newKpiItemId))
            {
                var name = (detailItem.KpiDetailItemNames ?? Enumerable.Empty<KpiDetailItemName>())
                    .OrderByDescending(n => n.StartYear)
                    .Select(n => n.Name)
                    .FirstOrDefault();
                if (name != null)
                {
                    if (newItemNameOrgToDetailId.TryGetValue((newKpiItemId, name, organizationId), out var matched))
                    {
                        return matched;
                    }
                    if (newItemNameUniqueFallback.TryGetValue((newKpiItemId, name), out var uniqueMatch))
                    {
                        return uniqueMatch;
                    }
                }
            }

            return detailItem.Id;
        }

        string? ResolveDetailItemNameForYear(IEnumerable<KpiDetailItemName>? names, int year) =>
            (names ?? Enumerable.Empty<KpiDetailItemName>())
                .Where(n => n.StartYear <= year && (!n.EndYear.HasValue || n.EndYear >= year))
                .OrderByDescending(n => n.StartYear)
                .Select(n => n.Name)
                .FirstOrDefault()
            ?? (names ?? Enumerable.Empty<KpiDetailItemName>())
                .OrderByDescending(n => n.StartYear)
                .Select(n => n.Name)
                .FirstOrDefault();

        string? ResolveItemNameForYear(IEnumerable<KpiItemName>? names, int year) =>
            (names ?? Enumerable.Empty<KpiItemName>())
                .Where(n => n.StartYear <= year)
                .OrderByDescending(n => n.StartYear)
                .Select(n => n.Name)
                .FirstOrDefault()
            ?? (names ?? Enumerable.Empty<KpiItemName>())
                .OrderByDescending(n => n.StartYear)
                .Select(n => n.Name)
                .FirstOrDefault();

        var result = rawData
        .GroupBy(d => new { DetailItemId = ResolveCanonicalDetailItemId(d.DetailItem, d.OrganizationId), d.OrganizationId, d.ProductionSite })
        .Select(g =>
        {
            try
            {
                var any = g.FirstOrDefault();
                var latestKpiData = g
                    .Where(d =>
                        !endYear.HasValue || (d.KpiReports ?? Enumerable.Empty<KpiReport>()).Any(r =>
                            r.Year < endYear ||
                            (r.Year == endYear && (string.IsNullOrEmpty(endQuarter) || QuarterOrder(r.Period) <= QuarterOrder(endQuarter)))
                        ))
                    .OrderByDescending(d => d.KpiCycle?.StartYear ?? 0)
                    .FirstOrDefault();

                var latestReport = latestKpiData?.KpiReports
                    .Where(r =>
                        r.Status == ReportStatus.Finalized &&
                        (!endYear.HasValue || r.Year < endYear || 
                            (r.Year == endYear && (
                                string.IsNullOrEmpty(endQuarter) || QuarterOrder(r.Period) <= QuarterOrder(endQuarter)
                            )))
                    )
                    .OrderByDescending(r => r.Year)
                    .ThenByDescending(r => QuarterOrder(r.Period))
                    .FirstOrDefault();

                // 用「真正最新」那筆（latestKpiData，可能是合併進來的新指標細項）取名稱/單位，
                // 而不是分組裡隨便一筆（any）——合併對照後，group 裡可能同時有新舊兩個指標細項的資料。
                var indicatorName = (latestKpiData?.DetailItem?.KpiItem?.KpiItemNames ?? Enumerable.Empty<KpiItemName>())
                    .OrderByDescending(n => n.StartYear)
                    .FirstOrDefault()?.Name;

                var detailItemName = (latestKpiData?.DetailItem?.KpiDetailItemNames ?? Enumerable.Empty<KpiDetailItemName>())
                    .OrderByDescending(n => n.StartYear)
                    .FirstOrDefault()?.Name;

                return new KpiDisplayGroupedDto
                {
                    Id = latestKpiData?.Id ?? 0,
                    DetailItemId = g.Key.DetailItemId,
                    ProductionSite = g.Key.ProductionSite,
                    Company = latestKpiData?.Organization?.Name,
                    Category = latestKpiData?.DetailItem?.KpiItem?.KpiCategoryId == 1 ? "客製型" : "基礎型",
                    Field = latestKpiData?.DetailItem?.KpiItem?.KpiField?.field,
                    IndicatorNumber = latestKpiData?.DetailItem?.KpiItem?.IndicatorNumber,
                    IndicatorName = indicatorName,
                    DetailItemName = detailItemName,
                    Unit = latestKpiData?.DetailItem?.Unit,
                    IsIndicator = latestKpiData?.DetailItem?.IsIndicator ?? false,
                    LastKpiCycleName = latestKpiData?.KpiCycle?.CycleName,
                    LastBaselineYear = latestKpiData?.BaselineYear,
                    LastBaselineValue = latestKpiData?.BaselineValue,
                    LastTargetValue = latestKpiData?.TargetValue,
                    LastComparisonOperator = latestKpiData?.DetailItem?.ComparisonOperator,
                    LastRemarks = latestKpiData?.Remarks,
                    LastReportYear = latestReport?.Year,
                    LastReportPeriod = latestReport?.Period,
                    LastReportValue = latestReport?.KpiReportValue,

                    KpiDatas = g.Select(d => new KpiDataCycleDto
                    {
                        KpiDataId = d.Id,
                        OrganizationName = d.Organization?.Name,
                        KpiCycleName = d.KpiCycle?.CycleName,
                        KpiCycleStartYear = d.KpiCycle?.StartYear ?? 0,
                        KpiCycleEndYear = d.KpiCycle?.EndYear ?? 0,
                        BaselineYear = d.BaselineYear,
                        BaselineValue = d.BaselineValue,
                        ComparisonOperator = d.DetailItem?.ComparisonOperator,
                        TargetValue = d.TargetValue,
                        Remarks = d.Remarks,
                        IsIndicator = d.DetailItem?.IsIndicator ?? false,
                        // 用該筆循環自己的起始年，去查當年生效的名稱/單位——
                        // 合併進來的舊指標細項會用「當年就是這個名稱」的舊版本，不會被新名稱蓋掉
                        IndicatorName = ResolveItemNameForYear(d.DetailItem?.KpiItem?.KpiItemNames, d.KpiCycle?.StartYear ?? 0),
                        DetailItemName = ResolveDetailItemNameForYear(d.DetailItem?.KpiDetailItemNames, d.KpiCycle?.StartYear ?? 0),
                        Unit = d.DetailItem?.Unit,
                        Reports = d.KpiReports
                            .Where(r =>
                                r.Status == ReportStatus.Finalized &&
                                (!startYear.HasValue || r.Year > startYear || 
                                    (r.Year == startYear && (
                                        string.IsNullOrEmpty(startQuarter) || QuarterOrder(r.Period) >= QuarterOrder(startQuarter)
                                    ))) &&
                                (!endYear.HasValue || r.Year < endYear || 
                                    (r.Year == endYear && (
                                        string.IsNullOrEmpty(endQuarter) || QuarterOrder(r.Period) <= QuarterOrder(endQuarter)
                                    )))
                            )
                            .OrderBy(r => r.Year)
                            .ThenBy(r => QuarterOrder(r.Period))
                            .Select(r => new KpiReportDto
                            {
                                Year = r.Year,
                                Period = r.Period,
                                KpiReportValue = r.KpiReportValue
                            }).ToList()
                    }).OrderBy(c => c.KpiCycleStartYear).ToList()
                };
            }
            catch (Exception ex)
            {
                // 拋出包含 DetailItemId 的錯誤訊息
                throw new Exception($"處理 DetailItemId={g.Key.DetailItemId}, OrganizationId={g.Key.OrganizationId}, ProductionSite={g.Key.ProductionSite} 時發生錯誤", ex);
            }
        }).ToList();

        return result;
    }

    //分頁顯示
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
    }
    public async Task<PagedResult<KpiDisplayDto>> GetKpiDisplayPagedAsync(
        int page = 1,
        int pageSize = 50,
        int? organizationId = null,
        string? categoryName = null,
        string? fieldName = null)
    {
        var orgIds = organizationId.HasValue
            ? _organizationService.GetDescendantOrganizationIds(organizationId.Value)
            : null;

        var query = _db.KpiDatas
            .AsNoTracking()
            .Where(d =>
                (!organizationId.HasValue || orgIds.Contains(d.Organization.Id)) &&
                (string.IsNullOrWhiteSpace(categoryName) ||
                    (categoryName == "客製型" ? 1 : 0) == d.DetailItem.KpiItem.KpiCategoryId) &&
                (string.IsNullOrWhiteSpace(fieldName) ||
                    d.DetailItem.KpiItem.KpiField.field == fieldName)
            );

        var totalCount = await query.CountAsync(); // ⬅️ 計算總筆數（給前端用）

        var pagedData = await query
            .OrderByDescending(d => d.Id) // ✅ 可以改成你想排序的欄位
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new KpiDisplayDto
            {
                Id = d.Id,
                Company = d.Organization.Name,
                ProductionSite = d.ProductionSite,
                Category = d.DetailItem.KpiItem.KpiCategoryId == 1 ? "客製型" : "基礎型",
                Field = d.DetailItem.KpiItem.KpiField.field,
                IndicatorNumber = d.DetailItem.KpiItem.IndicatorNumber,
                IndicatorName = d.DetailItem.KpiItem.KpiItemNames
                    .OrderByDescending(n => n.StartYear).FirstOrDefault().Name,
                DetailItemName = d.DetailItem.KpiDetailItemNames
                    .OrderByDescending(n => n.StartYear).FirstOrDefault().Name,
                Unit = d.DetailItem.Unit,
                BaselineYear = d.BaselineYear,
                BaselineValue = d.BaselineValue,
                TargetValue = d.TargetValue,
                LatestReportYear = d.KpiReports
                    .OrderByDescending(r => r.Year)
                    .ThenByDescending(r => GetPeriodOrder(r.Period))
                    .Select(r => r.Year)
                    .FirstOrDefault(),
                LatestReportPeriod = d.KpiReports
                    .OrderByDescending(r => r.Year)
                    .ThenByDescending(r => GetPeriodOrder(r.Period))
                    .Select(r => r.Period)
                    .FirstOrDefault(),
                LatestReportValue = d.KpiReports
                    .OrderByDescending(r => r.Year)
                    .ThenByDescending(r => GetPeriodOrder(r.Period))
                    .Select(r => r.KpiReportValue)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return new PagedResult<KpiDisplayDto>
        {
            Items = pagedData,
            TotalCount = totalCount
        };
    }
    
    public async Task<List<KpiDataDto>> GetKpiDataDtoByOrganizationIdAsync(int organizationId, int year, string quarter)
    {
        var result = await _db.KpiDatas
            .Include(d => d.DetailItem)
            .ThenInclude(di => di.KpiItem)
            .ThenInclude(ki => ki.KpiItemNames)
            .Include(d => d.DetailItem.KpiDetailItemNames)
            .Include(d => d.Organization)
            .Include(d => d.DetailItem.KpiItem.KpiField)
            .Include(d => d.KpiReports)
            .Include(d => d.KpiCycle)
            .Where(d =>
                    d.Organization.Id == organizationId &&
                    d.KpiCycle.StartYear <= year &&
                    d.KpiCycle.EndYear >= year
                    // !d.KpiReports.Any(r =>
                    //     r.Year == year &&
                    //     r.Period == quarter &&
                    //     r.Status == (ReportStatus)4) // ✅ 只要這筆 KPI 有定案報告就排除
            )
            .Select(d => new KpiDataDto
            {
                KpiDataId = d.Id,
                Company = d.Organization.Name,
                ProductionSite = d.ProductionSite,
                Field = d.DetailItem.KpiItem.KpiField.field,
                EnField = d.DetailItem.KpiItem.KpiField.enfield,
                KpiCategoryName = d.DetailItem.KpiItem.KpiCategoryId == 1 ? "客製型" : "基礎型",
                IndicatorName = d.DetailItem.KpiItem.KpiItemNames
                    .OrderByDescending(n => n.StartYear)
                    .FirstOrDefault().Name,
                DetailItemName = d.DetailItem.KpiDetailItemNames
                    .OrderByDescending(n => n.StartYear)
                    .FirstOrDefault().Name,
                Unit = d.DetailItem.Unit,
                BaselineYear = d.BaselineYear,
                BaselineValue = d.BaselineValue,
                TargetValue = d.TargetValue,
                // ✅ 補上目前該年該季的報告狀態（若有的話）
                Status = d.KpiReports
                    .Where(r => r.Year == year && r.Period == quarter)
                    .OrderByDescending(r => r.UpdateAt) // 若有更新時間
                    .Select(r => (int?)r.Status)         // 改為 nullable
                    .FirstOrDefault() ?? -1,              // 若無資料時，明確標示為 -1
                ReportValue = d.KpiReports
                .Where(r => r.Year == year && r.Period == quarter)
                .OrderByDescending(r => r.UpdateAt)
                .Select(r => (double?)r.KpiReportValue)  // 假設你的欄位叫 Value，請依實際調整
                .FirstOrDefault(),
                ReportUpdateAt = d.KpiReports
                    .Where(r => r.Year == year && r.Period == quarter)
                    .OrderByDescending(r => r.UpdateAt)
                    .Select(r => (DateTime?)r.UpdateAt)
                    .FirstOrDefault(),
                Remarks = d.KpiReports
                    .Where(r => r.Year == year && r.Period == quarter)
                    .OrderByDescending(r => r.UpdateAt)
                    .Select(r => r.Remarks)
                    .FirstOrDefault()

            })
            .ToListAsync();

        return result;
    }
    
    public async Task<(bool Success, string Message)> SubmitKpiReportsAsync(List<KpiReportInsertDto> reports, Guid? submittedByUserId = null, string? submittedByUserName = null)
    {
        if (reports == null || !reports.Any())
            return (false, "報告資料不可為空");

        var now = tool.GetTaiwanNow();

        // 記錄更新前的舊值（用於補建歷史 v1 快照）
        var preUpdateValues = new Dictionary<int, (decimal? Value, bool IsSkipped, string? Remarks, DateTime? UpdateAt)>();

        foreach (var r in reports)
        {
            var existing = await _db.KpiReports.FirstOrDefaultAsync(x =>
                x.KpiDataId == r.KpiDataId &&
                x.Year == r.Year &&
                x.Period == r.Quarter);

            if (existing != null)
            {
                if (existing.Status == ReportStatus.Draft || existing.Status == ReportStatus.Returned)
                {
                    // 保存舊值，以便在沒有歷史快照時補建 v1
                    preUpdateValues[r.KpiDataId] = (existing.KpiReportValue, existing.IsSkipped, existing.Remarks, existing.UpdateAt);

                    existing.KpiReportValue = r.IsSkipped ? null : r.Value;
                    existing.IsSkipped = r.IsSkipped;
                    existing.Remarks = r.Remark;
                    existing.Status = ReportStatus.Finalized;
                    existing.UpdateAt = now;
                }
                else
                {
                    return (false, $"KPI ID {r.KpiDataId} 在 {r.Year} 年 {QuarterLabelHelper.GetLabel(r.Quarter)} 已提交過，請勿重複提交");
                }
            }
            else
            {
                var entity = new KpiReport
                {
                    KpiDataId = r.KpiDataId,
                    Year = r.Year,
                    Period = r.Quarter,
                    KpiReportValue = r.IsSkipped ? null : r.Value,
                    IsSkipped = r.IsSkipped,
                    Remarks = r.Remark,
                    CreatedAt = now,
                    UpdateAt = now,
                    Status = ReportStatus.Finalized
                };
                _db.KpiReports.Add(entity);
            }
        }

        try
        {
            await _db.SaveChangesAsync();

            // 儲存快照
            var kpiDataIds = reports.Select(r => r.KpiDataId).Distinct().ToList();
            var orgLookup = await _db.KpiDatas
                .Where(d => kpiDataIds.Contains(d.Id) && d.OrganizationId != null)
                .Select(d => new { d.Id, OrgId = d.OrganizationId!.Value })
                .ToDictionaryAsync(d => d.Id, d => d.OrgId);

            var existingVersions = await _db.KpiReportSnapshots
                .Where(s => kpiDataIds.Contains(s.KpiDataId) &&
                            reports.Select(r => r.Year).Contains(s.Year) &&
                            reports.Select(r => r.Quarter).Contains(s.Period))
                .GroupBy(s => s.KpiDataId)
                .Select(g => new { KpiDataId = g.Key, MaxVersion = g.Max(s => s.Version) })
                .ToDictionaryAsync(x => x.KpiDataId, x => x.MaxVersion);

            foreach (var r in reports)
            {
                if (!orgLookup.TryGetValue(r.KpiDataId, out var orgId)) continue;
                var currentMax = existingVersions.TryGetValue(r.KpiDataId, out var v) ? v : 0;

                // 若此筆尚無任何快照，且本次是更新（非全新新增），補建退回前的舊值為 v1
                if (currentMax == 0 && preUpdateValues.TryGetValue(r.KpiDataId, out var old))
                {
                    _db.KpiReportSnapshots.Add(new KpiReportSnapshot
                    {
                        KpiDataId           = r.KpiDataId,
                        OrganizationId      = orgId,
                        Year                = r.Year,
                        Period              = r.Quarter,
                        Value               = old.Value,
                        IsSkipped           = old.IsSkipped,
                        Remarks             = old.Remarks,
                        Version             = 1,
                        SubmittedAt         = old.UpdateAt ?? now,
                        SubmittedByUserId   = null,
                        SubmittedByUserName = "（退回前紀錄）",
                    });
                    currentMax = 1;
                }

                _db.KpiReportSnapshots.Add(new KpiReportSnapshot
                {
                    KpiDataId           = r.KpiDataId,
                    OrganizationId      = orgId,
                    Year                = r.Year,
                    Period              = r.Quarter,
                    Value               = r.IsSkipped ? null : r.Value,
                    IsSkipped           = r.IsSkipped,
                    Remarks             = r.Remark,
                    Version             = currentMax + 1,
                    SubmittedAt         = now,
                    SubmittedByUserId   = submittedByUserId,
                    SubmittedByUserName = submittedByUserName,
                });
            }
            await _db.SaveChangesAsync();

            return (true, "KPI 報告已成功提交");
        }
        catch (Exception ex)
        {
            return (false, $"提交失敗：{ex.Message}");
        }
    }

    public async Task<List<KpiReportHistoryDto>> GetKpiReportHistoryAsync(int organizationId, int year, string quarter)
    {
        // 第一段：取快照（輕量查詢，不做深層 include）
        var snapshots = await _db.KpiReportSnapshots
            .AsNoTracking()
            .Where(s => s.OrganizationId == organizationId && s.Year == year && s.Period == quarter)
            .OrderBy(s => s.KpiDataId)
            .ThenBy(s => s.Version)
            .ToListAsync();

        if (!snapshots.Any()) return new List<KpiReportHistoryDto>();

        // 第二段：取 KPI 欄位名稱（參照現有 GetKpiDataDtoByOrganizationIdAsync 的做法）
        var kpiDataIds = snapshots.Select(s => s.KpiDataId).Distinct().ToList();
        var kpiInfos = await _db.KpiDatas
            .AsNoTracking()
            .Where(d => kpiDataIds.Contains(d.Id))
            .Select(d => new
            {
                d.Id,
                Field = d.DetailItem.KpiItem.KpiField.field ?? "",
                IndicatorName = d.DetailItem.KpiItem.KpiItemNames
                    .OrderByDescending(n => n.StartYear).Select(n => n.Name).FirstOrDefault() ?? "",
                DetailItemName = d.DetailItem.KpiDetailItemNames
                    .OrderByDescending(n => n.StartYear).Select(n => n.Name).FirstOrDefault() ?? "",
                d.DetailItem.Unit,
            })
            .ToDictionaryAsync(d => d.Id);

        return snapshots
            .GroupBy(s => s.KpiDataId)
            .Select(g =>
            {
                kpiInfos.TryGetValue(g.Key, out var info);
                return new KpiReportHistoryDto
                {
                    KpiDataId = g.Key,
                    Field = info?.Field ?? "",
                    IndicatorName = info?.IndicatorName ?? "",
                    DetailItemName = info?.DetailItemName ?? "",
                    Unit = info?.Unit ?? "",
                    Versions = g.Select(s => new KpiReportSnapshotDto
                    {
                        Version = s.Version,
                        Value = s.Value,
                        IsSkipped = s.IsSkipped,
                        Remarks = s.Remarks,
                        SubmittedAt = s.SubmittedAt,
                        SubmittedByUserName = s.SubmittedByUserName,
                    }).ToList()
                };
            })
            .ToList();
    }
    
    public async Task<(bool Success, string Message)> SelfReturnKpiReportsAsync(int organizationId, int year, string quarter)
    {
        var reports = await _db.KpiReports
            .Where(r => r.Year == year &&
                        r.Period == quarter &&
                        r.KpiData.OrganizationId == organizationId &&
                        r.Status == ReportStatus.Finalized)
            .ToListAsync();

        if (!reports.Any())
            return (false, "找不到可退回的已核准報告");

        foreach (var r in reports)
            r.Status = ReportStatus.Returned;

        try
        {
            await _db.SaveChangesAsync();
            return (true, "已退回重填，請重新填寫後送出");
        }
        catch (Exception ex)
        {
            return (false, $"退回失敗：{ex.Message}");
        }
    }

    public async Task<(bool Success, string Message)> SaveDraftReportsAsync(List<KpiReportInsertDto> reports)
    {
        if (reports == null || reports.Count == 0)
            return (false, "無任何資料可儲存。");

        var now = tool.GetTaiwanNow();

        foreach (var dto in reports)
        {
            if (dto.IsSkipped && string.IsNullOrWhiteSpace(dto.Remark))
            {
                return (false, $"KPI ID {dto.KpiDataId} 勾選跳過但未填寫備註。");
            }

            // 檢查是否已有相同 KPI 的草稿
            var existing = await _db.KpiReports.FirstOrDefaultAsync(r =>
                r.KpiDataId == dto.KpiDataId &&
                r.Year == dto.Year &&
                r.Period == dto.Quarter &&
                r.Status == ReportStatus.Draft
            );

            if (existing != null)
            {
                // ✅ 更新已存在草稿
                existing.KpiReportValue = dto.IsSkipped ? null : dto.Value;
                existing.IsSkipped = dto.IsSkipped;
                existing.Remarks = dto.Remark;
                existing.UpdateAt = now;
            }
            else
            {
                // ✅ 新增新的草稿
                var report = new KpiReport
                {
                    KpiDataId = dto.KpiDataId,
                    Year = dto.Year,
                    Period = dto.Quarter,
                    KpiReportValue = dto.IsSkipped ? null : dto.Value,
                    IsSkipped = dto.IsSkipped,
                    Remarks = dto.Remark,
                    Status = ReportStatus.Draft,
                    CreatedAt = now,
                    UpdateAt = now
                };

                _db.KpiReports.Add(report);
            }
        }

        await _db.SaveChangesAsync();
        return (true, "草稿儲存成功");
    }
    
    public async Task<List<KpiReportInsertDto>> LoadDraftReportsAsync(int organizationId, int year, string quarter)
    {
        var drafts = await _db.KpiReports
            .Where(r => (r.Status == ReportStatus.Draft || r.Status == ReportStatus.Returned) &&
                        r.Year == year &&
                        r.Period == quarter &&
                        r.KpiData.OrganizationId == organizationId)
            .Select(r => new KpiReportInsertDto
            {
                KpiDataId = r.KpiDataId,
                Value = r.KpiReportValue,
                IsSkipped = r.IsSkipped,
                Remark = r.Remarks,
                Year = r.Year,
                Quarter = r.Period
            })
            .ToListAsync();

        return drafts;
    }
    
    private bool ConvertYesNoToBool(string? value)
    {
        return value?.Trim() == "是";
    }
    
    private static string GetCellString(ICell cell)
    {
        if (cell == null) return string.Empty;

        var text = cell.ToString()?.Trim() ?? string.Empty;
        return text == "-" ? string.Empty : text;
    }
    private static decimal? GetCellDecimal(ICell cell)
    {
        if (cell == null) return null;

        if (cell.CellType == CellType.Numeric)
        {
            return (decimal)cell.NumericCellValue;
        }
        else
        {
            var text = cell.ToString()?.Trim();

            // ✅ 如果是空字串或者 "-"，就當成 null
            if (string.IsNullOrEmpty(text) || text == "-")
            {
                return null;
            }

            return decimal.TryParse(text, out var result) ? result : null;
        }
    }
    
    public async Task<List<KpimanyRow>> ParseExcelAsync(Stream fileStream, int organizationId)
    {
        var workbook = new XSSFWorkbook(fileStream);
        var sheet = workbook.GetSheetAt(0); // 第一個工作表
        var result = new List<KpimanyRow>();

        // 🏷 依照傳入的 organizationId 查出資料庫中的名稱
        var organization = await _db.Organizations
            .Where(o => o.Id == organizationId)
            .Select(o => o.Name)
            .FirstOrDefaultAsync();

        if (organization == null)
            throw new Exception($"找不到 Id 為 {organizationId} 的組織");

        // 從第2行開始讀
        for (int rowIndex = 1; rowIndex <= sheet.LastRowNum; rowIndex++)
        {
            var row = sheet.GetRow(rowIndex);
            if (row == null) continue;

            var dto = new KpimanyRow
            {
                OrganizationId = organizationId,     // ✅ 固定用傳入的 ID
                Organization = organization,         // ✅ 用資料庫查出名稱
                ProductionSite = GetCellString(row.GetCell(0)),
                KpiCategoryName = GetCellString(row.GetCell(1)),
                FieldName = GetCellString(row.GetCell(2)),
                IndicatorName = GetCellString(row.GetCell(3)),
                DetailItemName = GetCellString(row.GetCell(4)),
                Unit = GetCellString(row.GetCell(5)),
                IsIndicator = ConvertYesNoToBool(GetCellString(row.GetCell(6))),
                IsApplied = GetCellString(row.GetCell(7)) == "是",
                KpiCycleName = GetCellString(row.GetCell(8)),
                BaselineYear = GetCellString(row.GetCell(9)),
                BaselineValue = GetCellDecimal(row.GetCell(10)),
                ComparisonOperator = GetCellString(row.GetCell(11)),
                TargetValue = GetCellDecimal(row.GetCell(12)),
                Remarks = GetCellString(row.GetCell(13))
            };

            result.Add(dto);
        }

        return result;
    }
    
    // 確認後正式存入資料庫
    public async Task<(bool Success, string Message)> BatchInsertKpiDataAsync(int organizationId, List<KpimanyRow> rows)
    {
        if (rows == null || rows.Count == 0)
            return (false, "沒有任何資料可匯入。");

        using var transaction = await _db.Database.BeginTransactionAsync();
        var now = tool.GetTaiwanNow();
        var userEmail = "idsl5397@mail.isha.org.tw";
        var currentYear = 113;

        int successCount = 0;
        int failCount = 0;
        List<string> failDetails = new();

        // 資料快取區
        var allFieldsList = await _db.KpiFields.ToListAsync();
        var allKpiCycles = await _db.KpiCycles.ToListAsync();
        var allOrganizations = await _db.Organizations.ToDictionaryAsync(o => o.Id);
        var allFields = allFieldsList
            .SelectMany(f => new[] {
                new { Key = f.field?.Trim().ToLower(), Value = f },
                new { Key = f.enfield?.Trim().ToLower(), Value = f }
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Key))
            .ToDictionary(x => x.Key, x => x.Value);
        var allKpiItems = await _db.KpiItems.Include(i => i.KpiItemNames).ToListAsync();
        var allDetailItems = await _db.KpiDetailItems.Include(d => d.KpiDetailItemNames).ToListAsync();

        try
        {
            foreach (var row in rows)
            {
                try
                {
                    // ✅ 強制以傳入的 organizationId 為主
                    row.OrganizationId = organizationId;

                    if (!allOrganizations.TryGetValue(row.OrganizationId, out var organization))
                        throw new Exception($"找不到公司 ID：{row.OrganizationId}");

                    var normalizedFieldName = row.FieldName?.Trim().ToLower();
                    if (!allFields.TryGetValue(normalizedFieldName ?? "", out var field))
                        throw new Exception($"找不到領域：{row.FieldName}");

                    int categoryId = (row.KpiCategoryName == "客製" || row.KpiCategoryName == "客製型") ? 1 : 0;

                    // 指標處理
                    var item = allKpiItems.FirstOrDefault(i =>
                        i.KpiFieldId == field.Id &&
                        i.KpiCategoryId == categoryId &&
                        i.OrganizationId == (categoryId == 1 ? organization.Id : null) &&
                        i.KpiItemNames.Any(n => n.Name == row.IndicatorName && n.StartYear == currentYear));

                    if (item == null)
                    {
                        var maxNumber = allKpiItems
                            .Where(i => i.KpiFieldId == field.Id &&
                                        i.KpiCategoryId == categoryId &&
                                        i.OrganizationId == (categoryId == 1 ? organization.Id : null))
                            .Max(i => (int?)i.IndicatorNumber) ?? 0;

                        item = new KpiItem
                        {
                            IndicatorNumber = maxNumber + 1,
                            KpiFieldId = field.Id,
                            KpiCategoryId = categoryId,
                            OrganizationId = (categoryId == 1 ? organization.Id : null),
                            CreateTime = now,
                            UploadTime = now,
                            KpiItemNames = new List<KpiItemName>
                            {
                                new()
                                {
                                    Name = row.IndicatorName,
                                    StartYear = currentYear,
                                    UserEmail = userEmail,
                                    CreatedAt = now
                                }
                            }
                        };
                        _db.KpiItems.Add(item);
                        await _db.SaveChangesAsync();
                        allKpiItems.Add(item);
                    }

                    // 細項處理
                    var detailItem = allDetailItems.FirstOrDefault(d =>
                        d.KpiItemId == item.Id &&
                        d.Unit == row.Unit &&
                        d.KpiDetailItemNames.Any(n => n.Name == row.DetailItemName && n.StartYear == currentYear));

                    if (detailItem == null)
                    {
                        detailItem = new KpiDetailItem
                        {
                            KpiItemId = item.Id,
                            Unit = row.Unit,
                            ComparisonOperator = row.ComparisonOperator,
                            IsIndicator = row.IsIndicator,
                            CreateTime = now,
                            UploadTime = now,
                            KpiDetailItemNames = new List<KpiDetailItemName>
                            {
                                new()
                                {
                                    Name = row.DetailItemName,
                                    StartYear = currentYear,
                                    UserEmail = userEmail,
                                    CreatedAt = now
                                }
                            }
                        };
                        _db.KpiDetailItems.Add(detailItem);
                        await _db.SaveChangesAsync();
                        allDetailItems.Add(detailItem);
                    }

                    var kpiCycle = allKpiCycles.FirstOrDefault(c => c.CycleName == row.KpiCycleName?.Trim());
                    if (kpiCycle == null)
                        throw new Exception($"找不到循環期：{row.KpiCycleName}");

                    bool existsData = await _db.KpiDatas.AnyAsync(d =>
                        d.OrganizationId == organization.Id &&
                        d.DetailItemId == detailItem.Id &&
                        d.ProductionSite == row.ProductionSite &&
                        d.KpiCycleId == kpiCycle.Id);

                    if (existsData)
                    {
                        failCount++;
                        failDetails.Add($"已有資料：{organization.Name} / {row.IndicatorName} / {row.DetailItemName}");
                        continue;
                    }

                    _db.KpiDatas.Add(new KpiData
                    {
                        OrganizationId = organization.Id,
                        ProductionSite = row.ProductionSite,
                        DetailItemId = detailItem.Id,
                        IsApplied = row.IsApplied,
                        BaselineYear = row.BaselineYear,
                        BaselineValue = row.BaselineValue,
                        TargetValue = row.TargetValue,
                        Remarks = row.Remarks,
                        CreatedAt = now,
                        UpdateAt = now,
                        KpiCycleId = kpiCycle.Id
                    });

                    successCount++;
                }
                catch (Exception ex)
                {
                    failCount++;
                    failDetails.Add(ex.Message);
                }

                if ((successCount + failCount) % 50 == 0)
                    await _db.SaveChangesAsync();
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, $"✅ 匯入完成：成功 {successCount} 筆，失敗 {failCount} 筆\n{string.Join("\n", failDetails)}");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            var innerMessage = ex.InnerException?.Message ?? ex.Message;
            return (false, $"❌ 匯入失敗，錯誤：{innerMessage}");
        }
    }
    
    public List<KpiimportexcelDto> ParseFullImportExcel(Stream fileStream)
    {
        var workbook = new XSSFWorkbook(fileStream);
        var sheet = workbook.GetSheetAt(0);
        var result = new List<KpiimportexcelDto>();

        for (int rowIndex = 1; rowIndex <= sheet.LastRowNum; rowIndex++)
        {
            var row = sheet.GetRow(rowIndex);
            if (row == null) continue;

            try
            {
                // var data = new KpiimportexcelDto
                // {
                //     Id = int.TryParse(GetCellString(row.GetCell(0)), out var orgId) ? orgId : 0,
                //     Company = GetCellString(row.GetCell(1)),
                //     ProductionSite = row.GetCell(2)?.ToString()?.Trim(),
                //     Field = GetCellString(row.GetCell(3)),
                //     Category = GetCellString(row.GetCell(4)),
                //     IndicatorName = GetCellString(row.GetCell(6)),
                //     DetailItemName = GetCellString(row.GetCell(7)),
                //     Unit = GetCellString(row.GetCell(8)),
                //     IsIndicator = ConvertYesNoToBool(GetCellString(row.GetCell(9))),
                //     IsApplied = ConvertYesNoToBool(GetCellString(row.GetCell(10))),
                //     BaselineYear = GetCellString(row.GetCell(11)),
                //     BaselineValue = GetCellDecimal(row.GetCell(12)),
                //     Reports = new List<KpiReportDto>
                //     {
                //         new KpiReportDto { Year = 111, Period = "Y", KpiReportValue = GetCellDecimal(row.GetCell(13))},
                //         new KpiReportDto { Year = 112, Period = "Y", KpiReportValue = GetCellDecimal(row.GetCell(14))},
                //         new KpiReportDto { Year = 113, Period = "Y", KpiReportValue = GetCellDecimal(row.GetCell(15))}
                //     },
                //     TargetValue = GetCellDecimal(row.GetCell(16)),
                //     ComparisonOperator = GetCellString(row.GetCell(17)),
                //     Remarks = GetCellString(row.GetCell(18)),
                //     NewBaselineYear = GetCellString(row.GetCell(19)),
                //     NewBaselineValue = GetCellDecimal(row.GetCell(20)),
                //     NewExecutionValue = GetCellDecimal(row.GetCell(21)),
                //     NewTargetValue = GetCellDecimal(row.GetCell(22)),
                //     NewRemarks = GetCellString(row.GetCell(23)),
                // };
                var data = new KpiimportexcelDto
                {
                    Id = int.TryParse(GetCellString(row.GetCell(0)), out var orgId) ? orgId : 0,
                    Company = GetCellString(row.GetCell(1)),
                    ProductionSite = row.GetCell(2)?.ToString()?.Trim(),
                    Field = GetCellString(row.GetCell(3)),
                    Category = GetCellString(row.GetCell(4)),
                    IndicatorName = GetCellString(row.GetCell(6)),
                    DetailItemName = GetCellString(row.GetCell(7)),
                    Unit = GetCellString(row.GetCell(8)),
                    IsIndicator = ConvertYesNoToBool(GetCellString(row.GetCell(9))),
                    IsApplied = ConvertYesNoToBool(GetCellString(row.GetCell(10))),
                    BaselineYear = GetCellString(row.GetCell(11)),
                    BaselineValue = GetCellDecimal(row.GetCell(12)),
                    Reports = new List<KpiReportDto>
                    {
                        new KpiReportDto { Year = 111, Period = "Y", KpiReportValue = GetCellDecimal(row.GetCell(13))},
                        new KpiReportDto { Year = 112, Period = "Y", KpiReportValue = GetCellDecimal(row.GetCell(14))},
                        new KpiReportDto { Year = 113, Period = "Y", KpiReportValue = GetCellDecimal(row.GetCell(15))},
                    },
                    TargetValue = GetCellDecimal(row.GetCell(16)),
                    ComparisonOperator = GetCellString(row.GetCell(17)),
                    Remarks = GetCellString(row.GetCell(18)),
                    NewBaselineYear = GetCellString(row.GetCell(19)),
                    NewBaselineValue = GetCellDecimal(row.GetCell(20)),
                    NewExecutionValue = GetCellDecimal(row.GetCell(21)),
                    NewTargetValue = GetCellDecimal(row.GetCell(22)),
                    NewRemarks = GetCellString(row.GetCell(23)),
                };

                result.Add(data);
            }
            catch (Exception ex)
            {
                // 可加 log 記錄錯誤行
                Console.WriteLine($"Row {rowIndex} 發生錯誤：{ex.Message}");
            }
        }

        return result;
    }
    
    public async Task<(bool Success, string Message)> BatchFullKpiDataAsync(List<KpiimportexcelDto> rows)
    {
        if (rows == null || rows.Count == 0)
            return (false, "沒有任何資料可匯入。");

        using var transaction = await _db.Database.BeginTransactionAsync();
        var now = tool.GetTaiwanNow();
        var userEmail = "idsl5397@mail.isha.org.tw";
        var currentYear = 113;
    
        int successCount = 0;
        int failCount = 0;
        List<string> failDetails = new();

        var allFieldsList = await _db.KpiFields.ToListAsync();
        var allOrganizations = await _db.Organizations.ToDictionaryAsync(o => o.Id);
        var allFields = allFieldsList
            .SelectMany(f => new[]
            {
                new { Key = f.field?.Trim().ToLower(), Value = f },
                new { Key = f.enfield?.Trim().ToLower(), Value = f }
            })
            .Where(x => !string.IsNullOrWhiteSpace(x.Key))
            .ToDictionary(x => x.Key, x => x.Value);
        var allKpiItems = await _db.KpiItems.Include(i => i.KpiItemNames).ToListAsync();
        var allDetailItems = await _db.KpiDetailItems.Include(d => d.KpiDetailItemNames).ToListAsync();

        try
        {
            foreach (var row in rows)
            {
                try
                {
                    if (!allOrganizations.TryGetValue(row.Id, out var organization))
                        throw new Exception($"找不到公司：{row.Id}");

                    if (!allFields.TryGetValue(row.Field?.Trim().ToLower(), out var field))
                        throw new Exception($"找不到領域：{row.Field}");
                    
                    var productionSite = string.IsNullOrWhiteSpace(row.ProductionSite) || row.ProductionSite.Trim() == "-" 
                        ? ""
                        : row.ProductionSite.Trim();

                    int cycleId = row.KpiCycleId;
                    
                    int categoryId = (row.Category == "客製" || row.Category == "客製型") ? 1 : 0;

                    var item = allKpiItems.FirstOrDefault(i =>
                        i.KpiFieldId == field.Id &&
                        i.KpiCategoryId == categoryId &&
                        i.OrganizationId == (categoryId == 1 ? organization.Id : null) &&
                        i.KpiItemNames.Any(n => n.Name == row.IndicatorName && n.StartYear == currentYear));

                    if (item == null)
                    {
                        var maxNumber = allKpiItems
                            .Where(i => i.KpiFieldId == field.Id &&
                                        i.KpiCategoryId == categoryId &&
                                        i.OrganizationId == (categoryId == 1 ? organization.Id : null))
                            .Max(i => (int?)i.IndicatorNumber) ?? 0;

                        item = new KpiItem
                        {
                            IndicatorNumber = maxNumber + 1,
                            KpiFieldId = field.Id,
                            KpiCategoryId = categoryId,
                            OrganizationId = (categoryId == 1 ? organization.Id : null),
                            CreateTime = now,
                            UploadTime = now,
                            KpiItemNames = new List<KpiItemName>
                            {
                                new KpiItemName
                                {
                                    Name = row.IndicatorName,
                                    StartYear = currentYear,
                                    UserEmail = userEmail,
                                    CreatedAt = now
                                }
                            }
                        };
                        _db.KpiItems.Add(item);
                        await _db.SaveChangesAsync();
                        allKpiItems.Add(item);
                    }

                    var detailItem = allDetailItems.FirstOrDefault(d =>
                        d.KpiItemId == item.Id &&
                        d.Unit == row.Unit &&
                        d.KpiDetailItemNames.Any(n => n.Name == row.DetailItemName && n.StartYear == currentYear));

                    if (detailItem == null)
                    {
                        detailItem = new KpiDetailItem
                        {
                            KpiItemId = item.Id,
                            Unit = row.Unit,
                            ComparisonOperator = row.ComparisonOperator,
                            IsIndicator = row.IsIndicator,
                            CreateTime = now,
                            UploadTime = now,
                            KpiDetailItemNames = new List<KpiDetailItemName>
                            {
                                new KpiDetailItemName
                                {
                                    Name = row.DetailItemName,
                                    StartYear = currentYear,
                                    UserEmail = userEmail,
                                    CreatedAt = now
                                }
                            }
                        };
                        _db.KpiDetailItems.Add(detailItem);
                        await _db.SaveChangesAsync();
                        allDetailItems.Add(detailItem);
                    }

                    // 6. 確認是否已經存在相同的 KPI Data
                    bool existsData = await _db.KpiDatas.AnyAsync(d =>
                        d.OrganizationId == organization.Id &&
                        d.DetailItemId == detailItem.Id &&
                        (d.ProductionSite ?? "") == productionSite &&
                        d.KpiCycleId == cycleId);

                    if (existsData)
                    {
                        failCount++;
                        failDetails.Add($"已有資料：{row.Id} / {row.IndicatorName} / {row.DetailItemName}");
                        continue;
                    }
                    
                    // 舊週期 KpiData
                    var kpiData = new KpiData
                    {
                        OrganizationId = organization.Id,
                        ProductionSite = productionSite,
                        DetailItemId = detailItem.Id,
                        IsApplied = row.IsApplied,
                        BaselineYear = row.BaselineYear,
                        BaselineValue = row.BaselineValue,
                        TargetValue = row.TargetValue,
                        Remarks = row.Remarks,
                        CreatedAt = now,
                        UpdateAt = now,
                        KpiCycleId = 1
                    };
                    _db.KpiDatas.Add(kpiData);
                    await _db.SaveChangesAsync();

                    if (row.Reports != null)
                    {
                        foreach (var report in row.Reports)
                        {
                            decimal? value = null;
                            try { if (report?.KpiReportValue != null) value = Convert.ToDecimal(report.KpiReportValue); } catch { value = null; }

                            _db.KpiReports.Add(new KpiReport
                            {
                                KpiDataId = kpiData.Id,
                                Year = report?.Year ?? currentYear,
                                Period = report?.Period ?? "Y",
                                KpiReportValue = value,
                                CreatedAt = now,
                                UpdateAt = now,
                                Status = ReportStatus.Finalized,
                                IsSkipped = false,
                            });
                        }
                    }

                    
                    // 新週期 KpiData（若有提供）
                    if (!string.IsNullOrWhiteSpace(row.NewBaselineYear))
                    {
                        var kpiData2 = new KpiData
                        {
                            OrganizationId = organization.Id,
                            ProductionSite = productionSite,
                            DetailItemId = detailItem.Id,
                            IsApplied = row.IsApplied,
                            BaselineYear = row.NewBaselineYear,
                            BaselineValue = row.NewBaselineValue ?? 0,
                            TargetValue = row.NewTargetValue ?? 0,
                            Remarks = row.NewRemarks,
                            CreatedAt = now,
                            UpdateAt = now,
                            KpiCycleId = 2
                        };
                        _db.KpiDatas.Add(kpiData2);
                        await _db.SaveChangesAsync();
                    
                        if (row.NewExecutionValue.HasValue)
                        {
                            _db.KpiReports.Add(new KpiReport
                            {
                                KpiDataId = kpiData2.Id,
                                Year = 114,
                                Period = "Q2",
                                KpiReportValue = row.NewExecutionValue.Value,
                                CreatedAt = now,
                                UpdateAt = now,
                                Status = ReportStatus.Finalized,
                                IsSkipped = false
                            });
                        }
                    }

                    successCount++;
                }
                catch (Exception ex)
                {
                    failCount++;
                    failDetails.Add(ex.Message);
                }

                if ((successCount + failCount) % 50 == 0)
                {
                    await _db.SaveChangesAsync();
                }
            }

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();

            return (true, $"✅ 匯入完成，成功：{successCount} 筆，失敗：{failCount} 筆\n{string.Join("\n", failDetails)}");
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            var innerMessage = ex.InnerException?.Message ?? ex.Message;
            return (false, $"❌ 匯入失敗，原因：{innerMessage}");
        }
    }

    public async Task<List<KpiCycle>> GetAllCyclesAsync()
    {
        return await _db.KpiCycles
            .OrderByDescending(k => k.StartYear)
            .Select(k => new KpiCycle
            {
                Id = k.Id,
                CycleName = k.CycleName,
                StartYear = k.StartYear,
                EndYear = k.EndYear
            })
            .ToListAsync();
    }
    
    private string GetQuarter(DateTime dt)
    {
        return dt.Month switch
        {
            <= 3 => "Q1",
            <= 6 => "Q2",
            <= 9 => "Q3",
            _ => "Q4",
        };
    }
    public async Task<(string FileName, byte[] Content)> GenerateTemplateAsync(int organizationId, int year, string quarter)
    {
        var data = await GetKpiDataDtoByOrganizationIdAsync(organizationId, year, quarter);

        // 只保留可填報的狀態：尚未填報(-1)、草稿(0)、已退回(3)
        // Submitted(1)、Reviewed(2)、Finalized(4) 不需要下載重填
        var categoryOrder = new Dictionary<string, int> { { "基礎型", 1 }, { "客製型", 2 } };
        var siteOrder = new Dictionary<string, int>
        {
            { "PVC廠", 1 }, { "VCM廠", 2 }, { "AE廠", 3 }, { "公用廠", 4 }, { "PE廠", 5 }
        };
        var fieldOrder = new Dictionary<string, int> { { "PSM", 1 }, { "EP", 2 }, { "FR", 3 } };
        data = data.Where(d => d.Status == -1 || d.Status == 0 || d.Status == 3)
                   .OrderBy(d => categoryOrder.TryGetValue(d.KpiCategoryName ?? "", out var c) ? c : 99)
                   .ThenBy(d => siteOrder.TryGetValue(d.ProductionSite ?? "", out var s) ? s : 99)
                   .ThenBy(d => fieldOrder.TryGetValue(d.EnField ?? "", out var f) ? f : 99)
                   .ThenBy(d => d.KpiDataId)
                   .ToList();

        var workbook = new XSSFWorkbook();

        // ── 工作表1：說明 ──
        var infoSheet = workbook.CreateSheet("說明");
        var titleStyle = workbook.CreateCellStyle();
        var titleFont = workbook.CreateFont();
        titleFont.IsBold = true;
        titleFont.FontHeightInPoints = 14;
        titleStyle.SetFont(titleFont);

        var noteFont = workbook.CreateFont();
        noteFont.FontHeightInPoints = 12;
        var noteStyle = workbook.CreateCellStyle();
        noteStyle.SetFont(noteFont);

        var titleRow = infoSheet.CreateRow(0);
        var titleCell = titleRow.CreateCell(0);
        titleCell.SetCellValue("填寫注意事項");
        titleCell.CellStyle = titleStyle;

        var notes = new[]
        {
            "請勿更動模板中的欄位名稱與順序",
            "僅可填寫／修改藍色欄位，即填報值與備註",
            "請填寫填報值（僅填寫數值），若無資料請輸入備註",
            "請確認填寫數據，避免匯入失敗"
        };
        for (int n = 0; n < notes.Length; n++)
        {
            var noteRow = infoSheet.CreateRow(n + 2);
            var noteCell = noteRow.CreateCell(0);
            noteCell.SetCellValue($"• {notes[n]}");
            noteCell.CellStyle = noteStyle;
        }
        infoSheet.SetColumnWidth(0, 80 * 256);

        // ── 工作表2：KPI 填報 ──
        var sheet = workbook.CreateSheet("KPI");

        // 可編輯欄位藍底樣式（填報值、備註）
        var blueStyle = workbook.CreateCellStyle();
        var lightBlue = new XSSFColor(new byte[] { 221, 235, 247 });
        ((XSSFCellStyle)blueStyle).SetFillForegroundColor(lightBlue);
        blueStyle.FillPattern = FillPattern.SolidForeground;

        // 標題列
        var headers = new[]
        {
            "指標ID", "類別", "領域", "英文領域", "指標名稱", "細項名稱",
            "單位", "工場/製程區", "單位", "基準年", "基準值", "目標值", "填報值", "備註"
        };
        var headerRow = sheet.CreateRow(0);
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = headerRow.CreateCell(i);
            cell.SetCellValue(headers[i]);
            if (i >= 12)
                cell.CellStyle = blueStyle;
        }

        // 資料列
        for (int i = 0; i < data.Count; i++)
        {
            var d = data[i];
            var row = sheet.CreateRow(i + 1);
            row.CreateCell(0).SetCellValue(d.KpiDataId);
            row.CreateCell(1).SetCellValue(d.KpiCategoryName);
            row.CreateCell(2).SetCellValue(d.Field);
            row.CreateCell(3).SetCellValue(d.EnField);
            row.CreateCell(4).SetCellValue(d.IndicatorName);
            row.CreateCell(5).SetCellValue(d.DetailItemName);
            row.CreateCell(6).SetCellValue(d.Company);
            row.CreateCell(7).SetCellValue(d.ProductionSite ?? "");
            row.CreateCell(8).SetCellValue(d.Unit);
            row.CreateCell(9).SetCellValue(d.BaselineYear);
            if (d.BaselineValue.HasValue)
                row.CreateCell(10).SetCellValue((double)d.BaselineValue.Value);
            else
                row.CreateCell(10).SetCellValue(string.Empty);

            if (d.TargetValue.HasValue)
                row.CreateCell(11).SetCellValue((double)d.TargetValue.Value);
            else
                row.CreateCell(11).SetCellValue(string.Empty);

            // ✅ 填報值（可編輯，藍底）
            var c12 = row.CreateCell(12);
            if (d.ReportValue.HasValue) c12.SetCellValue((double)d.ReportValue.Value);
            else c12.SetCellValue(string.Empty);
            c12.CellStyle = blueStyle;

            // ✅ 備註（可編輯，藍底）
            var c13 = row.CreateCell(13);
            c13.SetCellValue(d.Remarks ?? string.Empty);
            c13.CellStyle = blueStyle;
        }

        using var stream = new MemoryStream();
        workbook.Write(stream);
        var fileName = $"KPI_Template_{year}_{quarter}.xlsx";
        return (fileName, stream.ToArray());
    }
    
    public async Task<List<KpiPreviewDto>> ReadPreviewAsync(IFormFile file)
    {
        using var stream = file.OpenReadStream();
        var workbook = new XSSFWorkbook(stream);
        var sheet = workbook.GetSheet("KPI") ?? workbook.GetSheetAt(1);

        var previewList = new List<KpiPreviewDto>();

        for (int i = 1; i <= sheet.LastRowNum; i++)
        {
            var row = sheet.GetRow(i);
            if (row == null) continue;

            string indicatorName = row.GetCell(4)?.ToString();
            string detailItemName = row.GetCell(5)?.ToString();
            string remarks = row.GetCell(13)?.ToString();

            double? reportValue = double.TryParse(row.GetCell(12)?.ToString(), out var val) ? val : null;

            // 驗證邏輯
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(indicatorName))
                errors.Add("指標名稱缺失");

            if (!string.IsNullOrWhiteSpace(row.GetCell(12)?.ToString()) && reportValue == null)
                errors.Add("實際值格式錯誤");

            if (!reportValue.HasValue && string.IsNullOrWhiteSpace(remarks))
                errors.Add("實際值與備註不可同時為空");

            previewList.Add(new KpiPreviewDto
            {
                IndicatorName = indicatorName,
                DetailItemName = detailItemName,
                ReportValue = reportValue,
                Remarks = remarks,
                RowIndex = i + 1,
                ErrorMessages = errors
            });
        }

        return previewList;
    }
    
    public async Task<(int inserted, int updated, int skipped)> ImportAsync(
        IFormFile file, int organizationId, int year, string quarter,
        Guid? submittedByUserId = null, string? submittedByUserName = null)
    {
        using var stream = file.OpenReadStream();
        var workbook = new XSSFWorkbook(stream);
        var sheet = workbook.GetSheet("KPI") ?? workbook.GetSheetAt(1);

        int inserted = 0;
        int updated  = 0;
        int skipped  = 0;

        var processedItems = new List<(int KpiDataId, decimal? Value, bool IsSkipped, string? Remarks)>();
        // 記錄更新前的舊值（key = kpiDataId）
        var preUpdateValues = new Dictionary<int, (decimal? Value, bool IsSkipped, string? Remarks, DateTime? UpdateAt)>();

        for (int i = 1; i <= sheet.LastRowNum; i++)
        {
            var row = sheet.GetRow(i);
            if (row == null) continue;

            // === 1. 解析欄位 ===
            if (!int.TryParse(row.GetCell(0)?.ToString(), out int kpiDataId))
                continue;

            decimal? reportValue = decimal.TryParse(
                row.GetCell(12)?.ToString(), out var val) ? val : null;

            string remarks = row.GetCell(13)?.ToString() ?? string.Empty;

            // === 2. 取得現有報告（若有） ===
            var existing = await _db.KpiReports.FirstOrDefaultAsync(r =>
                r.KpiDataId == kpiDataId &&
                r.Year      == year &&
                r.Period    == quarter);

            if (existing != null)
            {
                // === 狀態閘門：Submitted/Reviewed/Finalized 不可覆蓋，需等審核完成 ===
                if (existing.Status == ReportStatus.Submitted ||
                    existing.Status == ReportStatus.Reviewed  ||
                    existing.Status == ReportStatus.Finalized)
                {
                    skipped++;
                    continue;
                }

                // 保存舊值，以便補建歷史 v1 快照
                preUpdateValues[kpiDataId] = (existing.KpiReportValue, existing.IsSkipped, existing.Remarks, existing.UpdateAt);

                // === 3A. 更新（Draft 或 Returned 可重新送出） ===
                existing.KpiReportValue = reportValue;
                existing.Remarks        = string.IsNullOrEmpty(remarks) ? null : remarks;
                existing.Status         = ReportStatus.Finalized;
                existing.UpdateAt       = DateTime.Now;
                updated++;
            }
            else
            {
                // === 3B. 新增 ===
                var report = new KpiReport
                {
                    KpiDataId      = kpiDataId,
                    Year           = year,
                    Period         = quarter,
                    KpiReportValue = reportValue,
                    Remarks        = string.IsNullOrEmpty(remarks) ? null : remarks,
                    Status         = ReportStatus.Finalized,
                    UpdateAt       = DateTime.Now
                };
                _db.KpiReports.Add(report);
                inserted++;
            }

            processedItems.Add((kpiDataId, reportValue, false, string.IsNullOrEmpty(remarks) ? null : remarks));
        }

        await _db.SaveChangesAsync();

        // 儲存快照
        if (processedItems.Any())
        {
            var now = tool.GetTaiwanNow();
            var kpiDataIds = processedItems.Select(p => p.KpiDataId).Distinct().ToList();

            var existingVersions = await _db.KpiReportSnapshots
                .Where(s => kpiDataIds.Contains(s.KpiDataId) && s.Year == year && s.Period == quarter)
                .GroupBy(s => s.KpiDataId)
                .Select(g => new { KpiDataId = g.Key, MaxVersion = g.Max(s => s.Version) })
                .ToDictionaryAsync(x => x.KpiDataId, x => x.MaxVersion);

            foreach (var p in processedItems)
            {
                var currentMax = existingVersions.TryGetValue(p.KpiDataId, out var v) ? v : 0;

                // 若此筆尚無任何快照，且本次是更新（非全新新增），補建退回前的舊值為 v1
                if (currentMax == 0 && preUpdateValues.TryGetValue(p.KpiDataId, out var old))
                {
                    _db.KpiReportSnapshots.Add(new KpiReportSnapshot
                    {
                        KpiDataId           = p.KpiDataId,
                        OrganizationId      = organizationId,
                        Year                = year,
                        Period              = quarter,
                        Value               = old.Value,
                        IsSkipped           = old.IsSkipped,
                        Remarks             = old.Remarks,
                        Version             = 1,
                        SubmittedAt         = old.UpdateAt ?? now,
                        SubmittedByUserId   = null,
                        SubmittedByUserName = "（退回前紀錄）",
                    });
                    currentMax = 1;
                }

                _db.KpiReportSnapshots.Add(new KpiReportSnapshot
                {
                    KpiDataId           = p.KpiDataId,
                    OrganizationId      = organizationId,
                    Year                = year,
                    Period              = quarter,
                    Value               = p.Value,
                    IsSkipped           = p.IsSkipped,
                    Remarks             = p.Remarks,
                    Version             = currentMax + 1,
                    SubmittedAt         = now,
                    SubmittedByUserId   = submittedByUserId,
                    SubmittedByUserName = submittedByUserName,
                });
            }
            await _db.SaveChangesAsync();
        }

        return (inserted, updated, skipped);
    }

    public async Task<byte[]> GenerateKpiReportPdfAsync(int organizationId, int year, string quarter)
    {
        // 1. 查詢組織名稱
        var orgName = await _db.Organizations
            .Where(o => o.Id == organizationId)
            .Select(o => o.Name)
            .FirstOrDefaultAsync() ?? organizationId.ToString();

        // 2. 查詢該期間已核准的 KPI 報告
        var rows = await _db.KpiReports
            .Include(r => r.KpiData)
                .ThenInclude(d => d.DetailItem)
                    .ThenInclude(di => di.KpiDetailItemNames)
            .Include(r => r.KpiData.DetailItem.KpiItem)
                .ThenInclude(i => i.KpiItemNames)
            .Include(r => r.KpiData.DetailItem.KpiItem.KpiField)
            .Where(r =>
                r.Year == year &&
                r.Period == quarter &&
                r.Status == ReportStatus.Finalized &&
                r.KpiData.OrganizationId == organizationId)
            .OrderBy(r => r.KpiData.DetailItem.KpiItem.IndicatorNumber)
            .ToListAsync();

        if (!rows.Any()) return Array.Empty<byte>();

        var approvedAt = rows.Max(r => r.UpdateAt);
        var generatedAt = tool.GetTaiwanNow();
        var totalRows = rows.Count;

        // 3. 建立 PDF（QuestPDF，橫向 A4）
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(20, Unit.Point);
                page.DefaultTextStyle(x => x.FontFamily("KaiU").FontSize(8));

                page.Content().Column(col =>
                {
                    // 標題
                    col.Item()
                        .Text($"{orgName}　{year} 年 {QuarterLabelHelper.GetLabel(quarter)}　KPI 績效指標執行報告")
                        .FontSize(14).Bold();

                    col.Item().PaddingTop(2);

                    // 審核通過時間
                    if (approvedAt.HasValue)
                    {
                        col.Item()
                            .Text($"審核通過時間：{approvedAt.Value:yyyy/MM/dd HH:mm}")
                            .FontSize(7).FontColor(Colors.Grey.Medium);
                        col.Item().PaddingTop(2);
                    }

                    col.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Medium);
                    col.Item().PaddingTop(4);

                    // 表格
                    col.Item().Table(table =>
                    {
                        table.ColumnsDefinition(cols =>
                        {
                            cols.ConstantColumn(36);   // 領域
                            cols.RelativeColumn(3);    // 指標名稱
                            cols.RelativeColumn(3);    // 細項名稱
                            cols.ConstantColumn(30);   // 單位
                            cols.ConstantColumn(52);   // 基線值數據年限
                            cols.ConstantColumn(44);   // 基線值
                            cols.ConstantColumn(44);   // 目標值
                            cols.ConstantColumn(44);   // 執行值
                            cols.RelativeColumn(2);    // 備註
                        });

                        // 表頭
                        table.Header(header =>
                        {
                            string[] headers =
                            {
                                "領域", "指標名稱", "細項名稱",
                                "單位", "基線值數據年限", "基線值", "目標值", "執行值", "備註"
                            };
                            foreach (var h in headers)
                            {
                                header.Cell()
                                    .Background(Colors.Grey.Lighten2)
                                    .Border(0.5f).BorderColor(Colors.Grey.Medium)
                                    .Padding(3)
                                    .Text(h).Bold().FontSize(9);
                            }
                        });

                        // 資料列
                        bool alt = false;
                        foreach (var r in rows)
                        {
                            var d = r.KpiData;
                            var indicatorName = d.DetailItem?.KpiItem?.KpiItemNames
                                .OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "";
                            var detailName = d.DetailItem?.KpiDetailItemNames
                                .OrderByDescending(n => n.StartYear).FirstOrDefault()?.Name ?? "";
                            var field = d.DetailItem?.KpiItem?.KpiField?.field ?? "";
                            var bgColor = alt ? Colors.Blue.Lighten5 : Colors.White;
                            alt = !alt;

                            string[] cells =
                            {
                                field,
                                indicatorName,
                                detailName,
                                d.DetailItem?.Unit ?? "",
                                d.BaselineYear ?? "",
                                d.BaselineValue?.ToString("N2") ?? "-",
                                d.TargetValue?.ToString("N2") ?? "-",
                                r.IsSkipped ? "不適用" : (r.KpiReportValue?.ToString("N2") ?? "-"),
                                r.Remarks ?? ""
                            };

                            foreach (var cell in cells)
                            {
                                table.Cell()
                                    .Background(bgColor)
                                    .Border(0.3f).BorderColor(Colors.Grey.Lighten2)
                                    .Padding(3)
                                    .Text(cell);
                            }
                        }
                    });
                });

                // 頁尾
                page.Footer().Row(row =>
                {
                    row.RelativeItem()
                        .Text($"經濟部產業園區管理局績效指標資料庫 - 資料產製時間：{generatedAt:yyyy/MM/dd HH:mm}　共 {totalRows} 筆")
                        .FontSize(7).FontColor(Colors.Grey.Medium);
                    row.ConstantItem(60).AlignRight().Text(text =>
                    {
                        text.Span("第 ");
                        text.CurrentPageNumber();
                        text.Span(" / ");
                        text.TotalPages();
                        text.Span(" 頁");
                    });
                });
            });
        });

        return document.GeneratePdf();
    }

    private static bool CompareKpiValues(decimal actual, decimal target, string op) => op switch
    {
        ">=" => actual >= target,
        "<=" => actual <= target,
        ">"  => actual > target,
        "<"  => actual < target,
        "="  => actual == target,
        _    => actual >= target,
    };
}
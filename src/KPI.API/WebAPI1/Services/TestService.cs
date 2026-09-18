using ISHAuditAPI.Services;
using Microsoft.EntityFrameworkCore;
using NPOI.SS.UserModel;
using NPOI.XSSF.UserModel;
using WebAPI1.Context;
using WebAPI1.Entities;

namespace WebAPI1.Services;

public interface ITestService
{
    //系統使用者匯入所有資料前顯示使用
    List<KpiimportexcelDto> ParseFullImportExcel(Stream fileStream);
    //系統使用者匯入所有資料使用
    Task<(bool Success, string Message)> BatchFullKpiDataAsync(List<KpiimportexcelDto> rows);
    
}

public class TestService:ITestService
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<TestService> _logger;
    private readonly IOrganizationService _organizationService;
    private static string GetCellString(ICell cell)
    {
        if (cell == null) return string.Empty;

        var text = cell.ToString()?.Trim() ?? string.Empty;
        return text == "-" ? string.Empty : text;
    }
    private bool ConvertYesNoToBool(string? value)
    {
        return value?.Trim() == "是";
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
    
    public TestService(
        ISHAuditDbcontext db,
        ILogger<TestService> logger,
        IOrganizationService organizationService)
    {
        _db = db;
        _logger = logger;
        _organizationService = organizationService;
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
                        new KpiReportDto { Year = 113, Period = "Y", KpiReportValue = GetCellDecimal(row.GetCell(15))}
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
                        (d.ProductionSite ?? "") == productionSite);

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
}
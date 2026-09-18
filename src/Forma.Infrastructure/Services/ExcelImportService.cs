using ClosedXML.Excel;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Supervision.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Infrastructure.Services;

/// <summary>
/// Excel 督導清冊匯入服務
/// 解析 sheet "02. 督導150家業者" 與 "03. 公單位對應表單"
/// </summary>
public class ExcelImportService : IExcelImportService
{
    private readonly IApplicationDbContext _context;

    public ExcelImportService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ImportResult> ImportAsync(Guid campaignId, Stream excelStream, CancellationToken ct = default)
    {
        var result = new ImportResult();

        try
        {
            using var workbook = new XLWorkbook(excelStream);

            // 解析 sheet 3：公單位對應表單（機關名稱 → 表單名稱）
            var agencyFormMap = ParseAgencyFormMap(workbook, result);
            if (result.Errors.Count > 0)
                return result;

            // 驗證所有表單名稱在系統中都存在，並取得 Form Id 對應表
            var formDict = await ResolveFormsAsync(agencyFormMap, result, ct);
            if (result.Errors.Count > 0)
                return result;

            // 解析 sheet 2：督導業者清單
            var factoryRows = ParseFactoryRows(workbook, result);
            if (factoryRows.Count == 0)
            {
                result.Errors.Add("Sheet '02. 督導業者' 無資料或格式不符");
                return result;
            }

            // 確認或建立機關記錄
            var agencyCache = await EnsureAgenciesAsync(agencyFormMap.Keys.ToHashSet(), ct);

            // 刪除舊資料（重新匯入）
            var existingFactories = await _context.SupervisedFactories
                .Where(f => f.CampaignId == campaignId)
                .ToListAsync(ct);

            if (existingFactories.Count > 0)
            {
                _context.SupervisedFactories.RemoveRange(existingFactories);
                await _context.SaveChangesAsync(ct);
                result.Warnings.Add($"已刪除舊資料 {existingFactories.Count} 筆業者，重新匯入");
            }

            // 批次建立業者與督導任務
            int tasksCreated = 0;
            int factoriesImported = 0;

            foreach (var row in factoryRows)
            {
                var factory = new SupervisedFactory
                {
                    Id = Guid.NewGuid(),
                    CampaignId = campaignId,
                    FactoryName = row.FactoryName,
                    FactoryRegistrationNo = string.IsNullOrWhiteSpace(row.FactoryRegistrationNo) ? null : row.FactoryRegistrationNo,
                    IndustrialPark = row.IndustrialPark,
                    Region = row.Region,
                    County = row.County
                };

                _context.SupervisedFactories.Add(factory);
                factoriesImported++;

                // 針對此業者的每個督導機關建立任務
                foreach (var agencyName in row.Agencies)
                {
                    if (!agencyCache.TryGetValue(agencyName, out var agency))
                    {
                        result.Warnings.Add($"業者「{row.FactoryName}」的機關「{agencyName}」未在系統中找到，已略過");
                        continue;
                    }

                    // 取得此機關對應的表單列表
                    var formNames = agencyFormMap.TryGetValue(agencyName, out var names) ? names : new List<string>();

                    if (formNames.Count == 0)
                    {
                        result.Warnings.Add($"機關「{agencyName}」無對應表單設定，已略過");
                        continue;
                    }

                    foreach (var formName in formNames)
                    {
                        if (!formDict.TryGetValue(formName, out var formId))
                            continue; // 已在 ResolveFormsAsync 報錯，不會執行到這裡

                        // 同步更新 AgencyFormType 綁定（確保管理介面一致）
                        var existingBinding = agency.FormTypes
                            .FirstOrDefault(ft => ft.FormTypeName == formName);
                        if (existingBinding == null)
                        {
                            var binding = new AgencyFormType
                            {
                                Id = Guid.NewGuid(),
                                AgencyId = agency.Id,
                                FormTypeName = formName,
                                FormId = formId
                            };
                            _context.AgencyFormTypes.Add(binding);
                            agency.FormTypes.Add(binding); // 避免重複新增
                        }
                        else if (existingBinding.FormId != formId)
                        {
                            existingBinding.FormId = formId;
                        }

                        var task = new SupervisionTask
                        {
                            Id = Guid.NewGuid(),
                            SupervisedFactoryId = factory.Id,
                            AgencyId = agency.Id,
                            FormId = formId,
                            FormTypeName = formName,
                            Status = Forma.Domain.Enums.SupervisionTaskStatus.Pending
                        };

                        _context.SupervisionTasks.Add(task);
                        tasksCreated++;
                    }
                }
            }

            await _context.SaveChangesAsync(ct);

            result.Success = true;
            result.FactoriesImported = factoriesImported;
            result.TasksCreated = tasksCreated;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Errors.Add($"匯入失敗：{ex.Message}");
        }

        return result;
    }

    /// <summary>
    /// 驗證 sheet 3 中所有表單名稱在系統中都存在。
    /// 若有任何名稱找不到對應表單，加入 Errors 並回傳空 dict。
    /// </summary>
    private async Task<Dictionary<string, Guid>> ResolveFormsAsync(
        Dictionary<string, List<string>> agencyFormMap,
        ImportResult result,
        CancellationToken ct)
    {
        var allFormNames = agencyFormMap.Values
            .SelectMany(v => v)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (allFormNames.Count == 0)
            return new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);

        var foundForms = await _context.Forms
            .Where(f => allFormNames.Contains(f.Name))
            .Select(f => new { f.Name, f.Id })
            .ToListAsync(ct);

        var formDict = foundForms.ToDictionary(f => f.Name, f => f.Id, StringComparer.OrdinalIgnoreCase);

        var missing = allFormNames.Where(n => !formDict.ContainsKey(n)).ToList();
        foreach (var name in missing)
            result.Errors.Add($"系統中找不到名稱為「{name}」的表單，請先在系統建立該表單後再匯入");

        return formDict;
    }

    /// <summary>
    /// 解析 sheet 3：公單位對應表單
    /// 回傳 機關名稱 → List&lt;表單名稱&gt;
    /// </summary>
    private static Dictionary<string, List<string>> ParseAgencyFormMap(XLWorkbook workbook, ImportResult result)
    {
        var map = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

        var sheet = workbook.Worksheets
            .FirstOrDefault(ws => ws.Name.Contains("公單位對應"));

        if (sheet == null)
        {
            result.Warnings.Add("找不到 '03. 公單位對應表單' 工作表，將略過機關對應設定");
            return map;
        }

        foreach (var row in sheet.RowsUsed().Skip(1)) // 略過標題
        {
            var agencyName = row.Cell(2).GetString().Trim();
            var formTypeName = row.Cell(3).GetString().Trim();

            if (string.IsNullOrWhiteSpace(agencyName) || string.IsNullOrWhiteSpace(formTypeName))
                continue;

            if (!map.ContainsKey(agencyName))
                map[agencyName] = new List<string>();

            if (!map[agencyName].Contains(formTypeName))
                map[agencyName].Add(formTypeName);
        }

        return map;
    }

    /// <summary>
    /// 解析 sheet 2：督導業者清單
    /// 欄位：業者名稱, 工廠登記編號, 督導年分, 產業園區, 所屬轄區, 縣市, 督導機關
    /// </summary>
    private static List<FactoryImportRow> ParseFactoryRows(XLWorkbook workbook, ImportResult result)
    {
        var rows = new List<FactoryImportRow>();

        var sheet = workbook.Worksheets
            .FirstOrDefault(ws => ws.Name.Contains("督導") && ws.Name.Contains("業者"));

        if (sheet == null)
        {
            result.Errors.Add("找不到 '02. 督導150家業者' 工作表");
            return rows;
        }

        foreach (var row in sheet.RowsUsed().Skip(1)) // 略過標題
        {
            var factoryName = row.Cell(1).GetString().Trim();
            if (string.IsNullOrWhiteSpace(factoryName)) continue;

            var agenciesRaw = row.Cell(7).GetString().Trim();

            // 解析機關列表：格式為 (機關1,機關2,機關3) 或 (機關1，機關2)
            var agencies = ParseAgencyList(agenciesRaw);

            rows.Add(new FactoryImportRow
            {
                FactoryName = factoryName,
                FactoryRegistrationNo = row.Cell(2).GetString().Trim(),
                IndustrialPark = row.Cell(4).GetString().Trim(),
                Region = row.Cell(5).GetString().Trim(),
                County = row.Cell(6).GetString().Trim(),
                Agencies = agencies
            });
        }

        return rows;
    }

    private static List<string> ParseAgencyList(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new List<string>();

        // 移除括號
        raw = raw.TrimStart('(', '（').TrimEnd(')', '）');

        // 以中英文逗號分隔
        return raw
            .Split(new[] { ',', '，' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .ToList();
    }

    /// <summary>
    /// 確保所有機關都存在於資料庫，並載入其 FormTypes
    /// </summary>
    private async Task<Dictionary<string, Agency>> EnsureAgenciesAsync(
        HashSet<string> agencyNames,
        CancellationToken ct)
    {
        var existing = await _context.Agencies
            .Include(a => a.FormTypes)
            .Where(a => agencyNames.Contains(a.Name))
            .ToListAsync(ct);

        var cache = existing.ToDictionary(a => a.Name, StringComparer.OrdinalIgnoreCase);

        // 自動建立不存在的機關
        foreach (var name in agencyNames)
        {
            if (!cache.ContainsKey(name))
            {
                var newAgency = new Agency
                {
                    Id = Guid.NewGuid(),
                    Name = name,
                    IsActive = true
                };
                _context.Agencies.Add(newAgency);
                cache[name] = newAgency;
            }
        }

        await _context.SaveChangesAsync(ct);
        return cache;
    }

    private class FactoryImportRow
    {
        public string FactoryName { get; set; } = string.Empty;
        public string FactoryRegistrationNo { get; set; } = string.Empty;
        public string IndustrialPark { get; set; } = string.Empty;
        public string Region { get; set; } = string.Empty;
        public string County { get; set; } = string.Empty;
        public List<string> Agencies { get; set; } = new();
    }
}

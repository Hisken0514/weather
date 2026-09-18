using ClosedXML.Excel;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.FactoryRisk.DTOs;
using Forma.Domain.Entities;
using Forma.Shared;
using Microsoft.EntityFrameworkCore;

namespace Forma.Infrastructure.Services;

/// <summary>
/// 匯入全台工廠風險原始資料。跟哪一年的政府原生報表長怎樣完全無關——不管是哪一年，
/// 都是同一份固定範本（單一工作表，表頭是欄位名稱），差異只在於後面的「指標欄」有
/// 幾欄、叫什麼名字，完全依表頭文字動態決定，不用改程式。
///
/// 固定欄位（表頭必須完全一致，順序不拘）：<see cref="FixedColumns"/>；
/// 後面接的任何其他表頭欄位，都當成一個指標，表頭文字本身就是這個指標的 CanonicalKey
/// （對應公式管理裡「對應資料欄位」設定的那個值）——這樣不管公式今年指標有幾個、
/// 叫什麼名字，範本只要照著目前的指標名稱填表頭就好，不需要額外的英文代碼。
/// </summary>
public class FactoryRiskImportService : IFactoryRiskImportService
{
    private readonly IApplicationDbContext _context;

    private const string ColFactoryRegNo = "工廠登記編號";
    private const string ColFactoryName = "工廠名稱";
    private const string ColAddress = "地址";
    private const string ColIndustryCategory = "產業類別";
    private const string ColIndustrialPark = "產業園區";
    private const string ColRegion = "轄區";
    private const string ColCounty = "縣市";
    private const string ColChemicalType = "最大危害化學品類型";
    private const string ColSubstanceName = "最大使用量物質名稱";
    private const string ColQuantity = "最大使用量";

    private static readonly HashSet<string> FixedColumns = new()
    {
        ColFactoryRegNo, ColFactoryName, ColAddress, ColIndustryCategory,
        ColIndustrialPark, ColRegion, ColCounty, ColChemicalType, ColSubstanceName, ColQuantity,
    };

    private static readonly string[] RequiredColumns = { ColFactoryName, ColChemicalType, ColQuantity };

    /// <summary>
    /// 「最大危害化學品類型」代碼 1~7 → 名稱。這是固定的公共危險物品六大類＋可燃性
    /// 高壓氣體標準分類（法規定義，不會因為報表年度不同而改變），所以雖然範本欄位
    /// 本身是設計成收「名稱」，這裡仍保留代碼當作相容輸入：填代碼或填名稱都吃。
    /// </summary>
    private static readonly Dictionary<int, string> ChemicalTypeCodeToName = new()
    {
        [1] = "氧化性固體",
        [2] = "易燃固體",
        [3] = "發火性液體、固體及禁水性物質",
        [4] = "易燃液體",
        [5] = "自反應物質及有機過氧化物",
        [6] = "氧化性液體",
        [7] = "可燃性高壓氣體",
    };

    public FactoryRiskImportService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ImportFactoryRiskDataResult> ImportAsync(int dataYear, Stream excelStream, CancellationToken ct = default)
    {
        var errors = new List<string>();
        var missingRegNo = new List<string>();

        using var workbook = new XLWorkbook(excelStream);
        var sheet = workbook.Worksheets.First();

        var headerRow = sheet.RowsUsed().FirstOrDefault()
            ?? throw new InvalidOperationException("找不到表頭列，請確認檔案內容。");

        var columnByHeader = new Dictionary<string, int>();
        foreach (var cell in headerRow.CellsUsed())
        {
            var header = cell.GetString().Trim();
            if (string.IsNullOrWhiteSpace(header)) continue;
            if (!columnByHeader.TryAdd(header, cell.Address.ColumnNumber))
                throw new InvalidOperationException($"表頭欄位「{header}」重複出現，請確認範本內容。");
        }

        var missingRequired = RequiredColumns.Where(c => !columnByHeader.ContainsKey(c)).ToList();
        if (missingRequired.Count > 0)
            throw new InvalidOperationException($"範本缺少必要欄位：{string.Join("、", missingRequired)}。");

        var indicatorColumns = columnByHeader
            .Where(kv => !FixedColumns.Contains(kv.Key))
            .ToList();

        var dataRows = sheet.RowsUsed().Skip(1).ToList();

        // 預先載入既有工廠／既有輸入值，避免每一列都各打好幾次 DB
        var existingFactoriesByRegNo = await _context.RiskAssessedFactories
            .Where(f => f.FactoryRegistrationNo != null)
            .ToDictionaryAsync(f => f.FactoryRegistrationNo!, ct);
        var existingFactoriesByNameOnly = await _context.RiskAssessedFactories
            .Where(f => f.FactoryRegistrationNo == null)
            .ToDictionaryAsync(f => f.FactoryName, ct);
        // 同一年度重新匯入是覆蓋，不同年度各自保留一份快照，所以既有輸入值要用
        // (FactoryId, DataYear) 一起當 key，不能只用 FactoryId（那樣會把其他年度的資料也覆蓋掉）
        var existingInputsByFactoryAndYear = await _context.FactoryRiskInputs
            .Where(i => i.DataYear == dataYear)
            .Include(i => i.IndicatorValues)
            .ToDictionaryAsync(i => i.FactoryId, ct);

        // 哪些 CanonicalKey 空白時要當 0 分匯入，而不是「沒有這筆資料」（e.g. 事故通報件數、
        // 有沒有列入督導名單這種欄位，空白本身就是有意義的資料）。任何一個 Scheme 底下的
        // 指標只要標記了這個設定，匯入時看到這個表頭空白就當 0，不分是套用哪個 Scheme。
        var treatMissingAsZeroKeys = await _context.RiskIndicatorDefinitions
            .Where(i => i.TreatMissingAsZero)
            .Select(i => i.CanonicalKey)
            .Distinct()
            .ToListAsync(ct);
        var treatMissingAsZero = new HashSet<string>(treatMissingAsZeroKeys);

        int totalRows = 0, importedCount = 0;

        string Text(IXLRow row, string header) =>
            columnByHeader.TryGetValue(header, out var col) ? row.Cell(col).GetString().Trim() : "";

        foreach (var row in dataRows)
        {
            var factoryName = Text(row, ColFactoryName);
            if (string.IsNullOrWhiteSpace(factoryName)) continue;
            totalRows++;

            try
            {
                var chemicalTypeName = Text(row, ColChemicalType);
                if (string.IsNullOrWhiteSpace(chemicalTypeName))
                {
                    errors.Add($"工廠「{factoryName}」缺少「{ColChemicalType}」，已略過");
                    continue;
                }
                // 填的是代碼（1~7）就轉成固定的名稱，填名稱就直接用
                if (int.TryParse(chemicalTypeName, out var chemicalTypeCode) &&
                    ChemicalTypeCodeToName.TryGetValue(chemicalTypeCode, out var mappedName))
                {
                    chemicalTypeName = mappedName;
                }

                var quantityValue = ParseDecimal(row.Cell(columnByHeader[ColQuantity]), ColQuantity);
                var substanceName = Text(row, ColSubstanceName);

                // 過了前面會讓整筆略過的檢查，確定這筆會被匯入，才記錄「沒填登記編號」，
                // 避免根本沒匯入成功的列也被列進這份清單、誤導使用者。
                var regNo = Text(row, ColFactoryRegNo);
                if (columnByHeader.ContainsKey(ColFactoryRegNo) && string.IsNullOrWhiteSpace(regNo))
                    missingRegNo.Add(factoryName);
                regNo = string.IsNullOrWhiteSpace(regNo) ? null : FactoryRegistrationNoNormalizer.Normalize(regNo);

                // upsert RiskAssessedFactory：有登記編號用登記編號比對，沒有就用名稱比對
                RiskAssessedFactory? factory = null;
                if (regNo != null)
                    existingFactoriesByRegNo.TryGetValue(regNo, out factory);
                factory ??= existingFactoriesByNameOnly.GetValueOrDefault(factoryName);

                if (factory == null)
                {
                    factory = new RiskAssessedFactory { Id = Guid.NewGuid() };
                    _context.RiskAssessedFactories.Add(factory);
                    if (regNo != null) existingFactoriesByRegNo[regNo] = factory;
                    else existingFactoriesByNameOnly[factoryName] = factory;
                }

                factory.FactoryName = factoryName;
                factory.FactoryRegistrationNo = regNo;
                factory.Address = NullIfBlank(Text(row, ColAddress));
                factory.IndustryCategory = NullIfBlank(Text(row, ColIndustryCategory));
                factory.IndustrialPark = NullIfBlank(Text(row, ColIndustrialPark));
                factory.Region = NullIfBlank(Text(row, ColRegion));
                factory.County = NullIfBlank(Text(row, ColCounty));

                // upsert FactoryRiskInput（同一工廠＋同一資料年度只留一份，重新匯入同一年度是
                // 整份覆蓋；不同年度各自保留，不會互相覆蓋）
                if (existingInputsByFactoryAndYear.TryGetValue(factory.Id, out var existingInput))
                {
                    _context.FactoryIndicatorValues.RemoveRange(existingInput.IndicatorValues);
                    _context.FactoryRiskInputs.Remove(existingInput);
                }

                var riskInput = new FactoryRiskInput
                {
                    Id = Guid.NewGuid(),
                    FactoryId = factory.Id,
                    DataYear = dataYear,
                    MaxHazardChemicalTypeName = chemicalTypeName,
                    MaxHazardQuantity = quantityValue,
                    MaxHazardSubstanceName = string.IsNullOrWhiteSpace(substanceName) ? null : substanceName,
                };
                _context.FactoryRiskInputs.Add(riskInput);
                existingInputsByFactoryAndYear[factory.Id] = riskInput;

                // 指標欄：表頭文字本身就是 CanonicalKey。空白儲存格預設視為「這筆資料沒有
                // 這個指標的值」，不當成錯誤——套用公式時，需要這個指標的標準會把這家工廠
                // 標記資料不完整、不列入排名，而不是擋掉整筆匯入。但如果這個 CanonicalKey
                // 被設定成「缺值視為0」，空白就直接當 0 分寫入（e.g. 事故通報件數沒填代表
                // 沒發生過，而不是沒收集到資料）。
                foreach (var (canonicalKey, colIndex) in indicatorColumns)
                {
                    var cell = row.Cell(colIndex);
                    var isBlank = cell.IsEmpty() || string.IsNullOrWhiteSpace(cell.GetString());
                    if (isBlank && !treatMissingAsZero.Contains(canonicalKey)) continue;

                    var value = isBlank ? 0m : ParseDecimal(cell, canonicalKey);
                    _context.FactoryIndicatorValues.Add(new FactoryIndicatorValue
                    {
                        Id = Guid.NewGuid(),
                        FactoryRiskInputId = riskInput.Id,
                        IndicatorCanonicalKey = canonicalKey,
                        Value = value,
                    });
                }

                importedCount++;
            }
            catch (Exception ex)
            {
                errors.Add($"工廠「{factoryName}」匯入失敗：{ex.Message}");
            }
        }

        await _context.SaveChangesAsync(ct);

        return new ImportFactoryRiskDataResult(totalRows, importedCount, errors, missingRegNo);
    }

    private static string? NullIfBlank(string value) => string.IsNullOrWhiteSpace(value) ? null : value;

    private static decimal ParseDecimal(IXLCell cell, string fieldLabel)
    {
        if (cell.TryGetValue<decimal>(out var value))
            return value;

        var text = cell.GetString().Trim();
        if (decimal.TryParse(text, out var parsed))
            return parsed;

        throw new InvalidOperationException($"「{fieldLabel}」欄位的值「{text}」不是有效的數字。");
    }
}

using Forma.Application.Common.Interfaces;
using Forma.Application.Features.FactoryRisk.DTOs;
using Forma.Application.Features.RiskScoring.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public class FactoryRiskRankingService : IFactoryRiskRankingService
{
    private readonly IApplicationDbContext _context;
    private readonly IRiskCalculationService _calculationService;

    public FactoryRiskRankingService(IApplicationDbContext context, IRiskCalculationService calculationService)
    {
        _context = context;
        _calculationService = calculationService;
    }

    public async Task<FactoryRiskRankingResultDto> GetRankingAsync(Guid schemeId, int? dataYear = null, CancellationToken ct = default)
    {
        var scheme = await _calculationService.LoadSchemeForCalculationAsync(s => s.Id == schemeId, ct)
            ?? throw new KeyNotFoundException($"評分標準 {schemeId} 不存在");

        var resolvedYear = await ResolveDataYearAsync(dataYear, ct);
        if (resolvedYear == null)
            return new FactoryRiskRankingResultDto(new List<FactoryRiskRankingItemDto>(), new List<IncompleteFactoryDto>(), null);

        // 只看指定（或全資料庫最新）資料年度的快照；套用哪個標準是另一件事，跟資料年度分開選
        var riskInputs = await _context.FactoryRiskInputs
            .Where(i => i.DataYear == resolvedYear)
            .Include(i => i.Factory)
            .Include(i => i.IndicatorValues)
            .AsNoTracking()
            .ToListAsync(ct);

        var chemicalTypeIdByName = BuildChemicalTypeIdByName(scheme.ChemicalTypes);
        var yearWideZeroFillKeys = await BuildYearWideZeroFillKeysAsync(scheme.Indicators, resolvedYear.Value, ct);

        // 跟去年度（同一個標準）的排名比較，用來畫「排名上升/下降」箭頭；去年沒有資料
        // 或去年這個標準底下算不出分數，字典裡就不會有這家工廠，前端就不顯示箭頭
        var previousYearRanks = await ComputeRanksByFactoryIdAsync(scheme, resolvedYear.Value - 1, ct);

        var scored = new List<(FactoryRiskInput RiskInput, RiskCalculationResult Result, List<string> ZeroFillNotes)>();
        var incomplete = new List<IncompleteFactoryDto>();

        foreach (var riskInput in riskInputs)
        {
            if (!TryBuildCalculationInput(scheme, riskInput, chemicalTypeIdByName, yearWideZeroFillKeys, out var input, out var missingReason, out var zeroFillNotes))
            {
                incomplete.Add(new IncompleteFactoryDto(riskInput.FactoryId, riskInput.Factory.FactoryName, missingReason!));
                continue;
            }

            RiskCalculationResult result;
            try
            {
                result = RiskCalculationService.Score(scheme, input!);
            }
            catch (InvalidOperationException ex)
            {
                // 標準的分段規則／危害性等級／使用量級距如果不完整，跳過這筆，不讓整個排名掛掉
                incomplete.Add(new IncompleteFactoryDto(riskInput.FactoryId, riskInput.Factory.FactoryName, ex.Message));
                continue;
            }

            scored.Add((riskInput, result, zeroFillNotes));
        }

        var items = scored
            .OrderByDescending(s => s.Result.RiskScore)
            .Select((s, idx) => new FactoryRiskRankingItemDto(
                Rank: idx + 1,
                FactoryId: s.RiskInput.FactoryId,
                FactoryName: s.RiskInput.Factory.FactoryName,
                FactoryRegistrationNo: s.RiskInput.Factory.FactoryRegistrationNo,
                County: s.RiskInput.Factory.County,
                IndustrialPark: s.RiskInput.Factory.IndustrialPark,
                Region: s.RiskInput.Factory.Region,
                IndustryCategory: s.RiskInput.Factory.IndustryCategory,
                RiskScore: s.Result.RiskScore,
                HazardSeverityScore: s.Result.HazardSeverityScore,
                ManagementRiskScore: s.Result.ManagementRiskScore,
                MaxHazardChemicalTypeName: s.RiskInput.MaxHazardChemicalTypeName,
                MaxHazardQuantity: s.RiskInput.MaxHazardQuantity,
                MaxHazardSubstanceName: s.RiskInput.MaxHazardSubstanceName,
                DataYear: s.RiskInput.DataYear,
                ZeroFillNotes: s.ZeroFillNotes,
                PreviousYearRank: previousYearRanks.TryGetValue(s.RiskInput.FactoryId, out var prevRank) ? prevRank : null
            ))
            .ToList();

        return new FactoryRiskRankingResultDto(items, incomplete, resolvedYear);
    }

    /// <summary>
    /// 幫「排名上升/下降」箭頭用的輕量版排名計算：套用指定標準算出指定資料年度的排名，
    /// 只回傳 FactoryId → 名次，資料不完整的工廠一樣被排除、不會出現在字典裡（沒有東西
    /// 可比）。跟 <see cref="GetRankingAsync"/> 的主要計算邏輯是分開的，因為這裡不需要
    /// 工廠名稱、地址這些顯示用欄位，也不需要收集「資料不完整原因」清單。
    /// </summary>
    private async Task<Dictionary<Guid, int>> ComputeRanksByFactoryIdAsync(RiskScoringScheme scheme, int dataYear, CancellationToken ct)
    {
        var riskInputs = await _context.FactoryRiskInputs
            .Where(i => i.DataYear == dataYear)
            .Include(i => i.IndicatorValues)
            .AsNoTracking()
            .ToListAsync(ct);

        if (riskInputs.Count == 0) return new Dictionary<Guid, int>();

        var chemicalTypeIdByName = BuildChemicalTypeIdByName(scheme.ChemicalTypes);
        var yearWideZeroFillKeys = await BuildYearWideZeroFillKeysAsync(scheme.Indicators, dataYear, ct);

        var scored = new List<(Guid FactoryId, int RiskScore)>();
        foreach (var riskInput in riskInputs)
        {
            if (!TryBuildCalculationInput(scheme, riskInput, chemicalTypeIdByName, yearWideZeroFillKeys, out var input, out _, out _))
                continue;

            try
            {
                var result = RiskCalculationService.Score(scheme, input!);
                scored.Add((riskInput.FactoryId, result.RiskScore));
            }
            catch (InvalidOperationException)
            {
                // 標準的分段規則設定不完整，這筆算不出分數，沒有東西可比，跳過
            }
        }

        return scored
            .OrderByDescending(s => s.RiskScore)
            .Select((s, idx) => (s.FactoryId, Rank: idx + 1))
            .ToDictionary(x => x.FactoryId, x => x.Rank);
    }

    /// <summary>取得所有已匯入資料裡出現過的資料年度（distinct，新到舊排序），給前端年度選單用</summary>
    public async Task<List<int>> GetAvailableDataYearsAsync(CancellationToken ct = default)
    {
        return await _context.FactoryRiskInputs
            .Select(i => i.DataYear)
            .Distinct()
            .OrderByDescending(y => y)
            .ToListAsync(ct);
    }

    /// <summary>
    /// 沒有明確指定資料年度時，退回「全資料庫最新的資料年度」——只看最近一輪匯入涵蓋到
    /// 的工廠，舊年度才有、這輪沒有再匯入的工廠不會出現在排名裡。資料庫完全沒有任何
    /// 原始資料時回傳 null。
    /// </summary>
    private async Task<int?> ResolveDataYearAsync(int? dataYear, CancellationToken ct)
    {
        if (dataYear.HasValue) return dataYear;
        return await _context.FactoryRiskInputs.MaxAsync(i => (int?)i.DataYear, ct);
    }

    /// <summary>
    /// 比對「標準設定的對應資料欄位」跟「匯入資料實際存在的欄位」，幫助找出哪個指標／
    /// 化學品類型忘記改對應資料欄位、或範本表頭打錯字，不用再去看後端 log 才能發現。
    /// </summary>
    public async Task<SchemeDataCoverageDto> GetDataCoverageAsync(Guid schemeId, int? dataYear = null, CancellationToken ct = default)
    {
        var scheme = await _calculationService.LoadSchemeForCalculationAsync(s => s.Id == schemeId, ct)
            ?? throw new KeyNotFoundException($"評分標準 {schemeId} 不存在");

        var resolvedYear = await ResolveDataYearAsync(dataYear, ct);
        if (resolvedYear == null)
        {
            return new SchemeDataCoverageDto(
                0,
                scheme.Indicators.OrderBy(i => i.DisplayOrder).Select(i => new IndicatorCoverageDto(i.Name, i.CanonicalKey, 0)).ToList(),
                scheme.ChemicalTypes.OrderBy(c => c.DisplayOrder).Select(c => new ChemicalTypeCoverageDto(c.Name, c.MemberNames, 0)).ToList(),
                new List<UnmatchedDataFieldDto>(),
                new List<UnmatchedDataFieldDto>(),
                null);
        }

        var yearInputs = _context.FactoryRiskInputs.Where(i => i.DataYear == resolvedYear);

        var totalFactories = await yearInputs.CountAsync(ct);

        var valueCountByKey = await _context.FactoryIndicatorValues
            .Where(v => v.FactoryRiskInput.DataYear == resolvedYear)
            .GroupBy(v => v.IndicatorCanonicalKey)
            .Select(g => new { Key = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, ct);

        var typeCountByName = await yearInputs
            .GroupBy(r => r.MaxHazardChemicalTypeName)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Name, x => x.Count, ct);

        var indicatorCoverage = scheme.Indicators
            .OrderBy(i => i.DisplayOrder)
            .Select(i => new IndicatorCoverageDto(i.Name, i.CanonicalKey, valueCountByKey.GetValueOrDefault(i.CanonicalKey, 0)))
            .ToList();

        var chemicalTypeCoverage = scheme.ChemicalTypes
            .OrderBy(c => c.DisplayOrder)
            .Select(c =>
            {
                var names = c.MemberNames.Count > 0 ? c.MemberNames : new List<string> { c.Name };
                var count = names.Sum(n => typeCountByName.GetValueOrDefault(n, 0));
                return new ChemicalTypeCoverageDto(c.Name, names, count);
            })
            .ToList();

        var referencedKeys = scheme.Indicators.Select(i => i.CanonicalKey).ToHashSet();
        var unmatchedIndicatorFields = valueCountByKey
            .Where(kv => !referencedKeys.Contains(kv.Key))
            .Select(kv => new UnmatchedDataFieldDto(kv.Key, kv.Value))
            .OrderByDescending(x => x.FactoryCount)
            .ToList();

        var referencedTypeNames = scheme.ChemicalTypes
            .SelectMany(c => c.MemberNames.Count > 0 ? c.MemberNames : new List<string> { c.Name })
            .ToHashSet();
        var unmatchedChemicalTypeNames = typeCountByName
            .Where(kv => !referencedTypeNames.Contains(kv.Key))
            .Select(kv => new UnmatchedDataFieldDto(kv.Key, kv.Value))
            .OrderByDescending(x => x.FactoryCount)
            .ToList();

        return new SchemeDataCoverageDto(
            totalFactories, indicatorCoverage, chemicalTypeCoverage, unmatchedIndicatorFields, unmatchedChemicalTypeNames, resolvedYear);
    }

    /// <summary>
    /// 單一工廠跨資料年度的風險值走勢。fixedSchemeId 有值時，所有年度都套用同一個標準
    /// （方便用同一把尺比較不同年度）；沒給的話，每個資料年度各自套用「Year 跟這個資料
    /// 年度相同」的標準（沒有對應標準的年度會標記失敗並附原因，不會擋掉其他年度）。
    /// </summary>
    public async Task<FactoryTrendResultDto> GetFactoryTrendAsync(
        Guid factoryId, Guid? fixedSchemeId, CancellationToken ct = default)
    {
        var riskInputs = await _context.FactoryRiskInputs
            .Where(i => i.FactoryId == factoryId)
            .Include(i => i.Factory)
            .Include(i => i.IndicatorValues)
            .AsNoTracking()
            .OrderBy(i => i.DataYear)
            .ToListAsync(ct);

        if (riskInputs.Count == 0)
            throw new KeyNotFoundException($"找不到工廠 {factoryId} 的原始資料");

        var factoryName = riskInputs[0].Factory.FactoryName;

        RiskScoringScheme? fixedScheme = null;
        if (fixedSchemeId.HasValue)
        {
            fixedScheme = await _calculationService.LoadSchemeForCalculationAsync(s => s.Id == fixedSchemeId.Value, ct)
                ?? throw new KeyNotFoundException($"評分標準 {fixedSchemeId} 不存在");
        }

        // 「每年度套用自己那年的公式」模式：先找出每個 Year 該用哪個標準（同年度有多個標準
        // 時優先選生效中的、其次選最新建立的），要用到的才載入完整內容，避免不必要的查詢
        Dictionary<int, RiskScoringScheme>? schemesByYear = null;
        if (fixedScheme == null)
        {
            var neededYears = riskInputs.Select(i => i.DataYear).Distinct().ToHashSet();
            var candidates = await _context.RiskScoringSchemes
                .Where(s => neededYears.Contains(s.Year))
                .Select(s => new { s.Id, s.Year, s.IsActive, s.CreatedAt })
                .ToListAsync(ct);
            var bestIdByYear = candidates
                .GroupBy(s => s.Year)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.IsActive).ThenByDescending(s => s.CreatedAt).First().Id);

            schemesByYear = new Dictionary<int, RiskScoringScheme>();
            foreach (var (year, schemeId) in bestIdByYear)
            {
                var loaded = await _calculationService.LoadSchemeForCalculationAsync(s => s.Id == schemeId, ct);
                if (loaded != null) schemesByYear[year] = loaded;
            }
        }

        var points = new List<FactoryTrendPointDto>();
        foreach (var riskInput in riskInputs)
        {
            var schemeToApply = fixedScheme;
            if (schemeToApply == null && !schemesByYear!.TryGetValue(riskInput.DataYear, out schemeToApply))
            {
                points.Add(new FactoryTrendPointDto(
                    riskInput.DataYear, false, null, null, null, null, null,
                    $"找不到資料年度 {riskInput.DataYear} 對應的評分標準", new List<string>()));
                continue;
            }

            var chemicalTypeIdByName = BuildChemicalTypeIdByName(schemeToApply.ChemicalTypes);
            var yearWideZeroFillKeys = await BuildYearWideZeroFillKeysAsync(schemeToApply.Indicators, riskInput.DataYear, ct);
            if (!TryBuildCalculationInput(schemeToApply, riskInput, chemicalTypeIdByName, yearWideZeroFillKeys, out var input, out var missingReason, out var zeroFillNotes))
            {
                points.Add(new FactoryTrendPointDto(
                    riskInput.DataYear, false, null, null, null, schemeToApply.Id, schemeToApply.Year, missingReason, new List<string>()));
                continue;
            }

            try
            {
                var result = RiskCalculationService.Score(schemeToApply, input!);
                points.Add(new FactoryTrendPointDto(
                    riskInput.DataYear, true, result.RiskScore, result.HazardSeverityScore, result.ManagementRiskScore,
                    schemeToApply.Id, schemeToApply.Year, null, zeroFillNotes));
            }
            catch (InvalidOperationException ex)
            {
                points.Add(new FactoryTrendPointDto(
                    riskInput.DataYear, false, null, null, null, schemeToApply.Id, schemeToApply.Year, ex.Message, new List<string>()));
            }
        }

        return new FactoryTrendResultDto(factoryId, factoryName, points);
    }

    /// <summary>
    /// 每個化學品類型「有效對應的政府原始分類名稱」：有勾選 MemberNames（e.g. 115年把
    /// 「易燃固體」「易燃液體」合併成同一筆）就用那些名稱都指向同一個 Id；沒勾選（預設，
    /// 沒合併過的類型）就直接用自己的 Name 比對。
    /// </summary>
    private static Dictionary<string, Guid> BuildChemicalTypeIdByName(IEnumerable<HazardChemicalTypeDefinition> chemicalTypes)
    {
        var result = new Dictionary<string, Guid>();
        foreach (var c in chemicalTypes)
        {
            var names = c.MemberNames.Count > 0 ? c.MemberNames : new List<string> { c.Name };
            foreach (var name in names)
                result[name] = c.Id;
        }
        return result;
    }

    /// <summary>
    /// 找出這個資料年度裡，哪些「有勾缺失值視為0」的指標，全資料庫這個年度完全沒有任何
    /// 一筆值——代表這個指標對這個年度來說是結構性沒收集（e.g. 114年的匯入範本根本沒有
    /// 「近三年職業災害件數」這一欄），不是個別工廠自己漏填。這種情況套公式時全部工廠統一
    /// 補0計算；如果只是同年度裡「有些工廠有值、這家沒有」，則不在這個清單裡，維持原本
    /// 「資料不完整」被排除的邏輯，不會被誤補0。
    /// </summary>
    private async Task<HashSet<string>> BuildYearWideZeroFillKeysAsync(
        IEnumerable<RiskIndicatorDefinition> indicators, int dataYear, CancellationToken ct)
    {
        var candidateKeys = indicators.Where(i => i.TreatMissingAsZero).Select(i => i.CanonicalKey).ToHashSet();
        if (candidateKeys.Count == 0) return candidateKeys;

        var existingKeys = await _context.FactoryIndicatorValues
            .Where(v => v.FactoryRiskInput.DataYear == dataYear && candidateKeys.Contains(v.IndicatorCanonicalKey))
            .Select(v => v.IndicatorCanonicalKey)
            .Distinct()
            .ToListAsync(ct);

        candidateKeys.ExceptWith(existingKeys);
        return candidateKeys;
    }

    /// <summary>
    /// 把一筆跟年度／標準無關的原始輸入資料，依 CanonicalKey／化學品類型名稱比對出
    /// 目前這個 Scheme 專屬的指標／類型 Id，翻譯成可以直接丟給
    /// <see cref="RiskCalculationService.Score"/> 的輸入。
    /// 只要有任何一個指標、或化學品類型名稱在這個 Scheme 裡找不到對應（e.g. 公式今年
    /// 新增了當初匯入資料時還沒有的指標），就視為資料不完整回傳 false——這筆資料不會
    /// 當 0 分計算，而是直接不列入這個 Scheme 的排名（並在回傳結果附上原因）。例外是
    /// <paramref name="yearWideZeroFillKeys"/> 裡的指標：這個資料年度整年度都沒收集，
    /// 就統一補0計算，並附上附註說明是補0而非真實數值。
    /// </summary>
    private static bool TryBuildCalculationInput(
        RiskScoringScheme scheme,
        FactoryRiskInput riskInput,
        Dictionary<string, Guid> chemicalTypeIdByName,
        HashSet<string> yearWideZeroFillKeys,
        out RiskCalculationInput? input,
        out string? missingReason,
        out List<string> zeroFillNotes)
    {
        input = null;
        zeroFillNotes = new List<string>();

        if (!chemicalTypeIdByName.TryGetValue(riskInput.MaxHazardChemicalTypeName, out var chemicalTypeId))
        {
            missingReason = $"標準「{scheme.Name}」缺少化學品類型「{riskInput.MaxHazardChemicalTypeName}」的設定";
            return false;
        }

        var valuesByCanonicalKey = riskInput.IndicatorValues.ToDictionary(v => v.IndicatorCanonicalKey, v => v.Value);
        var indicatorValues = new List<IndicatorValueInput>();
        foreach (var indicator in scheme.Indicators)
        {
            if (!valuesByCanonicalKey.TryGetValue(indicator.CanonicalKey, out var value))
            {
                if (!yearWideZeroFillKeys.Contains(indicator.CanonicalKey))
                {
                    missingReason = $"缺少指標「{indicator.Name}」（對應資料欄位「{indicator.CanonicalKey}」）的資料";
                    return false;
                }
                value = 0;
                zeroFillNotes.Add($"指標「{indicator.Name}」本資料年度未收集，已視為0計算");
            }
            indicatorValues.Add(new IndicatorValueInput(indicator.Id, value));
        }

        input = new RiskCalculationInput(indicatorValues, chemicalTypeId, riskInput.MaxHazardQuantity);
        missingReason = null;
        return true;
    }
}

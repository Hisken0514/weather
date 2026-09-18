using Forma.Application.Common.Interfaces;
using Forma.Application.Features.RiskScoring.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public class RiskCalculationService : IRiskCalculationService
{
    private readonly IApplicationDbContext _context;

    public RiskCalculationService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RiskCalculationResult> CalculateAsync(
        RiskCalculationInput input,
        Guid? schemeId = null,
        CancellationToken ct = default)
    {
        var scheme = schemeId.HasValue
            ? await LoadSchemeForCalculationAsync(s => s.Id == schemeId.Value, ct)
                ?? throw new KeyNotFoundException($"評分標準 {schemeId} 不存在")
            : await LoadSchemeForCalculationAsync(s => s.IsActive, ct)
                ?? throw new InvalidOperationException("目前沒有生效的風險評分標準，請先至後台設定。");

        return Score(scheme, input);
    }

    /// <summary>
    /// 載入計算用的標準（含 Indicators/ChemicalTypes/Bands/HazardTypeLevels/QuantityThresholds）。
    /// 對「同一份標準」批次計算很多筆資料的呼叫端（例如全台工廠風險排名）可以只呼叫這裡一次，
    /// 拿到載入好的標準後重複呼叫 <see cref="Score"/>，不用每算一筆就重新打一次 DB。
    /// </summary>
    public async Task<RiskScoringScheme?> LoadSchemeForCalculationAsync(
        System.Linq.Expressions.Expression<Func<RiskScoringScheme, bool>> predicate,
        CancellationToken ct = default)
    {
        return await _context.RiskScoringSchemes
            .Include(s => s.Indicators)
            .Include(s => s.ChemicalTypes)
            .Include(s => s.Bands)
            .Include(s => s.HazardTypeLevels)
            .Include(s => s.QuantityThresholds)
            .AsNoTracking()
            .FirstOrDefaultAsync(predicate, ct);
    }

    /// <summary>
    /// 對一份已經載入好的標準計分，純運算、不碰 DB。
    /// </summary>
    public static RiskCalculationResult Score(RiskScoringScheme scheme, RiskCalculationInput input)
    {
        var bands = scheme.Bands.ToList();
        var valuesByIndicator = input.IndicatorValues.ToDictionary(v => v.IndicatorId, v => v.Value);

        // ── 依指標清單逐一計分，依 Category 累加進嚴重度／機率小計 ──────────────
        var indicatorScores = new List<IndicatorScoreDetail>();
        var hazardSeverity = 0;
        var managementRisk = 0;

        foreach (var indicator in scheme.Indicators.OrderBy(i => i.DisplayOrder))
        {
            if (!valuesByIndicator.TryGetValue(indicator.Id, out var value))
                throw new InvalidOperationException($"缺少指標「{indicator.Name}」的輸入值。");

            var score = LookupBand(bands, indicator, value);
            indicatorScores.Add(new IndicatorScoreDetail(indicator.Id, indicator.Name, indicator.Category, value, score, indicator.Weight));

            var weightedScore = score * indicator.Weight;
            if (indicator.Category == RiskIndicatorCategory.Severity)
                hazardSeverity += weightedScore;
            else
                managementRisk += weightedScore;
        }

        // ── 危害嚴重度矩陣：危害性等級 × 使用量級距 × 矩陣權重（結構固定，永遠併入嚴重度）─
        var hazardLevel = GetHazardLevel(scheme, input.MaxHazardChemicalTypeId);
        var quantityLevel = GetQuantityLevel(scheme, input.MaxHazardChemicalTypeId, input.MaxHazardQuantity);
        var matrixScore = hazardLevel * quantityLevel;
        hazardSeverity += matrixScore * scheme.HazardQuantityMatrixWeight;

        return new RiskCalculationResult(
            RiskScore:                  hazardSeverity * managementRisk,
            HazardSeverityScore:        hazardSeverity,
            ManagementRiskScore:        managementRisk,
            IndicatorScores:            indicatorScores,
            HazardQuantityMatrixScore:  matrixScore,
            HazardQuantityMatrixWeight: scheme.HazardQuantityMatrixWeight,
            HazardLevel:                hazardLevel,
            QuantityLevel:              quantityLevel,
            SchemeId:                   scheme.Id,
            SchemeYear:                 scheme.Year
        );
    }

    // ─── 查分段計分規則 ──────────────────────────────────────────────────────

    private static int LookupBand(
        IEnumerable<RiskScoringBand> bands,
        RiskIndicatorDefinition indicator,
        decimal value)
    {
        var match = bands
            .Where(b => b.IndicatorId == indicator.Id)
            .FirstOrDefault(b =>
                (b.MinValue == null || value >= b.MinValue) &&
                (b.MaxValue == null || value <= b.MaxValue));

        if (match == null)
            throw new InvalidOperationException(
                $"找不到指標「{indicator.Name}」、數值 {value} 對應的計分規則，請確認評分標準設定是否完整。");

        return match.Score;
    }

    // ─── 查危害性等級 ────────────────────────────────────────────────────────

    private static int GetHazardLevel(RiskScoringScheme scheme, Guid chemicalTypeId)
    {
        var chemicalType = scheme.ChemicalTypes.FirstOrDefault(c => c.Id == chemicalTypeId)
            ?? throw new InvalidOperationException($"找不到 Id 為 {chemicalTypeId} 的化學品類型設定。");

        var entry = scheme.HazardTypeLevels.FirstOrDefault(h => h.ChemicalTypeId == chemicalTypeId)
            ?? throw new InvalidOperationException(
                $"找不到化學品類型「{chemicalType.Name}」的危害性等級設定，請確認評分標準設定是否完整。");

        return entry.HazardLevel;
    }

    // ─── 查使用量級距 ────────────────────────────────────────────────────────

    private static int GetQuantityLevel(
        RiskScoringScheme scheme,
        Guid chemicalTypeId,
        decimal quantity)
    {
        var chemicalType = scheme.ChemicalTypes.FirstOrDefault(c => c.Id == chemicalTypeId)
            ?? throw new InvalidOperationException($"找不到 Id 為 {chemicalTypeId} 的化學品類型設定。");

        // 級距只用四捨五入到整數的使用量判斷（e.g. 532000.4 進位後看 532000 落在哪個級距），
        // 但存進資料庫、顯示給使用者看的還是原始未進位的數值，不受影響
        var roundedQuantity = Math.Round(quantity, 0, MidpointRounding.AwayFromZero);

        var match = scheme.QuantityThresholds
            .Where(q => q.ChemicalTypeId == chemicalTypeId)
            .FirstOrDefault(q =>
                roundedQuantity >= q.MinQuantity &&
                (q.MaxQuantity == null || roundedQuantity <= q.MaxQuantity));

        if (match == null)
            throw new InvalidOperationException(
                $"找不到化學品類型「{chemicalType.Name}」、使用量 {roundedQuantity}（原始值 {quantity}）對應的級距設定，請確認評分標準設定是否完整。");

        return match.Level;
    }
}

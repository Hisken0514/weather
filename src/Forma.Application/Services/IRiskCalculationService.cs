using Forma.Application.Features.RiskScoring.DTOs;
using Forma.Domain.Entities;

namespace Forma.Application.Services;

public interface IRiskCalculationService
{
    /// <summary>
    /// 使用指定標準（或目前生效的標準）計算風險值。
    /// </summary>
    Task<RiskCalculationResult> CalculateAsync(
        RiskCalculationInput input,
        Guid? schemeId = null,
        CancellationToken ct = default);

    /// <summary>
    /// 載入計算用的標準（含完整指標／化學品類型／分段規則）。批次計算多筆資料時
    /// （例如全台工廠風險排名）只需呼叫一次，重複用同一份標準呼叫 <see cref="Score"/>。
    /// </summary>
    Task<RiskScoringScheme?> LoadSchemeForCalculationAsync(
        System.Linq.Expressions.Expression<Func<RiskScoringScheme, bool>> predicate,
        CancellationToken ct = default);
}

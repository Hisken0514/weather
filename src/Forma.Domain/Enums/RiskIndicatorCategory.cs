namespace Forma.Domain.Enums;

/// <summary>
/// 指標所屬分類：決定該指標的計分要併入「危害嚴重度」還是「危害發生機率」小計。
/// </summary>
public enum RiskIndicatorCategory
{
    /// <summary>危害嚴重度（基礎風險）</summary>
    Severity = 0,

    /// <summary>危害發生機率（管理風險）</summary>
    Probability = 1,
}

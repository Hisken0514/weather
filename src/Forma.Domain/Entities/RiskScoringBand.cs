namespace Forma.Domain.Entities;

/// <summary>
/// 風險指標分段計分規則。
/// 對應表 2（百分位數）、表 3（類型數）、表 4（中位數）的計分邏輯。
/// 指標四（使用量×類型）的矩陣由 HazardTypeLevel + QuantityThreshold 另行處理。
/// </summary>
public class RiskScoringBand : BaseEntity
{
    public Guid SchemeId { get; set; }

    /// <summary>對應的指標定義</summary>
    public Guid IndicatorId { get; set; }

    /// <summary>此分段的最小值（含），null 表示無下限</summary>
    public decimal? MinValue { get; set; }

    /// <summary>此分段的最大值（含），null 表示無上限</summary>
    public decimal? MaxValue { get; set; }

    /// <summary>此分段對應的分數</summary>
    public int Score { get; set; }

    /// <summary>
    /// 選填標籤：離散型指標（MinValue == MaxValue）用來顯示友善名稱（e.g. 均已改善），
    /// 讓試算表單能渲染成下拉選單而不是裸數字輸入框。
    /// </summary>
    public string? Label { get; set; }

    // Navigation Properties
    public virtual RiskScoringScheme Scheme { get; set; } = null!;
    public virtual RiskIndicatorDefinition Indicator { get; set; } = null!;
}

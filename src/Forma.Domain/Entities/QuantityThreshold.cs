namespace Forma.Domain.Entities;

/// <summary>
/// 各危品類型的使用量級距設定（對應表 7）。
/// 因不同類型化學品的危害門檻不同，每種類型各自設定 1~5 級的數量範圍。
/// </summary>
public class QuantityThreshold : BaseEntity
{
    public Guid SchemeId { get; set; }

    /// <summary>對應的化學品類型定義</summary>
    public Guid ChemicalTypeId { get; set; }

    /// <summary>使用量級距（1~5）</summary>
    public int Level { get; set; }

    /// <summary>最小使用量（公升/公斤，含）</summary>
    public decimal MinQuantity { get; set; }

    /// <summary>最大使用量（公升/公斤，含），null 表示無上限</summary>
    public decimal? MaxQuantity { get; set; }

    // Navigation Properties
    public virtual RiskScoringScheme Scheme { get; set; } = null!;
    public virtual HazardChemicalTypeDefinition ChemicalType { get; set; } = null!;
}

namespace Forma.Domain.Entities;

/// <summary>
/// 危品類型危害性等級設定（對應表 6）。
/// 定義每種化學品類型在此年度標準下的危害性等級（1~5）。
/// </summary>
public class HazardTypeLevel : BaseEntity
{
    public Guid SchemeId { get; set; }

    /// <summary>對應的化學品類型定義</summary>
    public Guid ChemicalTypeId { get; set; }

    /// <summary>危害性等級（1~5，5 為最高）</summary>
    public int HazardLevel { get; set; }

    // Navigation Properties
    public virtual RiskScoringScheme Scheme { get; set; } = null!;
    public virtual HazardChemicalTypeDefinition ChemicalType { get; set; } = null!;
}

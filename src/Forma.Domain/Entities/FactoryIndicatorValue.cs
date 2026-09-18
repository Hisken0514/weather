namespace Forma.Domain.Entities;

/// <summary>
/// FactoryRiskInput 底下、某一個指標的原始輸入值（e.g. 工廠年齡 = 35）。
/// 用 IndicatorCanonicalKey（穩定識別碼）而不是某個 Scheme 專屬指標的 Id 去標記這是
/// 哪一個指標，套用公式時依 CanonicalKey 去該公式自己的指標清單裡找對應設定，跟匯入
/// 當下用的是哪一年度的公式無關。
/// </summary>
public class FactoryIndicatorValue : BaseEntity
{
    public Guid FactoryRiskInputId { get; set; }

    public string IndicatorCanonicalKey { get; set; } = string.Empty;

    public decimal Value { get; set; }

    // Navigation Properties
    public virtual FactoryRiskInput FactoryRiskInput { get; set; } = null!;
}

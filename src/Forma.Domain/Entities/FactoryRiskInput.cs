namespace Forma.Domain.Entities;

/// <summary>
/// 一家工廠、某一個資料年度的一份風險計算原始輸入值（匯入自歷史資料）。
/// 存起來的是「原始輸入值」而不是算好的分數，也不綁定任何特定年度的評分標準：
/// 套用哪一年的公式是排名當下才決定的，可以套用不同年度的公式重新計算，
/// 不需要每年重新匯入。指標值／化學品類型都用穩定的識別碼（CanonicalKey／Name）
/// 對應到目標公式的設定，公式的欄位有增減都能處理（詳見 FactoryIndicatorValue）。
///
/// 同一家工廠可以有「多個年度」各自一份快照（e.g. 114年匯入一份、115年再匯入一份，
/// 兩份都保留，同一個 FactoryId + DataYear 重新匯入才是覆蓋）。全台工廠風險排名預設
/// 只看「全資料庫最新資料年度」有資料的工廠，趨勢圖則是看單一工廠跨年度的所有快照。
/// </summary>
public class FactoryRiskInput : BaseEntity
{
    public Guid FactoryId { get; set; }

    /// <summary>這份原始資料代表哪一個資料年度（民國年，e.g. 114、115），跟評分標準的年度是兩件事</summary>
    public int DataYear { get; set; }

    /// <summary>
    /// 最大危害化學品類型名稱（e.g. 易燃液體）。存名稱字串而不是某個 Scheme 專屬的
    /// 化學品類型 Id，套用公式時依名稱去該公式自己的化學品類型清單裡找對應設定。
    /// </summary>
    public string MaxHazardChemicalTypeName { get; set; } = string.Empty;

    /// <summary>最大危害化學品使用量（危害嚴重度矩陣：類型 × 使用量的「使用量」輸入）</summary>
    public decimal MaxHazardQuantity { get; set; }

    /// <summary>
    /// 最大危害化學品的實際物質名稱（e.g. 苯(裂解汽油)），純文字紀錄、不參與計算，
    /// 供事後追溯這筆最大使用量具體是哪一個化學物質。
    /// </summary>
    public string? MaxHazardSubstanceName { get; set; }

    // Navigation Properties
    public virtual RiskAssessedFactory Factory { get; set; } = null!;
    public virtual ICollection<FactoryIndicatorValue> IndicatorValues { get; set; } = new List<FactoryIndicatorValue>();
}

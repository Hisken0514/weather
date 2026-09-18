namespace Forma.Domain.Entities;

/// <summary>
/// 年度標準自訂的危險化學品類型（取代原本寫死的 HazardChemicalType enum）。
/// 每個 RiskScoringScheme 各自擁有一份獨立的類型清單，可自由新增／刪除／改名。
/// </summary>
public class HazardChemicalTypeDefinition : BaseEntity
{
    public Guid SchemeId { get; set; }

    /// <summary>化學品類型名稱（e.g. 易燃固體，或合併後的自訂名稱如「易燃固體／易燃液體」）</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 這個類型對應哪些政府原始分類名稱（e.g. 匯入資料裡「工危品最大使用量之種類」代碼轉出
    /// 來的固定7類名稱）。有些年度會把多個政府分類合併成同一個危害性等級／使用量級距
    /// （e.g. 115年把「易燃固體」「易燃液體」合併成一筆），這裡就對應到同一個
    /// HazardChemicalTypeDefinition，套用公式時兩個原始名稱都能找到這筆設定。
    /// 空清單（預設）代表沒有特別合併，直接用 Name 本身比對，不需要額外設定。
    /// </summary>
    public List<string> MemberNames { get; set; } = new();

    /// <summary>顯示順序</summary>
    public int DisplayOrder { get; set; }

    // Navigation Properties
    public virtual RiskScoringScheme Scheme { get; set; } = null!;
}

using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 年度標準自訂的風險評分指標（取代原本寫死的 RiskIndicator enum）。
/// 每個 RiskScoringScheme 各自擁有一份獨立的指標清單，可自由新增／刪除／改名。
/// </summary>
public class RiskIndicatorDefinition : BaseEntity
{
    public Guid SchemeId { get; set; }

    /// <summary>指標名稱（e.g. 工廠年齡（年）），可跨年度改名，顯示用</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 對應資料欄位的穩定識別碼（e.g. "factory_age"）。跟顯示用的 Name 脫鉤：
    /// 114年的「工廠年齡」跟115年的「廠齡」名稱可以不同，但只要 CanonicalKey
    /// 一樣，全台工廠風險排名就能把同一批匯入資料套用到不同年度的公式上，
    /// 不需要每年重新匯入。同一個 Scheme 底下必須唯一。
    /// </summary>
    public string CanonicalKey { get; set; } = string.Empty;

    /// <summary>計分要併入危害嚴重度還是危害發生機率小計</summary>
    public RiskIndicatorCategory Category { get; set; }

    /// <summary>選填說明文字，顯示於試算表單的欄位提示（e.g. 離散型指標的數值對照說明）</summary>
    public string? Description { get; set; }

    /// <summary>
    /// 權重：計分時併入嚴重度／機率小計前，該指標分段分數要乘上的倍數，預設 1（不影響原始分數）。
    /// 讓不同年度可以各自表達「指標分數要不要加權」而不用把倍數手動乘進分段分數裡。
    /// </summary>
    public int Weight { get; set; } = 1;

    /// <summary>顯示順序</summary>
    public int DisplayOrder { get; set; }

    /// <summary>
    /// 匯入資料時，這個指標的儲存格是空白，要不要當成 0 分（而不是「沒有這筆資料」）。
    /// 預設 false：空白 = 缺值，套用需要這個指標的公式時該工廠會被標記資料不完整、
    /// 不列入排名。像「近三年事故通報件數」「有沒有列入督導名單」這種欄位，空白其實
    /// 是有意義的資料（沒發生過事故／沒被列入名單），該設成 true，空白就直接當 0 分匯入。
    /// </summary>
    public bool TreatMissingAsZero { get; set; }

    // Navigation Properties
    public virtual RiskScoringScheme Scheme { get; set; } = null!;
}

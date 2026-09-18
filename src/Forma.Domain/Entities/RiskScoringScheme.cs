namespace Forma.Domain.Entities;

/// <summary>
/// 年度風險評分標準（每年可獨立設定一套，IsActive 控制哪套生效）
/// </summary>
public class RiskScoringScheme : AuditableEntity
{
    /// <summary>民國年度（e.g. 115）</summary>
    public int Year { get; set; }

    /// <summary>標準名稱（e.g. 115年危險品風險評分標準）</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>是否為目前生效的標準</summary>
    public bool IsActive { get; set; }

    /// <summary>建立者 ID</summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// 危害嚴重度矩陣（危害性等級 × 使用量級距）併入嚴重度小計前要乘的權重，預設 1。
    /// e.g. 114 年公式「最大使用量之類型及使用量×4」：矩陣分數 = 危害性等級 × 使用量級距 × 4。
    /// </summary>
    public int HazardQuantityMatrixWeight { get; set; } = 1;

    // Navigation Properties
    public virtual User CreatedBy { get; set; } = null!;
    public virtual ICollection<RiskIndicatorDefinition> Indicators { get; set; } = new List<RiskIndicatorDefinition>();
    public virtual ICollection<HazardChemicalTypeDefinition> ChemicalTypes { get; set; } = new List<HazardChemicalTypeDefinition>();
    public virtual ICollection<RiskScoringBand> Bands { get; set; } = new List<RiskScoringBand>();
    public virtual ICollection<HazardTypeLevel> HazardTypeLevels { get; set; } = new List<HazardTypeLevel>();
    public virtual ICollection<QuantityThreshold> QuantityThresholds { get; set; } = new List<QuantityThreshold>();
}

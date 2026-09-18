using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WebAPI1.Entities;

/// <summary>
/// 一次政策修訂計畫（例如「113年環保署函釋修訂空污指標」），底下可以掛多筆指標細項對照。
/// </summary>
public class KpiDetailItemMappingGroup
{
    [Key]
    public int Id { get; set; }

    [StringLength(200)]
    public string Name { get; set; }

    /// <summary>
    /// 這次修訂從哪一年開始生效
    /// </summary>
    public int EffectiveYear { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }

    public string CreatedByEmail { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual ICollection<KpiDetailItemMapping> Mappings { get; set; } = new List<KpiDetailItemMapping>();
}

/// <summary>
/// 記錄「因政策調整而更名/換單位」前後兩個指標其實是同一件事的人工對照。
/// 一定要指定舊/新指標項目（KpiItem）；指標細項（KpiDetailItem）可以留空，
/// 留空代表「這個指標項目底下的全部細項」，查詢時會用名稱在新指標項目底下自動找對應細項。
/// 若指定了細項，就是針對那一筆細項的精確對照，優先於「全部細項」規則。
/// </summary>
public class KpiDetailItemMapping
{
    [Key]
    public int Id { get; set; }

    public int GroupId { get; set; }
    [ForeignKey("GroupId")]
    public virtual KpiDetailItemMappingGroup Group { get; set; }

    public int OldKpiItemId { get; set; }
    [ForeignKey("OldKpiItemId")]
    public virtual KpiItem OldKpiItem { get; set; }

    public int NewKpiItemId { get; set; }
    [ForeignKey("NewKpiItemId")]
    public virtual KpiItem NewKpiItem { get; set; }

    /// <summary>
    /// 留空 = 不限定特定細項，涵蓋 OldKpiItemId 底下全部細項
    /// </summary>
    public int? OldDetailItemId { get; set; }
    [ForeignKey("OldDetailItemId")]
    public virtual KpiDetailItem? OldDetailItem { get; set; }

    /// <summary>
    /// 留空 = 不限定特定細項，查詢時用名稱在 NewKpiItemId 底下自動找對應細項
    /// </summary>
    public int? NewDetailItemId { get; set; }
    [ForeignKey("NewDetailItemId")]
    public virtual KpiDetailItem? NewDetailItem { get; set; }
}

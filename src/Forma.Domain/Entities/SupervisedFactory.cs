namespace Forma.Domain.Entities;

/// <summary>
/// 被督導業者（來自年度清冊）
/// </summary>
public class SupervisedFactory : BaseEntity
{
    /// <summary>
    /// 所屬年度督導計畫 ID
    /// </summary>
    public Guid CampaignId { get; set; }

    /// <summary>
    /// 風險排序
    /// </summary>
    public int? RiskRank { get; set; }

    /// <summary>
    /// 工廠登記編號
    /// </summary>
    public string? FactoryRegistrationNo { get; set; }

    /// <summary>
    /// 工廠名稱
    /// </summary>
    public string FactoryName { get; set; } = string.Empty;

    /// <summary>
    /// 工廠地址
    /// </summary>
    public string? FactoryAddress { get; set; }

    /// <summary>
    /// 產業類別
    /// </summary>
    public string? IndustryCategory { get; set; }

    /// <summary>
    /// 產業園區
    /// </summary>
    public string? IndustrialPark { get; set; }

    /// <summary>
    /// 所屬轄區
    /// </summary>
    public string? Region { get; set; }

    /// <summary>
    /// 工廠所在縣市
    /// </summary>
    public string? County { get; set; }

    // Navigation Properties
    public virtual SupervisionCampaign Campaign { get; set; } = null!;
    public virtual ICollection<SupervisionTask> Tasks { get; set; } = new List<SupervisionTask>();
}

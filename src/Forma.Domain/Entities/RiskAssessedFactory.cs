namespace Forma.Domain.Entities;

/// <summary>
/// 全台工廠風險排名清單裡的一家工廠。獨立於督導計畫（SupervisedFactory）之外，
/// 用來承接「歷史資料匯入 → 套用評分標準公式 → 算風險排名」這條流程。
/// </summary>
public class RiskAssessedFactory : BaseEntity
{
    /// <summary>工廠登記編號（跨年度比對同一家工廠的依據，可能為 null）</summary>
    public string? FactoryRegistrationNo { get; set; }

    /// <summary>工廠名稱</summary>
    public string FactoryName { get; set; } = string.Empty;

    /// <summary>工廠地址</summary>
    public string? Address { get; set; }

    /// <summary>產業類別</summary>
    public string? IndustryCategory { get; set; }

    /// <summary>產業園區</summary>
    public string? IndustrialPark { get; set; }

    /// <summary>所屬轄區</summary>
    public string? Region { get; set; }

    /// <summary>縣市</summary>
    public string? County { get; set; }

    // Navigation Properties
    public virtual ICollection<FactoryRiskInput> RiskInputs { get; set; } = new List<FactoryRiskInput>();
}

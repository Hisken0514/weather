namespace Forma.Domain.Entities;

/// <summary>
/// 全台工廠主資料（來自經濟部工廠登記清冊，不定期匯入更新）
/// </summary>
public class FactoryMaster : AuditableEntity
{
    /// <summary>工廠登記編號（唯一鍵）</summary>
    public string FactoryRegistrationNo { get; set; } = string.Empty;

    /// <summary>工廠名稱</summary>
    public string FactoryName { get; set; } = string.Empty;

    /// <summary>統一編號</summary>
    public string? UnifiedBusinessNo { get; set; }

    /// <summary>工廠地址</summary>
    public string? Address { get; set; }

    /// <summary>縣市（從 工廠市鎮鄉村里 解析）</summary>
    public string? County { get; set; }

    /// <summary>鄉鎮市區</summary>
    public string? Township { get; set; }

    /// <summary>工廠負責人姓名</summary>
    public string? OwnerName { get; set; }

    /// <summary>工廠組織型態</summary>
    public string? OrganizationType { get; set; }

    /// <summary>工廠登記狀態</summary>
    public string? RegistrationStatus { get; set; }

    /// <summary>產業類別</summary>
    public string? IndustryCategory { get; set; }

    /// <summary>主要產品</summary>
    public string? MainProducts { get; set; }

    /// <summary>緯度（geocoding 補充，暫為 null）</summary>
    public double? Lat { get; set; }

    /// <summary>經度（geocoding 補充，暫為 null）</summary>
    public double? Lng { get; set; }

    /// <summary>清冊資料來源日期（例如 11502 → 2026-02）</summary>
    public string? DataSource { get; set; }

    /// <summary>最後匯入時間</summary>
    public DateTime LastImportedAt { get; set; }
}

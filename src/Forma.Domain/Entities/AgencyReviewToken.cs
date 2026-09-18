namespace Forma.Domain.Entities;

/// <summary>
/// 機關複查登打公開連結的存取 Token（每「年度督導計畫 x 機關」一條）
/// </summary>
public class AgencyReviewToken : AuditableEntity
{
    /// <summary>
    /// 對應的年度督導計畫 ID
    /// </summary>
    public Guid SupervisionCampaignId { get; set; }

    /// <summary>
    /// 對應的機關 ID
    /// </summary>
    public Guid AgencyId { get; set; }

    /// <summary>
    /// 高熵隨機字串
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// 是否已停用
    /// </summary>
    public bool IsRevoked { get; set; }

    /// <summary>
    /// 停用時間
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// 最後一次被存取的時間
    /// </summary>
    public DateTime? LastAccessedAt { get; set; }

    /// <summary>
    /// 累計被存取次數
    /// </summary>
    public int AccessCount { get; set; }

    // Navigation Properties
    public virtual SupervisionCampaign Campaign { get; set; } = null!;
    public virtual Agency Agency { get; set; } = null!;
}

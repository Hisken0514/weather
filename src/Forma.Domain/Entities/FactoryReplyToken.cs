namespace Forma.Domain.Entities;

/// <summary>
/// 工廠改善回覆公開連結的存取 Token（每工廠一條，涵蓋該工廠所有機關的督導任務）
/// </summary>
public class FactoryReplyToken : AuditableEntity
{
    /// <summary>
    /// 對應的工廠 ID
    /// </summary>
    public Guid SupervisedFactoryId { get; set; }

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
    public virtual SupervisedFactory Factory { get; set; } = null!;
}

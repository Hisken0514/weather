namespace Forma.Domain.Entities;

/// <summary>
/// 機關與使用者的綁定關係
/// </summary>
public class AgencyUser : BaseEntity
{
    /// <summary>
    /// 機關 ID
    /// </summary>
    public Guid AgencyId { get; set; }

    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 綁定時間
    /// </summary>
    public DateTime AssignedAt { get; set; }

    // Navigation Properties
    public virtual Agency Agency { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

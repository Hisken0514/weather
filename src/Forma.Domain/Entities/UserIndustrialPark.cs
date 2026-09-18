namespace Forma.Domain.Entities;

/// <summary>
/// 使用者綁定產業園區（多對多 junction）
/// </summary>
public class UserIndustrialPark
{
    /// <summary>使用者 ID</summary>
    public Guid UserId { get; set; }

    /// <summary>產業園區名稱（對應 SupervisedFactory.IndustrialPark）</summary>
    public string IndustrialParkName { get; set; } = string.Empty;

    // Navigation
    public virtual User User { get; set; } = null!;
}

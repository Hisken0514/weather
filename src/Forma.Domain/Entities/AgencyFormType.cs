namespace Forma.Domain.Entities;

/// <summary>
/// 機關對應表單類型（一個機關可對應多種表單）
/// </summary>
public class AgencyFormType : BaseEntity
{
    /// <summary>
    /// 機關 ID
    /// </summary>
    public Guid AgencyId { get; set; }

    /// <summary>
    /// 表單名稱（e.g. 公共危險物品等場所管理督導檢核項目）
    /// </summary>
    public string FormTypeName { get; set; } = string.Empty;

    /// <summary>
    /// 對應的 Forma 表單 ID（由 admin 綁定）
    /// </summary>
    public Guid? FormId { get; set; }

    // Navigation Properties
    public virtual Agency Agency { get; set; } = null!;
    public virtual Form? Form { get; set; }
}

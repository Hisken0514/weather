using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 年度督導計畫（e.g. 115年化學品安全督導）
/// </summary>
public class SupervisionCampaign : AuditableEntity
{
    /// <summary>
    /// 民國年度（e.g. 115）
    /// </summary>
    public int Year { get; set; }

    /// <summary>
    /// 計畫名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 計畫狀態
    /// </summary>
    public SupervisionCampaignStatus Status { get; set; } = SupervisionCampaignStatus.Draft;

    /// <summary>
    /// 建立者 ID
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// 此督導計畫專屬的 Forma 表單計畫 ID（建立計畫時自動產生）
    /// </summary>
    public Guid? FormProjectId { get; set; }

    // Navigation Properties
    public virtual User CreatedBy { get; set; } = null!;
    public virtual Project? FormProject { get; set; }
    public virtual ICollection<SupervisedFactory> Factories { get; set; } = new List<SupervisedFactory>();
}

using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 督導改善建議的單一項目（對應一條違反法規條款/違反事實），由 Admin 新增/刪除說明。
/// 工廠只能填寫自己這一條的回覆內容，機關只能填寫自己這一條的複查登打內容，兩邊互不影響，
/// 也都不能自行新增或刪除項目。一條建議 = 一份完整的工廠回覆 + 一份完整的機關複查，彼此獨立。
/// </summary>
public class FactoryReplyItem : AuditableEntity
{
    /// <summary>
    /// 對應的督導任務 ID
    /// </summary>
    public Guid SupervisionTaskId { get; set; }

    /// <summary>
    /// 顯示順序
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// 說明/標籤（Admin 填寫，例如摘錄對應的違反事實內容），讓工廠知道這一點在回答什麼
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// 工廠針對這一點填寫的改善對策（必填才能送出整份回覆）
    /// </summary>
    public string? ReplyText { get; set; }

    /// <summary>
    /// 這一點是否完成改善/辦理
    /// </summary>
    public bool? IsImprovementCompleted { get; set; }

    /// <summary>
    /// 未完成改善時的辦理狀態（IsImprovementCompleted = false 才需填寫）
    /// </summary>
    public ImprovementStatus? ImprovementStatus { get; set; }

    /// <summary>
    /// 這一點的完成/預計完成日期
    /// </summary>
    public DateTime? CompletionDate { get; set; }

    /// <summary>
    /// 工廠針對這一點填寫的備註
    /// </summary>
    public string? Remarks { get; set; }

    /// <summary>
    /// 【1】機關針對這一點是否複查
    /// </summary>
    public bool? WillReinspect { get; set; }

    /// <summary>
    /// 【2】這一點的(預計)複查日期
    /// </summary>
    public DateTime? ReinspectionDate { get; set; }

    /// <summary>
    /// 【3】這一點的複查結果
    /// </summary>
    public ReinspectionResult? Result { get; set; }

    /// <summary>
    /// 複查結果為「其他」時的自行輸入內容
    /// </summary>
    public string? ResultOtherText { get; set; }

    /// <summary>
    /// 【4】針對這一點是否裁處
    /// </summary>
    public bool? WillPenalize { get; set; }

    /// <summary>
    /// 【5】這一點的違反法條（無裁處則免填）
    /// </summary>
    public string? ViolatedRegulation { get; set; }

    /// <summary>
    /// 【6】這一點的裁處金額
    /// </summary>
    public decimal? PenaltyAmount { get; set; }

    /// <summary>
    /// 機關針對這一點填寫的備註
    /// </summary>
    public string? AgencyRemarks { get; set; }

    // Navigation Properties
    public virtual SupervisionTask Task { get; set; } = null!;
}

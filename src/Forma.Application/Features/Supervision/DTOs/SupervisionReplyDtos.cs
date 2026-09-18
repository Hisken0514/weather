namespace Forma.Application.Features.Supervision.DTOs;

/// <summary>督導發現內容的單一欄位（督導結果/違反法規條款/違反事實/建議事項備註其中之一）</summary>
public class SupervisionFindingDto
{
    public string Label { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

// ─── 工廠改善回覆 ──────────────────────────────────────────

/// <summary>
/// 工廠改善對策的單一回覆項目（Admin 新增/刪除說明，工廠只能填自己這一條的回覆內容）。
/// 一條建議對應一份完整回覆：改善對策/是否完成改善/完成日期/備註，彼此獨立。
/// </summary>
public class FactoryReplyItemDto
{
    public Guid Id { get; set; }
    public int SortOrder { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ReplyText { get; set; }
    public bool? IsImprovementCompleted { get; set; }
    /// <summary>未完成改善時的辦理狀態（IsImprovementCompleted = false 才會有值）</summary>
    public string? ImprovementStatus { get; set; }
    public DateTime? CompletionDate { get; set; }
    public string? Remarks { get; set; }
}

public class FactoryReplyDataDto
{
    public List<FactoryReplyItemDto> Items { get; set; } = new();
    /// <summary>填表人單位（工廠內部部門或職稱，自由文字）</summary>
    public string? FillerUnitName { get; set; }
    public string? FillerName { get; set; }
    public string? FillerContact { get; set; }
    public DateTime? SubmittedAt { get; set; }
}

public class FactoryReplyTaskDto
{
    public Guid TaskId { get; set; }
    public string AgencyName { get; set; } = string.Empty;
    public string FormTypeName { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public FactoryReplyDataDto? Reply { get; set; }
    /// <summary>督導發現內容（督導結果/違反法規條款/違反事實/建議事項備註），讓工廠知道要回覆什麼</summary>
    public List<SupervisionFindingDto> Findings { get; set; } = new();
}

public class FactoryReplyPortalDto
{
    public Guid FactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public List<FactoryReplyTaskDto> Tasks { get; set; } = new();
}

public class UpsertFactoryReplyItemRequest
{
    public Guid ItemId { get; set; }
    public string ReplyText { get; set; } = string.Empty;
    public bool? IsImprovementCompleted { get; set; }
    public string? ImprovementStatus { get; set; }
    public DateTime? CompletionDate { get; set; }
    public string? Remarks { get; set; }
}

public class UpsertFactoryReplyRequest
{
    public List<UpsertFactoryReplyItemRequest> Items { get; set; } = new();
    public string? FillerUnitName { get; set; }
    public string? FillerName { get; set; }
    public string? FillerContact { get; set; }
}

// ─── 工廠回覆項目管理（Admin）──────────────────────────────

public class CreateFactoryReplyItemRequest
{
    public string Description { get; set; } = string.Empty;
}

public class UpdateFactoryReplyItemRequest
{
    public string Description { get; set; } = string.Empty;
}

public class SetTaskNoImprovementNeededRequest
{
    public bool Value { get; set; }
}

/// <summary>Admin 瀏覽已完成任務、挑選要管理回覆項目的任務清單，分頁 + 搜尋</summary>
public class AdminReplyTaskListItemDto
{
    public Guid TaskId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public string AgencyName { get; set; } = string.Empty;
    public string FormTypeName { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public int ItemCount { get; set; }
    public int RepliedItemCount { get; set; }
    public bool FactoryReplySubmitted { get; set; }
    /// <summary>是否已標記為「無需改善回覆」（機關督導時沒有發現任何需要改善的項目）</summary>
    public bool NoImprovementNeeded { get; set; }
    /// <summary>督導發現內容（督導結果/違反法規條款/違反事實/建議事項備註），讓 Admin 設定回覆項目時知道要參考什麼</summary>
    public List<SupervisionFindingDto> Findings { get; set; } = new();
}

public class PagedAdminReplyTaskListResponse
{
    public List<AdminReplyTaskListItemDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

// ─── 機關複查登打 ──────────────────────────────────────────

/// <summary>
/// 機關針對單一項目的複查登打（比照工廠回覆逐點設計，一條建議 = 一份完整複查）。
/// 唯讀顯示工廠這一點的回覆內容，機關填寫自己這一點的複查結果，彼此獨立。
/// </summary>
public class AgencyReviewItemDto
{
    public Guid Id { get; set; }
    public int SortOrder { get; set; }
    public string Description { get; set; } = string.Empty;

    // 工廠回覆（唯讀）
    public string? FactoryReplyText { get; set; }
    public bool? FactoryIsImprovementCompleted { get; set; }
    /// <summary>未完成改善時的辦理狀態（FactoryIsImprovementCompleted 為 false 才會有值）</summary>
    public string? FactoryImprovementStatus { get; set; }
    public DateTime? FactoryCompletionDate { get; set; }
    public string? FactoryRemarks { get; set; }

    // 機關複查（機關填寫）
    public bool? WillReinspect { get; set; }
    public DateTime? ReinspectionDate { get; set; }
    public string? Result { get; set; }
    public string? ResultOtherText { get; set; }
    public bool? WillPenalize { get; set; }
    public string? ViolatedRegulation { get; set; }
    public decimal? PenaltyAmount { get; set; }
    public string? AgencyRemarks { get; set; }
}

public class AgencyReviewTaskDto
{
    public Guid TaskId { get; set; }
    public Guid FactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    /// <summary>登入雙軌（可能橫跨多個機關）時用來標示每列屬於哪個機關；公開連結入口已鎖定單一機關，此欄位可忽略</summary>
    public string AgencyName { get; set; } = string.Empty;
    public string FormTypeName { get; set; } = string.Empty;
    public DateTime? CompletedAt { get; set; }
    public List<AgencyReviewItemDto> Items { get; set; } = new();
    /// <summary>工廠整份改善回覆是否已送出（null 表示尚未送出）</summary>
    public DateTime? FactoryReplySubmittedAt { get; set; }
    /// <summary>機關單位（填表人所屬機關，自由文字）</summary>
    public string? ReviewerAgencyName { get; set; }
    public string? ReviewerName { get; set; }
    public string? ReviewerContact { get; set; }
    /// <summary>整份複查是否已送出</summary>
    public DateTime? SubmittedAt { get; set; }
    /// <summary>
    /// 機關已複查後，工廠又更新過回覆內容（FactoryReplySubmittedAt 晚於 SubmittedAt）。
    /// 兩者皆為「最後一次送出時間」，每次重新送出都會覆寫，所以可以直接比較。
    /// </summary>
    public bool NeedsReReview { get; set; }
    /// <summary>督導發現內容（督導結果/違反法規條款/違反事實/建議事項備註），讓機關檢視當初記錄了什麼</summary>
    public List<SupervisionFindingDto> Findings { get; set; } = new();
}

public class AgencyReviewPortalDto
{
    public Guid AgencyId { get; set; }
    public string AgencyName { get; set; } = string.Empty;
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public List<AgencyReviewTaskDto> Tasks { get; set; } = new();
}

/// <summary>登入雙軌的機關複查任務清單，分頁 + 搜尋 + 回覆/複查狀態篩選</summary>
public class PagedAgencyReviewTasksResponse
{
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public List<AgencyReviewTaskDto> Items { get; set; } = new();
    public int Total { get; set; }
    /// <summary>符合目前搜尋條件（不含回覆/複查篩選）中，工廠已回覆的筆數</summary>
    public int FactoryRepliedCount { get; set; }
    /// <summary>符合目前搜尋條件（不含回覆/複查篩選）中，工廠尚未回覆的筆數</summary>
    public int FactoryPendingCount { get; set; }
    /// <summary>符合目前搜尋條件（不含回覆/複查篩選）中，機關已完成複查登打的筆數</summary>
    public int AgencyReviewedCount { get; set; }
    /// <summary>符合目前搜尋條件（不含回覆/複查篩選）中，機關尚未完成複查登打的筆數</summary>
    public int AgencyPendingCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

/// <summary>
/// 依工廠分組的機關複查進度摘要（一家工廠可能有多筆任務）。狀態由前端依
/// SubmittedCount/TaskCount 三態換算：0 筆＝未填寫、部分＝填寫中、全部＝已完成。
/// </summary>
public class AgencyReviewFactorySummaryDto
{
    public Guid FactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public int TaskCount { get; set; }
    public int FactoryReplySubmittedCount { get; set; }
    public int AgencyReviewSubmittedCount { get; set; }
    /// <summary>機關已複查後，工廠又更新過回覆內容的任務數（需要重新確認複查內容是否仍然正確）</summary>
    public int NeedsReReviewCount { get; set; }
}

/// <summary>依工廠分組的機關複查進度清單，分頁 + 搜尋（工廠名稱/登記編號）</summary>
public class PagedAgencyReviewFactorySummaryResponse
{
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public List<AgencyReviewFactorySummaryDto> Items { get; set; } = new();
    /// <summary>符合搜尋條件（不含卡片分類篩選）的工廠家數，統計卡片的分母固定用這個，不受分類篩選影響</summary>
    public int TotalBeforeFilter { get; set; }
    /// <summary>符合搜尋條件＋分類篩選的工廠家數（分頁用）</summary>
    public int Total { get; set; }
    /// <summary>符合條件的工廠中，工廠改善回覆已全部送出（已完成）的家數</summary>
    public int FactoryReplyCompletedCount { get; set; }
    /// <summary>符合條件的工廠中，機關複查已全部送出（已完成）的家數</summary>
    public int AgencyReviewCompletedCount { get; set; }
    /// <summary>符合條件的工廠中，至少有一筆任務「機關已複查、工廠又更新回覆」需要重新確認的家數</summary>
    public int NeedsReReviewFactoryCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class UpsertAgencyReviewItemRequest
{
    public Guid ItemId { get; set; }
    public bool? WillReinspect { get; set; }
    public DateTime? ReinspectionDate { get; set; }
    public string? Result { get; set; }
    public string? ResultOtherText { get; set; }
    public bool? WillPenalize { get; set; }
    public string? ViolatedRegulation { get; set; }
    public decimal? PenaltyAmount { get; set; }
    public string? AgencyRemarks { get; set; }
}

public class UpsertAgencyReviewRequest
{
    public List<UpsertAgencyReviewItemRequest> Items { get; set; } = new();
    public string? ReviewerAgencyName { get; set; }
    public string? ReviewerName { get; set; }
    public string? ReviewerContact { get; set; }
}

// ─── Admin：連結管理 ──────────────────────────────────────

public class FactoryTokenLinkDto
{
    public Guid FactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public string Token { get; set; } = string.Empty;
    public bool IsRevoked { get; set; }
    public int TotalCompletedTasks { get; set; }
    public int RepliedTasks { get; set; }
    public DateTime? LastAccessedAt { get; set; }
}

public class AgencyTokenLinkDto
{
    public Guid AgencyId { get; set; }
    public string AgencyName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public bool IsRevoked { get; set; }
    public int TotalCompletedTasks { get; set; }
    public int ReviewedTasks { get; set; }
    public DateTime? LastAccessedAt { get; set; }
}

/// <summary>工廠改善回覆連結清單，分頁 + 搜尋（工廠名稱/登記編號）</summary>
public class PagedFactoryTokenLinksResponse
{
    public List<FactoryTokenLinkDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

/// <summary>機關複查登打連結清單，分頁 + 搜尋（機關名稱）</summary>
public class PagedAgencyTokenLinksResponse
{
    public List<AgencyTokenLinkDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class GenerateTokensResult
{
    public int Created { get; set; }
    /// <summary>已存在但先前被停用的連結，被重新啟用的筆數</summary>
    public int Reactivated { get; set; }
}

public class RegenerateTokenResult
{
    public string Token { get; set; } = string.Empty;
}

public class RevokeAllTokensResult
{
    public int Revoked { get; set; }
}

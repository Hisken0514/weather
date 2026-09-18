/** 督導發現內容的單一欄位（督導結果/違反法規條款/違反事實/建議事項備註其中之一） */
export interface SupervisionFindingDto {
  label: string;
  value: string;
}

// ─── 工廠改善回覆 ──────────────────────────────────────────

/**
 * 工廠改善對策的單一回覆項目（Admin 新增/刪除說明，工廠只能填自己這一條的回覆內容）。
 * 一條建議對應一份完整回覆：改善對策/是否完成改善/完成日期/備註，彼此獨立。
 */
export type ImprovementStatus = 'InProgress' | 'NotStarted';

export interface FactoryReplyItemDto {
  id: string;
  sortOrder: number;
  description: string;
  replyText: string | null;
  isImprovementCompleted: boolean | null;
  /** 未完成改善時的辦理狀態（isImprovementCompleted 為 false 才會有值） */
  improvementStatus: ImprovementStatus | null;
  completionDate: string | null;
  remarks: string | null;
}

export interface FactoryReplyDataDto {
  items: FactoryReplyItemDto[];
  /** 填表人單位（工廠內部部門或職稱，自由文字） */
  fillerUnitName: string | null;
  fillerName: string | null;
  fillerContact: string | null;
  submittedAt: string | null;
}

export interface FactoryReplyTaskDto {
  taskId: string;
  agencyName: string;
  formTypeName: string;
  completedAt: string | null;
  reply: FactoryReplyDataDto | null;
  /** 督導發現內容（督導結果/違反法規條款/違反事實/建議事項備註） */
  findings: SupervisionFindingDto[];
}

export interface FactoryReplyPortalDto {
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  tasks: FactoryReplyTaskDto[];
}

export interface UpsertFactoryReplyItemRequest {
  itemId: string;
  replyText: string;
  isImprovementCompleted?: boolean;
  improvementStatus?: ImprovementStatus;
  completionDate?: string;
  remarks?: string;
}

export interface UpsertFactoryReplyRequest {
  items: UpsertFactoryReplyItemRequest[];
  fillerUnitName?: string;
  fillerName?: string;
  fillerContact?: string;
}

// ─── 工廠回覆項目管理（Admin）──────────────────────────────

export interface CreateFactoryReplyItemRequest {
  description: string;
}

export interface UpdateFactoryReplyItemRequest {
  description: string;
}

/** Admin 瀏覽已完成任務、挑選要管理回覆項目的任務清單，分頁 + 搜尋 */
export interface AdminReplyTaskListItemDto {
  taskId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  agencyName: string;
  formTypeName: string;
  completedAt: string | null;
  itemCount: number;
  repliedItemCount: number;
  factoryReplySubmitted: boolean;
  /** 是否已標記為「無需改善回覆」（機關督導時沒有發現任何需要改善的項目） */
  noImprovementNeeded: boolean;
  /** 督導發現內容（督導結果/違反法規條款/違反事實/建議事項備註） */
  findings: SupervisionFindingDto[];
}

export interface PagedAdminReplyTaskListResponse {
  items: AdminReplyTaskListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── 機關複查登打 ──────────────────────────────────────────

export type ReinspectionResult = 'Improved' | 'PendingImprovement' | 'Other';

/**
 * 機關針對單一項目的複查登打（比照工廠回覆逐點設計，一條建議 = 一份完整複查）。
 * 唯讀顯示工廠這一點的回覆內容，機關填寫自己這一點的複查結果，彼此獨立。
 */
export interface AgencyReviewItemDto {
  id: string;
  sortOrder: number;
  description: string;

  // 工廠回覆（唯讀）
  factoryReplyText: string | null;
  factoryIsImprovementCompleted: boolean | null;
  /** 未完成改善時的辦理狀態（factoryIsImprovementCompleted 為 false 才會有值） */
  factoryImprovementStatus: ImprovementStatus | null;
  factoryCompletionDate: string | null;
  factoryRemarks: string | null;

  // 機關複查（機關填寫）
  willReinspect: boolean | null;
  reinspectionDate: string | null;
  result: ReinspectionResult | null;
  resultOtherText: string | null;
  willPenalize: boolean | null;
  violatedRegulation: string | null;
  penaltyAmount: number | null;
  agencyRemarks: string | null;
}

export interface AgencyReviewTaskDto {
  taskId: string;
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  /** 登入雙軌（可能橫跨多個機關）時用來標示每列屬於哪個機關 */
  agencyName: string;
  formTypeName: string;
  completedAt: string | null;
  items: AgencyReviewItemDto[];
  /** 工廠整份改善回覆是否已送出（null 表示尚未送出） */
  factoryReplySubmittedAt: string | null;
  reviewerAgencyName: string | null;
  reviewerName: string | null;
  reviewerContact: string | null;
  /** 整份複查是否已送出 */
  submittedAt: string | null;
  /** 機關已複查後，工廠又更新過回覆內容，需要重新確認複查內容是否仍然正確 */
  needsReReview: boolean;
  /** 督導發現內容（督導結果/違反法規條款/違反事實/建議事項備註） */
  findings: SupervisionFindingDto[];
}

export interface AgencyReviewPortalDto {
  agencyId: string;
  agencyName: string;
  campaignId: string;
  campaignName: string;
  tasks: AgencyReviewTaskDto[];
}

/** 登入雙軌的機關複查任務清單，分頁 + 搜尋 + 回覆/複查狀態篩選 */
export interface PagedAgencyReviewTasksResponse {
  campaignId: string;
  campaignName: string;
  items: AgencyReviewTaskDto[];
  total: number;
  factoryRepliedCount: number;
  factoryPendingCount: number;
  agencyReviewedCount: number;
  agencyPendingCount: number;
  page: number;
  pageSize: number;
}

/**
 * 依工廠分組的機關複查進度摘要（一家工廠可能有多筆任務）。狀態由前端依
 * factoryReplySubmittedCount/taskCount 三態換算：0 筆＝未填寫、部分＝填寫中、全部＝已完成。
 */
export interface AgencyReviewFactorySummaryDto {
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  taskCount: number;
  factoryReplySubmittedCount: number;
  agencyReviewSubmittedCount: number;
  /** 機關已複查後，工廠又更新過回覆內容的任務數 */
  needsReReviewCount: number;
}

/** 依工廠分組的機關複查進度清單，分頁 + 搜尋（工廠名稱/登記編號） */
export interface PagedAgencyReviewFactorySummaryResponse {
  campaignId: string;
  campaignName: string;
  items: AgencyReviewFactorySummaryDto[];
  /** 符合搜尋條件（不含卡片分類篩選）的工廠家數，統計卡片的分母固定用這個 */
  totalBeforeFilter: number;
  total: number;
  factoryReplyCompletedCount: number;
  agencyReviewCompletedCount: number;
  /** 至少有一筆任務需要重新確認複查內容的工廠家數 */
  needsReReviewFactoryCount: number;
  page: number;
  pageSize: number;
}

export interface UpsertAgencyReviewItemRequest {
  itemId: string;
  willReinspect?: boolean;
  reinspectionDate?: string;
  result?: ReinspectionResult;
  resultOtherText?: string;
  willPenalize?: boolean;
  violatedRegulation?: string;
  penaltyAmount?: number;
  agencyRemarks?: string;
}

export interface UpsertAgencyReviewRequest {
  items: UpsertAgencyReviewItemRequest[];
  reviewerAgencyName?: string;
  reviewerName?: string;
  reviewerContact?: string;
}

// ─── Admin：連結管理 ──────────────────────────────────────

export interface FactoryTokenLinkDto {
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  token: string;
  isRevoked: boolean;
  totalCompletedTasks: number;
  repliedTasks: number;
  lastAccessedAt: string | null;
}

export interface AgencyTokenLinkDto {
  agencyId: string;
  agencyName: string;
  token: string;
  isRevoked: boolean;
  totalCompletedTasks: number;
  reviewedTasks: number;
  lastAccessedAt: string | null;
}

/** 工廠改善回覆連結清單，分頁 + 搜尋（工廠名稱/登記編號） */
export interface PagedFactoryTokenLinksResponse {
  items: FactoryTokenLinkDto[];
  total: number;
  page: number;
  pageSize: number;
}

/** 機關複查登打連結清單，分頁 + 搜尋（機關名稱） */
export interface PagedAgencyTokenLinksResponse {
  items: AgencyTokenLinkDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GenerateTokensResult {
  created: number;
  /** 已存在但先前被停用的連結，被重新啟用的筆數 */
  reactivated: number;
}

export interface RegenerateTokenResult {
  token: string;
}

export interface RevokeAllTokensResult {
  revoked: number;
}

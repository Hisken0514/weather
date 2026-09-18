// ─── Agency ───────────────────────────────────────────────

export interface AgencyFormTypeDto {
  id: string;
  formTypeName: string;
  formId: string | null;
  formName: string | null;
}

export interface AgencyDto {
  id: string;
  name: string;
  region: string | null;
  isActive: boolean;
  createdAt: string;
  formTypes: AgencyFormTypeDto[];
  userCount: number;
}

export interface AgencyUserDto {
  userId: string;
  username: string;
  email: string;
  assignedAt: string;
}

export interface CreateAgencyRequest {
  name: string;
  region?: string;
}

export interface UpdateAgencyRequest {
  name: string;
  region?: string;
  isActive: boolean;
}

export interface AddAgencyFormTypeRequest {
  formTypeName: string;
  formId?: string;
}

// ─── Supervision Campaign ─────────────────────────────────

export interface CampaignMapFactoryDto {
  supervisedFactoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  county: string | null;
  address: string | null;
  industrialPark: string | null;
  lat: number | null;
  lng: number | null;
  riskRank: number | null;
  /** 0–100，由後端由 riskRank 正規化計算 */
  riskScore: number;
  /** 套用評分標準算出來的原始風險分數（未正規化），無排名資料時為 null */
  rawRiskScore: number | null;
}

export interface CampaignDto {
  id: string;
  year: number;
  name: string;
  description: string | null;
  status: 'Draft' | 'Active' | 'Closed';
  createdAt: string;
  factoryCount: number;
  taskCount: number;
  completedTaskCount: number;
  /** 此督導計畫的專屬 Forma 表單計畫 ID，用於直接管理表單 */
  formProjectId: string | null;
}

export interface CreateCampaignRequest {
  year: number;
  name: string;
  description?: string;
}

export interface UpdateCampaignRequest {
  name: string;
  description?: string;
  status: string;
}

// ─── Supervision Task ─────────────────────────────────────

export interface SupervisionTaskDto {
  id: string;
  status: 'Pending' | 'InProgress' | 'Completed';
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  industrialPark: string | null;
  region: string | null;
  county: string | null;
  riskRank: number | null;
  formTypeName: string;
  formId: string | null;
  submissionId: string | null;
  agencyId: string;
  agencyName: string;
  completedAt: string | null;
  submittedByUsername: string | null;
  submittedAt: string | null;
  campaignId: string;
  campaignName: string;
  campaignYear: number;
}

export interface PagedMyTasksResponse {
  items: SupervisionTaskDto[];
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  page: number;
  pageSize: number;
}

// ─── Progress ────────────────────────────────────────────

export interface SupervisionAgencyOptionDto {
  id: string;
  name: string;
}

export interface AgencyProgressDto {
  agencyId: string;
  agencyName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export interface CampaignProgressDto {
  campaignId: string;
  campaignName: string;
  year: number;
  totalFactories: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  completionRate: number;
  byAgency: AgencyProgressDto[];
}

// ─── Response (填寫數據) ──────────────────────────────────

export interface SupervisionResponseDto {
  taskId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  agencyName: string;
  region: string | null;
  county: string | null;
  industrialPark: string | null;
  formTypeName: string;
  formId: string | null;
  submittedAt: string | null;
  submittedByUsername: string | null;
  /** 欄位名稱 → 填寫值 */
  data: Record<string, unknown>;
}

// ─── Campaign Factory Summary（依工廠為主體）──────────────

export interface FactorySupervisionSummaryDto {
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  region: string | null;
  county: string | null;
  industrialPark: string | null;
  /** 表單類型名稱 → 督導結果 */
  results: Record<string, string>;
}

export interface CampaignFactorySummaryDto {
  formTypeNames: string[];
  items: FactorySupervisionSummaryDto[];
}

// ─── Factory ─────────────────────────────────────────────

export interface SupervisedFactoryDto {
  id: string;
  campaignId: string;
  riskRank: number | null;
  factoryRegistrationNo: string | null;
  factoryName: string;
  factoryAddress: string | null;
  industryCategory: string | null;
  industrialPark: string | null;
  region: string | null;
  county: string | null;
  taskCount: number;
  completedTaskCount: number;
}

/** 一筆缺登記編號的工廠管理資料，以及依名稱在全台工廠主資料比對到的候選項 */
export interface FactoryRegistrationNoSuggestionDto {
  factoryId: string;
  factoryName: string;
  factoryAddress: string | null;
  campaignYear: number;
  campaignName: string;
  /** 依名稱完全比對到的候選項：0筆＝找不到、1筆＝高信心、多筆＝需要人工挑選 */
  candidates: FactoryMasterCandidateDto[];
}

export interface FactoryMasterCandidateDto {
  factoryRegistrationNo: string;
  factoryName: string;
  address: string | null;
  county: string | null;
}

export interface CreateFactoryRequest {
  riskRank?: number;
  factoryRegistrationNo?: string;
  factoryName: string;
  factoryAddress?: string;
  industryCategory?: string;
  industrialPark?: string;
  region?: string;
  county?: string;
}

export interface UpdateFactoryRequest {
  riskRank?: number;
  factoryRegistrationNo?: string;
  factoryName: string;
  factoryAddress?: string;
  industryCategory?: string;
  industrialPark?: string;
  region?: string;
  county?: string;
}

export interface BindFactoryResult {
  tasksCreated: number;
}

export interface UnbindFactoryResult {
  tasksRemoved: number;
}

// ─── Task Reset Preview ──────────────────────────────────

export interface TaskResetPreviewItem {
  taskId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  formTypeName: string;
  agencyName: string;
  status: 'Pending' | 'InProgress' | 'Completed';
  submittedByUsername: string | null;
  submittedAt: string | null;
}

// ─── Import ───────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  factoriesImported: number;
  tasksCreated: number;
  errors: string[];
  warnings: string[];
}

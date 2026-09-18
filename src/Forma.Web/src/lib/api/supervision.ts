import { apiClient } from './client';
import type {
  CampaignMapFactoryDto,
  CampaignDto,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  PagedMyTasksResponse,
  CampaignProgressDto,
  ImportResult,
  SupervisionResponseDto,
  SupervisedFactoryDto,
  CreateFactoryRequest,
  UpdateFactoryRequest,
  BindFactoryResult,
  UnbindFactoryResult,
  TaskResetPreviewItem,
  SupervisionAgencyOptionDto,
  CampaignFactorySummaryDto,
  FactoryRegistrationNoSuggestionDto,
} from '@/types/api/supervision';

export const supervisionApi = {
  // 年度督導計畫
  getCampaigns: () =>
    apiClient.get<CampaignDto[]>('/supervision/campaigns'),

  getCampaign: (id: string) =>
    apiClient.get<CampaignDto>(`/supervision/campaigns/${id}`),

  getMapFactories: (campaignId: string, dataYear?: number) => {
    const q: Record<string, number> = {};
    if (dataYear) q.dataYear = dataYear;
    return apiClient.get<CampaignMapFactoryDto[]>(`/supervision/campaigns/${campaignId}/map-factories`, q);
  },

  getAllRiskMapFactories: (dataYear?: number, schemeId?: string) => {
    const q: Record<string, string | number> = {};
    if (dataYear) q.dataYear = dataYear;
    if (schemeId) q.schemeId = schemeId;
    return apiClient.get<CampaignMapFactoryDto[]>('/supervision/map-factories', q);
  },

  createCampaign: (data: CreateCampaignRequest) =>
    apiClient.post<{ id: string }>('/supervision/campaigns', data),

  updateCampaign: (id: string, data: UpdateCampaignRequest) =>
    apiClient.put<CampaignDto>(`/supervision/campaigns/${id}`, data),

  deleteCampaign: (id: string) =>
    apiClient.delete(`/supervision/campaigns/${id}`),

  // Excel 匯入
  importExcel: async (campaignId: string, file: File): Promise<ImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.postForm<ImportResult>(
      `/supervision/campaigns/${campaignId}/import`,
      formData,
    );
    return res;
  },

  // 下載匯入範本（含 cookie 認證）
  downloadTemplate: async () => {
    const url = `${import.meta.env.VITE_API_BASE_URL || '/api'}/supervision/campaigns/template`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('下載範本失敗');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '督導清冊匯入範本.xlsx';
    a.click();
    URL.revokeObjectURL(a.href);
  },

  // 督導任務（分頁）
  getMyTasks: (params: {
    campaignId?: string;
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    agencyId?: string;
  } = {}) => {
    const { campaignId, page = 1, pageSize = 50, status, search, agencyId } = params;
    const q: Record<string, string | number> = { page, pageSize };
    if (campaignId) q.campaignId = campaignId;
    if (status && status !== 'all') q.status = status;
    if (search) q.search = search;
    if (agencyId) q.agencyId = agencyId;
    return apiClient.get<PagedMyTasksResponse>('/supervision/my-tasks', q);
  },

  getProgress: (campaignId: string) =>
    apiClient.get<CampaignProgressDto>(`/supervision/campaigns/${campaignId}/progress`),

  linkSubmission: (taskId: string, submissionId: string) =>
    apiClient.put(`/supervision/tasks/${taskId}/link-submission/${submissionId}`, {}),

  rejectTask: (taskId: string) =>
    apiClient.put(`/supervision/tasks/${taskId}/reject`, {}),

  getCampaignResponses: (campaignId: string, formId?: string) =>
    apiClient.get<SupervisionResponseDto[]>(
      `/supervision/campaigns/${campaignId}/responses`,
      formId ? { formId } : undefined,
    ),

  getCampaignAgencies: (campaignId: string) =>
    apiClient.get<SupervisionAgencyOptionDto[]>(`/supervision/campaigns/${campaignId}/agencies`),

  getCampaignFactorySummary: (campaignId: string) =>
    apiClient.get<CampaignFactorySummaryDto>(`/supervision/campaigns/${campaignId}/factory-summary`),

  syncFormIds: (campaignId: string) =>
    apiClient.post<{ updated: number }>(`/supervision/campaigns/${campaignId}/sync-form-ids`, {}),

  // 工廠管理
  getFactories: (campaignId: string) =>
    apiClient.get<SupervisedFactoryDto[]>(`/supervision/campaigns/${campaignId}/factories`),

  createFactory: (campaignId: string, data: CreateFactoryRequest) =>
    apiClient.post<{ id: string }>(`/supervision/campaigns/${campaignId}/factories`, data),

  updateFactory: (factoryId: string, data: UpdateFactoryRequest) =>
    apiClient.put<SupervisedFactoryDto>(`/supervision/factories/${factoryId}`, data),

  deleteFactory: (factoryId: string) =>
    apiClient.delete(`/supervision/factories/${factoryId}`),

  // 補登記編號（依名稱比對全台工廠主資料）
  getRegistrationNoSuggestions: () =>
    apiClient.get<FactoryRegistrationNoSuggestionDto[]>('/supervision/factories/registration-no-suggestions'),

  applyRegistrationNo: (factoryId: string, registrationNo: string) =>
    apiClient.post(`/supervision/factories/${factoryId}/registration-no`, { registrationNo }),

  // 機關綁定工廠
  getAgencyFactories: (agencyId: string, campaignId: string) =>
    apiClient.get<SupervisedFactoryDto[]>(`/supervision/agencies/${agencyId}/factories`, { campaignId }),

  bindFactory: (agencyId: string, factoryId: string) =>
    apiClient.post<BindFactoryResult>(`/supervision/agencies/${agencyId}/factories/${factoryId}`, {}),

  unbindFactory: (agencyId: string, factoryId: string) =>
    apiClient.delete<UnbindFactoryResult>(`/supervision/agencies/${agencyId}/factories/${factoryId}`),

  getResetTasksPreview: (params: {
    campaignId: string;
    formId?: string;
    factorySearch?: string;
    status?: string;
  }) => {
    const q: Record<string, string> = { campaignId: params.campaignId };
    if (params.formId) q.formId = params.formId;
    if (params.factorySearch) q.factorySearch = params.factorySearch;
    if (params.status) q.status = params.status;
    return apiClient.get<TaskResetPreviewItem[]>('/supervision/tasks/reset/preview', q);
  },

  resetTasks: (params: { campaignId?: string; formId?: string; taskIds?: string[] }) => {
    const qs = new URLSearchParams();
    if (params.campaignId) qs.set('campaignId', params.campaignId);
    if (params.formId) qs.set('formId', params.formId);
    return apiClient.post<{ resetCount: number }>(
      `/supervision/tasks/reset?${qs.toString()}`,
      params.taskIds ?? [],
    );
  },

  // 取得所有督導計畫中出現的產業園區名稱（distinct）
  getIndustrialParks: () =>
    apiClient.get<string[]>('/supervision/industrial-parks'),
  
  // 取得督導計畫工廠的風險排名（與全台排名相同計算邏輯，過濾至計畫內工廠）
  getCampaignRiskRanking: (campaignId: string, schemeId: string, dataYear?: number) => {
    const q: Record<string, string | number> = { schemeId };
    if (dataYear) q.dataYear = dataYear;
    return apiClient.get<import('@/types/api/factoryRisk').FactoryRiskRankingResultDto>(
      `/supervision/campaigns/${campaignId}/risk-ranking`, q,
    );
  },
};

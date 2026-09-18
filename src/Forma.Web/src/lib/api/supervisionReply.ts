import { apiClient } from './client';
import type {
  FactoryReplyPortalDto,
  UpsertFactoryReplyRequest,
  AgencyReviewPortalDto,
  AgencyReviewTaskDto,
  UpsertAgencyReviewRequest,
  GenerateTokensResult,
  RegenerateTokenResult,
  RevokeAllTokensResult,
  PagedAgencyReviewTasksResponse,
  PagedAgencyReviewFactorySummaryResponse,
  FactoryReplyItemDto,
  CreateFactoryReplyItemRequest,
  UpdateFactoryReplyItemRequest,
  PagedAdminReplyTaskListResponse,
  PagedFactoryTokenLinksResponse,
  PagedAgencyTokenLinksResponse,
} from '@/types/api/supervisionReply';

export const supervisionReplyApi = {
  // ── Admin：工廠連結管理 ──
  generateFactoryTokens: (campaignId: string) =>
    apiClient.post<GenerateTokensResult>(`/supervision-reply/campaigns/${campaignId}/factory-tokens/generate`, {}),

  getFactoryTokenLinks: (campaignId: string, params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const { page = 1, pageSize = 10, search } = params;
    const q: Record<string, string | number> = { page, pageSize };
    if (search) q.search = search;
    return apiClient.get<PagedFactoryTokenLinksResponse>(
      `/supervision-reply/campaigns/${campaignId}/factory-tokens`, q,
    );
  },

  revokeFactoryToken: (factoryId: string) =>
    apiClient.post(`/supervision-reply/factories/${factoryId}/factory-token/revoke`, {}),

  regenerateFactoryToken: (factoryId: string) =>
    apiClient.post<RegenerateTokenResult>(`/supervision-reply/factories/${factoryId}/factory-token/regenerate`, {}),

  revokeAllFactoryTokens: (campaignId: string) =>
    apiClient.post<RevokeAllTokensResult>(`/supervision-reply/campaigns/${campaignId}/factory-tokens/revoke-all`, {}),

  // ── Admin：機關連結管理 ──
  generateAgencyTokens: (campaignId: string) =>
    apiClient.post<GenerateTokensResult>(`/supervision-reply/campaigns/${campaignId}/agency-tokens/generate`, {}),

  getAgencyTokenLinks: (campaignId: string, params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const { page = 1, pageSize = 10, search } = params;
    const q: Record<string, string | number> = { page, pageSize };
    if (search) q.search = search;
    return apiClient.get<PagedAgencyTokenLinksResponse>(
      `/supervision-reply/campaigns/${campaignId}/agency-tokens`, q,
    );
  },

  revokeAgencyToken: (campaignId: string, agencyId: string) =>
    apiClient.post(`/supervision-reply/campaigns/${campaignId}/agencies/${agencyId}/agency-token/revoke`, {}),

  regenerateAgencyToken: (campaignId: string, agencyId: string) =>
    apiClient.post<RegenerateTokenResult>(
      `/supervision-reply/campaigns/${campaignId}/agencies/${agencyId}/agency-token/regenerate`,
      {},
    ),

  revokeAllAgencyTokens: (campaignId: string) =>
    apiClient.post<RevokeAllTokensResult>(`/supervision-reply/campaigns/${campaignId}/agency-tokens/revoke-all`, {}),

  // ── 登入雙軌（機關使用者/Admin）──
  getMyAgencyReviewTasks: (campaignId: string, params: {
    page?: number;
    pageSize?: number;
    search?: string;
    factoryReplied?: boolean;
    agencyReviewed?: boolean;
    factoryId?: string;
  } = {}) => {
    const { page = 1, pageSize = 50, search, factoryReplied, agencyReviewed, factoryId } = params;
    const q: Record<string, string | number | boolean> = { page, pageSize };
    if (search) q.search = search;
    if (factoryReplied !== undefined) q.factoryReplied = factoryReplied;
    if (agencyReviewed !== undefined) q.agencyReviewed = agencyReviewed;
    if (factoryId) q.factoryId = factoryId;
    return apiClient.get<PagedAgencyReviewTasksResponse>(
      `/supervision-reply/campaigns/${campaignId}/my-agency-review-tasks`, q,
    );
  },

  getMyAgencyReviewFactories: (campaignId: string, params: {
    page?: number;
    pageSize?: number;
    search?: string;
    factoryReplyCompleted?: boolean;
    agencyReviewCompleted?: boolean;
    needsReReview?: boolean;
  } = {}) => {
    const { page = 1, pageSize = 50, search, factoryReplyCompleted, agencyReviewCompleted, needsReReview } = params;
    const q: Record<string, string | number | boolean> = { page, pageSize };
    if (search) q.search = search;
    if (factoryReplyCompleted !== undefined) q.factoryReplyCompleted = factoryReplyCompleted;
    if (agencyReviewCompleted !== undefined) q.agencyReviewCompleted = agencyReviewCompleted;
    if (needsReReview !== undefined) q.needsReReview = needsReReview;
    return apiClient.get<PagedAgencyReviewFactorySummaryResponse>(
      `/supervision-reply/campaigns/${campaignId}/my-agency-review-factories`, q,
    );
  },

  getMyAgencyReviewForTask: (taskId: string) =>
    apiClient.get<AgencyReviewTaskDto>(`/supervision-reply/tasks/${taskId}/agency-review`),

  upsertMyAgencyReview: (taskId: string, data: UpsertAgencyReviewRequest) =>
    apiClient.put(`/supervision-reply/tasks/${taskId}/agency-review`, data),

  // ── 公開連結（不需登入）──
  getFactoryPortal: (token: string) =>
    apiClient.getPublic<FactoryReplyPortalDto>(`/public/supervision-reply/factory/${token}`),

  upsertFactoryReply: (token: string, taskId: string, data: UpsertFactoryReplyRequest) =>
    apiClient.putPublic(`/public/supervision-reply/factory/${token}/tasks/${taskId}`, data),

  getAgencyPortal: (token: string) =>
    apiClient.getPublic<AgencyReviewPortalDto>(`/public/supervision-reply/agency/${token}`),

  upsertAgencyReviewPublic: (token: string, taskId: string, data: UpsertAgencyReviewRequest) =>
    apiClient.putPublic(`/public/supervision-reply/agency/${token}/tasks/${taskId}`, data),

  // ── Admin：工廠回覆項目管理 ──
  getAdminReplyTaskList: (campaignId: string, params: { page?: number; pageSize?: number; search?: string } = {}) => {
    const { page = 1, pageSize = 50, search } = params;
    const q: Record<string, string | number> = { page, pageSize };
    if (search) q.search = search;
    return apiClient.get<PagedAdminReplyTaskListResponse>(
      `/supervision-reply/campaigns/${campaignId}/admin-reply-tasks`, q,
    );
  },

  getFactoryReplyItems: (taskId: string) =>
    apiClient.get<FactoryReplyItemDto[]>(`/supervision-reply/tasks/${taskId}/factory-reply-items`),

  createFactoryReplyItem: (taskId: string, data: CreateFactoryReplyItemRequest) =>
    apiClient.post<{ id: string }>(`/supervision-reply/tasks/${taskId}/factory-reply-items`, data),

  updateFactoryReplyItem: (itemId: string, data: UpdateFactoryReplyItemRequest) =>
    apiClient.put(`/supervision-reply/factory-reply-items/${itemId}`, data),

  deleteFactoryReplyItem: (itemId: string) =>
    apiClient.delete(`/supervision-reply/factory-reply-items/${itemId}`),

  moveFactoryReplyItem: (itemId: string, up: boolean) =>
    apiClient.post(`/supervision-reply/factory-reply-items/${itemId}/move?up=${up}`, {}),

  setTaskNoImprovementNeeded: (taskId: string, value: boolean) =>
    apiClient.put(`/supervision-reply/tasks/${taskId}/no-improvement-needed`, { value }),
};

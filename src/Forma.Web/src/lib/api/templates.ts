// 範本 API

import { apiClient } from './client';
import type {
  TemplateDto,
  TemplateListDto,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  GetTemplatesParams,
  PagedResult,
} from '@/types/api';

export const templatesApi = {
  // 取得範本列表
  getTemplates: (params?: GetTemplatesParams) =>
    apiClient.get<PagedResult<TemplateListDto>>('/templates', params as Record<string, string | number | boolean | undefined>),

  // 取得範本詳情
  getTemplate: (id: string) =>
    apiClient.get<TemplateDto>(`/templates/${id}`),

  // 建立範本
  createTemplate: (data: CreateTemplateRequest) =>
    apiClient.post<{ id: string }>('/templates', data),

  // 更新範本
  updateTemplate: (id: string, data: UpdateTemplateRequest) =>
    apiClient.put<TemplateDto>(`/templates/${id}`, data),

  // 刪除範本
  deleteTemplate: (id: string) =>
    apiClient.delete<void>(`/templates/${id}`),
};

export default templatesApi;

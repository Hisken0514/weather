// 表單 API

import { apiClient } from './client';
import type {
  FormDto,
  FormListDto,
  FormVersionDto,
  CreateFormRequest,
  UpdateFormRequest,
  CloneFormRequest,
  GetFormsParams,
  PagedResult,
} from '@/types/api';

export const formsApi = {
  // 取得專案表單列表
  getProjectForms: (projectId: string, params?: GetFormsParams) =>
    apiClient.get<PagedResult<FormListDto>>(`/projects/${projectId}/forms`, params as Record<string, string | number | boolean | undefined>),

  // 取得表單詳情
  getForm: (id: string) =>
    apiClient.get<FormDto>(`/forms/${id}`),

  // 建立表單
  createForm: (projectId: string, data: CreateFormRequest) =>
    apiClient.post<{ id: string }>(`/projects/${projectId}/forms`, data),

  // 更新表單
  updateForm: (id: string, data: UpdateFormRequest) =>
    apiClient.put<FormDto>(`/forms/${id}`, data),

  // 刪除表單
  deleteForm: (id: string) =>
    apiClient.delete<void>(`/forms/${id}`),

  // 發布表單
  publishForm: (id: string) =>
    apiClient.post<FormDto>(`/forms/${id}/publish`),

  // 下架表單
  unpublishForm: (id: string) =>
    apiClient.post<FormDto>(`/forms/${id}/unpublish`),

  // 複製表單
  cloneForm: (id: string, data?: CloneFormRequest) =>
    apiClient.post<{ id: string }>(`/forms/${id}/clone`, data),

  // 取得表單版本歷史
  getFormVersions: (id: string) =>
    apiClient.get<FormVersionDto[]>(`/forms/${id}/versions`),

  // 鎖定表單
  lockForm: (id: string) =>
    apiClient.post<FormDto>(`/forms/${id}/lock`),

  // 解鎖表單
  unlockForm: (id: string) =>
    apiClient.post<FormDto>(`/forms/${id}/unlock`),

  // 取得公開表單（不需登入）
  getPublicForm: (id: string) =>
    apiClient.getPublic<FormDto>(`/public/forms/${id}`),
};

export default formsApi;

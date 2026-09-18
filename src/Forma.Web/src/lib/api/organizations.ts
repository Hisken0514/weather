// 組織 API

import { apiClient } from './client';
import type {
  OrganizationDto,
  OrganizationListDto,
  ProjectListDto,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  GetOrganizationsParams,
  GetOrganizationProjectsParams,
  PagedResult,
} from '@/types/api';

export const organizationsApi = {
  // 取得組織列表
  getOrganizations: (params?: GetOrganizationsParams) =>
    apiClient.get<PagedResult<OrganizationListDto>>('/organizations', params as Record<string, string | number | boolean | undefined>),

  // 取得組織詳情
  getOrganization: (id: string) =>
    apiClient.get<OrganizationDto>(`/organizations/${id}`),

  // 取得組織下的專案
  getOrganizationProjects: (id: string, params?: GetOrganizationProjectsParams) =>
    apiClient.get<PagedResult<ProjectListDto>>(`/organizations/${id}/projects`, params as Record<string, string | number | boolean | undefined>),

  // 建立組織 (系統管理員)
  createOrganization: (data: CreateOrganizationRequest) =>
    apiClient.post<{ id: string }>('/organizations', data),

  // 更新組織 (系統管理員)
  updateOrganization: (id: string, data: UpdateOrganizationRequest) =>
    apiClient.put<OrganizationDto>(`/organizations/${id}`, data),

  // 刪除組織 (系統管理員)
  deleteOrganization: (id: string) =>
    apiClient.delete<void>(`/organizations/${id}`),
};

export default organizationsApi;

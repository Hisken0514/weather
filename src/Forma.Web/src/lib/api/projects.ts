// 專案 API

import { apiClient } from './client';
import type {
  ProjectDto,
  ProjectListDto,
  ProjectMemberDto,
  AvailableMemberDto,
  CreateProjectRequest,
  UpdateProjectRequest,
  AddProjectMemberRequest,
  UpdateProjectMemberRequest,
  GetProjectsParams,
  GetAvailableMembersParams,
  PagedResult,
} from '@/types/api';

export const projectsApi = {
  // 取得專案列表
  getProjects: (params?: GetProjectsParams) =>
    apiClient.get<PagedResult<ProjectListDto>>('/projects', params as Record<string, string | number | boolean | undefined>),

  // 取得我參與的專案
  getParticipatedProjects: (params?: GetProjectsParams) =>
    apiClient.get<PagedResult<ProjectListDto>>('/projects/participated', params as Record<string, string | number | boolean | undefined>),

  // 取得我管理的專案
  getManagedProjects: (params?: GetProjectsParams) =>
    apiClient.get<PagedResult<ProjectListDto>>('/projects/managed', params as Record<string, string | number | boolean | undefined>),

  // 取得專案詳情
  getProject: (id: string) =>
    apiClient.get<ProjectDto>(`/projects/${id}`),

  // 建立專案
  createProject: (data: CreateProjectRequest) =>
    apiClient.post<{ id: string }>('/projects', data),

  // 更新專案
  updateProject: (id: string, data: UpdateProjectRequest) =>
    apiClient.put<ProjectDto>(`/projects/${id}`, data),

  // 刪除專案
  deleteProject: (id: string) =>
    apiClient.delete<void>(`/projects/${id}`),

  // 取得專案成員
  getProjectMembers: (id: string) =>
    apiClient.get<ProjectMemberDto[]>(`/projects/${id}/members`),

  // 新增專案成員
  addProjectMember: (id: string, data: AddProjectMemberRequest) =>
    apiClient.post<ProjectMemberDto>(`/projects/${id}/members`, data),

  // 更新專案成員
  updateProjectMember: (id: string, userId: string, data: UpdateProjectMemberRequest) =>
    apiClient.put<ProjectMemberDto>(`/projects/${id}/members/${userId}`, data),

  // 移除專案成員
  removeProjectMember: (id: string, userId: string) =>
    apiClient.delete<void>(`/projects/${id}/members/${userId}`),

  // 離開專案
  leaveProject: (id: string) =>
    apiClient.post<void>(`/projects/${id}/leave`),

  // 封存專案
  archiveProject: (id: string) =>
    apiClient.post<ProjectDto>(`/projects/${id}/archive`),

  // 取得可新增的成員
  getAvailableMembers: (id: string, params?: GetAvailableMembersParams) =>
    apiClient.get<AvailableMemberDto[]>(`/projects/${id}/members/available`, params as Record<string, string | number | boolean | undefined>),
};

export default projectsApi;

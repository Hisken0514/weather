// 角色管理 API

import { apiClient } from './client';
import type { RoleDto, CreateRoleRequest, UpdateRoleRequest, PermissionDefinitionDto } from '@/types/api/roles';

export const rolesApi = {
  getAll: () =>
    apiClient.get<RoleDto[]>('/roles'),

  get: (id: string) =>
    apiClient.get<RoleDto>(`/roles/${id}`),

  create: (data: CreateRoleRequest) =>
    apiClient.post<RoleDto>('/roles', data),

  update: (id: string, data: UpdateRoleRequest) =>
    apiClient.put<RoleDto>(`/roles/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<void>(`/roles/${id}`),

  getPermissions: () =>
    apiClient.get<PermissionDefinitionDto[]>('/roles/permissions'),
};

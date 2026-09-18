// 使用者 API

import { apiClient } from './client';
import type {
  UserProfileDto,
  UserListDto,
  UpdateUserProfileRequest,
  ChangePasswordRequest,
  UpdateUserRequest,
  GetUsersParams,
  PagedResult,
} from '@/types/api';

export const usersApi = {
  // 取得當前使用者
  getCurrentUser: () =>
    apiClient.get<UserProfileDto>('/users/me'),

  // 更新當前使用者資料
  updateProfile: (data: UpdateUserProfileRequest) =>
    apiClient.put<UserProfileDto>('/users/me', data),

  // 修改密碼
  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<{ message: string }>('/users/me/change-password', data),

  // 取得使用者列表 (系統管理員)
  getUsers: (params?: GetUsersParams) =>
    apiClient.get<PagedResult<UserListDto>>('/users', params as Record<string, string | number | boolean | undefined>),

  // 取得指定使用者 (系統管理員)
  getUser: (id: string) =>
    apiClient.get<UserProfileDto>(`/users/${id}`),

  // 更新使用者 (系統管理員)
  updateUser: (id: string, data: UpdateUserRequest) =>
    apiClient.put<UserProfileDto>(`/users/${id}`, data),

  // 啟用使用者 (系統管理員)
  activateUser: (id: string) =>
    apiClient.post<{ message: string }>(`/users/${id}/activate`),

  // 停用使用者 (系統管理員)
  deactivateUser: (id: string) =>
    apiClient.post<{ message: string }>(`/users/${id}/deactivate`),

  // 取得使用者綁定的產業園區 (系統管理員)
  getUserIndustrialParks: (id: string) =>
    apiClient.get<string[]>(`/supervision/users/${id}/industrial-parks`),

  // 設定使用者綁定的產業園區 (系統管理員)
  setUserIndustrialParks: (id: string, parkNames: string[]) =>
    apiClient.put<void>(`/supervision/users/${id}/industrial-parks`, { parkNames }),
};

export default usersApi;

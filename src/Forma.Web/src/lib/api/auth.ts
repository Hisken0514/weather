// 認證 API

import { apiClient } from './client';
import type {
  AuthResponseDto,
  ProfileDto,
  LoginRequest,
  RegisterRequest,
  SetupAdminRequest,
  SystemStatusDto,
  UpdateProfileRequest,
} from '@/types/api';

export const authApi = {
  // 取得系統狀態
  getSystemStatus: () =>
    apiClient.get<SystemStatusDto>('/auth/status'),

  // 首次設定 - 註冊管理員
  setupAdmin: (data: SetupAdminRequest) =>
    apiClient.post<AuthResponseDto>('/auth/setup', data),

  // 登入
  login: (data: LoginRequest) =>
    apiClient.post<AuthResponseDto>('/auth/login', data),

  // 註冊
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponseDto>('/auth/register', data),

  // 刷新 Token
  refreshToken: () =>
    apiClient.post<AuthResponseDto>('/auth/refresh'),

  // 登出
  logout: () =>
    apiClient.post<void>('/auth/logout'),

  // 登出所有裝置
  logoutAll: () =>
    apiClient.post<void>('/auth/logout-all'),

  // 取得個人資料
  getProfile: () =>
    apiClient.get<ProfileDto>('/auth/profile'),

  // 更新個人資料
  updateProfile: (data: UpdateProfileRequest) =>
    apiClient.put<ProfileDto>('/auth/profile', data),
};

export default authApi;

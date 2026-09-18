// 系統設定 API

import { apiClient } from './client';
import type {
  SystemSettingDto,
  EmailSettingsDto,
  FileStorageSettingsDto,
  SecuritySettingsDto,
  PasswordPolicyDto,
  CaptchaSettingsDto,
  SecurityHeadersSettingsDto,
  CorsSettingsDto,
  Fido2SettingsDto,
} from '@/types/api';

export const settingsApi = {
  // 取得所有設定分類
  getAllCategories: () =>
    apiClient.get<SystemSettingDto[]>('/settings'),

  // Email 設定
  getEmailSettings: () =>
    apiClient.get<EmailSettingsDto>('/settings/email'),

  updateEmailSettings: (data: EmailSettingsDto) =>
    apiClient.put<{ message: string }>('/settings/email', data),

  // 檔案存儲設定
  getFileStorageSettings: () =>
    apiClient.get<FileStorageSettingsDto>('/settings/file-storage'),

  updateFileStorageSettings: (data: FileStorageSettingsDto) =>
    apiClient.put<{ message: string }>('/settings/file-storage', data),

  // 安全性設定
  getSecuritySettings: () =>
    apiClient.get<SecuritySettingsDto>('/settings/security'),

  updateSecuritySettings: (data: SecuritySettingsDto) =>
    apiClient.put<{ message: string }>('/settings/security', data),

  // 密碼策略設定
  getPasswordPolicySettings: () =>
    apiClient.get<PasswordPolicyDto>('/settings/password-policy'),

  updatePasswordPolicySettings: (data: PasswordPolicyDto) =>
    apiClient.put<{ message: string }>('/settings/password-policy', data),

  // CAPTCHA 設定
  getCaptchaSettings: () =>
    apiClient.get<CaptchaSettingsDto>('/settings/captcha'),

  updateCaptchaSettings: (data: CaptchaSettingsDto) =>
    apiClient.put<{ message: string }>('/settings/captcha', data),

  // Security Headers 設定
  getSecurityHeadersSettings: () =>
    apiClient.get<SecurityHeadersSettingsDto>('/settings/security-headers'),

  updateSecurityHeadersSettings: (data: SecurityHeadersSettingsDto) =>
    apiClient.put<{ message: string }>('/settings/security-headers', data),

  // FIDO2 設定
  getFido2Settings: () =>
    apiClient.get<Fido2SettingsDto>('/settings/fido2'),

  updateFido2Settings: (data: Fido2SettingsDto) =>
    apiClient.put<{ message: string }>('/settings/fido2', data),

  // CORS 設定
  getCorsSettings: () =>
    apiClient.get<CorsSettingsDto>('/settings/cors'),

  updateCorsSettings: (data: CorsSettingsDto) =>
    apiClient.put<{ message: string }>('/settings/cors', data),

};

export default settingsApi;

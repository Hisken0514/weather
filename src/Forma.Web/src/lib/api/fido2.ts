// FIDO2 / Passkey API

import { apiClient } from './client';
import type { Fido2SettingsDto, Fido2CredentialInfo } from '@/types/api';
import type { AuthResponseDto } from '@/types/api';

export const fido2Api = {
  // 查詢 FIDO2 啟用狀態（公開）
  getStatus: () =>
    apiClient.getPublic<Fido2SettingsDto>('/auth/fido2/status'),

  // 開始註冊
  startRegistration: (deviceName?: string) =>
    apiClient.post<PublicKeyCredentialCreationOptions>('/auth/fido2/register/start', { deviceName }),

  // 完成註冊
  completeRegistration: (attestationResponse: unknown, deviceName?: string) =>
    apiClient.post<{ message: string }>('/auth/fido2/register/complete', {
      attestationResponse,
      deviceName,
    }),

  // 取得目前使用者的憑證列表
  getCredentials: () =>
    apiClient.get<Fido2CredentialInfo[]>('/auth/fido2/credentials'),

  // 刪除憑證
  deleteCredential: (id: string) =>
    apiClient.delete<{ message: string }>(`/auth/fido2/credentials/${id}`),

  // 開始認證（公開）
  startAuthentication: (email?: string) =>
    apiClient.postPublic<PublicKeyCredentialRequestOptions>('/auth/fido2/authenticate/start', { email }),

  // 完成認證（公開，回傳 JWT）
  completeAuthentication: (assertionResponse: unknown) =>
    apiClient.postPublic<AuthResponseDto>('/auth/fido2/authenticate/complete', {
      assertionResponse: assertionResponse,
    }),
};

export default fido2Api;

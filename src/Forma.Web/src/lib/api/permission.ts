// 權限 API

import { apiClient } from './client';
import type {
  FormPermissionSummaryDto,
  GrantPermissionRequest,
} from '@/types/api';

export const permissionsApi = {
  // 取得表單權限
  getFormPermissions: (formId: string) =>
    apiClient.get<FormPermissionSummaryDto>(`/permissions/form/${formId}`),

  // 授予權限
  grantPermission: (data: GrantPermissionRequest) =>
    apiClient.post<{ id: string }>('/permissions', data),

  // 移除權限
  revokePermission: (id: string) =>
    apiClient.delete<void>(`/permissions/${id}`),
};

export default permissionsApi;

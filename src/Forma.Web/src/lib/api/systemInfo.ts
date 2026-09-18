// 系統資訊 API

import { apiClient } from './client';
import type { SystemInfoDto, HealthStatusDto } from '@/types/api';

export const systemInfoApi = {
  // 取得系統資訊 (需要系統管理員權限)
  getSystemInfo: () =>
    apiClient.get<SystemInfoDto>('/system-info'),

  // 健康檢查 (公開)
  getHealth: () =>
    apiClient.get<HealthStatusDto>('/system-info/health'),
};

export default systemInfoApi;

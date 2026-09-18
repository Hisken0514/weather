// 健康檢查 API

import { apiClient } from './client';
import type { HealthStatus } from '@/types/api';

export const healthApi = {
  // 健康檢查
  check: () =>
    apiClient.get<HealthStatus>('/health'),
};

export default healthApi;

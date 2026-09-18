// 郵件日誌 API

import { apiClient } from './client';
import type { EmailLogDto, EmailLogQueryParams } from '@/types/api/emailLogs';
import type { PagedResult } from '@/types/api/common';

export const emailLogsApi = {
  getLogs: (params?: EmailLogQueryParams) =>
    apiClient.get<PagedResult<EmailLogDto>>('/logs/email', params as Record<string, string | number | boolean | undefined>),

  getLog: (id: number) =>
    apiClient.get<EmailLogDto>(`/logs/email/${id}`),
};

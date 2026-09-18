// 報告 API

import { apiClient } from './client';
import type {
  ReportDto,
  GetFormReportParams,
} from '@/types/api';

export const reportsApi = {
  // 取得表單報告
  getFormReport: (formId: string, params?: GetFormReportParams) =>
    apiClient.get<ReportDto>(`/reports/${formId}`, params as Record<string, string | number | boolean | undefined>),
};

export default reportsApi;

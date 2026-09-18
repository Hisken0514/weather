// 匯出 API

import { apiClient } from './client';
import type {
  ExportDto,
  CreateExportRequest,
} from '@/types/api';

export const exportsApi = {
  // 建立匯出任務
  createExport: (data: CreateExportRequest) =>
    apiClient.post<ExportDto>('/exports', data),

  // 取得匯出任務狀態
  getExport: (id: string) =>
    apiClient.get<ExportDto>(`/exports/${id}`),

  // 取得下載連結
  getDownloadUrl: (id: string) =>
    `/api/exports/${id}/download`,
};

export default exportsApi;

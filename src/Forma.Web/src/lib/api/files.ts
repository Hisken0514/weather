// 檔案管理 API

import { apiClient } from './client';
import type {
  FileUploadResponse,
  FileInfoResponse,
  FileListItemResponse,
  FileStatisticsResponse,
  FileQueryParams,
  FileUpdateRequest,
  PagedResult,
} from '@/types/api';

export const filesApi = {
  // 上傳單一檔案
  upload: async (file: File, options?: {
    entityType?: string;
    entityId?: string;
    isPublic?: boolean;
    expiresAt?: string;
  }): Promise<FileUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.entityType) formData.append('entityType', options.entityType);
    if (options?.entityId) formData.append('entityId', options.entityId);
    if (options?.isPublic !== undefined) formData.append('isPublic', String(options.isPublic));
    if (options?.expiresAt) formData.append('expiresAt', options.expiresAt);

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message);
    }

    return response.json();
  },

  // 批量上傳檔案
  uploadBatch: async (files: File[], options?: {
    entityType?: string;
    entityId?: string;
    isPublic?: boolean;
  }): Promise<FileUploadResponse[]> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (options?.entityType) formData.append('entityType', options.entityType);
    if (options?.entityId) formData.append('entityId', options.entityId);
    if (options?.isPublic !== undefined) formData.append('isPublic', String(options.isPublic));

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/files/batch`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Batch upload failed' }));
      throw new Error(error.message);
    }

    return response.json();
  },

  // 下載檔案
  download: (id: string): string => {
    const token = localStorage.getItem('accessToken');
    return `${import.meta.env.VITE_API_BASE_URL || '/api'}/files/${id}/download${token ? `?token=${token}` : ''}`;
  },

  // 取得檔案資訊
  getFile: (id: string) =>
    apiClient.get<FileInfoResponse>(`/files/${id}`),

  // 查詢檔案列表
  getFiles: (params?: FileQueryParams) =>
    apiClient.get<PagedResult<FileListItemResponse>>('/files', params as Record<string, string | number | boolean | undefined>),

  // 刪除檔案
  deleteFile: (id: string) =>
    apiClient.delete<{ message: string }>(`/files/${id}`),

  // 更新檔案資訊
  updateFile: (id: string, data: FileUpdateRequest) =>
    apiClient.put<FileInfoResponse>(`/files/${id}`, data),

  // 取得檔案統計
  getStatistics: () =>
    apiClient.get<FileStatisticsResponse>('/files/statistics'),
};

export default filesApi;

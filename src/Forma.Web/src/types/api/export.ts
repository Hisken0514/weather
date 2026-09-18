// 匯出相關類型定義

export interface ExportDto {
  id: string;
  formId: string;
  formName: string;
  format: string;
  filters?: string;
  status: string;
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  errorMessage?: string;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  downloadUrl?: string;
}

// Request DTOs
export interface CreateExportRequest {
  formId: string;
  format?: string;
  filters?: string;
}

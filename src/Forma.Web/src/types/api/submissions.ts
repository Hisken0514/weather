// 表單提交相關類型定義

export interface SubmissionDto {
  id: string;
  formId: string;
  formName: string;
  projectId: string;
  projectName: string;
  submittedById?: string;
  submittedByUsername?: string;
  submissionData: string;
  formVersion: string;
  submittedAt: string;
  updatedAt?: string;
  status: string;
  reviewedById?: string;
  reviewedByUsername?: string;
  reviewedAt?: string;
  ipAddress?: string;
  reportDownloadedAt?: string;
  canEdit: boolean;
  canDelete: boolean;
}

export interface SubmissionListDto {
  id: string;
  formId: string;
  formName: string;
  submittedById?: string;
  submittedByUsername?: string;
  submittedAt: string;
  status: string;
  reviewedAt?: string;
  reportDownloadedAt?: string;
}

// Request DTOs
export interface CreateSubmissionRequest {
  formId: string;
  submissionData: string;
  isDraft: boolean;
}

export interface UpdateSubmissionRequest {
  submissionData: string;
  status?: string;
}

// Query Parameters
export interface GetFormSubmissionsParams {
  status?: string;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

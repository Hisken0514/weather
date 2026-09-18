// 表單相關類型定義

export interface FormDto {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  description?: string;
  schema: string;
  templateId?: string;
  templateName?: string;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string;
  isActive: boolean;
  version: string;
  accessControl: string;
  submissionCount: number;
  projectSettings?: string;
  canEdit: boolean;
  canDelete: boolean;
  isLocked: boolean;
  lockedByUsername?: string;
  lockedAt?: string;
}

export interface FormListDto {
  id: string;
  name: string;
  description?: string;
  version: string;
  accessControl: string;
  isActive: boolean;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  createdByUsername: string;
  submissionCount: number;
  isLocked: boolean;
  lockedByUsername?: string;
  lockedAt?: string;
}

export interface FormVersionDto {
  id: string;
  formId: string;
  version: string;
  schema: string;
  changeNote?: string;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  isPublished: boolean;
}

// Request DTOs
export interface CreateFormRequest {
  name: string;
  description?: string;
  schema: string;
  templateId?: string;
  accessControl?: string;
}

export interface UpdateFormRequest {
  name: string;
  description?: string;
  schema: string;
  accessControl?: string;
  isActive?: boolean;
}

export interface CloneFormRequest {
  targetProjectId?: string;
  newName?: string;
}

// Query Parameters
export interface GetFormsParams {
  searchTerm?: string;
  isPublished?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

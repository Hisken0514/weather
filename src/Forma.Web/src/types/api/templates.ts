// 範本相關類型定義

export interface TemplateDto {
  id: string;
  name: string;
  description?: string;
  category?: string;
  schema: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  updatedAt?: string;
  usageCount: number;
  canEdit: boolean;
  canDelete: boolean;
}

export interface TemplateListDto {
  id: string;
  name: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  createdByUsername: string;
  createdAt: string;
  usageCount: number;
}

// Request DTOs
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  schema: string;
  thumbnailUrl?: string;
  isPublic: boolean;
}

export interface UpdateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  schema: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
}

// Query Parameters
export interface GetTemplatesParams {
  searchTerm?: string;
  category?: string;
  isPublic?: boolean;
  onlyMine?: boolean;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

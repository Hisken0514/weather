// 組織相關類型定義

export interface OrganizationDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  type: string;
  createdAt: string;
  updatedAt?: string;
  projectCount: number;
}

export interface OrganizationListDto {
  id: string;
  name: string;
  code: string;
  type: string;
  projectCount: number;
  createdAt: string;
}

// Request DTOs
export interface CreateOrganizationRequest {
  name: string;
  code: string;
  description?: string;
  type?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  description?: string;
  type?: string;
}

// Query Parameters
export interface GetOrganizationsParams {
  searchTerm?: string;
  type?: string;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetOrganizationProjectsParams {
  searchTerm?: string;
  year?: number;
  status?: string;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// 專案相關類型定義

export interface ProjectTheme {
  logo?: string;
  logoFileId?: string;
  logoBackgroundColor?: string;
  backgroundColor?: string;
  brandColor?: string;
  questionColor?: string;
  inputColor?: string;
  inputBorderColor?: string;
  cardBackgroundColor?: string;
  cardBorderColor?: string;
  cardBorderRadius?: number;
  hideProgressBar?: boolean;
  fontFamily?: string;
  allowFormOverride?: boolean;
}

export interface ProjectDto {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  code: string;
  description?: string;
  year: number;
  budget?: number;
  startDate?: string;
  endDate?: string;
  status: string;
  createdById: string;
  createdByUsername: string;
  createdAt: string;
  updatedAt?: string;
  memberCount: number;
  formCount: number;
  currentUserRole?: string;
  settings?: string;
}

export interface ProjectListDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  year: number;
  status: string;
  startDate?: string;
  endDate?: string;
  memberCount: number;
  formCount: number;
  currentUserRole?: string;
  createdAt: string;
}

export interface ProjectMemberDto {
  userId: string;
  username: string;
  email: string;
  department?: string;
  jobTitle?: string;
  role: string;
  addedAt: string;
  addedById: string;
  addedByUsername: string;
}

export interface AvailableMemberDto {
  id: string;
  username: string;
  email: string;
  department?: string;
  jobTitle?: string;
}

// Request DTOs
export interface CreateProjectRequest {
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  year: number;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string;
  year: number;
  budget?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  settings?: string;
}

export interface AddProjectMemberRequest {
  userId: string;
  role: string;
}

export interface UpdateProjectMemberRequest {
  role: string;
}

// Query Parameters
export interface GetProjectsParams {
  searchTerm?: string;
  year?: number;
  status?: string;
  onlyMyProjects?: boolean;
  sortBy?: string;
  sortDescending?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetAvailableMembersParams {
  searchTerm?: string;
  limit?: number;
}

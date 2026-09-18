// 使用者相關類型定義

export interface UserProfileDto {
  id: string;
  username: string;
  email: string;
  roleId?: string;
  roleName?: string;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
  industrialParks: string[];
}

export interface UserListDto {
  id: string;
  username: string;
  email: string;
  roleId?: string;
  roleName?: string;
  department?: string;
  isActive: boolean;
  lastLoginAt?: string;
  industrialParks: string[];
}

// Request DTOs
export interface UpdateUserProfileRequest {
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  roleId?: string;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
}

// Query Parameters
export interface GetUsersParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  isActive?: boolean;
  sortBy?: string;
  sortDescending?: boolean;
}

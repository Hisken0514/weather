// 認證相關類型定義

export interface SystemStatusDto {
  isInitialized: boolean;
  version: string;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  roleName?: string;
  permissions: number;
  department?: string;
  jobTitle?: string;
  isActive: boolean;
}

export interface ProfileDto {
  id: string;
  username: string;
  email: string;
  roleName?: string;
  permissions: number;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponseDto {
  accessToken?: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  user: UserDto;
}

// Request DTOs
export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SetupAdminRequest {
  username: string;
  email: string;
  password: string;
  department?: string;
  jobTitle?: string;
}

export interface UpdateProfileRequest {
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
}

// 權限相關類型定義

export interface PermissionDto {
  id: string;
  formId: string;
  userId?: string;
  username?: string;
  userEmail?: string;
  projectMemberRole?: string;
  permissionType: string;
  grantedById: string;
  grantedByUsername: string;
  grantedAt: string;
}

export interface FormPermissionSummaryDto {
  formId: string;
  formName: string;
  permissions: PermissionDto[];
}

// Request DTOs
export interface GrantPermissionRequest {
  formId: string;
  userId?: string;
  projectMemberRole?: string;
  permissionType: string;
}

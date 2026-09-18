// 角色相關類型定義

export interface RoleDto {
  id: string;
  name: string;
  description?: string;
  permissionValue: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionValue: number;
}

export interface UpdateRoleRequest {
  name: string;
  description?: string;
  permissionValue: number;
}

export interface PermissionDefinitionDto {
  key: string;
  value: number;
  group: string;
}

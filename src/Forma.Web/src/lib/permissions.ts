/**
 * 計畫角色權限定義
 * 根據使用者在計畫中的角色判斷可執行的操作
 */

export type ProjectRole = 'Owner' | 'Manager' | 'Analyst' | 'Member' | 'Submitter';

export type Permission =
  | 'manage_project'      // 管理計畫設定
  | 'manage_members'      // 管理成員
  | 'create_form'         // 建立表單
  | 'edit_form'           // 編輯表單
  | 'publish_form'        // 發布/下架表單
  | 'view_submissions'    // 查看提交資料
  | 'export_data'         // 匯出報表
  | 'submit_form';        // 填寫表單

/**
 * 角色權限對照表
 */
const rolePermissions: Record<ProjectRole, Permission[]> = {
  Owner: [
    'manage_project',
    'manage_members',
    'create_form',
    'edit_form',
    'publish_form',
    'view_submissions',
    'export_data',
    'submit_form',
  ],
  Manager: [
    'manage_project',
    'manage_members',
    'create_form',
    'edit_form',
    'publish_form',
    'view_submissions',
    'export_data',
    'submit_form',
  ],
  Analyst: [
    'view_submissions',
    'export_data',
    'submit_form',
  ],
  Member: [
    'create_form',
    'edit_form',
    'publish_form',
    'view_submissions',
    'export_data',
    'submit_form',
  ],
  Submitter: [
    'submit_form',
  ],
};

/**
 * 檢查使用者是否有指定權限
 */
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = rolePermissions[role as ProjectRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

/**
 * 檢查使用者是否有任一指定權限
 */
export function hasAnyPermission(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * 檢查使用者是否有所有指定權限
 */
export function hasAllPermissions(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * 取得角色的所有權限
 */
export function getRolePermissions(role: string | undefined): Permission[] {
  if (!role) return [];
  return rolePermissions[role as ProjectRole] || [];
}

/**
 * 角色顯示名稱
 */
export const roleLabels: Record<ProjectRole, string> = {
  Owner: '擁有者',
  Manager: '管理員',
  Analyst: '分析師',
  Member: '一般成員',
  Submitter: '提交者',
};

/**
 * 取得角色顯示名稱
 */
export function getRoleLabel(role: string | undefined): string {
  if (!role) return '未知';
  return roleLabels[role as ProjectRole] || role;
}

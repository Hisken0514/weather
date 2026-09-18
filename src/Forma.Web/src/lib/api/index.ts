// API 統一匯出

export { apiClient } from './client';
export { authApi } from './auth';
export { dashboardApi } from './dashboard';
export { formsApi } from './forms';
export { projectsApi } from './projects';
export { organizationsApi } from './organizations';
export { submissionsApi } from './submissions';
export { templatesApi } from './templates';
export { notificationsApi } from './notifications';
export { permissionsApi } from './permission';
export { reportsApi } from './reports';
export { exportsApi } from './export';
export { usersApi } from './users';
export { healthApi } from './health';
export { filesApi } from './files';
export { logsApi } from './logs';
export { systemInfoApi } from './systemInfo';
export { settingsApi } from './settings';
export { emailTemplatesApi } from './emailTemplates';
export { rolesApi } from './roles';
export { emailLogsApi } from './emailLogs';
export { fido2Api } from './fido2';
export { riskScoringApi } from './riskScoring';

// 統一 API 物件
export const api = {
  auth: () => import('./auth').then(m => m.authApi),
  dashboard: () => import('./dashboard').then(m => m.dashboardApi),
  forms: () => import('./forms').then(m => m.formsApi),
  projects: () => import('./projects').then(m => m.projectsApi),
  organizations: () => import('./organizations').then(m => m.organizationsApi),
  submissions: () => import('./submissions').then(m => m.submissionsApi),
  templates: () => import('./templates').then(m => m.templatesApi),
  notifications: () => import('./notifications').then(m => m.notificationsApi),
  permissions: () => import('./permission').then(m => m.permissionsApi),
  reports: () => import('./reports').then(m => m.reportsApi),
  exports: () => import('./export').then(m => m.exportsApi),
  users: () => import('./users').then(m => m.usersApi),
  health: () => import('./health').then(m => m.healthApi),
  files: () => import('./files').then(m => m.filesApi),
  logs: () => import('./logs').then(m => m.logsApi),
  systemInfo: () => import('./systemInfo').then(m => m.systemInfoApi),
  settings: () => import('./settings').then(m => m.settingsApi),
  emailTemplates: () => import('./emailTemplates').then(m => m.emailTemplatesApi),
  roles: () => import('./roles').then(m => m.rolesApi),
  emailLogs: () => import('./emailLogs').then(m => m.emailLogsApi),
  fido2: () => import('./fido2').then(m => m.fido2Api),
};

export default api;

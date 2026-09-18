// 通知 API

import { apiClient } from './client';
import type {
  NotificationDto,
  NotificationPreferenceDto,
  UnreadCountDto,
  UpdatePreferencesRequest,
  SendTestEmailRequest,
  GetNotificationsParams,
  PagedResult,
} from '@/types/api';

export const notificationsApi = {
  // 取得通知列表
  getNotifications: (params?: GetNotificationsParams) =>
    apiClient.get<PagedResult<NotificationDto>>('/notifications', params as Record<string, string | number | boolean | undefined>),

  // 取得未讀數量
  getUnreadCount: () =>
    apiClient.get<UnreadCountDto>('/notifications/unread-count'),

  // 標記為已讀
  markAsRead: (id: string) =>
    apiClient.put<void>(`/notifications/${id}/read`),

  // 全部標記已讀
  markAllAsRead: () =>
    apiClient.put<{ markedCount: number }>('/notifications/read-all'),

  // 刪除通知
  deleteNotification: (id: string) =>
    apiClient.delete<void>(`/notifications/${id}`),

  // 取得通知偏好設定
  getPreferences: () =>
    apiClient.get<NotificationPreferenceDto>('/notifications/preferences'),

  // 更新通知偏好設定
  updatePreferences: (data: UpdatePreferencesRequest) =>
    apiClient.put<NotificationPreferenceDto>('/notifications/preferences', data),

  // 發送測試郵件 (系統管理員)
  sendTestEmail: (data?: SendTestEmailRequest) =>
    apiClient.post<{ success: boolean; message: string }>('/notifications/test-email', data),
};

export default notificationsApi;

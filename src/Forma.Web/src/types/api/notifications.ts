// 通知相關類型定義

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferenceDto {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  notifyOnFormSubmission: boolean;
  notifyOnSubmissionReview: boolean;
  notifyOnMemberChange: boolean;
  notifyOnProjectUpdate: boolean;
  notifyOnFormPublish: boolean;
  dailyDigestEmail: boolean;
}

export interface UnreadCountDto {
  count: number;
}

// Request DTOs
export interface UpdatePreferencesRequest {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  notifyOnFormSubmission: boolean;
  notifyOnSubmissionReview: boolean;
  notifyOnMemberChange: boolean;
  notifyOnProjectUpdate: boolean;
  notifyOnFormPublish: boolean;
  dailyDigestEmail: boolean;
}

export interface SendTestEmailRequest {
  targetEmail?: string;
}

// Query Parameters
export interface GetNotificationsParams {
  isRead?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

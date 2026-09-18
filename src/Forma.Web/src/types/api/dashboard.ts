// 儀表板相關類型定義

export interface DashboardSummaryDto {
  totalProjects: number;
  activeProjects: number;
  totalForms: number;
  publishedForms: number;
  totalSubmissions: number;
  pendingReviewCount: number;
  unreadNotifications: number;
  recentProjects: RecentProjectDto[];
}

export interface RecentProjectDto {
  id: string;
  name: string;
  organizationName: string;
  role: string;
  formCount: number;
  pendingSubmissions: number;
  lastActivityAt: string;
}

export interface PendingTaskDto {
  type: string;
  title: string;
  description: string;
  link?: string;
  entityId?: string;
  entityType?: string;
  projectName: string;
  createdAt: string;
  priority: string;
}

export interface RecentActivityDto {
  type: string;
  description: string;
  actorName?: string;
  projectName?: string;
  formName?: string;
  entityId?: string;
  entityType?: string;
  occurredAt: string;
}

export interface PersonalStatisticsDto {
  submissionsThisMonth: number;
  submissionsLastMonth: number;
  reviewedThisMonth: number;
  formsCreatedThisMonth: number;
  averageReviewTime: number;
  dailyActivities: DailyActivityStat[];
}

export interface DailyActivityStat {
  date: string;
  submissions: number;
  reviews: number;
}

export interface ProjectStatsDto {
  projectId: string;
  projectName: string;
  organizationName: string;
  role: string;
  totalForms: number;
  publishedForms: number;
  totalSubmissions: number;
  pendingReviews: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  lastSubmissionAt?: string;
}

export interface PendingReviewSubmissionDto {
  id: string;
  formId: string;
  formName: string;
  projectId: string;
  projectName: string;
  submittedByUsername?: string;
  submittedAt: string;
  status: string;
}

// 儀表板 API

import { apiClient } from './client';
import type {
  DashboardSummaryDto,
  PendingTaskDto,
  RecentActivityDto,
  PersonalStatisticsDto,
  ProjectStatsDto,
  PendingReviewSubmissionDto,
  PagedResult,
} from '@/types/api';

export const dashboardApi = {
  // 取得儀表板摘要
  getSummary: () =>
    apiClient.get<DashboardSummaryDto>('/dashboard/summary'),

  // 取得待辦事項
  getPendingTasks: (limit: number = 20) =>
    apiClient.get<PendingTaskDto[]>('/dashboard/pending-tasks', { limit }),

  // 取得最近活動
  getRecentActivities: (limit: number = 20) =>
    apiClient.get<RecentActivityDto[]>('/dashboard/recent-activities', { limit }),

  // 取得個人統計
  getStatistics: () =>
    apiClient.get<PersonalStatisticsDto>('/dashboard/statistics'),

  // 取得專案統計
  getProjectsStats: () =>
    apiClient.get<ProjectStatsDto[]>('/dashboard/projects/stats'),

  // 取得待審核提交
  getPendingReview: (pageNumber: number = 1, pageSize: number = 20) =>
    apiClient.get<PagedResult<PendingReviewSubmissionDto>>('/dashboard/pending-review', {
      pageNumber,
      pageSize,
    }),
};

export default dashboardApi;

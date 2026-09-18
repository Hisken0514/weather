// 系統日誌相關類型定義

export interface ActionLogDto {
  id: number;
  actionType: string;
  actionName: string;
  userId?: string;
  userName?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  isSuccess: boolean;
  errorMessage?: string;
  executionDuration?: number;
  createdAt: string;
}

export interface ActionLogQueryParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  actionType?: string;
  userId?: string;
  entityType?: string;
  isSuccess?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface ActionLogStatisticsDto {
  totalCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  actionTypeDistribution: Record<string, number>;
  entityTypeDistribution: Record<string, number>;
  dailyTrend: ActionLogDailyTrendItem[];
  topUsers: ActionLogUserSummary[];
  averageExecutionDuration: number;
}

export interface ActionLogDailyTrendItem {
  date: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export interface ActionLogUserSummary {
  userId: string;
  userName: string;
  actionCount: number;
}

export interface AuditLogDto {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface AuditLogQueryParams {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  descending?: boolean;
}

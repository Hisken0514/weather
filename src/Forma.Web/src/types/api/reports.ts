// 報告相關類型定義

export interface ReportDto {
  formId: string;
  formName: string;
  totalSubmissions: number;
  submittedCount: number;
  draftCount: number;
  approvedCount: number;
  rejectedCount: number;
  firstSubmissionAt?: string;
  lastSubmissionAt?: string;
  dailyStats: DailySubmissionStat[];
  fieldSummaries: FieldSummary[];
}

export interface DailySubmissionStat {
  date: string;
  count: number;
}

export interface FieldSummary {
  fieldName: string;
  fieldType: string;
  responseCount: number;
  valueDistribution?: Record<string, number>;
}

// Query Parameters
export interface GetFormReportParams {
  startDate?: string;
  endDate?: string;
}

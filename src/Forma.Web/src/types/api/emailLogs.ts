// 郵件日誌相關類型定義

export interface EmailLogDto {
  id: number;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  templateKey?: string;
  isSuccess: boolean;
  errorMessage?: string;
  sentAt: string;
  userId?: string;
  userName?: string;
}

export interface EmailLogQueryParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  templateKey?: string;
  isSuccess?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

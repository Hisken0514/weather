// 檔案管理相關類型定義

export const FileStatus = {
  Uploading: 0,
  Completed: 1,
  Processing: 2,
  Deleted: 3,
  Error: 4,
} as const;

export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

export interface FileUploadRequest {
  file: File;
  entityType?: string;
  entityId?: string;
  isPublic?: boolean;
  expiresAt?: string;
}

export interface FileUploadResponse {
  id: string;
  originalFileName: string;
  storedFileName: string;
  contentType: string;
  fileSize: number;
  status: FileStatus;
  createdAt: string;
}

export interface FileInfoResponse {
  id: string;
  originalFileName: string;
  storedFileName: string;
  contentType: string;
  fileSize: number;
  fileHash: string;
  status: FileStatus;
  entityType?: string;
  entityId?: string;
  uploaderId: string;
  uploaderName?: string;
  downloadCount: number;
  isPublic: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FileListItemResponse {
  id: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  status: FileStatus;
  entityType?: string;
  downloadCount: number;
  isPublic: boolean;
  createdAt: string;
}

export interface FileStatisticsResponse {
  totalFiles: number;
  totalSize: number;
  filesByStatus: Record<string, number>;
  filesByType: Record<string, number>;
  averageFileSize: number;
  totalDownloads: number;
}

export interface FileQueryParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  entityType?: string;
  entityId?: string;
  status?: FileStatus;
  isPublic?: boolean;
  sortBy?: string;
  sortDescending?: boolean;
}

export interface FileUpdateRequest {
  isPublic?: boolean;
  expiresAt?: string;
}

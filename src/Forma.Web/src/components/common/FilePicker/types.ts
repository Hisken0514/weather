/**
 * FilePicker 元件類型定義
 */

import type { FileUploadResponse, FileListItemResponse } from '@/types/api';

/** 已選擇的檔案 */
export interface SelectedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  isNew?: boolean; // 是否為新上傳的檔案
}

/** FilePicker Props */
export interface FilePickerProps {
  /** 已選擇的檔案 */
  value?: SelectedFile[];
  /** 選擇變更回調 */
  onChange?: (files: SelectedFile[]) => void;
  /** 是否允許多選 */
  multiple?: boolean;
  /** 接受的檔案類型 (MIME types，如 "image/*,application/pdf") */
  accept?: string;
  /** 最大檔案大小 (bytes) */
  maxSize?: number;
  /** 最大檔案數量 */
  maxFiles?: number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 實體類型 (用於關聯檔案) */
  entityType?: string;
  /** 實體 ID (用於關聯檔案) */
  entityId?: string;
  /** 是否公開 */
  isPublic?: boolean;
  /** 錯誤訊息 */
  error?: string;
  /** 輔助文字 */
  helperText?: string;
  /** 標籤 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 是否隱藏既有檔案瀏覽 */
  hideFileBrowser?: boolean;
  /** 緊湊模式 */
  compact?: boolean;
}

/** 上傳進度 */
export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  result?: FileUploadResponse;
}

/** 檔案瀏覽對話框 Props */
export interface FileBrowserDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (files: FileListItemResponse[]) => void;
  multiple?: boolean;
  accept?: string;
  entityType?: string;
}

/** 格式化檔案大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** 判斷是否為圖片 */
export function isImageFile(type: string): boolean {
  return type.startsWith('image/');
}

/** 取得檔案圖示 */
export function getFileIcon(type: string): string {
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'VideoFile';
  if (type.startsWith('audio/')) return 'AudioFile';
  if (type === 'application/pdf') return 'PictureAsPdf';
  if (type.includes('word') || type.includes('document')) return 'Description';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'TableChart';
  if (type.includes('powerpoint') || type.includes('presentation')) return 'Slideshow';
  if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'FolderZip';
  return 'InsertDriveFile';
}

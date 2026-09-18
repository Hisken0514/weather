import React, {useState} from 'react';
import axios from 'axios';
import {
    AlertCircle,
    CheckCircle,
    Download,
    Eye,
    File,
    FileText,
    Film,
    Image,
    Loader2,
    Music,
    Pause,
    Play,
    Settings,
    Upload,
    X
} from 'lucide-react';
import {FileStatus, FileWithId, formatFileSize, useFileUpload} from '@/components/File/useFileUpload';
import api from "@/utils/api";


// Enhanced response type based on your UploadResult
export interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    fileUuid: string;
    filePath: string;
    originalFileName: string;
    savedFileName: string;
    fileSize: number;
    fileHash?: string;
    uploadTime: string;
    downloadUrl: string;
    previewUrl?: string;
    requiresManualReview: boolean;
    securityScanResult?: {
      isSafe: boolean;
      riskLevel: string;
      details?: string;
    };
  };
  traceId?: string;
}

// Upload options interface matching your backend
export interface UploadOptions {
  overwrite?: boolean;
  createDirectory?: boolean;
  validateIntegrity?: boolean;
  expectedHash?: string;
  scanForVirus?: boolean;
  customFileName?: string;
  description?: string;
  startWatchingAfterUpload?: boolean;
}

// Props for the FileUpload component
export interface FileUploadProps {
  // API configuration (支援兩種方式)
  uploadUrl?: string;
  endpoints?: {
    singleFileUrl?: string;
    chunkUploadUrl?: string;
    mergeChunksUrl?: string;
    removeFileUrl?: string;
  };

  // 必要參數（可選，有預設值）
  targetPath?: string;
  uploadedById?: string;

  // Upload options
  uploadOptions?: UploadOptions;

  // Custom handlers
  onUpload?: (file: File, onProgress?: (progress: number) => void, signal?: AbortSignal) => Promise<UploadResponse>;
  onSuccess?: (response: UploadResponse, fileId: string) => void;
  onError?: (error: Error, fileId: string) => void;

  // File restrictions
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  minSize?: number;
  acceptedFileTypes?: string[];

  // Upload behavior
  autoUpload?: boolean;
  showUploadOptions?: boolean;

  // UI customization
  className?: string;
  labels?: Partial<UploadLabels>;
  showFileControls?: boolean;
  showFileDetails?: boolean;
  showSimpleFileTypes?: boolean; // 新增：是否顯示簡化的檔案類型
  renderFileCard?: (file: FileWithId, actions: FileCardActions, uploadResult?: UploadResponse['data']) => React.ReactNode;
}

// Actions available for file cards
export interface FileCardActions {
  removeFile: () => void;
  pauseUpload: () => void;
  resumeUpload: () => void;
  downloadFile: () => void;
  previewFile: () => void;
}

// Default labels with type
/**
 * 上傳標籤介面
 * 定義上傳元件中所使用的所有文字標籤。
 *
 * @interface UploadLabels
 * @member {string} dropzone 拖曳檔案的提示文字
 * @member {string} browse 點擊選取檔案的提示文字
 * @member {string} maxFiles 顯示允許上傳的最大檔案數
 * @member {string} maxSize 顯示允許上傳的最大檔案大小
 * @member {string} uploading 上傳中時的狀態文字
 * @member {string} uploadOptions 上傳設定區塊的標題
 * @member {string} fileName 自訂檔名的標籤文字
 * @member {string} description 檔案描述的欄位標籤
 * @member {string} overwrite 是否覆蓋既有檔案的選項標籤
 * @member {string} validateIntegrity 驗證檔案完整性的選項標籤
 * @member {string} scanForVirus 病毒掃描的選項標籤
 */
export interface UploadLabels {
  dropzone: string;
  browse: string;
  maxFiles: string;
  maxSize: string;
  uploading: string;
  uploadOptions: string;
  fileName: string;
  description: string;
  overwrite: string;
  validateIntegrity: string;
  scanForVirus: string;
}

// Default labels
const defaultLabels: UploadLabels = {
  dropzone: '將檔案拖放到此處',
  browse: '或點此夾帶檔案',
  maxFiles: '最大上傳文件數量:',
  maxSize: '最大上傳文件大小:',
  uploading: '上傳中...',
  uploadOptions: '上傳選項',
  fileName: '自訂檔案名稱',
  description: '檔案描述',
  overwrite: '覆蓋現有檔案',
  validateIntegrity: '驗證檔案完整性',
  scanForVirus: '病毒掃描',
};

// 檔案類型映射 - 將複雜的 MIME 類型轉換為簡單的顯示名稱
const getSimpleFileTypeLabel = (mimeType: string): string => {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'text/plain': '文字檔',
    'image/jpeg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'video/mp4': 'MP4',
    'audio/mpeg': 'MP3',
  };

  // 先查找完全匹配
  if (typeMap[mimeType]) {
    return typeMap[mimeType];
  }

  // 按類別匹配
  if (mimeType.startsWith('image/')) {
    const format = mimeType.split('/')[1];
    return format.toUpperCase();
  }
  if (mimeType.startsWith('video/')) {
    const format = mimeType.split('/')[1];
    return format.toUpperCase();
  }
  if (mimeType.startsWith('audio/')) {
    const format = mimeType.split('/')[1];
    return format.toUpperCase();
  }
  if (mimeType.includes('document')) {
    return 'Office文件';
  }
  if (mimeType.includes('text')) {
    return '文字檔';
  }

  // 預設返回格式名稱
  const format = mimeType.split('/')[1] || mimeType;
  return format.toUpperCase();
};

// Group file types for display (修改版)
const groupFileTypes = (types: string[], simple = false) => {
  const groups: Record<string, { icon: React.ReactNode, extensions: string[] }> = {
    image: {
      icon: <span aria-label="圖片檔案類型"><Image aria-hidden="true" className="w-4 h-4" /></span>,
      extensions: []
    },
    document: {
      icon: <span aria-label="文件檔案類型"><FileText aria-hidden="true" className="w-4 h-4" /></span>,
      extensions: []
    },
    video: {
      icon: <span aria-label="影片檔案類型"><Film aria-hidden="true" className="w-4 h-4" /></span>,
      extensions: []
    },
    audio: {
      icon: <span aria-label="音頻檔案類型"><Music aria-hidden="true" className="w-4 h-4" /></span>,
      extensions: []
    },
    other: {
      icon: <span aria-label="其他檔案類型"><File aria-hidden="true" className="w-4 h-4" /></span>,
      extensions: []
    }
  };

  types.forEach(type => {
    const extension = simple ? getSimpleFileTypeLabel(type) : type.split('/')[1]?.toUpperCase() || '';

    if (type.startsWith('image/')) {
      groups.image.extensions.push(extension);
    } else if (type.startsWith('video/')) {
      groups.video.extensions.push(extension);
    } else if (type.startsWith('audio/')) {
      groups.audio.extensions.push(extension);
    } else if (['pdf', 'msword', 'vnd.openxmlformats-officedocument', 'text'].some(t => type.includes(t))) {
      groups.document.extensions.push(extension);
    } else {
      groups.other.extensions.push(extension);
    }
  });

  return Object.entries(groups).filter(([_, group]) => group.extensions.length > 0);
};

// Get icon based on file type
const getFileTypeIcon = (type: string): React.ReactNode => {
  if (type.startsWith('image/'))
    return <span aria-label="圖片檔案"><Image aria-hidden="true" className="w-5 h-5" /></span>;
  if (type.startsWith('video/'))
    return <span aria-label="影片檔案"><Film aria-hidden="true" className="w-5 h-5" /></span>;
  if (type.startsWith('audio/'))
    return <span aria-label="音頻檔案"><Music aria-hidden="true" className="w-5 h-5" /></span>;
  if (['pdf', 'msword', 'vnd.openxmlformats-officedocument', 'text'].some(t => type.includes(t))) {
    return <span aria-label="文件檔案"><FileText aria-hidden="true" className="w-5 h-5" /></span>;
  }
  return <span aria-label="其他檔案"><File aria-hidden="true" className="w-5 h-5" /></span>;
};

// Get status icon based on file status
const getStatusIcon = (status: FileStatus): React.ReactNode => {
  switch (status) {
    case 'uploading':
      return <span aria-label="上傳中"><Loader2 aria-hidden="true" className="w-5 h-5 text-blue-500 animate-spin" /></span>;
    case 'success':
      return <span aria-label="上傳成功"><CheckCircle aria-hidden="true" className="w-5 h-5 text-green-500" /></span>;
    case 'error':
      return <span aria-label="上傳失敗"><AlertCircle aria-hidden="true" className="w-5 h-5 text-red-500" /></span>;
    case 'paused':
      return <span aria-label="上傳暫停"><Pause aria-hidden="true" className="w-5 h-5 text-yellow-500" /></span>;
    default:
      return null;
  }
};


// Main FileUpload component
export function FileUpload({
  // API configuration (支援兩種方式)
  uploadUrl,
  endpoints,

  // 參數（提供預設值）
  targetPath = '/',

  // Upload options
  uploadOptions: defaultUploadOptions = {},

  // Custom handlers
  onUpload,
  onSuccess,
  onError,

  // File restrictions
  multiple = true,
  maxFiles = 10,
  maxSize = 10485760,
  minSize = 0,
  acceptedFileTypes = [],

  // Upload behavior
  autoUpload = true,
  showUploadOptions = false,

  // UI customization
  className = '',
  labels: customLabels = {},
  showFileControls = true,
  showFileDetails = true,
  showSimpleFileTypes = true, // 預設使用簡化顯示
  renderFileCard
}: FileUploadProps) {
  // Merge custom labels with defaults
  const labels: UploadLabels = { ...defaultLabels, ...customLabels };

  // 決定使用的上傳 URL
  const finalUploadUrl = uploadUrl || endpoints?.singleFileUrl || '/api/files/upload';

  // Upload options state
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>({
    overwrite: false,
    createDirectory: true,
    validateIntegrity: false,
    scanForVirus: true,
    ...defaultUploadOptions
  });

  // Store upload results
  const [uploadResults, setUploadResults] = useState<Record<string, UploadResponse['data']>>({});

  // Default delete handler
  const defaultDeleteHandler = async (fileId: string, uploadResult?: UploadResponse['data']): Promise<boolean> => {
    const deleteUrl = endpoints?.removeFileUrl;

    if (!deleteUrl) {
      console.warn('removeFileUrl 未設定，無法從伺服器刪除檔案');
      return false;
    }

    try {
      // 構建刪除請求，使用檔案路徑
      const filePath = uploadResult?.filePath;

      if (!filePath) {
        console.warn('檔案路徑不存在，無法刪除伺服器檔案');
        return false;
      }

      // 完全符合你的 curl 範例格式
      const deleteRequest = {
        path: filePath,
        recursive: false  // 檔案刪除通常不需要遞迴
      };

      console.log('正在刪除檔案:', filePath);

      const response = await api.delete(deleteUrl, {
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json',
        },
        data: deleteRequest,
        timeout: 30000,
      });

      // 檢查回應格式：{ success: true, message: "檔案刪除成功", data: true }
      const result = response.data;
      if (result?.success === true) {
        console.log('檔案刪除成功:', result.message);
        return true;
      } else {
        console.error('刪除檔案失敗:', result?.message || '未知錯誤');
        return false;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          // 檔案不存在，視為刪除成功
          console.warn('檔案不存在或已被刪除');
          return true;
        }

        if (error.response?.status === 400) {
          const errorData = error.response.data;
          console.error('刪除請求失敗 (400):', errorData?.message || '請求參數錯誤');
        } else {
          console.error(`刪除檔案失敗 (${error.response?.status}):`, error.response?.data?.message || error.message);
        }
      } else {
        console.error('刪除檔案時發生未知錯誤:', error);
      }

      return false;
    }
  };

  // Default upload handler
  const defaultUploadHandler = async (
    file: File,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<UploadResponse> => {
    const formData = new FormData();

    // 主要參數
    formData.append('file', file);
    formData.append('targetPath', targetPath);

    // 嵌套 options 物件（符合你的 API 格式）
    formData.append('options.createDirectory', uploadOptions.createDirectory?.toString() || 'true');
    formData.append('options.scanForVirus', uploadOptions.scanForVirus?.toString() || 'true');
    formData.append('options.validateIntegrity', uploadOptions.validateIntegrity?.toString() || 'false');
    formData.append('options.customFileName', uploadOptions.customFileName || '');
    formData.append('options.description', uploadOptions.description || '');
    formData.append('options.hashAlgorithm', '0'); // SHA256
    formData.append('options.expectedHash', uploadOptions.expectedHash || '');
    formData.append('options.startWatchingAfterUpload', uploadOptions.startWatchingAfterUpload?.toString() || 'false');
    formData.append('options.overwrite', uploadOptions.overwrite?.toString() || 'false');

    try {
      const response = await api.post<UploadResponse>(finalUploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'accept': '*/*',
        },
        signal: signal,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
        timeout: 300000, // 5 分鐘超時
      });

      // 確保回傳格式符合 UploadResponse
      if (!response.data.success) {
        throw new Error(response.data.message || '上傳失敗');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Axios 錯誤
        if (error.code === 'ECONNABORTED') {
          throw new Error('上傳超時，請檢查網路連線或檔案大小');
        }

        if (error.response) {
          // 伺服器回應錯誤
          const errorData = error.response.data;
          const errorMessage = errorData?.message || error.response.statusText || '伺服器錯誤';
          throw new Error(`上傳失敗 (${error.response.status}): ${errorMessage}`);
        } else if (error.request) {
          // 網路錯誤
          throw new Error('網路連線失敗，請檢查網路狀態');
        }
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('未知錯誤，上傳失敗');
    }
  };

  // Use the hook with enhanced upload handler
  const {
    loading,
    error,
    isDragging,
    files,
    handleDragEvents,
    handleFileChange,
    removeFile,
    pauseUpload,
    resumeUpload,
  } = useFileUpload<UploadResponse>({
    onUpload: onUpload || defaultUploadHandler,
    onSuccess: (response, fileId) => {
      if (response.data) {
        setUploadResults(prev => ({ ...prev, [fileId]: response.data! }));
      }
      onSuccess?.(response, fileId);
    },
    onError,
    multiple,
    maxFiles,
    maxSize,
    minSize,
    acceptedFileTypes,
    autoUpload
  });

  // Upload options component
  const UploadOptionsPanel = () => (
    <div className="card bg-base-100 border border-base-300 mb-4">
      <div className="card-body p-4">
        <h3 className="card-title text-sm flex items-center gap-2">
          <Settings className="w-4 h-4" />
          {labels.uploadOptions}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs">{labels.fileName}</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm"
              placeholder="留空使用原檔名"
              value={uploadOptions.customFileName || ''}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, customFileName: e.target.value }))}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-xs">{labels.description}</span>
            </label>
            <input
              type="text"
              className="input input-bordered input-sm"
              placeholder="檔案描述"
              value={uploadOptions.description || ''}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
          <label className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={uploadOptions.overwrite}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, overwrite: e.target.checked }))}
            />
            <span className="label-text text-xs">{labels.overwrite}</span>
          </label>

          <label className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={uploadOptions.validateIntegrity}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, validateIntegrity: e.target.checked }))}
            />
            <span className="label-text text-xs">{labels.validateIntegrity}</span>
          </label>

          <label className="label cursor-pointer justify-start gap-2">
            <input
              type="checkbox"
              className="checkbox checkbox-sm"
              checked={uploadOptions.scanForVirus}
              onChange={(e) => setUploadOptions(prev => ({ ...prev, scanForVirus: e.target.checked }))}
            />
            <span className="label-text text-xs">{labels.scanForVirus}</span>
          </label>
        </div>
      </div>
    </div>
  );

  // Enhanced file card renderer
  const enhancedFileCardRenderer = (file: FileWithId, actions: FileCardActions) => {
    const uploadResult = uploadResults[file.id];

    return (
      <div key={file.id} className="card bg-base-100 border border-base-300">
        <div className="card-body p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getStatusIcon(file.status)}
              {getFileTypeIcon(file.file.type)}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadResult?.originalFileName || file.file.name}
                </p>
                <p className="text-xs text-base-content/70">
                  {formatFileSize(file.file.size)}
                  {file.error && <span className="text-error"> • {file.error}</span>}
                </p>

                {showFileDetails && uploadResult && (
                  <div className="mt-2 space-y-1">
                    {uploadResult.fileHash && (
                      <p className="text-xs text-base-content/60">
                        Hash: {uploadResult.fileHash.slice(0, 16)}...
                      </p>
                    )}
                    {uploadResult.requiresManualReview && (
                      <div className="badge badge-warning badge-sm">需要人工審核</div>
                    )}
                    {uploadResult.securityScanResult && (
                      <div className={`badge badge-sm ${uploadResult.securityScanResult.isSafe ? 'badge-success' : 'badge-error'}`}>
                        {uploadResult.securityScanResult.isSafe ? '安全掃描通過' : '安全掃描未通過'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showFileControls && (
              <div className="flex gap-1">
                {uploadResult?.downloadUrl && (
                  <button
                    onClick={() => window.open(uploadResult.downloadUrl, '_blank')}
                    className="btn btn-ghost btn-xs"
                    title="下載檔案"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}

                {uploadResult?.previewUrl && (
                  <button
                    onClick={() => window.open(uploadResult.previewUrl, '_blank')}
                    className="btn btn-ghost btn-xs"
                    title="預覽檔案"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}

                {file.status === 'uploading' && (
                  <button
                    onClick={actions.pauseUpload}
                    className="btn btn-ghost btn-xs"
                    title="暫停上傳"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                )}

                {file.status === 'paused' && (
                  <button
                    onClick={actions.resumeUpload}
                    className="btn btn-ghost btn-xs"
                    title="繼續上傳"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => {
                    const result = uploadResults[file.id];
                    const deleteFromServer = file.status === 'success' && result && endpoints?.removeFileUrl;

                    if (deleteFromServer) {
                      defaultDeleteHandler(file.id, result).then((success) => {
                        if (success) {
                          setUploadResults(prev => {
                            const newResults = { ...prev };
                            delete newResults[file.id];
                            return newResults;
                          });
                        }
                        removeFile(file.id, { deleteFromServer: false });
                      });
                    } else {
                      removeFile(file.id, { deleteFromServer: false });
                    }
                  }}
                  className="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content"
                  title="移除檔案"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {file.status === 'uploading' && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-base-content/70 mb-1">
                <span>上傳進度</span>
                <span>{file.progress}%</span>
              </div>
              <progress className="progress progress-primary w-full" value={file.progress} max="100"></progress>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Default dropzone renderer (修改版，支援簡化顯示)
  const defaultDropzoneRenderer = () => (
    <label
      className={`relative flex flex-col items-center justify-center w-full h-50 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 
        ${isDragging ? 'border-primary bg-primary/10' : 'border-base-300 bg-base-100 hover:bg-base-200'}
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="flex flex-col items-center justify-center pt-5 pb-6">
        <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-primary' : 'text-base-content/50'}`} />
        <p className="mb-2 text-sm text-base-content">
          <span className="font-semibold">{labels.dropzone}</span>
        </p>
        <div className="text-sm text-base-content/70">
          {labels.browse}
        </div>
        <p className="text-xs text-base-content/50 mt-2">
          {loading ? labels.uploading : `${labels.maxFiles} ${maxFiles}`}
          {maxSize ? `, ${labels.maxSize} ${formatFileSize(maxSize)}` : ''}
        </p>

        {acceptedFileTypes.length > 0 && (
          <div className="mt-2 space-y-1 max-w-xs">
            {groupFileTypes(acceptedFileTypes, showSimpleFileTypes).map(([key, group]) => (
              <div key={key} className="flex items-center gap-1 text-xs text-base-content/50">
                <span>•</span>
                {group.icon}
                <span className="truncate">
                  {showSimpleFileTypes
                    ? group.extensions.slice(0, 3).join(', ') + (group.extensions.length > 3 ? '...' : '')
                    : group.extensions.join(', ')
                  }
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={loading}
        multiple={multiple}
        accept={acceptedFileTypes.join(',')}
        className="hidden"
      />
    </label>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {showUploadOptions && <UploadOptionsPanel />}

      <div
        className="w-full"
        onDragEnter={handleDragEvents.handleDragEnter}
        onDragLeave={handleDragEvents.handleDragLeave}
        onDragOver={handleDragEvents.handleDragOver}
        onDrop={handleDragEvents.handleDrop}
      >
        {defaultDropzoneRenderer()}
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle className="w-4 h-4" />
          <span>{error.message}</span>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          {files.map((file) => {
            const actions: FileCardActions = {
              removeFile: () => {
                const result = uploadResults[file.id];
                // 如果檔案上傳成功且有 removeFileUrl，則從伺服器刪除
                const deleteFromServer = file.status === 'success' && result && endpoints?.removeFileUrl;

                if (deleteFromServer) {
                  // 先從伺服器刪除，再從本地移除
                  defaultDeleteHandler(file.id, result).then((success) => {
                    if (success) {
                      // 從本地狀態移除
                      setUploadResults(prev => {
                        const newResults = { ...prev };
                        delete newResults[file.id];
                        return newResults;
                      });
                    }
                    // 不論是否成功都從 UI 移除
                    removeFile(file.id, { deleteFromServer: false });
                  });
                } else {
                  // 只從本地移除
                  removeFile(file.id, { deleteFromServer: false });
                }
              },
              pauseUpload: () => pauseUpload(file.id),
              resumeUpload: () => resumeUpload(file.id),
              downloadFile: () => {
                const result = uploadResults[file.id];
                if (result?.downloadUrl) {
                  window.open(result.downloadUrl, '_blank');
                }
              },
              previewFile: () => {
                const result = uploadResults[file.id];
                if (result?.previewUrl) {
                  window.open(result.previewUrl, '_blank');
                }
              }
            };

            return renderFileCard
              ? renderFileCard(file, actions, uploadResults[file.id])
              : enhancedFileCardRenderer(file, actions);
          })}
        </div>
      )}
    </div>
  );
}

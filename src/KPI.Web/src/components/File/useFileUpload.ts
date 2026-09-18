// hooks/useFileUpload.ts
import { useState, useCallback, useRef } from 'react';
import axios, { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

// File status types
export type FileStatus = 'pending' | 'uploading' | 'paused' | 'success' | 'error';

// File with metadata for tracking upload status
export interface FileWithId {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
  uploadedChunks?: number[];
  totalChunks?: number;
}

// Custom upload handler type
export type CustomUploadHandler<TResponse> = (
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
) => Promise<TResponse>;

// API endpoints configuration
export interface UploadEndpoints {
  singleFileUrl?: string;
  chunkUploadUrl?: string;
  mergeChunksUrl?: string;
  removeFileUrl?: string;
}

// Options for the file upload hook
export interface FileUploadOptions<TResponse> {
  // API configuration
  endpoints?: UploadEndpoints;

  // Custom handlers
  onUpload?: CustomUploadHandler<TResponse>;
  onSuccess?: (response: TResponse, fileId: string) => void;
  onError?: (error: Error, fileId: string) => void;

  // File restrictions
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  minSize?: number;
  acceptedFileTypes?: string[];

  // Upload behavior
  autoUpload?: boolean;
  streamEnabled?: boolean;
  chunkSize?: number;

  // Request configuration
  requestConfig?: AxiosRequestConfig;
}

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Helper function to generate a unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

export function useFileUpload<TResponse>({
  // API endpoints with defaults
  endpoints = {
    singleFileUrl: '/api/upload',
    chunkUploadUrl: '/api/upload/chunk',
    mergeChunksUrl: '/api/upload/merge',
    removeFileUrl: '/api/upload/remove'
  },

  // Custom handlers
  onUpload,
  onSuccess,
  onError,

  // File restrictions
  multiple = true,
  maxFiles = 10,
  maxSize = 104857600, // Default 100MB
  minSize = 0,
  acceptedFileTypes = [],

  // Upload behavior
  autoUpload = true,
  streamEnabled = false,
  chunkSize = 10 * 1024 * 1024, // Default 10MB chunks

  // Request configuration
  requestConfig = {}
}: FileUploadOptions<TResponse>) {
  const [files, setFiles] = useState<FileWithId[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const abortControllers = useRef<{ [key: string]: AbortController }>({});

  // Handle drag events
  const handleDragEvents = {
    handleDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    handleDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    handleDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
    },
    handleDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    }
  };

  // Check if file type is accepted
  const isFileTypeAccepted = (file: File): boolean => {
    if (acceptedFileTypes.length === 0) return true;
    return acceptedFileTypes.some(type => {
      // Handle wildcard MIME types, like 'image/*'
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return file.type.startsWith(`${category}/`);
      }
      return file.type === type;
    });
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // If multiple is false, only take the first file
      const newFiles = multiple
        ? Array.from(e.target.files)
        : [e.target.files[0]];

      handleFiles(newFiles);

      // Reset input field so the same file can be selected again
      e.target.value = '';
    }
  };

  // Process files
  const handleFiles = (newFiles: File[]) => {
    setError(null);

    // Check if exceeding file count limit
    if (!multiple && newFiles.length > 1) {
      setError(new Error('一次只能上傳一個檔案'));
      return;
    }

    if (files.length + newFiles.length > maxFiles) {
      setError(new Error(`您最多只能上傳 ${maxFiles} 檔案`));
      return;
    }

    const validFiles = newFiles.filter(file => {
      // Check file size (minimum)
      if (minSize > 0 && file.size < minSize) {
        setError(new Error(`"${file.name}"檔案太小（最小值： ${formatFileSize(minSize)})`));
        return false;
      }

      // Check file size (maximum)
      if (maxSize && file.size > maxSize) {
        setError(new Error(`"${file.name}"檔案太大（最大值：${formatFileSize(maxSize)})`));
        return false;
      }

      // Check file type
      if (!isFileTypeAccepted(file)) {
        setError(new Error(`"${file.type}"檔案型態非允許類型`));
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // If not multiple mode, replace existing files instead of adding
    const shouldReplace = !multiple;

    // Add new files to state
    const newFilesWithId = validFiles.map(file => {
      const fileWithId: FileWithId = {
        id: generateId(),
        file,
        status: 'pending',
        progress: 0
      };

      // If streaming mode is enabled, add chunk-related properties
      if (streamEnabled) {
        const totalChunks = Math.ceil(file.size / chunkSize);
        fileWithId.totalChunks = totalChunks;
        fileWithId.uploadedChunks = [];
      }

      return fileWithId;
    });

    setFiles(prevFiles => shouldReplace ? newFilesWithId : [...prevFiles, ...newFilesWithId]);

    // Auto-upload new files if enabled
    if (autoUpload) {
      newFilesWithId.forEach(fileWithId => {
        uploadFile(fileWithId);
      });
    }
  };

  // Upload file
  const uploadFile = async (fileWithId: FileWithId) => {
    const { id, file } = fileWithId;

    try {
      setLoading(true);

      // Update file status to uploading
      setFiles(prevFiles => prevFiles.map(f =>
        f.id === id ? { ...f, status: 'uploading' } : f
      ));

      // Create AbortController for cancellation
      const controller = new AbortController();
      abortControllers.current[id] = controller;

      let response: TResponse;

      // Choose upload method based on mode
      if (streamEnabled) {
        // Streaming upload mode
        response = await uploadFileInChunks(fileWithId, controller);
      } else {
        // Traditional upload mode
        if (onUpload) {
          // Use custom upload handler if provided
          const updateProgress = (progress: number) => {
            setFiles(prevFiles => prevFiles.map(f =>
              f.id === id ? { ...f, progress } : f
            ));
          };

          response = await onUpload(file, updateProgress, controller.signal);
        } else {
          // Use default upload method
          const formData = new FormData();
          formData.append('file', file);

          const { data } = await axios.post<TResponse>(
            endpoints.singleFileUrl || '/api/upload',
            formData,
            {
              ...requestConfig,
              signal: controller.signal,
              headers: {
                'Content-Type': 'multipart/form-data',
                ...requestConfig.headers
              },
              onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                const total = progressEvent.total || 0;
                if (total <= 0) return;
                const progress = Math.round((progressEvent.loaded / total) * 100);

                setFiles(prevFiles => prevFiles.map(f =>
                  f.id === id ? { ...f, progress } : f
                ));
              }
            }
          );

          response = data;
        }
      }

      // Update file status to success
      setFiles(prevFiles => prevFiles.map(f =>
        f.id === id ? { ...f, status: 'success', progress: 100 } : f
      ));

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response as TResponse, id);
      }

      // Remove AbortController
      delete abortControllers.current[id];

    } catch (err) {
      if (axios.isCancel(err)) {
        // Upload was cancelled by user
        setFiles(prevFiles => prevFiles.map(f =>
          f.id === id ? { ...f, status: 'paused' } : f
        ));
      } else {
        // Other errors
        const error = err instanceof Error ? err : new Error(String(err));

        setFiles(prevFiles => prevFiles.map(f =>
          f.id === id ? { ...f, status: 'error', error: error.message } : f
        ));

        // Call error callback if provided
        if (onError) {
          onError(error, id);
        }
      }

      // Remove AbortController
      delete abortControllers.current[id];
    } finally {
      setLoading(false);
    }
  };

  // Upload file in chunks
  const uploadFileInChunks = async (fileWithId: FileWithId, controller: AbortController) => {
    const { id, file, totalChunks = 0 } = fileWithId;
    const { chunkUploadUrl, mergeChunksUrl } = endpoints;

    // Generate unique upload ID
    const uploadId = `${id}-${Date.now()}`;

    // Upload each chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      // Abort if upload was cancelled
      if (controller.signal.aborted) {
        throw new axios.Cancel('上傳已取消');
      }

      // Calculate current chunk start and end positions
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);

      // Create FormData object
      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('fileName', file.name);
      formData.append('uploadId', uploadId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('chunkSize', chunkSize.toString());
      formData.append('fileSize', file.size.toString());
      formData.append('fileType', file.type);

      // Send request
      await axios.post(
        chunkUploadUrl || '/api/upload/chunk',
        formData,
        {
          ...requestConfig,
          signal: controller.signal,
          headers: {
            'Content-Type': 'multipart/form-data',
            ...requestConfig.headers
          },
          onUploadProgress: (progressEvent: AxiosProgressEvent) => {
            const total = progressEvent.total || 0;
            if (total <= 0) return;

            // Calculate current chunk upload progress
            const _chunkProgress = (progressEvent.loaded / total) * (1 / totalChunks);

            // Update overall file progress
            setFiles(prevFiles => prevFiles.map(f => {
              if (f.id === id) {
                const uploadedChunks = [...(f.uploadedChunks || [])];
                if (!uploadedChunks.includes(chunkIndex) && progressEvent.loaded === total) {
                  uploadedChunks.push(chunkIndex);
                }

                // Calculate overall progress
                const overallProgress = Math.min(
                  ((chunkIndex / totalChunks) + (progressEvent.loaded / total) * (1 / totalChunks)) * 100,
                  99.9 // Limit to 99.9% until merge is complete
                );

                return {
                  ...f,
                  progress: overallProgress,
                  uploadedChunks
                };
              }
              return f;
            }));
          }
        }
      );

      // Mark this chunk as uploaded
      setFiles(prevFiles => prevFiles.map(f => {
        if (f.id === id && f.uploadedChunks) {
          const uploadedChunks = [...f.uploadedChunks];
          if (!uploadedChunks.includes(chunkIndex)) {
            uploadedChunks.push(chunkIndex);
          }
          return { ...f, uploadedChunks };
        }
        return f;
      }));
    }

    // All chunks uploaded, send merge request
    const { data } = await axios.post(
      mergeChunksUrl || '/api/upload/merge',
      {
        uploadId,
        fileName: file.name,
        totalChunks,
        fileType: file.type
      },
      requestConfig
    );

    return data;
  };

  // Pause upload
  const pauseUpload = (fileId: string) => {
    const controller = abortControllers.current[fileId];
    if (controller) {
      controller.abort();

      setFiles(prevFiles => prevFiles.map(f =>
        f.id === fileId ? { ...f, status: 'paused' } : f
      ));
    }
  };

  // Resume upload
  const resumeUpload = (fileId: string) => {
    const fileToResume = files.find(f => f.id === fileId);
    if (fileToResume && fileToResume.status === 'paused') {
      uploadFile(fileToResume);
    }
  };

  // Start upload manually (for when autoUpload is false)
  const startUpload = (fileId?: string) => {
    if (fileId) {
      // Upload specific file
      const fileToUpload = files.find(f => f.id === fileId && f.status === 'pending');
      if (fileToUpload) {
        uploadFile(fileToUpload);
      }
    } else {
      // Upload all pending files
      files
        .filter(f => f.status === 'pending')
        .forEach(f => uploadFile(f));
    }
  };

  // Remove file
  const removeFile = useCallback(async (fileId: string, options?: { deleteFromServer?: boolean }) => {
    const { deleteFromServer = false } = options || {};
    const fileToRemove = files.find(f => f.id === fileId);

    // If file is uploading, cancel upload first
    const controller = abortControllers.current[fileId];
    if (controller) {
      controller.abort();
      delete abortControllers.current[fileId];
    }

    // Delete from server if requested and file was uploaded successfully
    if (deleteFromServer && fileToRemove && fileToRemove.status === 'success') {
      try {
        const fileType = fileToRemove.file.type;
        const extension = `.${fileType.split('/')[1]}`;

        await axios.post(
          endpoints.removeFileUrl || '/api/upload/remove',
          {
            fileId,
            filetype: extension
          },
          requestConfig
        );
      } catch (err) {
        console.error('從伺服器刪除檔案時發生錯誤：', err);
      }
    }

    // Remove file from state
    setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
  }, [endpoints.removeFileUrl, requestConfig,files]);

  // Clear all files
  const clearFiles = useCallback(async (options?: { deleteFromServer?: boolean }) => {
    const { deleteFromServer = false } = options || {};

    // Cancel all active uploads
    Object.values(abortControllers.current).forEach(controller => {
      controller.abort();
    });
    abortControllers.current = {};

    // Delete from server if requested
    if (deleteFromServer) {
      const successFiles = files.filter(f => f.status === 'success');
      for (const file of successFiles) {
        try {
          const fileType = file.file.type;
          const extension = `.${fileType.split('/')[1]}`;

          await axios.post(
            endpoints.removeFileUrl || '/api/upload/remove',
            {
              fileId: file.id,
              filetype: extension
            },
            requestConfig
          );
        } catch (err) {
          console.error('從伺服器刪除檔案時發生錯誤:', err);
        }
      }
    }

    // Clear files state
    setFiles([]);
  }, [endpoints.removeFileUrl, files, requestConfig]);

  return {
    // State
    files,
    loading,
    error,
    isDragging,

    // Event handlers
    handleDragEvents,
    handleFileChange,

    // File actions
    uploadFile,
    pauseUpload,
    resumeUpload,
    startUpload,
    removeFile,
    clearFiles,

    // Utility
    formatFileSize,
  };
}

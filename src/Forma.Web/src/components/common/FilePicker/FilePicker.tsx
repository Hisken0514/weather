/**
 * FilePicker - 檔案上傳與選擇元件
 * 支援拖放上傳、選擇既有檔案、預覽
 */

import { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Folder as BrowseIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  FolderZip as ZipIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { filesApi } from '@/lib/api/files';
import { FileBrowserDialog } from './FileBrowserDialog';
import type { FilePickerProps, SelectedFile, UploadProgress } from './types';
import { formatFileSize, getFileIcon, isImageFile } from './types';

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Image: ImageIcon,
  InsertDriveFile: FileIcon,
  PictureAsPdf: PdfIcon,
  VideoFile: VideoIcon,
  AudioFile: AudioIcon,
  Description: DocIcon,
  TableChart: ExcelIcon,
  FolderZip: ZipIcon,
};

export function FilePicker({
  value = [],
  onChange,
  multiple = false,
  accept,
  maxSize,
  maxFiles,
  disabled = false,
  entityType,
  entityId,
  isPublic = false,
  error,
  helperText,
  label,
  required,
  hideFileBrowser = false,
  compact = false,
}: FilePickerProps) {
  const [dragOver, setDragOver] = useState(false);
  const [, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 取得圖示元件
  const getIconComponent = (contentType: string) => {
    const iconName = getFileIcon(contentType);
    return iconMap[iconName] || FileIcon;
  };

  // 驗證檔案
  const validateFile = (file: File): string | null => {
    if (accept) {
      const acceptTypes = accept.split(',').map(t => t.trim());
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

      // 圖片副檔名對應
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];

      const isValid = acceptTypes.some(type => {
        // 萬用字元類型 (如 image/*)
        if (type.endsWith('/*')) {
          const category = type.replace('/*', '');
          // 先檢查 MIME type
          if (file.type && file.type.startsWith(category + '/')) {
            return true;
          }
          // 如果是 image/*，也檢查副檔名
          if (category === 'image' && imageExtensions.includes(fileExt)) {
            return true;
          }
          return false;
        }
        // 副檔名類型 (如 .pdf)
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        // 完整 MIME type (如 application/pdf)
        return file.type === type;
      });
      if (!isValid) {
        return `不支援的檔案格式: ${file.name}`;
      }
    }

    if (maxSize && file.size > maxSize) {
      return `檔案過大: ${file.name} (最大 ${formatFileSize(maxSize)})`;
    }

    return null;
  };

  // 上傳檔案
  const uploadFiles = async (files: File[]) => {
    if (disabled) return;

    // 檢查數量限制
    const currentCount = value.length;
    const maxAllowed = maxFiles ? maxFiles - currentCount : files.length;
    if (maxAllowed <= 0) {
      setUploadError(`已達檔案數量上限 (${maxFiles})`);
      return;
    }

    const filesToUpload = files.slice(0, maxAllowed);

    // 驗證檔案
    const validationErrors: string[] = [];
    filesToUpload.forEach(file => {
      const error = validateFile(file);
      if (error) validationErrors.push(error);
    });

    if (validationErrors.length > 0) {
      setUploadError(validationErrors.join('\n'));
      return;
    }

    setUploadError(null);
    setUploading(true);

    // 初始化進度
    const progress: UploadProgress[] = filesToUpload.map(file => ({
      file,
      progress: 0,
      status: 'pending',
    }));
    setUploadProgress(progress);

    // 上傳檔案
    const results: SelectedFile[] = [];
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];

      // 更新狀態為上傳中
      setUploadProgress(prev =>
        prev.map((p, idx) =>
          idx === i ? { ...p, status: 'uploading', progress: 50 } : p
        )
      );

      try {
        const result = await filesApi.upload(file, {
          entityType,
          entityId,
          isPublic,
        });

        // 更新為成功
        setUploadProgress(prev =>
          prev.map((p, idx) =>
            idx === i ? { ...p, status: 'success', progress: 100, result } : p
          )
        );

        results.push({
          id: result.id,
          name: result.originalFileName,
          size: result.fileSize,
          type: result.contentType,
          url: filesApi.download(result.id),
          isNew: true,
        });
      } catch (err) {
        // 更新為失敗
        setUploadProgress(prev =>
          prev.map((p, idx) =>
            idx === i
              ? { ...p, status: 'error', error: err instanceof Error ? err.message : '上傳失敗' }
              : p
          )
        );
      }
    }

    // 更新值
    if (results.length > 0) {
      const newValue = multiple ? [...value, ...results] : results;
      onChange?.(newValue);
    }

    setUploading(false);

    // 延遲清除進度
    setTimeout(() => {
      setUploadProgress([]);
    }, 2000);
  };

  // 處理拖放
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (!multiple && files.length > 1) {
      uploadFiles([files[0]]);
    } else {
      uploadFiles(files);
    }
  }, [disabled, multiple]);

  // 處理檔案選擇
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadFiles(files);
    }
    // 重置 input
    e.target.value = '';
  };

  // 處理既有檔案選擇
  const handleBrowseSelect = (files: { id: string; originalFileName: string; contentType: string; fileSize: number }[]) => {
    const selectedFiles: SelectedFile[] = files.map(f => ({
      id: f.id,
      name: f.originalFileName,
      size: f.fileSize,
      type: f.contentType,
      url: filesApi.download(f.id),
      isNew: false,
    }));

    const newValue = multiple ? [...value, ...selectedFiles] : selectedFiles;
    onChange?.(newValue);
  };

  // 移除檔案
  const handleRemove = (id: string) => {
    const newValue = value.filter(f => f.id !== id);
    onChange?.(newValue);
  };

  return (
    <Box>
      {/* 標籤 */}
      {label && (
        <Typography
          variant="body2"
          color={error ? 'error' : 'text.secondary'}
          gutterBottom
          sx={{ fontWeight: 500 }}
        >
          {label}
          {required && <span style={{ color: 'red' }}> *</span>}
        </Typography>
      )}

      {/* 上傳區域 */}
      <Paper
        variant="outlined"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          p: compact ? 2 : 3,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: error
            ? 'error.main'
            : dragOver
            ? 'primary.main'
            : 'divider',
          backgroundColor: dragOver
            ? 'action.hover'
            : disabled
            ? 'action.disabledBackground'
            : 'background.paper',
          transition: 'all 0.2s',
          '&:hover': disabled
            ? {}
            : {
                borderColor: 'primary.main',
                backgroundColor: 'action.hover',
              },
        }}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <UploadIcon
          sx={{
            fontSize: compact ? 32 : 48,
            color: disabled ? 'action.disabled' : 'primary.main',
            mb: 1,
          }}
        />

        <Typography
          variant={compact ? 'body2' : 'body1'}
          color={disabled ? 'text.disabled' : 'text.secondary'}
        >
          {dragOver ? '放開以上傳檔案' : '拖放檔案至此，或點擊上傳'}
        </Typography>

        {accept && (
          <Typography variant="caption" color="text.disabled" display="block">
            支援格式: {accept}
          </Typography>
        )}

        {maxSize && (
          <Typography variant="caption" color="text.disabled" display="block">
            最大檔案大小: {formatFileSize(maxSize)}
          </Typography>
        )}

        {/* 按鈕區 */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<UploadIcon />}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            上傳檔案
          </Button>

          {!hideFileBrowser && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<BrowseIcon />}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                setBrowserOpen(true);
              }}
            >
              選擇既有檔案
            </Button>
          )}
        </Box>
      </Paper>

      {/* 錯誤訊息 */}
      {(error || uploadError) && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setUploadError(null)}>
          {error || uploadError}
        </Alert>
      )}

      {/* 輔助文字 */}
      {helperText && !error && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {helperText}
        </Typography>
      )}

      {/* 上傳進度 */}
      {uploadProgress.length > 0 && (
        <List dense sx={{ mt: 1 }}>
          {uploadProgress.map((item, idx) => (
            <ListItem key={idx}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.status === 'success' ? (
                  <SuccessIcon color="success" fontSize="small" />
                ) : item.status === 'error' ? (
                  <ErrorIcon color="error" fontSize="small" />
                ) : (
                  <CircularProgressSmall value={item.progress} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.file.name}
                secondary={
                  item.status === 'error'
                    ? item.error
                    : item.status === 'success'
                    ? '上傳完成'
                    : '上傳中...'
                }
                primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                secondaryTypographyProps={{
                  variant: 'caption',
                  color: item.status === 'error' ? 'error' : undefined,
                }}
              />
            </ListItem>
          ))}
        </List>
      )}

      {/* 已選擇的檔案列表 */}
      {value.length > 0 && (
        <List dense sx={{ mt: 1 }}>
          {value.map((file) => {
            const IconComponent = getIconComponent(file.type);

            return (
              <ListItem
                key={file.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {isImageFile(file.type) && file.url ? (
                    <Box
                      component="img"
                      src={file.url}
                      alt={file.name}
                      sx={{
                        width: 32,
                        height: 32,
                        objectFit: 'cover',
                        borderRadius: 0.5,
                      }}
                    />
                  ) : (
                    <IconComponent color="action" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Chip
                        label={formatFileSize(file.size)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                      {file.isNew && (
                        <Chip
                          label="新上傳"
                          size="small"
                          color="primary"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  }
                  primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="移除">
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleRemove(file.id)}
                      disabled={disabled}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}

      {/* 檔案瀏覽對話框 */}
      <FileBrowserDialog
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={handleBrowseSelect}
        multiple={multiple}
        accept={accept}
        entityType={entityType}
      />
    </Box>
  );
}

// 小型進度圈
function CircularProgressSmall({ value }: { value: number }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <svg width="20" height="20" viewBox="0 0 20 20">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="2"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="#1976d2"
          strokeWidth="2"
          strokeDasharray={`${(value / 100) * 50.3} 50.3`}
          strokeLinecap="round"
          transform="rotate(-90 10 10)"
        />
      </svg>
    </Box>
  );
}

export default FilePicker;

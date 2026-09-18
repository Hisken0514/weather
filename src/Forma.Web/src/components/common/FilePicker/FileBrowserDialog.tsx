/**
 * FileBrowserDialog - 既有檔案瀏覽對話框
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  CircularProgress,
  Pagination,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Description as DocIcon,
  TableChart as ExcelIcon,
  FolderZip as ZipIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { filesApi } from '@/lib/api/files';
import type { FileListItemResponse } from '@/types/api';
import type { FileBrowserDialogProps } from './types';
import { formatFileSize, getFileIcon } from './types';

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

export function FileBrowserDialog({
  open,
  onClose,
  onSelect,
  multiple = false,
  accept,
  entityType,
}: FileBrowserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<FileListItemResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // 載入檔案列表
  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await filesApi.getFiles({
        pageNumber: page,
        pageSize,
        searchTerm: searchTerm || undefined,
        entityType,
        sortBy: 'createdAt',
        sortDescending: true,
      });
      setFiles(result.items);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open, page, searchTerm]);

  // 重置狀態
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchTerm('');
      setPage(1);
    }
  }, [open]);

  // 切換選擇
  const toggleSelect = (file: FileListItemResponse) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(file.id)) {
      newSelected.delete(file.id);
    } else {
      if (!multiple) {
        newSelected.clear();
      }
      newSelected.add(file.id);
    }
    setSelectedIds(newSelected);
  };

  // 確認選擇
  const handleConfirm = () => {
    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    onSelect(selectedFiles);
    onClose();
  };

  // 過濾檔案類型
  const filteredFiles = accept
    ? files.filter(file => {
        const acceptTypes = accept.split(',').map(t => t.trim());
        return acceptTypes.some(type => {
          if (type.endsWith('/*')) {
            return file.contentType.startsWith(type.replace('/*', '/'));
          }
          return file.contentType === type;
        });
      })
    : files;

  // 取得圖示元件
  const getIconComponent = (contentType: string) => {
    const iconName = getFileIcon(contentType);
    return iconMap[iconName] || FileIcon;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">選擇既有檔案</Typography>
          <Tooltip title="重新整理">
            <IconButton size="small" onClick={loadFiles}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* 搜尋欄 */}
        <TextField
          fullWidth
          size="small"
          placeholder="搜尋檔案..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* 檔案列表 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredFiles.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {searchTerm ? '找不到符合的檔案' : '尚無檔案'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredFiles.map((file) => {
              const IconComponent = getIconComponent(file.contentType);
              const isSelected = selectedIds.has(file.id);

              return (
                <ListItemButton
                  key={file.id}
                  onClick={() => toggleSelect(file)}
                  selected={isSelected}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  {multiple && (
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                    />
                  )}
                  <ListItemIcon>
                    <IconComponent color={isSelected ? 'primary' : 'action'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.originalFileName}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                        <Chip
                          label={formatFileSize(file.fileSize)}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(file.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>
        )}

        {/* 分頁 */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              size="small"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, ml: 2 }}>
          已選擇 {selectedIds.size} 個檔案
        </Typography>
        <Button onClick={onClose}>取消</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={selectedIds.size === 0}
        >
          確定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default FileBrowserDialog;

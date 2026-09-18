import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, Alert, LinearProgress,
  Paper, Chip, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, AlertTitle,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Factory as FactoryIcon,
  Download as DownloadIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import apiClient from '@/lib/api/client';

interface Stats { total: number; counties: number }
interface ImportResult {
  message: string; inserted: number; updated: number; skipped: number; dataSource: string;
}

export function FactoryMasterSettings() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await apiClient.get<Stats>('/factory-master/stats');
      setStats(data);
    } catch { /* 尚無資料時忽略 */ }
  }, []);

  // 首次渲染時載入統計
  useState(() => { loadStats(); });

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '/api';
      const res = await fetch(`${base}/factory-master/export`, { credentials: 'include' });
      if (!res.ok) throw new Error('匯出失敗');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `工廠清冊匯出_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '匯出失敗，請稍後再試');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await apiClient.delete('/factory-master/all');
      setDeleteAllOpen(false);
      setResult(null);
      await loadStats();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '刪除失敗，請稍後再試');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleFile = async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setError('僅支援 CSV、XLSX、XLS 格式');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataSource', file.name.replace(/\.[^.]+$/, ''));

    try {
      const data = await apiClient.postForm<ImportResult>('/factory-master/import', formData);
      setResult(data);
      await loadStats();
    } catch (err: any) {
      setError(err?.message ?? '匯入失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        工廠清冊管理
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        上傳經濟部工廠登記清冊（CSV 或 Excel），系統將自動比對工廠登記編號進行新增或更新。
      </Typography>

      {/* 目前統計 */}
      {stats && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', gap: 3, alignItems: 'center' }}>
          <FactoryIcon color="primary" />
          <Box>
            <Typography variant="subtitle2" color="text.secondary">目前資料庫</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.total.toLocaleString()} 家工廠</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="subtitle2" color="text.secondary">涵蓋縣市</Typography>
            <Typography variant="h5" fontWeight="bold">{stats.counties} 個</Typography>
          </Box>
        </Paper>
      )}

      <Box display="flex" gap={1} mb={2}>
        <Button
          variant="outlined" size="small" startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
          onClick={handleExport} disabled={exporting || !stats?.total}
        >
          匯出目前資料
        </Button>
        <Button
          variant="outlined" size="small" color="error" startIcon={<DeleteSweepIcon />}
          onClick={() => setDeleteAllOpen(true)} disabled={!stats?.total}
        >
          全部刪除
        </Button>
      </Box>

      {/* 拖曳上傳區 */}
      <Paper
        variant="outlined"
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        sx={{
          p: 5, mb: 2, textAlign: 'center', cursor: 'pointer',
          border: '2px dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          bgcolor: dragging ? 'primary.50' : 'grey.50',
          transition: 'all 0.2s',
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".csv,.xlsx,.xls"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
        <UploadIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="subtitle1" gutterBottom>
          拖曳清冊檔案至此，或點擊選擇
        </Typography>
        <Typography variant="body2" color="text.secondary">
          支援 CSV、XLSX、XLS，上限 50 MB
        </Typography>
        <Box mt={2}>
          <Chip label="CSV" size="small" sx={{ mr: 0.5 }} />
          <Chip label="XLSX" size="small" sx={{ mr: 0.5 }} />
          <Chip label="XLS" size="small" />
        </Box>
      </Paper>

      <Button
        variant="contained"
        startIcon={<UploadIcon />}
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        選擇檔案上傳
      </Button>

      {/* 進度 */}
      {loading && (
        <Box mb={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            匯入中，請勿關閉頁面（約需 1–2 分鐘）...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {/* 結果 */}
      {result && (
        <Alert icon={<SuccessIcon />} severity="success" sx={{ mb: 2 }}>
          <Typography fontWeight="bold">{result.message}</Typography>
          <Typography variant="body2">
            來源：{result.dataSource}　｜　新增：{result.inserted.toLocaleString()} 筆　更新：{result.updated.toLocaleString()} 筆　略過：{result.skipped.toLocaleString()} 筆
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.disabled">
        欄位格式請與政府開放資料之「工廠登記資料集」一致（工廠名稱、工廠登記編號、工廠地址、工廠市鎮鄉村里 …）。
        重複上傳時依工廠登記編號自動更新，不會產生重複資料。「匯出目前資料」下載的 CSV 欄位順序跟上傳格式完全對應，改完可以直接匯入回來。
      </Typography>

      <Dialog open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)}>
        <DialogTitle>確定要刪除全部工廠主資料？</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            <AlertTitle>此動作無法復原</AlertTitle>
            將刪除資料庫裡「全部」共 {stats?.total.toLocaleString() ?? 0} 筆工廠主資料。建議先按「匯出目前資料」備份，
            確認手上有一份可以重新匯入的清冊之後，再執行這個動作。
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllOpen(false)} disabled={deletingAll}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAll} disabled={deletingAll}>
            {deletingAll ? <CircularProgress size={20} /> : `確定刪除全部${stats?.total ? ` ${stats.total.toLocaleString()} 筆` : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

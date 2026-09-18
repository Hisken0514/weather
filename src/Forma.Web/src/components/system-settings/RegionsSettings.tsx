/**
 * RegionsSettings - 轄區管理
 * 可新增、修改、刪除轄區，作為機關與業者的轄區下拉選單來源
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { regionsApi, type RegionDto } from '@/lib/api/regions';

export function RegionsSettings() {
  const [regions, setRegions] = useState<RegionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RegionDto | null>(null);
  const [formName, setFormName] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<RegionDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await regionsApi.getAll();
      setRegions(data);
    } catch {
      setError('載入轄區失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormSortOrder(regions.length > 0 ? Math.max(...regions.map(r => r.sortOrder)) + 10 : 0);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (region: RegionDto) => {
    setEditing(region);
    setFormName(region.name);
    setFormSortOrder(region.sortOrder);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setFormError('請輸入轄區名稱');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await regionsApi.update(editing.id, { name: formName.trim(), sortOrder: formSortOrder });
      } else {
        await regionsApi.create({ name: formName.trim(), sortOrder: formSortOrder });
      }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string } })?.data?.message;
      setFormError(msg ?? '儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await regionsApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      setError('刪除失敗');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h6" fontWeight="bold">轄區管理</Typography>
          <Typography variant="body2" color="text.secondary">
            管理督導系統中的轄區清單，供機關與業者選用
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          新增轄區
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : regions.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
          <Typography>尚未建立任何轄區</Typography>
          <Typography variant="body2">點擊「新增轄區」建立第一個轄區</Typography>
        </Box>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>轄區名稱</TableCell>
              <TableCell align="center" sx={{ width: 100 }}>排序</TableCell>
              <TableCell align="right" sx={{ width: 100 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {regions.map((region) => (
              <TableRow key={region.id} hover>
                <TableCell>{region.name}</TableCell>
                <TableCell align="center">{region.sortOrder}</TableCell>
                <TableCell align="right">
                  <Tooltip title="編輯">
                    <IconButton size="small" onClick={() => openEdit(region)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="刪除">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(region)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? '編輯轄區' : '新增轄區'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              label="轄區名稱"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              fullWidth
              autoFocus
              placeholder="例：臺北分局"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <TextField
              label="排序"
              type="number"
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(Number(e.target.value))}
              fullWidth
              helperText="數字越小越靠前"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={16} /> : '儲存'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除確認 Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除轄區「<strong>{deleteTarget?.name}</strong>」嗎？
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            已使用此轄區名稱的機關與業者資料不受影響。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>取消</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={16} /> : '刪除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RegionsSettings;

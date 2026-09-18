/**
 * OrganizationsSettings - 組織管理設定
 * 系統管理員專用
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { organizationsApi } from '@/lib/api/organizations';
import type {
  OrganizationListDto,
  OrganizationDto,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from '@/types/api/organizations';

// 組織類型對應
const organizationTypes: Record<string, { label: string; color: 'primary' | 'secondary' | 'default' }> = {
  Central: { label: '中央政府', color: 'primary' },
  Local: { label: '地方政府', color: 'secondary' },
  Foundation: { label: '財團法人', color: 'default' },
  Association: { label: '社團法人', color: 'default' },
  Company: { label: '公司', color: 'default' },
  Enterprise: { label: '企業', color: 'default' },
  Group: { label: '集團', color: 'default' },
  Academic: { label: '學術單位', color: 'default' },
};

function getTypeInfo(type: string) {
  return organizationTypes[type] || { label: type, color: 'primary' as const };
}

// 組織對話框
interface OrganizationDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingOrganization?: OrganizationDto | null;
}

function OrganizationDialog({ open, onClose, onSaved, editingOrganization }: OrganizationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editingOrganization;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateOrganizationRequest>({
    defaultValues: {
      name: '',
      code: '',
      description: '',
      type: 'Central',
    },
  });

  useEffect(() => {
    if (editingOrganization) {
      reset({
        name: editingOrganization.name,
        code: editingOrganization.code,
        description: editingOrganization.description || '',
        type: editingOrganization.type,
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        type: 'Central',
      });
    }
  }, [editingOrganization, reset]);

  const onSubmit = async (data: CreateOrganizationRequest) => {
    setLoading(true);
    setError(null);

    try {
      if (isEditing && editingOrganization) {
        await organizationsApi.updateOrganization(editingOrganization.id, {
          name: data.name,
          description: data.description,
          type: data.type,
        } as UpdateOrganizationRequest);
      } else {
        await organizationsApi.createOrganization(data);
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? '編輯組織' : '建立新組織'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Controller
            name="name"
            control={control}
            rules={{ required: '請輸入組織名稱' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="組織名稱"
                error={!!errors.name}
                helperText={errors.name?.message}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="code"
            control={control}
            rules={{ required: '請輸入組織代碼' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="組織代碼"
                placeholder="例如: ORG-001"
                error={!!errors.code}
                helperText={errors.code?.message}
                disabled={isEditing}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>組織類型</InputLabel>
                <Select {...field} label="組織類型">
                  <MenuItem value="Central">中央政府</MenuItem>
                  <MenuItem value="Local">地方政府</MenuItem>
                  <MenuItem value="Foundation">財團法人</MenuItem>
                  <MenuItem value="Association">社團法人</MenuItem>
                  <MenuItem value="Company">公司</MenuItem>
                  <MenuItem value="Enterprise">企業</MenuItem>
                  <MenuItem value="Group">集團</MenuItem>
                  <MenuItem value="Academic">學術單位</MenuItem>
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={3}
                label="描述"
                placeholder="組織說明（選填）"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>取消</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '處理中...' : isEditing ? '儲存' : '建立'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function OrganizationsSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<OrganizationDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await organizationsApi.getOrganizations({ pageSize: 100 });
      setOrganizations(response.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (org: OrganizationListDto) => {
    try {
      const fullOrg = await organizationsApi.getOrganization(org.id);
      setEditingOrganization(fullOrg);
      setDialogOpen(true);
    } catch (err) {
      console.error('Failed to load organization:', err);
    }
  };

  const handleDelete = async (org: OrganizationListDto) => {
    if (!confirm(`確定要刪除組織「${org.name}」嗎？`)) return;

    setDeleteLoading(org.id);
    try {
      await organizationsApi.deleteOrganization(org.id);
      loadOrganizations();
    } catch (err) {
      const message = err instanceof Error ? err.message : '刪除失敗';
      alert(message);
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        組織管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        管理系統中的所有組織
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <TextField
          placeholder="搜尋組織..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditingOrganization(null); setDialogOpen(true); }}
        >
          建立組織
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadOrganizations}>重試</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>名稱</TableCell>
              <TableCell>代碼</TableCell>
              <TableCell>類型</TableCell>
              <TableCell align="center">計畫數</TableCell>
              <TableCell>建立日期</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : filteredOrganizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm ? '找不到符合的組織' : '尚無組織'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrganizations.map((org) => {
                const typeInfo = getTypeInfo(org.type);
                return (
                  <TableRow key={org.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">{org.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{org.code}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={typeInfo.label} size="small" color={typeInfo.color} />
                    </TableCell>
                    <TableCell align="center">{org.projectCount}</TableCell>
                    <TableCell>
                      {new Date(org.createdAt).toLocaleDateString('zh-TW')}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="編輯">
                        <IconButton size="small" onClick={() => handleEdit(org)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={org.projectCount > 0 ? '有計畫無法刪除' : '刪除'}>
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(org)}
                            disabled={org.projectCount > 0 || deleteLoading === org.id}
                            color="error"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <OrganizationDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingOrganization(null); }}
        onSaved={loadOrganizations}
        editingOrganization={editingOrganization}
      />
    </Box>
  );
}

export default OrganizationsSettings;

/**
 * OrganizationsPage - 組織管理頁面
 * 系統管理員專用，用於管理組織的 CRUD 操作
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  Folder as ProjectsIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { MainLayout } from '@/components/layout';
import { organizationsApi } from '@/lib/api/organizations';
import { useAuthStore } from '@/stores/authStore';
import type {
  OrganizationListDto,
  OrganizationDto,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  GetOrganizationsParams,
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
  return organizationTypes[type] || { label: type, color: 'default' as const };
}

// 組織卡片組件
interface OrganizationCardProps {
  organization: OrganizationListDto;
  onEdit?: (organization: OrganizationListDto) => void;
  onDelete?: (organization: OrganizationListDto) => void;
  isAdmin: boolean;
}

function OrganizationCard({ organization, onEdit, onDelete, isAdmin }: OrganizationCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const typeInfo = getTypeInfo(organization.type);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
            <BusinessIcon />
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={typeInfo.label}
              size="small"
              color={typeInfo.color}
              sx={{ height: 24 }}
            />
            {isAdmin && (
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Title */}
        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
          {organization.name}
        </Typography>

        {/* Code */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          代碼：{organization.code}
        </Typography>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ProjectsIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {organization.projectCount} 個計畫
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          建立於 {new Date(organization.createdAt).toLocaleDateString('zh-TW')}
        </Typography>
      </CardActions>

      {/* Context Menu */}
      {isAdmin && (
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem onClick={() => { handleMenuClose(); onEdit?.(organization); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>編輯</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => { handleMenuClose(); onDelete?.(organization); }}
            sx={{ color: 'error.main' }}
            disabled={organization.projectCount > 0}
          >
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>刪除</ListItemText>
          </MenuItem>
        </Menu>
      )}
    </Card>
  );
}

// 建立/編輯組織對話框
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

  // 當編輯時，填入現有資料
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

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? '編輯組織' : '建立新組織'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
            rules={{ required: '請選擇組織類型' }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>組織類型</InputLabel>
                <Select {...field} label="組織類型" error={!!errors.type}>
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
          <Button onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '處理中...' : isEditing ? '儲存' : '建立'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// 刪除確認對話框
interface DeleteConfirmDialogProps {
  open: boolean;
  organization: OrganizationListDto | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function DeleteConfirmDialog({ open, organization, onClose, onConfirm, loading }: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>確認刪除</DialogTitle>
      <DialogContent>
        <Typography>
          確定要刪除組織「{organization?.name}」嗎？此操作無法復原。
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? '刪除中...' : '刪除'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 載入骨架
function OrganizationsSkeleton() {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
          <Skeleton variant="rounded" height={200} />
        </Grid>
      ))}
    </Grid>
  );
}

export function OrganizationsPage() {
  const { user } = useAuthStore();
  const isAdmin = user ? (BigInt(user.permissions ?? 0) & 7n) === 7n : false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationListDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState<OrganizationDto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingOrganization, setDeletingOrganization] = useState<OrganizationListDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const pageSize = 12;

  useEffect(() => {
    loadOrganizations();
  }, [currentPage, searchTerm, typeFilter]);

  const loadOrganizations = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: GetOrganizationsParams = {
        pageNumber: currentPage,
        pageSize,
        searchTerm: searchTerm || undefined,
        type: typeFilter || undefined,
      };

      const response = await organizationsApi.getOrganizations(params);
      setOrganizations(response.items || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  const handleEdit = async (organization: OrganizationListDto) => {
    try {
      // 載入完整組織資料
      const fullOrg = await organizationsApi.getOrganization(organization.id);
      setEditingOrganization(fullOrg);
      setDialogOpen(true);
    } catch (err) {
      console.error('Failed to load organization:', err);
    }
  };

  const handleDelete = (organization: OrganizationListDto) => {
    setDeletingOrganization(organization);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingOrganization) return;

    setDeleteLoading(true);
    try {
      await organizationsApi.deleteOrganization(deletingOrganization.id);
      setDeleteDialogOpen(false);
      setDeletingOrganization(null);
      loadOrganizations();
    } catch (err) {
      const message = err instanceof Error ? err.message : '刪除失敗';
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingOrganization(null);
  };

  const handleOrganizationSaved = () => {
    loadOrganizations();
  };

  return (
    <MainLayout title="組織管理">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              組織管理
            </Typography>
            <Typography variant="body1" color="text.secondary">
              管理系統中的所有組織
            </Typography>
          </Box>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              建立組織
            </Button>
          )}
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="搜尋組織..."
            value={searchTerm}
            onChange={handleSearchChange}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>組織類型</InputLabel>
            <Select
              value={typeFilter}
              label="組織類型"
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            >
              <MenuItem value="">全部</MenuItem>
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
        </Box>
      </Box>

      {/* Non-admin warning */}
      {!isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          您目前僅能檢視組織資訊。如需新增或編輯組織，請聯繫系統管理員。
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadOrganizations}>
              重試
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <OrganizationsSkeleton />
      ) : organizations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BusinessIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            尚無組織
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {searchTerm || typeFilter
              ? '找不到符合條件的組織'
              : '建立第一個組織開始使用'}
          </Typography>
          {!searchTerm && !typeFilter && isAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
            >
              建立組織
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {organizations.map((organization) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={organization.id}>
                <OrganizationCard
                  organization={organization}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Create/Edit Dialog */}
      <OrganizationDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSaved={handleOrganizationSaved}
        editingOrganization={editingOrganization}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        organization={deletingOrganization}
        onClose={() => { setDeleteDialogOpen(false); setDeletingOrganization(null); }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </MainLayout>
  );
}

export default OrganizationsPage;

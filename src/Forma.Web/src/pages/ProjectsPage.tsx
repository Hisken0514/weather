/**
 * ProjectsPage - 計畫列表頁面
 * 顯示使用者參與的所有計畫，支援搜尋、篩選和建立新計畫
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
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Folder as FolderIcon,
  People as PeopleIcon,
  Description as FormIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  ExitToApp as LeaveIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { MainLayout } from '@/components/layout';
import { projectsApi } from '@/lib/api/projects';
import { organizationsApi } from '@/lib/api/organizations';
import type { ProjectListDto, CreateProjectRequest, GetProjectsParams } from '@/types/api/projects';
import type { OrganizationListDto } from '@/types/api/organizations';

// 狀態顏色對應
function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status?.toLowerCase()) {
    case 'active':
    case '進行中':
      return 'success';
    case 'planning':
    case '規劃中':
      return 'info';
    case 'completed':
    case '已完成':
      return 'default';
    case 'archived':
    case '已封存':
      return 'warning';
    case 'cancelled':
    case '已取消':
      return 'error';
    default:
      return 'default';
  }
}

// 角色顏色對應
function getRoleColor(role: string): 'primary' | 'secondary' | 'default' {
  switch (role?.toLowerCase()) {
    case 'owner':
    case '擁有者':
      return 'primary';
    case 'manager':
    case '管理員':
      return 'secondary';
    default:
      return 'default';
  }
}

// 計畫卡片組件
interface ProjectCardProps {
  project: ProjectListDto;
  onEdit?: (project: ProjectListDto) => void;
  onDelete?: (project: ProjectListDto) => void;
  onArchive?: (project: ProjectListDto) => void;
  onLeave?: (project: ProjectListDto) => void;
}

function ProjectCard({ project, onEdit, onDelete, onArchive, onLeave }: ProjectCardProps) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  const isOwnerOrManager = ['owner', 'manager', '擁有者', '管理員'].includes(
    project.currentUserRole?.toLowerCase() ?? ''
  );

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
            <FolderIcon />
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              label={project.status}
              size="small"
              color={getStatusColor(project.status)}
              sx={{ height: 24 }}
            />
            <IconButton size="small" onClick={handleMenuClick}>
              <MoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Title */}
        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
          {project.name}
        </Typography>

        {/* Code & Year */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {project.code} • {project.year}
        </Typography>

        {/* Description */}
        {project.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 2,
            }}
          >
            {project.description}
          </Typography>
        )}

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PeopleIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {project.memberCount}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FormIcon fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {project.formCount}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
        {project.currentUserRole && (
          <Chip
            label={project.currentUserRole}
            size="small"
            color={getRoleColor(project.currentUserRole)}
            variant="outlined"
          />
        )}
        <Typography variant="caption" color="text.secondary">
          {new Date(project.createdAt).toLocaleDateString('zh-TW')}
        </Typography>
      </CardActions>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        {isOwnerOrManager && (
          <MenuItem onClick={() => { handleMenuClose(); onEdit?.(project); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>編輯</ListItemText>
          </MenuItem>
        )}
        {isOwnerOrManager && (
          <MenuItem onClick={() => { handleMenuClose(); onArchive?.(project); }}>
            <ListItemIcon><ArchiveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>封存</ListItemText>
          </MenuItem>
        )}
        {!isOwnerOrManager && (
          <MenuItem onClick={() => { handleMenuClose(); onLeave?.(project); }}>
            <ListItemIcon><LeaveIcon fontSize="small" /></ListItemIcon>
            <ListItemText>離開計畫</ListItemText>
          </MenuItem>
        )}
        {project.currentUserRole?.toLowerCase() === 'owner' && (
          <MenuItem onClick={() => { handleMenuClose(); onDelete?.(project); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>刪除</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}

// 建立計畫對話框
interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  organizations: OrganizationListDto[];
}

function CreateProjectDialog({ open, onClose, onCreated, organizations }: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateProjectRequest>({
    defaultValues: {
      organizationId: organizations[0]?.id || '',
      name: '',
      code: '',
      description: '',
      year: new Date().getFullYear(),
    },
  });

  const onSubmit = async (data: CreateProjectRequest) => {
    setLoading(true);
    setError(null);

    try {
      await projectsApi.createProject(data);
      reset();
      onCreated();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '建立失敗';
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
      <DialogTitle>建立新計畫</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Controller
            name="organizationId"
            control={control}
            rules={{ required: '請選擇組織' }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>組織</InputLabel>
                <Select {...field} label="組織" error={!!errors.organizationId}>
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>
                      {org.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="name"
            control={control}
            rules={{ required: '請輸入計畫名稱' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="計畫名稱"
                error={!!errors.name}
                helperText={errors.name?.message}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="code"
            control={control}
            rules={{ required: '請輸入計畫代碼' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="計畫代碼"
                placeholder="例如: PRJ-2026-001"
                error={!!errors.code}
                helperText={errors.code?.message}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="year"
            control={control}
            rules={{ required: '請輸入年度' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="年度"
                error={!!errors.year}
                helperText={errors.year?.message}
                sx={{ mb: 2 }}
              />
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
                placeholder="計畫說明（選填）"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            取消
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '建立中...' : '建立'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// 載入骨架
function ProjectsSkeleton() {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
          <Skeleton variant="rounded" height={240} />
        </Grid>
      ))}
    </Grid>
  );
}

export function ProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');

  const pageSize = 12;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadProjects();
  }, [currentPage, searchTerm, statusFilter, yearFilter]);

  const loadInitialData = async () => {
    try {
      const orgsResponse = await organizationsApi.getOrganizations();
      setOrganizations(orgsResponse.items || []);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: GetProjectsParams = {
        pageNumber: currentPage,
        pageSize,
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
        year: yearFilter || undefined,
      };

      const response = await projectsApi.getProjects(params);
      setProjects(response.items || []);
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

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, mode: 'grid' | 'list' | null) => {
    if (mode) setViewMode(mode);
  };

  const handleProjectCreated = () => {
    loadProjects();
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <MainLayout title="計畫">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              計畫
            </Typography>
            <Typography variant="body1" color="text.secondary">
              管理您參與的所有計畫
            </Typography>
          </Box>
          <Tooltip title={organizations.length === 0 ? '請先聯繫管理員建立組織' : ''}>
            <span>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                disabled={organizations.length === 0}
              >
                建立計畫
              </Button>
            </span>
          </Tooltip>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="搜尋計畫..."
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

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>狀態</InputLabel>
            <Select
              value={statusFilter}
              label="狀態"
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value="active">進行中</MenuItem>
              <MenuItem value="planning">規劃中</MenuItem>
              <MenuItem value="completed">已完成</MenuItem>
              <MenuItem value="archived">已封存</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>年度</InputLabel>
            <Select
              value={yearFilter}
              label="年度"
              onChange={(e) => { setYearFilter(e.target.value as number | ''); setCurrentPage(1); }}
            >
              <MenuItem value="">全部</MenuItem>
              {yearOptions.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
          >
            <ToggleButton value="grid">
              <Tooltip title="卡片檢視">
                <GridIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list">
              <Tooltip title="列表檢視">
                <ListIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* No Organizations Warning */}
      {!loading && organizations.length === 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          目前沒有可用的組織。請聯繫系統管理員建立組織後才能建立計畫。
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={loadProjects}>
              重試
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Content */}
      {loading ? (
        <ProjectsSkeleton />
      ) : projects.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FolderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            尚無計畫
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {searchTerm || statusFilter || yearFilter
              ? '找不到符合條件的計畫'
              : '建立您的第一個計畫開始使用'}
          </Typography>
          {!searchTerm && !statusFilter && !yearFilter && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              disabled={organizations.length === 0}
            >
              建立計畫
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {projects.map((project) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
                <ProjectCard project={project} />
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

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={handleProjectCreated}
        organizations={organizations}
      />
    </MainLayout>
  );
}

export default ProjectsPage;

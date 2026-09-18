/**
 * ProjectsSettings - 計畫管理設定
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
  Popover,
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
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { projectsApi } from '@/lib/api/projects';
import { organizationsApi } from '@/lib/api/organizations';
import type { ProjectListDto, CreateProjectRequest } from '@/types/api/projects';
import type { OrganizationListDto } from '@/types/api/organizations';

// 狀態設定
const statusOptions = [
  { value: 'Draft', label: '草稿', color: 'default' as const },
  { value: 'Planning', label: '規劃中', color: 'info' as const },
  { value: 'Active', label: '進行中', color: 'success' as const },
  { value: 'Completed', label: '已完成', color: 'default' as const },
  { value: 'Archived', label: '已封存', color: 'warning' as const },
];

function getStatusOption(status: string) {
  return statusOptions.find(s => s.value === status) || statusOptions[0];
}

// 狀態編輯器組件
interface StatusEditorProps {
  project: ProjectListDto;
  onStatusChange: (project: ProjectListDto, newStatus: string) => void;
  disabled?: boolean;
}

function StatusEditor({ project, onStatusChange, disabled }: StatusEditorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const statusInfo = getStatusOption(project.status);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (newStatus: string) => {
    if (newStatus !== project.status) {
      onStatusChange(project, newStatus);
    }
    handleClose();
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Chip
          label={statusInfo.label}
          size="small"
          color={statusInfo.color}
        />
        <IconButton
          size="small"
          onClick={handleClick}
          disabled={disabled}
          sx={{ p: 0.25 }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 1, minWidth: 120 }}>
          {statusOptions.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => handleSelect(option.value)}
              selected={option.value === project.status}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <Chip
                label={option.label}
                size="small"
                color={option.color}
                sx={{ width: '100%' }}
              />
            </MenuItem>
          ))}
        </Box>
      </Popover>
    </>
  );
}

// 建立計畫對話框
interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  organizations: OrganizationListDto[];
}

function ProjectDialog({ open, onClose, onSaved, organizations }: ProjectDialogProps) {
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

  useEffect(() => {
    if (organizations.length > 0) {
      reset({
        organizationId: organizations[0].id,
        name: '',
        code: '',
        description: '',
        year: new Date().getFullYear(),
      });
    }
  }, [organizations, reset]);

  const onSubmit = async (data: CreateProjectRequest) => {
    setLoading(true);
    setError(null);

    try {
      await projectsApi.createProject(data);
      reset();
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '建立失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>建立新計畫</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Controller
            name="organizationId"
            control={control}
            rules={{ required: '請選擇組織' }}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>組織</InputLabel>
                <Select {...field} label="組織" error={!!errors.organizationId}>
                  {organizations.map((org) => (
                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
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
          <Button onClick={onClose} disabled={loading}>取消</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '建立中...' : '建立'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function ProjectsSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectListDto[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationListDto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    loadData();
  }, [yearFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectsRes, orgsRes] = await Promise.all([
        projectsApi.getProjects({
          pageSize: 100,
          year: yearFilter || undefined,
        }),
        organizationsApi.getOrganizations({ pageSize: 100 }),
      ]);
      setProjects(projectsRes.items || []);
      setOrganizations(orgsRes.items || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (project: ProjectListDto, newStatus: string) => {
    setActionLoading(project.id);
    try {
      await projectsApi.updateProject(project.id, {
        name: project.name,
        year: project.year,
        status: newStatus,
      });
      // 更新本地狀態
      setProjects(prev => prev.map(p =>
        p.id === project.id ? { ...p, status: newStatus } : p
      ));
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新狀態失敗';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (project: ProjectListDto) => {
    if (!confirm(`確定要刪除計畫「${project.name}」嗎？此操作無法復原。`)) return;

    setActionLoading(project.id);
    try {
      await projectsApi.deleteProject(project.id);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '刪除失敗';
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        計畫管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        管理系統中的所有計畫
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="搜尋計畫..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ width: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>年度</InputLabel>
            <Select
              value={yearFilter}
              label="年度"
              onChange={(e) => setYearFilter(e.target.value as number | '')}
            >
              <MenuItem value="">全部</MenuItem>
              {yearOptions.map((year) => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          disabled={organizations.length === 0}
        >
          建立計畫
        </Button>
      </Box>

      {organizations.length === 0 && !loading && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          請先建立組織才能建立計畫
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadData}>重試</Button>
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
              <TableCell>年度</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell align="center">表單數</TableCell>
              <TableCell align="center">成員數</TableCell>
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
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm || yearFilter ? '找不到符合的計畫' : '尚無計畫'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow key={project.id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{project.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{project.code}</Typography>
                  </TableCell>
                  <TableCell>{project.year}</TableCell>
                  <TableCell>
                    <StatusEditor
                      project={project}
                      onStatusChange={handleStatusChange}
                      disabled={actionLoading === project.id}
                    />
                  </TableCell>
                  <TableCell align="center">{project.formCount}</TableCell>
                  <TableCell align="center">{project.memberCount}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="刪除">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(project)}
                        disabled={actionLoading === project.id}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <ProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadData}
        organizations={organizations}
      />
    </Box>
  );
}

export default ProjectsSettings;

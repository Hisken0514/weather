/**
 * ProjectDetailPage - 計畫詳情頁面
 * 顯示計畫資訊和表單列表
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Alert,
  Breadcrumbs,
  Link,
  Divider,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Description as FormIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CloneIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishIcon,
  PlayArrow as FillIcon,
  Visibility as ViewIcon,
  Link as LinkIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, Link as RouterLink } from 'react-router';
import { MainLayout } from '@/components/layout';
import { projectsApi } from '@/lib/api/projects';
import { formsApi } from '@/lib/api/forms';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import type { ProjectDto, ProjectMemberDto } from '@/types/api/projects';
import type { FormListDto } from '@/types/api/forms';

// 表單狀態顏色
function getFormStatusColor(isPublished: boolean, isActive: boolean): 'success' | 'warning' | 'default' {
  if (!isActive) return 'default';
  return isPublished ? 'success' : 'warning';
}

function getFormStatusText(isPublished: boolean, isActive: boolean): string {
  if (!isActive) return '已停用';
  return isPublished ? '已發布' : '草稿';
}

// 計畫狀態選項
const PROJECT_STATUS_OPTIONS = [
  { value: 'Draft', label: '草稿', color: 'default' as const },
  { value: 'Planning', label: '規劃中', color: 'info' as const },
  { value: 'Active', label: '進行中', color: 'success' as const },
  { value: 'Completed', label: '已完成', color: 'default' as const },
  { value: 'Archived', label: '已封存', color: 'warning' as const },
];

function getProjectStatusOption(status: string) {
  return PROJECT_STATUS_OPTIONS.find(s => s.value === status) || PROJECT_STATUS_OPTIONS[0];
}

// 表單卡片組件
interface FormCardProps {
  form: FormListDto;
  projectId: string;
  canEdit: boolean;
  canPublish: boolean;
  canViewSubmissions: boolean;
  canLockUnlock: boolean;
  onDelete: (form: FormListDto) => void;
  onClone: (form: FormListDto) => void;
  onPublish: (form: FormListDto) => void;
  onUnpublish: (form: FormListDto) => void;
  onLock: (form: FormListDto) => void;
  onUnlock: (form: FormListDto) => void;
}

function FormCard({
  form,
  projectId,
  canEdit,
  canPublish,
  canViewSubmissions,
  canLockUnlock,
  onDelete,
  onClone,
  onPublish,
  onUnpublish,
  onLock,
  onUnlock,
}: FormCardProps) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const menuOpen = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditForm = () => {
    navigate(`/projects/${projectId}/forms/${form.id}/edit`);
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
            <FormIcon />
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {form.isLocked && (
              <Tooltip title={`已鎖定${form.lockedByUsername ? ` (${form.lockedByUsername})` : ''}`}>
                <LockIcon fontSize="small" color="warning" />
              </Tooltip>
            )}
            <Chip
              label={getFormStatusText(form.isPublished, form.isActive)}
              size="small"
              color={getFormStatusColor(form.isPublished, form.isActive)}
            />
            <IconButton size="small" onClick={handleMenuClick}>
              <MoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
          {form.name}
        </Typography>

        {form.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 1,
            }}
          >
            {form.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            版本: {form.version}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            提交: {form.submissionCount}
          </Typography>
        </Box>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {form.createdByUsername}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(form.createdAt).toLocaleDateString('zh-TW')}
        </Typography>
      </CardActions>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={menuOpen} onClose={handleMenuClose}>
        {form.isPublished && (
          <MenuItem onClick={() => { handleMenuClose(); navigate(`/forms/${form.id}/submit`); }}>
            <ListItemIcon><FillIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText>填寫表單</ListItemText>
          </MenuItem>
        )}
        {form.isPublished && form.accessControl === 'Public' && (
          <MenuItem onClick={() => {
            handleMenuClose();
            navigator.clipboard.writeText(`${window.location.origin}/public/forms/${form.id}`);
            setCopySnackbar(true);
          }}>
            <ListItemIcon><LinkIcon fontSize="small" /></ListItemIcon>
            <ListItemText>複製公開連結</ListItemText>
          </MenuItem>
        )}
        {canViewSubmissions && form.submissionCount > 0 && (
          <MenuItem onClick={() => { handleMenuClose(); navigate(`/forms/${form.id}/submissions`); }}>
            <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
            <ListItemText>查看提交 ({form.submissionCount})</ListItemText>
          </MenuItem>
        )}
        {(form.isPublished || (canViewSubmissions && form.submissionCount > 0)) && <Divider />}
        {canEdit && (!form.isLocked || canLockUnlock) && (
          <MenuItem onClick={() => { handleMenuClose(); handleEditForm(); }}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText>編輯</ListItemText>
          </MenuItem>
        )}
        {canEdit && (
          <MenuItem onClick={() => { handleMenuClose(); onClone(form); }}>
            <ListItemIcon><CloneIcon fontSize="small" /></ListItemIcon>
            <ListItemText>複製</ListItemText>
          </MenuItem>
        )}
        {canPublish && form.isActive && !form.isPublished && (!form.isLocked || canLockUnlock) && (
          <MenuItem onClick={() => { handleMenuClose(); onPublish(form); }}>
            <ListItemIcon><PublishIcon fontSize="small" /></ListItemIcon>
            <ListItemText>發布</ListItemText>
          </MenuItem>
        )}
        {canPublish && form.isActive && form.isPublished && (!form.isLocked || canLockUnlock) && (
          <MenuItem onClick={() => { handleMenuClose(); onUnpublish(form); }}>
            <ListItemIcon><UnpublishIcon fontSize="small" /></ListItemIcon>
            <ListItemText>下架</ListItemText>
          </MenuItem>
        )}
        {canLockUnlock && !form.isLocked && (
          <MenuItem onClick={() => { handleMenuClose(); onLock(form); }}>
            <ListItemIcon><LockIcon fontSize="small" /></ListItemIcon>
            <ListItemText>鎖定</ListItemText>
          </MenuItem>
        )}
        {canLockUnlock && form.isLocked && (
          <MenuItem onClick={() => { handleMenuClose(); onUnlock(form); }}>
            <ListItemIcon><LockOpenIcon fontSize="small" /></ListItemIcon>
            <ListItemText>解鎖</ListItemText>
          </MenuItem>
        )}
        {canEdit && <Divider />}
        {canEdit && !form.isLocked && (
          <MenuItem onClick={() => { handleMenuClose(); onDelete(form); }} sx={{ color: 'error.main' }}>
            <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>刪除</ListItemText>
          </MenuItem>
        )}
      </Menu>

      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        message="公開連結已複製"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Card>
  );
}

// 載入骨架
function ProjectDetailSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width={200} height={40} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
      <Grid container spacing={3}>
        {[1, 2, 3].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Skeleton variant="rounded" height={200} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [forms, setForms] = useState<FormListDto[]>([]);
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);

  // Get current user's role and permissions
  const currentUserMember = members.find(m => m.userId === user?.id);
  const userRole = currentUserMember?.role;
  const canCreateForm = hasPermission(userRole, 'create_form');
  const canEditForm = hasPermission(userRole, 'edit_form');
  const canPublishForm = hasPermission(userRole, 'publish_form');
  const canViewSubmissions = hasPermission(userRole, 'view_submissions');
  // LockUnlockForms = 1n << 33n (需要 BigInt 做位元運算)
  const canLockUnlock = !!user && (BigInt(user.permissions) & (1n << 33n)) !== 0n;

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const [projectData, formsData, membersData] = await Promise.all([
        projectsApi.getProject(projectId),
        formsApi.getProjectForms(projectId),
        projectsApi.getProjectMembers(projectId),
      ]);

      setProject(projectData);
      setForms(formsData.items || []);
      setMembers(membersData);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = () => {
    if (!projectId) return;
    navigate(`/projects/${projectId}/forms/new`);
  };

  const handlePublishForm = async (form: FormListDto) => {
    try {
      await formsApi.publishForm(form.id);
      loadProjectData();
    } catch (err) {
      console.error('Failed to publish form:', err);
    }
  };

  const handleUnpublishForm = async (form: FormListDto) => {
    try {
      await formsApi.unpublishForm(form.id);
      loadProjectData();
    } catch (err) {
      console.error('Failed to unpublish form:', err);
    }
  };

  const handleDeleteForm = async (form: FormListDto) => {
    if (!confirm(`確定要刪除表單「${form.name}」嗎？`)) return;

    try {
      await formsApi.deleteForm(form.id);
      loadProjectData();
    } catch (err) {
      console.error('Failed to delete form:', err);
    }
  };

  const handleCloneForm = async (form: FormListDto) => {
    try {
      await formsApi.cloneForm(form.id);
      loadProjectData();
    } catch (err) {
      console.error('Failed to clone form:', err);
    }
  };

  const handleLockForm = async (form: FormListDto) => {
    try {
      await formsApi.lockForm(form.id);
      loadProjectData();
    } catch (err) {
      console.error('Failed to lock form:', err);
    }
  };

  const handleUnlockForm = async (form: FormListDto) => {
    try {
      await formsApi.unlockForm(form.id);
      loadProjectData();
    } catch (err) {
      console.error('Failed to unlock form:', err);
    }
  };

  if (loading) {
    return (
      <MainLayout title="計畫詳情">
        <ProjectDetailSkeleton />
      </MainLayout>
    );
  }

  if (error || !project) {
    return (
      <MainLayout title="計畫詳情">
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadProjectData}>
              重試
            </Button>
          }
        >
          {error || '找不到計畫'}
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={project.name}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
          儀表板
        </Link>
        <Typography color="text.primary">{project.name}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            {project.name}
          </Typography>
          <Chip
            label={getProjectStatusOption(project.status).label}
            size="small"
            color={getProjectStatusOption(project.status).color}
          />
        </Box>
        <Typography variant="body1" color="text.secondary">
          {project.code} • {project.year}
          {project.description && ` • ${project.description}`}
        </Typography>
      </Box>

      {/* Forms Section */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">表單列表 ({forms.length})</Typography>
        {canCreateForm && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateForm}
          >
            建立表單
          </Button>
        )}
      </Box>

      {forms.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <FormIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            尚無表單
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            建立第一個表單開始收集資料
          </Typography>
          {canCreateForm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateForm}
            >
              建立表單
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={3}>
          {forms.map((form) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={form.id}>
              <FormCard
                form={form}
                projectId={projectId!}
                canEdit={canEditForm}
                canPublish={canPublishForm}
                canViewSubmissions={canViewSubmissions}
                canLockUnlock={canLockUnlock}
                onDelete={handleDeleteForm}
                onClone={handleCloneForm}
                onPublish={handlePublishForm}
                onUnpublish={handleUnpublishForm}
                onLock={handleLockForm}
                onUnlock={handleUnlockForm}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </MainLayout>
  );
}

export default ProjectDetailPage;

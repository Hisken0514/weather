/**
 * ProjectSettingsPage - 計畫設定頁面
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Breadcrumbs,
  Link,
  Divider,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router';
import { MainLayout } from '@/components/layout';
import { projectsApi } from '@/lib/api/projects';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { ProjectThemeSettings } from '@/components/project/ProjectThemeSettings';
import { ThemePreview } from '@/components/project/ThemePreview';
import { parseProjectTheme } from '@/hooks/useFormTheme';
import type { ProjectDto, ProjectMemberDto, ProjectTheme } from '@/types/api/projects';

// 計畫狀態選項
const PROJECT_STATUS_OPTIONS = [
  { value: 'Draft', label: '草稿', color: 'default' as const },
  { value: 'Planning', label: '規劃中', color: 'info' as const },
  { value: 'Active', label: '進行中', color: 'success' as const },
  { value: 'Completed', label: '已完成', color: 'default' as const },
  { value: 'Archived', label: '已封存', color: 'warning' as const },
];

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  // Form state
  const [editName, setEditName] = useState('');
  const [editYear, setEditYear] = useState(new Date().getFullYear());
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('Draft');

  // Theme state
  const [theme, setTheme] = useState<ProjectTheme>({ allowFormOverride: true });

  // Get current user's role in this project
  const currentUserMember = members.find(m => m.userId === user?.id);
  const canManageProject = hasPermission(currentUserMember?.role, 'manage_project');

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditYear(project.year);
      setEditDescription(project.description || '');
      setEditStatus(project.status);
      setTheme(parseProjectTheme(project.settings) || { allowFormOverride: true });
    }
  }, [project]);

  const loadData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const [projectData, membersData] = await Promise.all([
        projectsApi.getProject(projectId),
        projectsApi.getProjectMembers(projectId),
      ]);

      setProject(projectData);
      setMembers(membersData);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectId || !canManageProject) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await projectsApi.updateProject(projectId, {
        name: editName,
        year: editYear,
        description: editDescription,
        status: editStatus,
        settings: JSON.stringify(theme),
      });
      setSuccess('設定已儲存');
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '儲存失敗';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;

    // Only owner can delete
    if (currentUserMember?.role !== 'Owner') {
      alert('只有擁有者可以刪除計畫');
      return;
    }

    if (!confirm('確定要刪除此計畫嗎？此操作無法復原，所有表單和提交資料都會被刪除。')) return;

    try {
      await projectsApi.deleteProject(projectId);
      navigate('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : '刪除失敗';
      alert(message);
    }
  };

  if (loading) {
    return (
      <MainLayout title="計畫設定">
        <Box>
          <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={400} />
        </Box>
      </MainLayout>
    );
  }

  if (error && !project) {
    return (
      <MainLayout title="計畫設定">
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    );
  }

  const statusOption = PROJECT_STATUS_OPTIONS.find(s => s.value === project?.status);

  return (
    <MainLayout title="計畫設定">
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
          儀表板
        </Link>
        <Link component={RouterLink} to={`/projects/${projectId}`} underline="hover" color="inherit">
          {project?.name}
        </Link>
        <Typography color="text.primary">計畫設定</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant="h4" fontWeight="bold">
            計畫設定
          </Typography>
          {statusOption && (
            <Chip label={statusOption.label} size="small" color={statusOption.color} />
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          管理計畫基本資訊與主題設定
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="基本設定" />
          <Tab label="主題設定" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {activeTab === 0 && (
            <>
              <Typography variant="h6" gutterBottom>
                基本資訊
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="計畫名稱"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!canManageProject}
                  fullWidth
                />

                <FormControl fullWidth disabled={!canManageProject}>
                  <InputLabel>年度</InputLabel>
                  <Select
                    value={editYear}
                    label="年度"
                    onChange={(e) => setEditYear(e.target.value as number)}
                  >
                    {yearOptions.map((year) => (
                      <MenuItem key={year} value={year}>{year}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth disabled={!canManageProject}>
                  <InputLabel>狀態</InputLabel>
                  <Select
                    value={editStatus}
                    label="狀態"
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    {PROJECT_STATUS_OPTIONS.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        {status.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="描述"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  disabled={!canManageProject}
                  multiline
                  rows={3}
                  fullWidth
                />
              </Box>

              {/* Project Info */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  計畫資訊
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">建立者</Typography>
                    <Typography>{project?.createdByUsername}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">建立時間</Typography>
                    <Typography>
                      {project?.createdAt ? new Date(project.createdAt).toLocaleString('zh-TW') : '-'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">所屬組織</Typography>
                    <Typography>{project?.organizationName || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">表單數量</Typography>
                    <Typography>{project?.formCount || 0}</Typography>
                  </Box>
                </Box>
              </Box>
            </>
          )}

          {activeTab === 1 && (
            <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
              {/* Left: Settings */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <ProjectThemeSettings
                  theme={theme}
                  onChange={setTheme}
                  projectId={projectId}
                />
              </Box>
              {/* Right: Preview */}
              <Box sx={{ width: { xs: '100%', md: 1000 }, flexShrink: 0, position: 'sticky', top: 72, alignSelf: 'flex-start' }}>
                <ThemePreview theme={theme} />
              </Box>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Save Button */}
      {canManageProject && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '儲存中...' : '儲存設定'}
          </Button>
        </Box>
      )}

      {/* Danger Zone */}
      {currentUserMember?.role === 'Owner' && (
        <Paper variant="outlined" sx={{ p: 3, borderColor: 'error.main' }}>
          <Typography variant="h6" color="error" gutterBottom>
            危險區域
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body1" fontWeight="medium">
                刪除計畫
              </Typography>
              <Typography variant="body2" color="text.secondary">
                刪除後無法復原，所有表單和資料都會被永久刪除
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleDelete}
            >
              刪除計畫
            </Button>
          </Box>
        </Paper>
      )}
    </MainLayout>
  );
}

export default ProjectSettingsPage;

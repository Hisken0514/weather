/**
 * ProjectMembersPage - 計畫成員管理頁面
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Skeleton,
  Breadcrumbs,
  Link,
  Tooltip,
} from '@mui/material';
import {
  PersonAdd as AddMemberIcon,
  Delete as RemoveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useParams, Link as RouterLink } from 'react-router';
import { MainLayout } from '@/components/layout';
import { projectsApi } from '@/lib/api/projects';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import type { ProjectDto, ProjectMemberDto, AvailableMemberDto } from '@/types/api/projects';

// 角色選項（對應後端 ProjectRole enum）
const ROLE_OPTIONS = [
  { value: 'Manager', label: '管理員' },
  { value: 'Analyst', label: '分析師' },
  { value: 'Member', label: '一般成員' },
  { value: 'Submitter', label: '提交者' },
];

const roleColors: Record<string, 'error' | 'warning' | 'info' | 'default' | 'success'> = {
  Owner: 'error',
  Manager: 'warning',
  Analyst: 'info',
  Member: 'default',
  Submitter: 'success',
};

const roleLabels: Record<string, string> = {
  Owner: '擁有者',
  Manager: '管理員',
  Analyst: '分析師',
  Member: '一般成員',
  Submitter: '提交者',
};

// 新增成員對話框
interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  projectId: string;
}

function AddMemberDialog({ open, onClose, onAdded, projectId }: AddMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableMembers, setAvailableMembers] = useState<AvailableMemberDto[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Member');

  useEffect(() => {
    if (open) {
      loadAvailableMembers();
    }
  }, [open, searchTerm]);

  const loadAvailableMembers = async () => {
    try {
      const members = await projectsApi.getAvailableMembers(projectId, {
        searchTerm: searchTerm || undefined,
        limit: 20,
      });
      setAvailableMembers(members);
    } catch (err) {
      console.error('Failed to load available members:', err);
    }
  };

  const handleAdd = async () => {
    if (!selectedUserId) return;

    setLoading(true);
    setError(null);

    try {
      await projectsApi.addProjectMember(projectId, {
        userId: selectedUserId,
        role: selectedRole,
      });
      onAdded();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '新增失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSelectedUserId('');
    setSelectedRole('Member');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>新增成員</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          fullWidth
          label="搜尋使用者"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="輸入名稱或 Email"
          sx={{ mb: 2, mt: 1 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>選擇使用者</InputLabel>
          <Select
            value={selectedUserId}
            label="選擇使用者"
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            {availableMembers.map((member) => (
              <MenuItem key={member.id} value={member.id}>
                {member.username} ({member.email})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>角色</InputLabel>
          <Select
            value={selectedRole}
            label="角色"
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          取消
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={loading || !selectedUserId}
        >
          {loading ? '新增中...' : '新增'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// 編輯角色對話框
interface EditRoleDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  projectId: string;
  member: ProjectMemberDto | null;
}

function EditRoleDialog({ open, onClose, onSaved, projectId, member }: EditRoleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  const handleSave = async () => {
    if (!member) return;

    setLoading(true);
    setError(null);

    try {
      await projectsApi.updateProjectMember(projectId, member.userId, {
        role: selectedRole,
      });
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '更新失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>修改角色</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {member?.username}
        </Typography>

        <FormControl fullWidth>
          <InputLabel>角色</InputLabel>
          <Select
            value={selectedRole}
            label="角色"
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            {ROLE_OPTIONS.map((role) => (
              <MenuItem key={role.value} value={role.value}>
                {role.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? '儲存中...' : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function ProjectMembersPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [members, setMembers] = useState<ProjectMemberDto[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMemberDto | null>(null);

  // Get current user's role in this project
  const currentUserMember = members.find(m => m.userId === user?.id);
  const canManageMembers = hasPermission(currentUserMember?.role, 'manage_members');

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

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

  const handleRemoveMember = async (member: ProjectMemberDto) => {
    if (member.role === 'Owner') {
      alert('無法移除擁有者');
      return;
    }

    if (!confirm(`確定要移除成員「${member.username}」嗎？`)) return;

    try {
      await projectsApi.removeProjectMember(projectId!, member.userId);
      loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '移除失敗';
      alert(message);
    }
  };

  const handleEditRole = (member: ProjectMemberDto) => {
    setEditingMember(member);
    setEditDialogOpen(true);
  };

  if (loading) {
    return (
      <MainLayout title="成員管理">
        <Box>
          <Skeleton variant="text" width={200} height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={300} />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="成員管理">
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="成員管理">
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/dashboard" underline="hover" color="inherit">
          儀表板
        </Link>
        <Link component={RouterLink} to={`/projects/${projectId}`} underline="hover" color="inherit">
          {project?.name}
        </Link>
        <Typography color="text.primary">成員管理</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            成員管理
          </Typography>
          <Typography variant="body1" color="text.secondary">
            管理計畫成員與權限
          </Typography>
        </Box>

        {canManageMembers && (
          <Button
            variant="contained"
            startIcon={<AddMemberIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            新增成員
          </Button>
        )}
      </Box>

      {/* Members Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>成員</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>加入時間</TableCell>
              {canManageMembers && <TableCell align="right">操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManageMembers ? 5 : 4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">尚無成員</Typography>
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.userId} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{member.username}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {member.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={roleLabels[member.role] || member.role}
                      size="small"
                      color={roleColors[member.role] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(member.addedAt).toLocaleDateString('zh-TW')}
                    </Typography>
                  </TableCell>
                  {canManageMembers && (
                    <TableCell align="right">
                      {member.role !== 'Owner' && (
                        <>
                          <Tooltip title="修改角色">
                            <IconButton size="small" onClick={() => handleEditRole(member)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="移除成員">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRemoveMember(member)}
                            >
                              <RemoveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Permission Info */}
      <Paper variant="outlined" sx={{ mt: 3, p: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          角色權限說明
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2 }}>
          <li><Typography variant="body2"><strong>擁有者</strong>：完整權限，包含刪除計畫</Typography></li>
          <li><Typography variant="body2"><strong>管理員</strong>：管理計畫設定、成員、表單</Typography></li>
          <li><Typography variant="body2"><strong>一般成員</strong>：建立/編輯/發布表單、查看提交資料</Typography></li>
          <li><Typography variant="body2"><strong>分析師</strong>：查看提交資料、匯出報表</Typography></li>
          <li><Typography variant="body2"><strong>提交者</strong>：僅能填寫表單</Typography></li>
        </Box>
      </Paper>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdded={loadData}
        projectId={projectId!}
      />

      {/* Edit Role Dialog */}
      <EditRoleDialog
        open={editDialogOpen}
        onClose={() => { setEditDialogOpen(false); setEditingMember(null); }}
        onSaved={loadData}
        projectId={projectId!}
        member={editingMember}
      />
    </MainLayout>
  );
}

export default ProjectMembersPage;

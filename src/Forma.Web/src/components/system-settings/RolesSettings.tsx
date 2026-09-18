/**
 * RolesSettings - 角色管理（含權限勾選）
 */

import { useState, useEffect, useCallback } from 'react';
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
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { rolesApi } from '@/lib/api/roles';
import type { RoleDto, CreateRoleRequest, PermissionDefinitionDto } from '@/types/api/roles';

// 權限 key 對應中文名稱
const PERMISSION_LABELS: Record<string, string> = {
  ManageUsers: '使用者管理',
  ManageRoles: '角色管理',
  ManageSettings: '系統設定',
  ViewActionLogs: '查看操作日誌',
  ViewEmailLogs: '查看郵件日誌',
  ManageOrganizations: '組織管理',
  CreateProjects: '建立計畫',
  ManageAllProjects: '管理所有計畫',
  CreateForms: '建立表單',
  ManageAllForms: '管理所有表單',
  ManageTemplates: '管理表單範本',
  LockUnlockForms: '鎖定/解鎖表單',
  ManageEmailTemplates: '管理信件範本',
  ViewAllSubmissions: '查看所有提交資料',
  ExportData: '匯出資料',
  ViewReports: '查看報表',
};

export function RolesSettings() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinitionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPerm, setFormPerm] = useState(BigInt(0));

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        rolesApi.getAll(),
        rolesApi.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // 把權限按 group 分組
  const permissionGroups = permissions.reduce<Record<string, PermissionDefinitionDto[]>>((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const hasPermission = (value: number) => {
    const v = BigInt(value);
    return (formPerm & v) === v;
  };
  const togglePermission = (value: number) => {
    const v = BigInt(value);
    setFormPerm(prev => (prev & v) === v ? prev & ~v : prev | v);
  };

  // 計算角色已勾選的權限數量
  const countPermissions = (permValue: number) => {
    const pv = BigInt(permValue);
    return permissions.filter(p => (pv & BigInt(p.value)) === BigInt(p.value)).length;
  };

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDesc('');
    setFormPerm(BigInt(0));
    setDialogOpen(true);
  };

  const openEdit = (r: RoleDto) => {
    setEditing(r);
    setFormName(r.name);
    setFormDesc(r.description || '');
    setFormPerm(BigInt(r.permissionValue));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const data: CreateRoleRequest = {
        name: formName,
        description: formDesc || undefined,
        permissionValue: Number(formPerm),
      };
      if (editing) {
        await rolesApi.update(editing.id, data);
        setSuccess('角色已更新');
      } else {
        await rolesApi.create(data);
        setSuccess('角色已建立');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: RoleDto) => {
    if (!confirm(`確定要刪除角色「${r.name}」嗎？`)) return;
    try {
      await rolesApi.delete(r.id);
      setSuccess('角色已刪除');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">角色管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={openCreate}>
          新增角色
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>角色名稱</TableCell>
            <TableCell>說明</TableCell>
            <TableCell>權限數量</TableCell>
            <TableCell>建立時間</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.description || '-'}</TableCell>
              <TableCell>{countPermissions(r.permissionValue)} / {permissions.length}</TableCell>
              <TableCell>{new Date(r.createdAt).toLocaleDateString('zh-TW')}</TableCell>
              <TableCell align="right">
                <Tooltip title="編輯">
                  <IconButton size="small" onClick={() => openEdit(r)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="刪除">
                  <IconButton size="small" color="error" onClick={() => handleDelete(r)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {roles.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography color="text.secondary" sx={{ py: 3 }}>尚無角色</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? '編輯角色' : '新增角色'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="角色名稱"
              required
              fullWidth
              size="small"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
            <TextField
              label="說明"
              fullWidth
              size="small"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
            />
            <Divider />
            <Typography variant="subtitle2" fontWeight="bold">權限設定</Typography>
            {Object.entries(permissionGroups).map(([group, perms]) => (
              <Box key={group}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ mb: 0.5, display: 'block' }}>
                  {group}
                </Typography>
                <FormGroup>
                  {perms.map((p) => (
                    <FormControlLabel
                      key={p.key}
                      control={
                        <Checkbox
                          size="small"
                          checked={hasPermission(p.value)}
                          onChange={() => togglePermission(p.value)}
                        />
                      }
                      label={PERMISSION_LABELS[p.key] || p.key}
                    />
                  ))}
                </FormGroup>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formName.trim()}>
            {saving ? '儲存中...' : editing ? '更新' : '建立'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

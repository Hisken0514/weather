/**
 * UsersSettings - 使用者管理設定
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
  TablePagination,
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
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  FilterList as FilterIcon,
  Factory as FactoryIcon,
} from '@mui/icons-material';
import {
  Autocomplete,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { usersApi } from '@/lib/api/users';
import { rolesApi } from '@/lib/api/roles';
import { supervisionApi } from '@/lib/api/supervision';
import type {
  UserListDto,
  UserProfileDto,
  UpdateUserRequest,
} from '@/types/api/users';
import type { RoleDto } from '@/types/api/roles';

// 編輯使用者對話框
interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user: UserProfileDto | null;
  roles: RoleDto[];
}

function UserDialog({ open, onClose, onSaved, user, roles }: UserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, reset, formState: { errors } } = useForm<UpdateUserRequest>({
    defaultValues: {
      username: '',
      email: '',
      roleId: '',
      department: '',
      jobTitle: '',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        username: user.username,
        email: user.email,
        roleId: user.roleId || '',
        department: user.department || '',
        jobTitle: user.jobTitle || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UpdateUserRequest) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const payload = { ...data, roleId: data.roleId || '00000000-0000-0000-0000-000000000000' };
      await usersApi.updateUser(user.id, payload);
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
      <DialogTitle>編輯使用者</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Controller
            name="username"
            control={control}
            rules={{ required: '請輸入使用者名稱' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="使用者名稱"
                error={!!errors.username}
                helperText={errors.username?.message}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="email"
            control={control}
            rules={{
              required: '請輸入電子郵件',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: '請輸入有效的電子郵件',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="電子郵件"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="roleId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>角色</InputLabel>
                <Select {...field} label="角色">
                  <MenuItem value="">無</MenuItem>
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="department"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="部門"
                placeholder="選填"
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="jobTitle"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="職稱"
                placeholder="選填"
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="電話"
                placeholder="選填"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>取消</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '處理中...' : '儲存'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// 產業園區綁定對話框
interface IndustrialParksDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user: UserProfileDto | null;
}

function IndustrialParksDialog({ open, onClose, onSaved, user }: IndustrialParksDialogProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allParks, setAllParks] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);

    Promise.all([
      supervisionApi.getIndustrialParks(),
      user ? usersApi.getUserIndustrialParks(user.id) : Promise.resolve([]),
    ])
      .then(([parks, userParks]) => {
        setAllParks(parks);
        setSelected(userParks);
      })
      .catch(() => setError('載入失敗'))
      .finally(() => setLoading(false));
  }, [open, user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await usersApi.setUserIndustrialParks(user.id, selected);
      onSaved();
      onClose();
    } catch {
      setError('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>產業園區綁定 — {user?.username}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Skeleton variant="rectangular" height={56} />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              選擇後，該使用者在督導任務頁可看到所有綁定園區的工廠任務。未選擇任何園區則維持原有機關範圍。
            </Typography>
            <Autocomplete
              multiple
              options={allParks}
              value={selected}
              onChange={(_, newValue) => setSelected(newValue)}
              disableCloseOnSelect
              renderOption={(props, option, { selected: isSelected }) => (
                <li {...props}>
                  <Checkbox checked={isSelected} sx={{ mr: 1 }} />
                  <ListItemText primary={option} />
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="產業園區" placeholder="搜尋或選擇..." />
              )}
              noOptionsText="無可用園區（請先匯入督導清冊）"
            />
            {selected.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((p) => (
                  <Chip key={p} label={p} size="small" onDelete={() => setSelected(selected.filter((s) => s !== p))} />
                ))}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? '儲存中...' : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function UsersSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserListDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<boolean | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfileDto | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [parksDialogOpen, setParksDialogOpen] = useState(false);
  const [parksUser, setParksUser] = useState<UserProfileDto | null>(null);

  useEffect(() => {
    rolesApi.getAll().then(setRoles).catch(() => {});
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, activeFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await usersApi.getUsers({
        pageNumber: page + 1,
        pageSize: rowsPerPage,
        searchTerm: searchTerm || undefined,
        isActive: activeFilter === '' ? undefined : activeFilter,
      });
      setUsers(response.items || []);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    loadUsers();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleEdit = async (user: UserListDto) => {
    try {
      const fullUser = await usersApi.getUser(user.id);
      setEditingUser(fullUser);
      setDialogOpen(true);
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  const handleOpenParks = async (user: UserListDto) => {
    try {
      const fullUser = await usersApi.getUser(user.id);
      setParksUser(fullUser);
      setParksDialogOpen(true);
    } catch (err) {
      console.error('Failed to load user:', err);
    }
  };

  const handleToggleActive = async (user: UserListDto) => {
    const action = user.isActive ? '停用' : '啟用';
    if (!confirm(`確定要${action}使用者「${user.username}」嗎？`)) return;

    setActionLoading(user.id);
    try {
      if (user.isActive) {
        await usersApi.deactivateUser(user.id);
      } else {
        await usersApi.activateUser(user.id);
      }
      loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action}失敗`;
      alert(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        使用者管理
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        管理系統中的所有使用者帳號
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Search and Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="搜尋使用者名稱或信箱..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
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
        <Button variant="outlined" onClick={handleSearch}>
          搜尋
        </Button>
        <Button
          variant={showFilters ? 'contained' : 'outlined'}
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
        >
          篩選
        </Button>
      </Box>

      {/* Filter Options */}
      {showFilters && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>狀態</InputLabel>
            <Select
              value={activeFilter}
              onChange={(e) => { setActiveFilter(e.target.value as boolean | ''); setPage(0); }}
              label="狀態"
            >
              <MenuItem value="">全部</MenuItem>
              <MenuItem value={true as never}>啟用</MenuItem>
              <MenuItem value={false as never}>停用</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadUsers}>重試</Button>
        }>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>使用者名稱</TableCell>
              <TableCell>電子郵件</TableCell>
              <TableCell>角色</TableCell>
              <TableCell>部門</TableCell>
              <TableCell>產業園區</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell>最後登入</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {searchTerm || activeFilter !== '' ? '找不到符合條件的使用者' : '尚無使用者'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography fontWeight="medium">{user.username}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.roleName || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.department || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {user.industrialParks?.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {user.industrialParks.map((p) => (
                            <Chip key={p} label={p} size="small" variant="outlined" color="primary" />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? '啟用' : '停用'}
                        size="small"
                        color={user.isActive ? 'success' : 'default'}
                        variant={user.isActive ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString('zh-TW')
                          : '從未登入'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="編輯">
                        <IconButton size="small" onClick={() => handleEdit(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.industrialParks?.length > 0 ? `已綁定：${user.industrialParks.join('、')}` : '產業園區綁定'}>
                        <IconButton size="small" onClick={() => handleOpenParks(user)}>
                          <FactoryIcon fontSize="small" color={user.industrialParks?.length > 0 ? 'primary' : 'inherit'} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.isActive ? '停用' : '啟用'}>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(user)}
                          disabled={actionLoading === user.id}
                          color={user.isActive ? 'warning' : 'success'}
                        >
                          {user.isActive ? <BlockIcon fontSize="small" /> : <ActivateIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="每頁筆數"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </TableContainer>

      {/* Edit Dialog */}
      <UserDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingUser(null); }}
        onSaved={loadUsers}
        user={editingUser}
        roles={roles}
      />

      {/* Industrial Parks Dialog */}
      <IndustrialParksDialog
        open={parksDialogOpen}
        onClose={() => { setParksDialogOpen(false); setParksUser(null); }}
        onSaved={loadUsers}
        user={parksUser}
      />
    </Box>
  );
}

export default UsersSettings;

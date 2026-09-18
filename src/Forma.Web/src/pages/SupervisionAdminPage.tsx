/**
 * SupervisionAdminPage — 督導管理 (Admin only)
 * Tab 1: 年度計畫   Tab 2: 機關管理   Tab 3: 進度總覽
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Tabs, Tab, Button, Table, TableHead, TableRow,
  TableCell, TableBody, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel, Alert, CircularProgress, Tooltip,
  LinearProgress, Divider, Stack, Paper, Collapse, InputAdornment,
  Autocomplete, TablePagination, Skeleton, Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PersonAdd as PersonAddIcon,
  LinkOff as UnlinkIcon,
  OpenInNew as OpenInNewIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishedIcon,
  Factory as FactoryIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  AutoFixHigh as SuggestIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  Block as RevokeIcon,
  Bolt as GenerateIcon,
  ArrowUpward as MoveUpIcon,
  ArrowDownward as MoveDownIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
  UnfoldMore as UnsortedIcon,
  ListAlt as ManageItemsIcon,
} from '@mui/icons-material';
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, createColumnHelper, type SortingState, type ColumnFiltersState,
} from '@tanstack/react-table';
import { MainLayout } from '@/components/layout';
import { SupervisionFindingSummary } from '@/components/supervision-reply/SupervisionFindingSummary';
import { supervisionApi } from '@/lib/api/supervision';
import { supervisionReplyApi } from '@/lib/api/supervisionReply';
import { agenciesApi } from '@/lib/api/agencies';
import { regionsApi, type RegionDto } from '@/lib/api/regions';
import { usersApi } from '@/lib/api/users';
import { formsApi } from '@/lib/api/forms';
import type { FormListDto } from '@/types/api';
import { useNavigate } from 'react-router';
import type {
  CampaignDto, AgencyDto, CampaignProgressDto,
  CreateCampaignRequest, CreateAgencyRequest, ImportResult,
  SupervisedFactoryDto, CreateFactoryRequest, UpdateFactoryRequest,
  FactoryRegistrationNoSuggestionDto,
} from '@/types/api/supervision';
import type {
  FactoryTokenLinkDto, AdminReplyTaskListItemDto, FactoryReplyItemDto,
  SupervisionFindingDto,
} from '@/types/api/supervisionReply';

// ─── Status helpers ───────────────────────────────────────

const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  Draft: '草稿', Active: '進行中', Closed: '已結束',
};
const CAMPAIGN_STATUS_COLOR: Record<string, 'default' | 'success' | 'error'> = {
  Draft: 'default', Active: 'success', Closed: 'error',
};

// ─── Main Page ────────────────────────────────────────────

export function SupervisionAdminPage() {
  const [tab, setTab] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDto | null>(null);

  return (
    <MainLayout title="督導管理">
      <Box>
        <Typography variant="h5" fontWeight="bold" mb={2}>
          化學品安全督導管理
        </Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="年度計畫" />
          <Tab label="機關管理" />
          <Tab label="表單管理" />
          <Tab label="工廠管理" />
          <Tab label="進度總覽" />
          <Tab label="改善回覆與複查" />
        </Tabs>
        {tab === 0 && <CampaignsTab onSelectCampaign={(c) => { setSelectedCampaign(c); setTab(2); }} />}
        {tab === 1 && <AgenciesTab />}
        {tab === 2 && <FormsTab selectedCampaign={selectedCampaign} />}
        {tab === 3 && <FactoriesTab />}
        {tab === 4 && <ProgressTab />}
        {tab === 5 && <RectificationTab />}
      </Box>
    </MainLayout>
  );
}

// ════════════════════════════════════════════════════════════
// Tab 1: 年度計畫
// ════════════════════════════════════════════════════════════

function CampaignsTab({ onSelectCampaign }: { onSelectCampaign: (c: CampaignDto) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [importCampaign, setImportCampaign] = useState<CampaignDto | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingCampaign, setDeletingCampaign] = useState<CampaignDto | null>(null);
  const [deleteNameInput, setDeleteNameInput] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setCampaigns(await supervisionApi.getCampaigns()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDeleteConfirm = async () => {
    if (!deletingCampaign) return;
    setDeleting(true);
    try {
      await supervisionApi.deleteCampaign(deletingCampaign.id);
      setDeletingCampaign(null);
      setDeleteNameInput('');
      load();
    } catch {
      // 保留 dialog，讓使用者看到失敗
    } finally {
      setDeleting(false);
    }
  };

  const handleActivate = async (c: CampaignDto) => {
    const nextStatus = c.status === 'Draft' ? 'Active' : c.status === 'Active' ? 'Closed' : 'Draft';
    await supervisionApi.updateCampaign(c.id, { name: c.name, description: c.description ?? undefined, status: nextStatus });
    load();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importCampaign) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await supervisionApi.importExcel(importCampaign.id, file);
      setImportResult(result);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportResult({ success: false, factoriesImported: 0, tasksCreated: 0, errors: [msg], warnings: [] });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          新增計畫
        </Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>年度</TableCell>
              <TableCell>計畫名稱</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell align="right">業者數</TableCell>
              <TableCell align="right">任務數</TableCell>
              <TableCell align="right">完成</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map(c => (
              <TableRow key={c.id} hover>
                <TableCell>{c.year}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>
                  <Chip
                    label={CAMPAIGN_STATUS_LABEL[c.status] ?? c.status}
                    color={CAMPAIGN_STATUS_COLOR[c.status] ?? 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">{c.factoryCount}</TableCell>
                <TableCell align="right">{c.taskCount}</TableCell>
                <TableCell align="right">
                  {c.taskCount > 0
                    ? `${c.completedTaskCount} / ${c.taskCount}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="切換狀態">
                      <Button size="small" variant="outlined" onClick={() => handleActivate(c)}>
                        {c.status === 'Draft' ? '啟用' : c.status === 'Active' ? '結束' : '重開'}
                      </Button>
                    </Tooltip>
                    <Tooltip title="匯入 Excel 業者清冊">
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<UploadIcon />}
                        onClick={() => { setImportCampaign(c); setImportResult(null); }}
                      >
                        匯入
                      </Button>
                    </Tooltip>
                    <Tooltip title="管理此計畫的表單">
                      <Button
                        size="small"
                        variant="outlined"
                        color="info"
                        disabled={!c.formProjectId}
                        onClick={() => onSelectCampaign(c)}
                      >
                        表單
                      </Button>
                    </Tooltip>
                    <Tooltip title="刪除計畫（不可復原）">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => { setDeletingCampaign(c); setDeleteNameInput(''); }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary' }}>
                  尚無督導計畫
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* 刪除計畫確認 Dialog */}
      <Dialog
        open={!!deletingCampaign}
        onClose={() => !deleting && setDeletingCampaign(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>刪除督導計畫</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            此操作不可復原！將一併刪除該計畫下所有業者（{deletingCampaign?.factoryCount ?? 0} 筆）
            及督導任務（{deletingCampaign?.taskCount ?? 0} 筆）。
          </Alert>
          <Typography variant="body2" mb={2}>
            請輸入計畫名稱 <strong>「{deletingCampaign?.name}」</strong> 以確認刪除：
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder={deletingCampaign?.name}
            value={deleteNameInput}
            onChange={e => setDeleteNameInput(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingCampaign(null)} disabled={deleting}>取消</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteNameInput !== deletingCampaign?.name || deleting}
            onClick={handleDeleteConfirm}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {deleting ? '刪除中...' : '確認刪除'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新增計畫 Dialog */}
      <CreateCampaignDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); load(); }}
      />

      {/* Excel 匯入 Dialog */}
      <Dialog open={!!importCampaign} onClose={() => setImportCampaign(null)} maxWidth="sm" fullWidth>
        <DialogTitle>匯入業者清冊 — {importCampaign?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            請上傳含有「02. 督導業者」和「03. 公單位對應表單」的 .xlsx 檔案。
            重複匯入將覆蓋舊資料。
          </Typography>
          <Stack spacing={1} mb={2}>
            <Button
              variant="outlined"
              startIcon={downloadingTemplate ? <CircularProgress size={16} /> : <DownloadIcon />}
              disabled={downloadingTemplate}
              onClick={async () => {
                setDownloadingTemplate(true);
                try { await supervisionApi.downloadTemplate(); }
                catch { /* ignore */ }
                finally { setDownloadingTemplate(false); }
              }}
              color="secondary"
            >
              下載匯入範本
            </Button>
          </Stack>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            variant="contained"
            startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
            fullWidth
          >
            {importing ? '匯入中...' : '選擇 Excel 檔案上傳'}
          </Button>

          {importResult && (
            <Box mt={2}>
              <Alert severity={importResult.success ? 'success' : 'error'}>
                {importResult.success
                  ? `匯入成功：${importResult.factoriesImported} 家業者、${importResult.tasksCreated} 筆任務`
                  : '匯入失敗'}
              </Alert>
              {importResult.errors.map((e, i) => (
                <Alert key={i} severity="error" sx={{ mt: 1 }}>{e}</Alert>
              ))}
              {importResult.warnings.map((w, i) => (
                <Alert key={i} severity="warning" sx={{ mt: 1 }}>{w}</Alert>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportCampaign(null)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function CreateCampaignDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState<CreateCampaignRequest>({
    year: currentYear - 1911, // 轉為民國年
    name: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('請填寫計畫名稱'); return; }
    setSaving(true);
    try {
      await supervisionApi.createCampaign(form);
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '建立失敗');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>新增督導計畫</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="民國年度"
            type="number"
            value={form.year}
            onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
            fullWidth
          />
          <TextField
            label="計畫名稱"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            placeholder="例：115年化學品安全督導"
          />
          <TextField
            label="描述（選填）"
            value={form.description ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '建立'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════
// Tab 2: 機關管理
// ════════════════════════════════════════════════════════════

function AgenciesTab() {
  const [agencies, setAgencies] = useState<AgencyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  // 所有 campaign 的表單 project ID（用於機關綁定表單下拉選單）
  const [formProjectIds, setFormProjectIds] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [agencyData, campaigns] = await Promise.all([
        agenciesApi.getAll(),
        supervisionApi.getCampaigns(),
      ]);
      setAgencies(agencyData);
      setFormProjectIds(
        campaigns.map(c => c.formProjectId).filter((id): id is string => !!id)
      );
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          新增機關
        </Button>
      </Box>

      {loading ? <CircularProgress /> : (
        <Stack spacing={1}>
          {agencies.map(agency => (
            <AgencyRow
              key={agency.id}
              agency={agency}
              expanded={expanded === agency.id}
              formProjectIds={formProjectIds}
              onToggle={() => setExpanded(prev => prev === agency.id ? null : agency.id)}
              onDeleted={() => load()}
              onUpdated={() => load()}
            />
          ))}
          {agencies.length === 0 && (
            <Typography color="text.secondary" align="center" py={4}>
              尚無機關資料
            </Typography>
          )}
        </Stack>
      )}

      <CreateAgencyDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { setCreateOpen(false); load(); }}
      />
    </Box>
  );
}

function AgencyRow({ agency, expanded, formProjectIds, onToggle, onDeleted, onUpdated }: {
  agency: AgencyDto;
  expanded: boolean;
  formProjectIds: string[];
  onToggle: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const [users, setUsers] = useState<{ userId: string; username: string; email: string }[]>([]);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string; email: string } | null>(null);
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; username: string; email: string }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const userSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [availableForms, setAvailableForms] = useState<{ id: string; name: string }[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  // 綁定工廠
  const [boundFactories, setBoundFactories] = useState<SupervisedFactoryDto[]>([]);
  const [bindFactoryOpen, setBindFactoryOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [bindCampaignId, setBindCampaignId] = useState('');
  const [allFactories, setAllFactories] = useState<SupervisedFactoryDto[]>([]);
  const [selectedFactoryId, setSelectedFactoryId] = useState('');
  const [bindingFactory, setBindingFactory] = useState(false);

  useEffect(() => {
    if (expanded) {
      agenciesApi.getUsers(agency.id).then(setUsers);
      // 從所有年度督導計畫的表單 project 載入可用表單
      if (formProjectIds.length > 0) {
        Promise.all(
          formProjectIds.map(pid =>
            formsApi.getProjectForms(pid, { pageSize: 200 })
              .then(r => (r.items ?? []).map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })))
              .catch(() => [] as { id: string; name: string }[])
          )
        ).then(results => setAvailableForms(results.flat()));
      }
      // 載入計畫列表（用於綁定工廠）
      supervisionApi.getCampaigns().then(cs => {
        setCampaigns(cs);
        const active = cs.find(c => c.status === 'Active');
        if (active) {
          setBindCampaignId(active.id);
          loadBoundFactories(active.id);
        }
      });
    }
  }, [expanded, agency.id, formProjectIds.join(',')]);

  const loadBoundFactories = (campaignId: string) => {
    if (!campaignId) return;
    supervisionApi.getAgencyFactories(agency.id, campaignId).then(setBoundFactories);
  };

  useEffect(() => {
    if (bindCampaignId && expanded) loadBoundFactories(bindCampaignId);
  }, [bindCampaignId]);

  const handleUserSearch = (searchTerm: string) => {
    if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
    if (!searchTerm.trim()) { setUserSearchResults([]); return; }
    userSearchTimer.current = setTimeout(() => {
      setUserSearchLoading(true);
      usersApi.getUsers({ searchTerm, pageSize: 20 })
        .then(r => setUserSearchResults(
          (r.items ?? []).filter(u => !users.some(au => au.userId === u.id))
        ))
        .finally(() => setUserSearchLoading(false));
    }, 300);
  };

  const closeAddUserDialog = () => {
    setAddUserOpen(false);
    setSelectedUser(null);
    setUserSearchResults([]);
  };

  const handleAddUser = async () => {
    if (!selectedUser) return;
    await agenciesApi.addUser(agency.id, selectedUser.id);
    closeAddUserDialog();
    agenciesApi.getUsers(agency.id).then(setUsers);
  };

  const handleRemoveUser = async (userId: string) => {
    await agenciesApi.removeUser(agency.id, userId);
    agenciesApi.getUsers(agency.id).then(setUsers);
  };

  const handleRemoveFormType = async (agencyFormTypeId: string) => {
    if (boundFactories.length > 0) {
      const ok = confirm(
        `此機關已綁定 ${boundFactories.length} 個工廠，移除表單類型「不會」自動更新已建立的督導任務。\n` +
        `若要讓任務同步更新，請先解除工廠綁定，修改完表單設定後再重新綁定。\n\n確定要移除嗎？`
      );
      if (!ok) return;
    }
    await agenciesApi.removeFormType(agencyFormTypeId);
    onUpdated();
  };

  const handleBindFactory = async () => {
    if (!selectedFactoryId) return;
    setBindingFactory(true);
    try {
      await supervisionApi.bindFactory(agency.id, selectedFactoryId);
      setSelectedFactoryId('');
      setBindFactoryOpen(false);
      loadBoundFactories(bindCampaignId);
    } finally { setBindingFactory(false); }
  };

  const handleUnbindFactory = async (factoryId: string) => {
    if (!confirm('確定要解除此工廠的綁定？相關督導任務將被刪除。')) return;
    await supervisionApi.unbindFactory(agency.id, factoryId);
    loadBoundFactories(bindCampaignId);
  };

  const openBindDialog = () => {
    if (!bindCampaignId) return;
    supervisionApi.getFactories(bindCampaignId).then(setAllFactories);
    setBindFactoryOpen(true);
  };

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      {/* Header row */}
      <Box
        display="flex" alignItems="center" px={2} py={1.5}
        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
        onClick={onToggle}
      >
        <Box flex={1}>
          <Typography fontWeight="medium">{agency.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {agency.region ?? '未設定轄區'} · {agency.formTypes.length} 種表單 · {agency.userCount} 位使用者
          </Typography>
        </Box>
        <Chip
          label={agency.isActive ? '啟用' : '停用'}
          color={agency.isActive ? 'success' : 'default'}
          size="small"
          sx={{ mr: 1 }}
        />
        <IconButton size="small" onClick={e => { e.stopPropagation(); setEditOpen(true); }}>
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); onDeleted(); agenciesApi.delete(agency.id).then(onDeleted); }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>

      <Collapse in={expanded}>
        <Divider />
        <Box p={2} display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2}>

          {/* 綁定表單 */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">綁定表單</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setAddFormOpen(true)}>
                新增
              </Button>
            </Box>
            {agency.formTypes.length === 0
              ? <Typography variant="caption" color="text.secondary">尚無表單設定</Typography>
              : agency.formTypes.map(ft => (
                <Box key={ft.id} display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="body2" flex={1} noWrap title={ft.formName ?? ft.formTypeName}>
                    {ft.formName ?? ft.formTypeName}
                  </Typography>
                  <Chip label="已綁定" size="small" color="primary" variant="outlined" />
                  <Tooltip title="移除">
                    <IconButton size="small" color="error" onClick={() => handleRemoveFormType(ft.id)}>
                      <UnlinkIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))
            }
          </Box>

          {/* 使用者 */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">綁定使用者</Typography>
              <Button size="small" startIcon={<PersonAddIcon />} onClick={() => setAddUserOpen(true)}>
                新增
              </Button>
            </Box>
            {users.length === 0
              ? <Typography variant="caption" color="text.secondary">尚無使用者</Typography>
              : users.map(u => (
                <Box key={u.userId} display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="body2" flex={1}>{u.username}</Typography>
                  <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                  <IconButton size="small" color="error" onClick={() => handleRemoveUser(u.userId)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))
            }
          </Box>

          {/* 綁定工廠 */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">綁定工廠</Typography>
              <Button size="small" startIcon={<LinkIcon />} onClick={openBindDialog} disabled={!bindCampaignId}>
                綁定
              </Button>
            </Box>
            {campaigns.length > 1 && (
              <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                <Select
                  value={bindCampaignId}
                  onChange={e => setBindCampaignId(e.target.value)}
                  displayEmpty
                  size="small"
                >
                  {campaigns.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.year} — {c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {boundFactories.length === 0
              ? <Typography variant="caption" color="text.secondary">尚未綁定工廠</Typography>
              : boundFactories.map(f => (
                <Box key={f.id} display="flex" alignItems="center" gap={1} mb={0.5}>
                  <FactoryIcon fontSize="small" color="action" />
                  <Typography variant="body2" flex={1} noWrap title={f.factoryName}>
                    {f.factoryName}
                  </Typography>
                  <Tooltip title="解除綁定">
                    <IconButton size="small" color="error" onClick={() => handleUnbindFactory(f.id)}>
                      <UnlinkIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ))
            }
          </Box>
        </Box>
      </Collapse>

      {/* 新增使用者 Dialog */}
      <Dialog open={addUserOpen} onClose={closeAddUserDialog} maxWidth="xs" fullWidth>
        <DialogTitle>新增使用者至 {agency.name}</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }}
            options={userSearchResults}
            getOptionLabel={u => `${u.username} (${u.email})`}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            loading={userSearchLoading}
            value={selectedUser}
            onChange={(_, val) => setSelectedUser(val)}
            onInputChange={(_, val) => handleUserSearch(val)}
            filterOptions={x => x}
            noOptionsText="輸入姓名或 Email 搜尋"
            loadingText="搜尋中..."
            renderInput={params => (
              <TextField {...params} label="搜尋使用者" placeholder="輸入姓名或 Email..." />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddUserDialog}>取消</Button>
          <Button variant="contained" onClick={handleAddUser} disabled={!selectedUser}>確定</Button>
        </DialogActions>
      </Dialog>

      {/* 綁定表單 Dialog */}
      <AddFormDialog
        open={addFormOpen}
        agencyId={agency.id}
        availableForms={availableForms.filter(f => !agency.formTypes.some(ft => ft.formId === f.id))}
        boundFactoryCount={boundFactories.length}
        onClose={() => setAddFormOpen(false)}
        onAdded={() => { setAddFormOpen(false); onUpdated(); }}
      />

      {/* 綁定工廠 Dialog */}
      <Dialog open={bindFactoryOpen} onClose={() => setBindFactoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>綁定工廠至 {agency.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            綁定後將自動為此機關的每個表單類型建立督導任務。
          </Typography>
          <Autocomplete
            options={allFactories.filter(f => !boundFactories.some(bf => bf.id === f.id))}
            getOptionLabel={(opt) => `${opt.factoryName}${opt.industrialPark ? ` (${opt.industrialPark})` : ''}`}
            value={allFactories.find(f => f.id === selectedFactoryId) ?? null}
            onChange={(_, val) => setSelectedFactoryId(val?.id ?? '')}
            renderInput={(params) => <TextField {...params} label="搜尋工廠" placeholder="輸入工廠名稱..." />}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBindFactoryOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleBindFactory} disabled={bindingFactory || !selectedFactoryId}>
            {bindingFactory ? <CircularProgress size={20} /> : '綁定'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 編輯機關 Dialog */}
      <EditAgencyDialog
        open={editOpen}
        agency={agency}
        onClose={() => setEditOpen(false)}
        onUpdated={() => { setEditOpen(false); onUpdated(); }}
      />
    </Paper>
  );
}

function CreateAgencyDialog({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState<CreateAgencyRequest>({ name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [regions, setRegions] = useState<RegionDto[]>([]);

  useEffect(() => {
    if (open) regionsApi.getAll().then(setRegions).catch(() => {});
  }, [open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('請填寫機關名稱'); return; }
    setSaving(true);
    try {
      await agenciesApi.create(form);
      setForm({ name: '' });
      onCreated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '建立失敗');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>新增督導機關</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="機關名稱"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            placeholder="例：桃園市政府消防局"
          />
          <FormControl fullWidth>
            <InputLabel>所屬轄區（選填）</InputLabel>
            <Select
              value={form.region ?? ''}
              label="所屬轄區（選填）"
              onChange={e => setForm(f => ({ ...f, region: e.target.value || undefined }))}
            >
              <MenuItem value=""><em>未分類</em></MenuItem>
              {regions.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '建立'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EditAgencyDialog({ open, agency, onClose, onUpdated }: {
  open: boolean; agency: AgencyDto; onClose: () => void; onUpdated: () => void;
}) {
  const [form, setForm] = useState({ name: agency.name, region: agency.region ?? '', isActive: agency.isActive });
  const [saving, setSaving] = useState(false);
  const [regions, setRegions] = useState<RegionDto[]>([]);

  useEffect(() => {
    setForm({ name: agency.name, region: agency.region ?? '', isActive: agency.isActive });
  }, [agency]);

  useEffect(() => {
    if (open) regionsApi.getAll().then(setRegions).catch(() => {});
  }, [open]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await agenciesApi.update(agency.id, { name: form.name, region: form.region || undefined, isActive: form.isActive });
      onUpdated();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>編輯機關</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <TextField label="機關名稱" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
          <FormControl fullWidth>
            <InputLabel>所屬轄區</InputLabel>
            <Select
              value={form.region}
              label="所屬轄區"
              onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
            >
              <MenuItem value=""><em>未分類</em></MenuItem>
              {regions.map(r => <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>狀態</InputLabel>
            <Select
              value={form.isActive ? 'true' : 'false'}
              label="狀態"
              onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}
            >
              <MenuItem value="true">啟用</MenuItem>
              <MenuItem value="false">停用</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AddFormDialog({ open, agencyId, availableForms, boundFactoryCount, onClose, onAdded }: {
  open: boolean;
  agencyId: string;
  availableForms: { id: string; name: string }[];
  boundFactoryCount: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [selectedFormId, setSelectedFormId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    setSelectedFormId('');
    onClose();
  };

  const handleSubmit = async () => {
    const form = availableForms.find(f => f.id === selectedFormId);
    if (!form) return;
    if (boundFactoryCount > 0) {
      const ok = confirm(
        `此機關已綁定 ${boundFactoryCount} 個工廠，新增表單類型「不會」自動為已綁定的工廠建立新任務。\n` +
        `若要讓任務同步更新，請先解除工廠綁定，修改完表單設定後再重新綁定。\n\n確定要新增嗎？`
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await agenciesApi.addFormType(agencyId, { formTypeName: form.name, formId: form.id });
      setSelectedFormId('');
      onAdded();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>綁定表單</DialogTitle>
      <DialogContent>
        <FormControl fullWidth sx={{ mt: 1 }}>
          <InputLabel>選擇表單</InputLabel>
          <Select
            value={selectedFormId}
            label="選擇表單"
            onChange={e => setSelectedFormId(e.target.value)}
          >
            {availableForms.length === 0
              ? <MenuItem disabled value=""><em>無可用表單</em></MenuItem>
              : availableForms.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)
            }
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || !selectedFormId}>
          {saving ? <CircularProgress size={20} /> : '綁定'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════
// Tab 3: 表單管理
// ════════════════════════════════════════════════════════════

function FormsTab({ selectedCampaign }: { selectedCampaign: CampaignDto | null }) {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<CampaignDto | null>(selectedCampaign);
  const [forms, setForms] = useState<FormListDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadForms = (campaign: CampaignDto | null = activeCampaign) => {
    if (!campaign?.formProjectId) { setForms([]); return; }
    setLoading(true);
    formsApi.getProjectForms(campaign.formProjectId, { pageSize: 100 })
      .then(r => setForms(r.items ?? []))
      .catch(() => setForms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    supervisionApi.getCampaigns().then(cs => {
      setCampaigns(cs);
      if (!activeCampaign) {
        const active = cs.find(c => c.status === 'Active') ?? cs[0];
        if (active) setActiveCampaign(active);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedCampaign) setActiveCampaign(selectedCampaign);
  }, [selectedCampaign]);

  useEffect(() => { loadForms(activeCampaign); }, [activeCampaign]);

  const handlePublish = async (id: string) => {
    await formsApi.publishForm(id);
    loadForms();
  };

  const handleUnpublish = async (id: string) => {
    await formsApi.unpublishForm(id);
    loadForms();
  };

  const handleLock = async (id: string) => {
    await formsApi.lockForm(id);
    loadForms();
  };

  const handleUnlock = async (id: string) => {
    await formsApi.unlockForm(id);
    loadForms();
  };

  const handleSyncFormIds = async () => {
    if (!activeCampaign) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await supervisionApi.syncFormIds(activeCampaign.id);
      setSyncResult(`已同步 ${res.updated} 筆任務`);
    } catch {
      setSyncResult('同步失敗，請稍後再試');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>選擇督導計畫</InputLabel>
          <Select
            value={activeCampaign?.id ?? ''}
            label="選擇督導計畫"
            onChange={e => setActiveCampaign(campaigns.find(c => c.id === e.target.value) ?? null)}
          >
            {campaigns.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.year} — {c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!activeCampaign?.formProjectId}
          onClick={() => navigate(`/projects/${activeCampaign!.formProjectId}/forms/new?from=/supervision`)}
        >
          建立表單
        </Button>
        <Tooltip title="將機關已綁定的表單同步回督導任務（先匯入清冊、後綁定表單時使用）">
          <span>
            <Button
              variant="outlined"
              disabled={!activeCampaign || syncing}
              onClick={handleSyncFormIds}
            >
              {syncing ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
              同步任務表單
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {syncResult && (
        <Alert severity={syncResult.includes('失敗') ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setSyncResult(null)}>
          {syncResult}
        </Alert>
      )}

      {!activeCampaign?.formProjectId && (
        <Alert severity="info">此計畫尚未關聯表單庫（可能是舊計畫），請重新建立一個計畫。</Alert>
      )}

      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>表單名稱</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {forms.map(f => (
              <TableRow key={f.id} hover>
                <TableCell>{f.name}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {f.isLocked ? (
                      <Chip label="已鎖定" color="warning" size="small" icon={<LockIcon sx={{ fontSize: '14px !important' }} />} />
                    ) : f.isPublished ? (
                      <Chip label="已發布" color="success" size="small" />
                    ) : (
                      <Chip label="草稿" color="default" size="small" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    {/* 發布 / 下架 */}
                    {!f.isLocked && !f.isPublished && (
                      <Tooltip title="發布">
                        <IconButton size="small" color="success" onClick={() => handlePublish(f.id)}>
                          <PublishIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!f.isLocked && f.isPublished && (
                      <Tooltip title="下架（回草稿）">
                        <IconButton size="small" color="warning" onClick={() => handleUnpublish(f.id)}>
                          <UnpublishedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* 鎖定 / 解鎖 */}
                    {!f.isLocked ? (
                      <Tooltip title="鎖定">
                        <IconButton size="small" onClick={() => handleLock(f.id)}>
                          <LockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="解鎖">
                        <IconButton size="small" color="warning" onClick={() => handleUnlock(f.id)}>
                          <LockOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* 編輯 */}
                    <Tooltip title="編輯表單">
                      <IconButton
                        size="small"
                        disabled={f.isLocked}
                        onClick={() => navigate(`/projects/${activeCampaign!.formProjectId}/forms/${f.id}/edit?from=/supervision`)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {/* 預覽 */}
                    <Tooltip title="預覽表單">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/projects/${activeCampaign!.formProjectId}/forms/${f.id}/preview`)}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {forms.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: 'text.secondary' }}>
                  此計畫尚無表單，點擊「建立表單」開始新增
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// Tab 4: 工廠管理
// ════════════════════════════════════════════════════════════

function FactoriesTab() {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState('');
  const [factories, setFactories] = useState<SupervisedFactoryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editFactory, setEditFactory] = useState<SupervisedFactoryDto | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    supervisionApi.getCampaigns().then(cs => {
      setCampaigns(cs);
      const active = cs.find(c => c.status === 'Active') ?? cs[0];
      if (active) setActiveCampaignId(active.id);
    });
  }, []);

  const loadFactories = () => {
    if (!activeCampaignId) return;
    setLoading(true);
    supervisionApi.getFactories(activeCampaignId)
      .then(setFactories)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFactories(); }, [activeCampaignId]);

  const handleDelete = async (f: SupervisedFactoryDto) => {
    if (!confirm(`確定要刪除工廠「${f.factoryName}」？相關的 ${f.taskCount} 筆督導任務也會一併刪除。`)) return;
    await supervisionApi.deleteFactory(f.id);
    loadFactories();
  };

  const filtered = factories.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    return f.factoryName.toLowerCase().includes(s) ||
      (f.factoryRegistrationNo?.toLowerCase().includes(s) ?? false) ||
      (f.industrialPark?.toLowerCase().includes(s) ?? false) ||
      (f.county?.toLowerCase().includes(s) ?? false) ||
      (f.region?.toLowerCase().includes(s) ?? false);
  });

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>選擇督導計畫</InputLabel>
          <Select
            value={activeCampaignId}
            label="選擇督導計畫"
            onChange={e => setActiveCampaignId(e.target.value)}
          >
            {campaigns.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.year} — {c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="搜尋工廠名稱、編號、園區、縣市..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          disabled={!activeCampaignId}
          onClick={() => { setEditFactory(null); setFormOpen(true); }}
        >
          新增工廠
        </Button>
        <Button
          variant="outlined"
          startIcon={<SuggestIcon />}
          onClick={() => setSuggestionsOpen(true)}
        >
          補登記編號
        </Button>
      </Stack>

      {loading ? <CircularProgress /> : (
        <>
          <Typography variant="caption" color="text.secondary" mb={1} display="block">
            共 {filtered.length} 家工廠（計畫共 {factories.length} 家）
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>風險排序</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>工廠名稱</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>登記編號</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>產業園區</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>縣市</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>轄區</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>任務數</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>已完成</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(f => (
                <TableRow key={f.id} hover>
                  <TableCell>{f.riskRank ?? '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">{f.factoryName}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{f.factoryRegistrationNo ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>{f.industrialPark ?? '—'}</TableCell>
                  <TableCell>{f.county ?? '—'}</TableCell>
                  <TableCell>{f.region ?? '—'}</TableCell>
                  <TableCell align="right">{f.taskCount}</TableCell>
                  <TableCell align="right">
                    {f.taskCount > 0 ? `${f.completedTaskCount} / ${f.taskCount}` : '—'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="編輯">
                        <IconButton size="small" onClick={() => { setEditFactory(f); setFormOpen(true); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="刪除">
                        <IconButton size="small" color="error" onClick={() => handleDelete(f)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ color: 'text.secondary' }}>
                    {factories.length === 0 ? '此計畫尚無工廠資料，請先匯入或手動新增' : '無符合條件的工廠'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* 新增/編輯工廠 Dialog */}
      <FactoryFormDialog
        open={formOpen}
        factory={editFactory}
        campaignId={activeCampaignId}
        onClose={() => { setFormOpen(false); setEditFactory(null); }}
        onSaved={() => { setFormOpen(false); setEditFactory(null); loadFactories(); }}
      />

      <RegistrationNoSuggestionsDialog
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        onApplied={loadFactories}
      />
    </Box>
  );
}

function RegistrationNoSuggestionsDialog({ open, onClose, onApplied }: {
  open: boolean;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<FactoryRegistrationNoSuggestionDto[]>([]);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    supervisionApi.getRegistrationNoSuggestions()
      .then(setSuggestions)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '載入建議失敗'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (open) load(); }, [open]);

  const handleApply = async (factoryId: string, registrationNo: string) => {
    setApplyingId(factoryId);
    try {
      await supervisionApi.applyRegistrationNo(factoryId, registrationNo);
      setSuggestions(prev => prev.filter(s => s.factoryId !== factoryId));
      onApplied();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '套用失敗');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>補登記編號</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          底下列出所有「工廠管理」裡缺登記編號的工廠，依名稱去比對全台工廠主資料（政府登記清冊）
          找可能的候選項。只有名稱唯一比對到一筆時才算高信心；同名有好幾家不同工廠的話，
          請自行比對地址後再選正確的那一筆套用，不要亂猜。套用後這筆工廠的名稱也會跟其他
          用同一個登記編號的資料（原始資料維護等）同步。
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : suggestions.length === 0 ? (
          <Alert severity="success">目前沒有缺登記編號的工廠管理資料。</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>工廠管理（缺登記編號）</TableCell>
                <TableCell>候選主資料</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {suggestions.map(s => (
                <TableRow key={s.factoryId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">{s.factoryName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.campaignYear} 年・{s.campaignName}
                      {s.factoryAddress && <> ・{s.factoryAddress}</>}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {s.candidates.length === 0 ? (
                      <Typography variant="caption" color="text.disabled">找不到符合名稱的主資料</Typography>
                    ) : (
                      <Stack spacing={0.5}>
                        {s.candidates.map(c => (
                          <Stack key={c.factoryRegistrationNo} direction="row" spacing={1} alignItems="center">
                            <Chip label={c.factoryRegistrationNo} size="small" />
                            <Typography variant="caption" color="text.secondary">
                              {c.county ?? ''}{c.address ?? ''}
                            </Typography>
                            <Button
                              size="small"
                              variant={s.candidates.length === 1 ? 'contained' : 'outlined'}
                              disabled={applyingId === s.factoryId}
                              onClick={() => handleApply(s.factoryId, c.factoryRegistrationNo)}
                            >
                              套用
                            </Button>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {applyingId === s.factoryId && <CircularProgress size={16} />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

function FactoryFormDialog({ open, factory, campaignId, onClose, onSaved }: {
  open: boolean;
  factory: SupervisedFactoryDto | null;
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!factory;
  const [form, setForm] = useState<CreateFactoryRequest>({
    factoryName: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (factory) {
      setForm({
        factoryName: factory.factoryName,
        riskRank: factory.riskRank ?? undefined,
        factoryRegistrationNo: factory.factoryRegistrationNo ?? undefined,
        factoryAddress: factory.factoryAddress ?? undefined,
        industryCategory: factory.industryCategory ?? undefined,
        industrialPark: factory.industrialPark ?? undefined,
        region: factory.region ?? undefined,
        county: factory.county ?? undefined,
      });
    } else {
      setForm({ factoryName: '' });
    }
    setError('');
  }, [factory, open]);

  const handleSubmit = async () => {
    if (!form.factoryName.trim()) { setError('請填寫工廠名稱'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await supervisionApi.updateFactory(factory!.id, form as UpdateFactoryRequest);
      } else {
        await supervisionApi.createFactory(campaignId, form);
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? '編輯工廠' : '新增工廠'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="工廠名稱"
            value={form.factoryName}
            onChange={e => setForm(f => ({ ...f, factoryName: e.target.value }))}
            fullWidth
            required
          />
          <TextField
            label="登記編號"
            value={form.factoryRegistrationNo ?? ''}
            onChange={e => setForm(f => ({ ...f, factoryRegistrationNo: e.target.value || undefined }))}
            fullWidth
          />
          <TextField
            label="風險排序"
            type="number"
            value={form.riskRank ?? ''}
            onChange={e => setForm(f => ({ ...f, riskRank: e.target.value ? Number(e.target.value) : undefined }))}
            fullWidth
          />
          <TextField
            label="產業園區"
            value={form.industrialPark ?? ''}
            onChange={e => setForm(f => ({ ...f, industrialPark: e.target.value || undefined }))}
            fullWidth
          />
          <TextField
            label="縣市"
            value={form.county ?? ''}
            onChange={e => setForm(f => ({ ...f, county: e.target.value || undefined }))}
            fullWidth
          />
          <TextField
            label="轄區"
            value={form.region ?? ''}
            onChange={e => setForm(f => ({ ...f, region: e.target.value || undefined }))}
            fullWidth
          />
          <TextField
            label="地址"
            value={form.factoryAddress ?? ''}
            onChange={e => setForm(f => ({ ...f, factoryAddress: e.target.value || undefined }))}
            fullWidth
          />
          <TextField
            label="產業類別"
            value={form.industryCategory ?? ''}
            onChange={e => setForm(f => ({ ...f, industryCategory: e.target.value || undefined }))}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : isEdit ? '儲存' : '建立'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ════════════════════════════════════════════════════════════
// Tab 5: 進度總覽
// ════════════════════════════════════════════════════════════

function ProgressTab() {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [progress, setProgress] = useState<CampaignProgressDto | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supervisionApi.getCampaigns().then(cs => {
      setCampaigns(cs);
      const active = cs.find(c => c.status === 'Active');
      if (active) setSelectedId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    supervisionApi.getProgress(selectedId)
      .then(setProgress)
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <Box>
      <FormControl sx={{ mb: 3, minWidth: 300 }}>
        <InputLabel>選擇計畫</InputLabel>
        <Select value={selectedId} label="選擇計畫" onChange={e => setSelectedId(e.target.value)}>
          {campaigns.map(c => (
            <MenuItem key={c.id} value={c.id}>{c.year} — {c.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {loading && <CircularProgress />}

      {progress && (
        <Box>
          {/* 整體進度 */}
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" mb={2}>{progress.campaignName} — 整體進度</Typography>
            <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} mb={2}>
              {[
                { label: '督導業者', value: progress.totalFactories },
                { label: '督導任務', value: progress.totalTasks },
                { label: '已完成', value: progress.completedTasks },
                { label: '完成率', value: `${progress.completionRate}%` },
              ].map(item => (
                <Paper key={item.label} elevation={0} sx={{ bgcolor: 'grey.50', p: 2, textAlign: 'center', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight="bold" color="primary">{item.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                </Paper>
              ))}
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress.completionRate}
              sx={{ height: 10, borderRadius: 5 }}
            />
            <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
              進行中 {progress.inProgressTasks} · 未填 {progress.pendingTasks}
            </Typography>
          </Paper>

          {/* 各機關進度 */}
          <Typography variant="subtitle1" fontWeight="bold" mb={1}>各機關進度</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>機關名稱</TableCell>
                <TableCell align="right">任務數</TableCell>
                <TableCell align="right">已完成</TableCell>
                <TableCell sx={{ width: 200 }}>完成率</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {progress.byAgency.map(a => (
                <TableRow key={a.agencyId} hover>
                  <TableCell>{a.agencyName}</TableCell>
                  <TableCell align="right">{a.totalTasks}</TableCell>
                  <TableCell align="right">{a.completedTasks}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LinearProgress
                        variant="determinate"
                        value={a.completionRate}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                        color={a.completionRate === 100 ? 'success' : 'primary'}
                      />
                      <Typography variant="caption" sx={{ minWidth: 40 }}>
                        {a.completionRate}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// Tab 6: 改善回覆與複查（連結管理）
// ════════════════════════════════════════════════════════════

function RectificationTab() {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [campaignId, setCampaignId] = useState('');

  useEffect(() => {
    supervisionApi.getCampaigns().then(cs => {
      setCampaigns(cs);
      const active = cs.find(c => c.status === 'Active') ?? cs[0];
      if (active) setCampaignId(active.id);
    });
  }, []);

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" mb={3} flexWrap="wrap">
        <FormControl sx={{ minWidth: 300 }}>
          <InputLabel>選擇督導計畫</InputLabel>
          <Select value={campaignId} label="選擇督導計畫" onChange={e => setCampaignId(e.target.value)}>
            {campaigns.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.year} — {c.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        連結只對「已完成」的督導任務開放。工廠連結涵蓋該工廠所有機關的已完成任務；機關連結涵蓋該機關在此計畫內督導的所有工廠。
      </Alert>

      <Stack spacing={4}>
        <FactoryLinksSection campaignId={campaignId} />
        {/* 機關複查登打連結：暫時停用，主管機關改為登入系統直接填寫，公開連結先不開放 */}
        {/* <AgencyLinksSection campaignId={campaignId} /> */}
        <FactoryReplyItemManagementSection campaignId={campaignId} />
      </Stack>
    </Box>
  );
}

// ─── 連結列表共用工具 ──────────────────────────────────────

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function buildPublicLink(kind: 'factory-reply' | 'agency-review', token: string) {
  const base = import.meta.env.BASE_URL || '/';
  return `${window.location.origin}${base}public/${kind}/${token}`;
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (direction === 'asc') return <AscIcon sx={{ fontSize: 14, ml: 0.5 }} />;
  if (direction === 'desc') return <DescIcon sx={{ fontSize: 14, ml: 0.5 }} />;
  return <UnsortedIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.3 }} />;
}

function ColumnFilterInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="篩選..."
      onClick={e => e.stopPropagation()}
      sx={{
        mt: 0.5,
        '& .MuiInputBase-root': { fontSize: 11, height: 24 },
        '& .MuiInputBase-input': { py: 0.25, px: 0.75 },
      }}
    />
  );
}

// ════════════════════════════════════════════════════════════
// 工廠改善回覆連結（分頁 + 排序 + 搜尋）
// ════════════════════════════════════════════════════════════

const factoryLinkColumnHelper = createColumnHelper<FactoryTokenLinkDto>();

function FactoryLinksSection({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<{ items: FactoryTokenLinkDto[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(0); }, 400);
  };

  const load = () => {
    if (!campaignId) return;
    setLoading(true);
    supervisionReplyApi.getFactoryTokenLinks(campaignId, { page: page + 1, pageSize: rowsPerPage, search: search || undefined })
      .then(res => { setData(res); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [campaignId, page, rowsPerPage, search]);

  const links = data?.items ?? [];
  const totalRows = data?.total ?? 0;

  const handleCopy = async (link: string, token: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(prev => (prev === token ? null : prev)), 2000);
    } catch {
      // clipboard 權限被拒時忽略
    }
  };

  const handleGenerate = async () => {
    if (!campaignId) return;
    setGenerating(true);
    try {
      await supervisionReplyApi.generateFactoryTokens(campaignId);
      load();
    } finally { setGenerating(false); }
  };

  const handleRevokeAll = async () => {
    if (!campaignId) return;
    if (!confirm('確定要停用此計畫下所有啟用中的工廠改善回覆連結？停用後工廠將無法再透過原連結填寫回覆。')) return;
    setRevokingAll(true);
    try {
      await supervisionReplyApi.revokeAllFactoryTokens(campaignId);
      load();
    } finally { setRevokingAll(false); }
  };

  const handleRevoke = async (factoryId: string) => {
    await supervisionReplyApi.revokeFactoryToken(factoryId);
    load();
  };
  const handleRegenerate = async (factoryId: string) => {
    await supervisionReplyApi.regenerateFactoryToken(factoryId);
    load();
  };

  const handleExport = async () => {
    if (!campaignId) return;
    setExporting(true);
    try {
      const all = await supervisionReplyApi.getFactoryTokenLinks(campaignId, { page: 1, pageSize: 10000, search: search || undefined });
      downloadCsv(
        '工廠改善回覆連結.csv',
        ['工廠名稱', '登記編號', '連結', '回覆進度', '狀態'],
        all.items.map(f => [
          f.factoryName,
          f.factoryRegistrationNo ?? '',
          buildPublicLink('factory-reply', f.token),
          `${f.repliedTasks}/${f.totalCompletedTasks}`,
          f.isRevoked ? '已停用' : '啟用中',
        ]),
      );
    } finally { setExporting(false); }
  };

  const columns = [
    factoryLinkColumnHelper.accessor('factoryName', {
      header: '工廠名稱', enableSorting: true, enableColumnFilter: true, filterFn: 'includesString',
    }),
    factoryLinkColumnHelper.accessor('factoryRegistrationNo', {
      header: '登記編號', enableSorting: true, enableColumnFilter: true, filterFn: 'includesString',
      cell: info => info.getValue() ?? '—',
    }),
    factoryLinkColumnHelper.display({ id: 'link', header: '連結', enableSorting: false, enableColumnFilter: false }),
    factoryLinkColumnHelper.accessor('repliedTasks', {
      header: '回覆進度', enableSorting: true, enableColumnFilter: false,
    }),
    factoryLinkColumnHelper.accessor('isRevoked', {
      header: '狀態', enableSorting: true, enableColumnFilter: false,
    }),
    factoryLinkColumnHelper.display({ id: 'actions', header: '操作', enableSorting: false, enableColumnFilter: false }),
  ];

  const table = useReactTable({
    data: links,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" fontWeight="bold">工廠改善回覆連結</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small" variant="outlined" startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
            disabled={totalRows === 0 || exporting}
            onClick={handleExport}
          >
            匯出 CSV
          </Button>
          <Button
            size="small" variant="contained" startIcon={<GenerateIcon />}
            disabled={!campaignId || generating}
            onClick={handleGenerate}
          >
            {generating ? '產生中...' : '產生所有工廠連結'}
          </Button>
          <Button
            size="small" variant="outlined" color="error" startIcon={<RevokeIcon />}
            disabled={!campaignId || totalRows === 0 || revokingAll}
            onClick={handleRevokeAll}
          >
            {revokingAll ? '停用中...' : '全部停用'}
          </Button>
        </Stack>
      </Stack>

      <TextField
        size="small"
        placeholder="搜尋工廠名稱、登記編號..."
        value={searchInput}
        onChange={e => handleSearchInput(e.target.value)}
        sx={{ width: 300, mb: 1.5 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
      />

      <Table size="small">
        <TableHead>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} sx={{ bgcolor: 'grey.50' }}>
              {headerGroup.headers.map(header => {
                const canSort = header.column.getCanSort();
                const canFilter = header.column.getCanFilter();
                const sortDir = header.column.getIsSorted();
                const filterVal = (header.column.getFilterValue() as string) ?? '';
                const align = (header.id === 'repliedTasks' || header.id === 'actions') ? 'right' as const : undefined;
                return (
                  <TableCell key={header.id} align={align} sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent={align === 'right' ? 'flex-end' : 'flex-start'}
                      sx={{ cursor: canSort ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon direction={sortDir} />}
                    </Box>
                    {canFilter && (
                      <ColumnFilterInput
                        value={filterVal}
                        onChange={v => header.column.setFilterValue(v || undefined)}
                      />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {loading ? (
            Array.from({ length: Math.min(rowsPerPage, 10) }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton /></TableCell></TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                尚未產生連結，點擊「產生所有工廠連結」建立
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map(row => {
              const f = row.original;
              const link = buildPublicLink('factory-reply', f.token);
              return (
                <TableRow key={f.factoryId} hover>
                  <TableCell>{f.factoryName}</TableCell>
                  <TableCell>{f.factoryRegistrationNo ?? '—'}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    <Typography variant="body2" noWrap title={link} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {link}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{f.repliedTasks} / {f.totalCompletedTasks}</TableCell>
                  <TableCell>
                    <Chip
                      label={f.isRevoked ? '已停用' : '啟用中'}
                      color={f.isRevoked ? 'default' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title={copiedToken === f.token ? '已複製！' : '複製連結'}>
                        <IconButton size="small" onClick={() => handleCopy(link, f.token)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="重新產生連結（舊連結立即失效）">
                        <IconButton size="small" onClick={() => handleRegenerate(f.factoryId)}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!f.isRevoked && (
                        <Tooltip title="停用連結">
                          <IconButton size="small" color="error" onClick={() => handleRevoke(f.factoryId)}>
                            <RevokeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage="每頁筆數"
        labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
      />
    </Box>
  );
}

// ════════════════════════════════════════════════════════════
// 機關複查登打連結（分頁 + 排序 + 搜尋）
// 暫時停用：主管機關改為登入系統直接填寫機關複查作業，公開連結先不開放。
// 要恢復的話把下面這整塊的註解拿掉，並在上面 <Stack spacing={4}> 裡復原
// <AgencyLinksSection campaignId={campaignId} /> 的渲染即可。
// ════════════════════════════════════════════════════════════

/*
const agencyLinkColumnHelper = createColumnHelper<AgencyTokenLinkDto>();

function AgencyLinksSection({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<{ items: AgencyTokenLinkDto[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(0); }, 400);
  };

  const load = () => {
    if (!campaignId) return;
    setLoading(true);
    supervisionReplyApi.getAgencyTokenLinks(campaignId, { page: page + 1, pageSize: rowsPerPage, search: search || undefined })
      .then(res => { setData(res); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [campaignId, page, rowsPerPage, search]);

  const links = data?.items ?? [];
  const totalRows = data?.total ?? 0;

  const handleCopy = async (link: string, token: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(prev => (prev === token ? null : prev)), 2000);
    } catch {
      // clipboard 權限被拒時忽略
    }
  };

  const handleGenerate = async () => {
    if (!campaignId) return;
    setGenerating(true);
    try {
      await supervisionReplyApi.generateAgencyTokens(campaignId);
      load();
    } finally { setGenerating(false); }
  };

  const handleRevokeAll = async () => {
    if (!campaignId) return;
    if (!confirm('確定要停用此計畫下所有啟用中的機關複查登打連結？停用後機關將無法再透過原連結登打複查資料。')) return;
    setRevokingAll(true);
    try {
      await supervisionReplyApi.revokeAllAgencyTokens(campaignId);
      load();
    } finally { setRevokingAll(false); }
  };

  const handleRevoke = async (agencyId: string) => {
    await supervisionReplyApi.revokeAgencyToken(campaignId, agencyId);
    load();
  };
  const handleRegenerate = async (agencyId: string) => {
    await supervisionReplyApi.regenerateAgencyToken(campaignId, agencyId);
    load();
  };

  const handleExport = async () => {
    if (!campaignId) return;
    setExporting(true);
    try {
      const all = await supervisionReplyApi.getAgencyTokenLinks(campaignId, { page: 1, pageSize: 10000, search: search || undefined });
      downloadCsv(
        '機關複查連結.csv',
        ['機關名稱', '連結', '複查進度', '狀態'],
        all.items.map(a => [
          a.agencyName,
          buildPublicLink('agency-review', a.token),
          `${a.reviewedTasks}/${a.totalCompletedTasks}`,
          a.isRevoked ? '已停用' : '啟用中',
        ]),
      );
    } finally { setExporting(false); }
  };

  const columns = [
    agencyLinkColumnHelper.accessor('agencyName', {
      header: '機關名稱', enableSorting: true, enableColumnFilter: true, filterFn: 'includesString',
    }),
    agencyLinkColumnHelper.display({ id: 'link', header: '連結', enableSorting: false, enableColumnFilter: false }),
    agencyLinkColumnHelper.accessor('reviewedTasks', {
      header: '複查進度', enableSorting: true, enableColumnFilter: false,
    }),
    agencyLinkColumnHelper.accessor('isRevoked', {
      header: '狀態', enableSorting: true, enableColumnFilter: false,
    }),
    agencyLinkColumnHelper.display({ id: 'actions', header: '操作', enableSorting: false, enableColumnFilter: false }),
  ];

  const table = useReactTable({
    data: links,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="subtitle1" fontWeight="bold">機關複查登打連結</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small" variant="outlined" startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
            disabled={totalRows === 0 || exporting}
            onClick={handleExport}
          >
            匯出 CSV
          </Button>
          <Button
            size="small" variant="contained" startIcon={<GenerateIcon />}
            disabled={!campaignId || generating}
            onClick={handleGenerate}
          >
            {generating ? '產生中...' : '產生所有機關連結'}
          </Button>
          <Button
            size="small" variant="outlined" color="error" startIcon={<RevokeIcon />}
            disabled={!campaignId || totalRows === 0 || revokingAll}
            onClick={handleRevokeAll}
          >
            {revokingAll ? '停用中...' : '全部停用'}
          </Button>
        </Stack>
      </Stack>

      <TextField
        size="small"
        placeholder="搜尋機關名稱..."
        value={searchInput}
        onChange={e => handleSearchInput(e.target.value)}
        sx={{ width: 300, mb: 1.5 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
      />

      <Table size="small">
        <TableHead>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id} sx={{ bgcolor: 'grey.50' }}>
              {headerGroup.headers.map(header => {
                const canSort = header.column.getCanSort();
                const canFilter = header.column.getCanFilter();
                const sortDir = header.column.getIsSorted();
                const filterVal = (header.column.getFilterValue() as string) ?? '';
                const align = (header.id === 'reviewedTasks' || header.id === 'actions') ? 'right' as const : undefined;
                return (
                  <TableCell key={header.id} align={align} sx={{ fontWeight: 'bold', verticalAlign: 'top' }}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent={align === 'right' ? 'flex-end' : 'flex-start'}
                      sx={{ cursor: canSort ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && <SortIcon direction={sortDir} />}
                    </Box>
                    {canFilter && (
                      <ColumnFilterInput
                        value={filterVal}
                        onChange={v => header.column.setFilterValue(v || undefined)}
                      />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {loading ? (
            Array.from({ length: Math.min(rowsPerPage, 10) }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={5}><Skeleton /></TableCell></TableRow>
            ))
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary' }}>
                尚未產生連結，點擊「產生所有機關連結」建立
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map(row => {
              const a = row.original;
              const link = buildPublicLink('agency-review', a.token);
              return (
                <TableRow key={a.agencyId} hover>
                  <TableCell>{a.agencyName}</TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" noWrap title={link} sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {link}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{a.reviewedTasks} / {a.totalCompletedTasks}</TableCell>
                  <TableCell>
                    <Chip
                      label={a.isRevoked ? '已停用' : '啟用中'}
                      color={a.isRevoked ? 'default' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title={copiedToken === a.token ? '已複製！' : '複製連結'}>
                        <IconButton size="small" onClick={() => handleCopy(link, a.token)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="重新產生連結（舊連結立即失效）">
                        <IconButton size="small" onClick={() => handleRegenerate(a.agencyId)}>
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!a.isRevoked && (
                        <Tooltip title="停用連結">
                          <IconButton size="small" color="error" onClick={() => handleRevoke(a.agencyId)}>
                            <RevokeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage="每頁筆數"
        labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
      />
    </Box>
  );
}
*/

// ════════════════════════════════════════════════════════════
// 工廠回覆項目管理（Admin 新增/刪除/排序，工廠只能填回覆內容）
// ════════════════════════════════════════════════════════════

function FactoryReplyItemManagementSection({ campaignId }: { campaignId: string }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<{ items: AdminReplyTaskListItemDto[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [managingTask, setManagingTask] = useState<AdminReplyTaskListItemDto | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(0); }, 400);
  };

  const load = () => {
    if (!campaignId) return;
    setLoading(true);
    supervisionReplyApi.getAdminReplyTaskList(campaignId, {
      page: page + 1, pageSize: rowsPerPage, search: search || undefined,
    })
      .then(res => { setData(res); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [campaignId, page, rowsPerPage, search]);

  const tasks = data?.items ?? [];
  const totalRows = data?.total ?? 0;

  const handleToggleNoImprovementNeeded = async (t: AdminReplyTaskListItemDto) => {
    const next = !t.noImprovementNeeded;
    if (next && !confirm(`確定要把「${t.factoryName}」這筆任務標記為「無」？標記後工廠改善回覆連結、機關複查登打連結都不會再顯示這筆任務。`)) return;
    setTogglingTaskId(t.taskId);
    try {
      await supervisionReplyApi.setTaskNoImprovementNeeded(t.taskId, next);
      load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失敗');
    } finally {
      setTogglingTaskId(null);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>工廠回覆項目管理</Typography>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        設定每一份督導任務要讓工廠逐點回覆的改善項目（工廠只能填寫回覆內容，不能自行新增或刪除項目）。
        機關督導時若沒有發現任何需要改善的項目，可以把該任務標記為「無」，這筆任務就不會出現在工廠改善回覆連結、機關複查登打連結裡。
      </Typography>
      <TextField
        size="small"
        placeholder="搜尋工廠名稱、登記編號、機關名稱..."
        value={searchInput}
        onChange={e => handleSearchInput(e.target.value)}
        sx={{ width: 300, mb: 1.5 }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
        }}
      />
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>工廠名稱</TableCell>
            <TableCell>登記編號</TableCell>
            <TableCell>機關</TableCell>
            <TableCell>表單類型</TableCell>
            <TableCell>督導完成日期</TableCell>
            <TableCell align="right">項目數</TableCell>
            <TableCell>工廠回覆</TableCell>
            <TableCell align="center">無需回覆</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}><TableCell colSpan={9}><Skeleton /></TableCell></TableRow>
            ))
          ) : (
            tasks.map(t => (
              <TableRow key={t.taskId} hover sx={{ opacity: t.noImprovementNeeded ? 0.6 : 1 }}>
                <TableCell>{t.factoryName}</TableCell>
                <TableCell>{t.factoryRegistrationNo ?? '—'}</TableCell>
                <TableCell>{t.agencyName}</TableCell>
                <TableCell>{t.formTypeName}</TableCell>
                <TableCell>{t.completedAt ? new Date(t.completedAt).toLocaleDateString() : '—'}</TableCell>
                <TableCell align="right">{t.noImprovementNeeded ? '—' : `${t.repliedItemCount} / ${t.itemCount}`}</TableCell>
                <TableCell>
                  {t.noImprovementNeeded ? (
                    <Chip label="無需回覆" color="default" size="small" />
                  ) : (
                    <Chip
                      label={t.factoryReplySubmitted ? '已送出' : '未送出'}
                      color={t.factoryReplySubmitted ? 'success' : 'default'}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title={t.noImprovementNeeded ? '取消標記，恢復需要工廠回覆' : '標記為「無」：機關督導時沒有發現任何需要改善的項目'}>
                    <span>
                      <Switch
                        size="small"
                        checked={t.noImprovementNeeded}
                        disabled={togglingTaskId === t.taskId}
                        onChange={() => handleToggleNoImprovementNeeded(t)}
                      />
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small" variant="outlined" startIcon={<ManageItemsIcon fontSize="small" />}
                    onClick={() => setManagingTask(t)}
                    disabled={t.noImprovementNeeded}
                  >
                    管理項目
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
          {!loading && tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ color: 'text.secondary' }}>
                沒有符合條件的已完成任務
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 20, 50, 100]}
        labelRowsPerPage="每頁筆數"
        labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
      />

      <FactoryReplyItemsDialog
        taskId={managingTask?.taskId ?? null}
        factoryName={managingTask?.factoryName ?? ''}
        findings={managingTask?.findings ?? []}
        onClose={() => setManagingTask(null)}
        onChanged={load}
      />
    </Box>
  );
}

function FactoryReplyItemsDialog({ taskId, factoryName, findings, onClose, onChanged }: {
  taskId: string | null;
  factoryName: string;
  findings: SupervisionFindingDto[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<FactoryReplyItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    supervisionReplyApi.getFactoryReplyItems(taskId)
      .then(setItems)
      .catch(() => setError('載入失敗，請稍後再試'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (taskId) load(); }, [taskId]);

  const handleAdd = async () => {
    if (!taskId || !newDescription.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await supervisionReplyApi.createFactoryReplyItem(taskId, { description: newDescription.trim() });
      setNewDescription('');
      load();
      onChanged();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '新增失敗');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('確定要刪除這個項目？工廠已填寫的回覆內容、機關已填寫的複查登打內容都會一併刪除。')) return;
    await supervisionReplyApi.deleteFactoryReplyItem(itemId);
    load();
    onChanged();
  };

  const handleMove = async (itemId: string, up: boolean) => {
    await supervisionReplyApi.moveFactoryReplyItem(itemId, up);
    load();
  };

  const startEdit = (item: FactoryReplyItemDto) => {
    setEditingId(item.id);
    setEditingText(item.description);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    await supervisionReplyApi.updateFactoryReplyItem(editingId, { description: editingText.trim() });
    setEditingId(null);
    load();
    onChanged();
  };

  return (
    <Dialog open={!!taskId} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>管理改善項目{factoryName && ` — ${factoryName}`}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" mb={2}>
          工廠只能填寫每個項目的回覆內容，不能自行新增或刪除項目。建議依下方「違反法規條款」或「違反事實」的編號逐點新增，方便工廠對應回覆。
        </Typography>

        <SupervisionFindingSummary findings={findings} />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}><CircularProgress /></Box>
        ) : (
          <Stack spacing={1}>
            {items.map((item, idx) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.5 }}>
                {editingId === item.id ? (
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <TextField
                      size="small" fullWidth multiline value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      autoFocus
                    />
                    <Button size="small" onClick={handleSaveEdit} disabled={!editingText.trim()}>儲存</Button>
                    <Button size="small" onClick={() => setEditingId(null)}>取消</Button>
                  </Stack>
                ) : (
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="body2">
                        第 {idx + 1} 點：{item.description}
                      </Typography>
                      {item.replyText && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          工廠回覆：{item.replyText}
                          {item.isImprovementCompleted != null &&
                            `｜是否完成改善：${item.isImprovementCompleted ? '是' : '否'}`}
                          {item.completionDate &&
                            `｜完成/預計完成日期：${new Date(item.completionDate).toLocaleDateString()}`}
                          {item.remarks && `｜備註：${item.remarks}`}
                        </Typography>
                      )}
                    </Box>
                    <Stack direction="row">
                      <Tooltip title="上移">
                        <span>
                          <IconButton size="small" disabled={idx === 0} onClick={() => handleMove(item.id, true)}>
                            <MoveUpIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="下移">
                        <span>
                          <IconButton size="small" disabled={idx === items.length - 1} onClick={() => handleMove(item.id, false)}>
                            <MoveDownIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="編輯說明">
                        <IconButton size="small" onClick={() => startEdit(item)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="刪除">
                        <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                )}
              </Paper>
            ))}
            {items.length === 0 && (
              <Typography variant="body2" color="text.secondary">尚未設定任何項目</Typography>
            )}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            size="small" fullWidth multiline
            placeholder="新增一點說明（例如摘錄違反事實內容）"
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <Button variant="contained" onClick={handleAdd} disabled={adding || !newDescription.trim()}>
            新增
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

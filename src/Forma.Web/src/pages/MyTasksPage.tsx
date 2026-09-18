/**
 * MyTasksPage — 機關使用者的督導清單（分頁 + TanStack Table 排序/欄位篩選）
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Button, FormControl, InputLabel, Select, MenuItem,
  TextField, InputAdornment, Tooltip, IconButton,
  ToggleButtonGroup, ToggleButton, Stack, Paper, Alert,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  TablePagination, Skeleton, CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  OpenInNew as OpenIcon,
  CheckCircle as DoneIcon,
  HourglassEmpty as PendingIcon,
  Edit as InProgressIcon,
  Undo as RejectIcon,
  PictureAsPdf as PdfIcon,
  DriveFileRenameOutline as AdminEditIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
  UnfoldMore as UnsortedIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { MainLayout } from '@/components/layout';
import { supervisionApi } from '@/lib/api/supervision';
import { formsApi } from '@/lib/api/forms';
import { submissionsApi } from '@/lib/api/submissions';
import { useAuthStore } from '@/stores/authStore';
import type { SupervisionTaskDto, PagedMyTasksResponse, CampaignDto } from '@/types/api/supervision';
import type { FormSchema, Field, PanelField, PanelDynamicField, DownloadReportField, DownloadReportFieldProperties } from '@/types/form';

// ─── PDF helpers ──────────────────────────────────────────

function extractFields(fields: Field[]): Field[] {
  const result: Field[] = [];
  for (const f of fields) {
    if (f.type === 'panel') {
      result.push(...extractFields((f as PanelField).properties?.fields ?? []));
    } else if (f.type === 'paneldynamic') {
      result.push(...extractFields((f as PanelDynamicField).properties?.fields ?? []));
    } else {
      result.push(f);
    }
  }
  return result;
}

function findDownloadReportField(schema: FormSchema): DownloadReportField | null {
  for (const page of schema.pages) {
    for (const f of extractFields(page.fields)) {
      if (f.type === 'downloadreport') return f as DownloadReportField;
    }
    for (const f of page.fields) {
      if (f.type === 'downloadreport') return f as DownloadReportField;
    }
  }
  return null;
}

// ─── Status helpers ───────────────────────────────────────

type TaskStatus = 'Pending' | 'InProgress' | 'Completed';

const STATUS_LABEL: Record<TaskStatus, string> = {
  Pending: '未填寫',
  InProgress: '填寫中',
  Completed: '已完成',
};

const STATUS_COLOR: Record<TaskStatus, 'default' | 'warning' | 'success'> = {
  Pending: 'default',
  InProgress: 'warning',
  Completed: 'success',
};

const STATUS_ICON: Record<TaskStatus, React.ReactNode> = {
  Pending: <PendingIcon fontSize="small" />,
  InProgress: <InProgressIcon fontSize="small" />,
  Completed: <DoneIcon fontSize="small" />,
};

// ─── Skeleton rows ────────────────────────────────────────

function SkeletonRows({ cols, rows = 10 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}><Skeleton variant="text" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Sort icon ────────────────────────────────────────────

function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  if (direction === 'asc') return <AscIcon sx={{ fontSize: 14, ml: 0.5 }} />;
  if (direction === 'desc') return <DescIcon sx={{ fontSize: 14, ml: 0.5 }} />;
  return <UnsortedIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.3 }} />;
}

// ─── Column filter input ──────────────────────────────────

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

// ─── Column helper ────────────────────────────────────────

const columnHelper = createColumnHelper<SupervisionTaskDto>();

// ─── Page ────────────────────────────────────────────────

export function MyTasksPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAdmin = user ? (BigInt(user.permissions ?? 0) & 7n) === 7n : false;

  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [agencyFilter, setAgencyFilter] = useState('');

  const [data, setData] = useState<PagedMyTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);

  const [rejectTarget, setRejectTarget] = useState<SupervisionTaskDto | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([{ id: 'riskRank', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchInput = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(0);
    }, 400);
  };

  useEffect(() => {
    supervisionApi.getCampaigns().then(cs => {
      const visible = isAdmin ? cs : cs.filter(c => c.status !== 'Closed');
      setCampaigns(visible);
      const active = visible.find(c => c.status === 'Active');
      setSelectedCampaignId(active?.id ?? visible[0]?.id ?? '');
    });
  }, [isAdmin]);

  const fetchTasks = useCallback(() => {
    if (!selectedCampaignId) return;
    setLoading(true);
    supervisionApi.getMyTasks({
      campaignId: selectedCampaignId,
      page: page + 1,
      pageSize: rowsPerPage,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      search: search || undefined,
      agencyId: agencyFilter || undefined,
    })
      .then(res => { setData(res); })
      .finally(() => setLoading(false));
  }, [selectedCampaignId, page, rowsPerPage, statusFilter, search, agencyFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  useEffect(() => {
    if (!isAdmin || !selectedCampaignId) return;
    supervisionApi.getCampaignAgencies(selectedCampaignId)
      .then(res => setAgencies(res));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedCampaignId]);

  const tasks = data?.items ?? [];
  const totalRows = data?.total ?? 0;

  const stats = {
    total: (data?.pending ?? 0) + (data?.inProgress ?? 0) + (data?.completed ?? 0),
    pending: data?.pending ?? 0,
    inProgress: data?.inProgress ?? 0,
    completed: data?.completed ?? 0,
  };
  const completionRate = stats.total > 0
    ? Math.round(stats.completed / stats.total * 100)
    : 0;

  // ─── TanStack Table columns ───────────────────────────────

  const columns = [
    columnHelper.accessor('riskRank', {
      header: '風險排序',
      enableSorting: true,
      enableColumnFilter: false,
      sortingFn: (a, b) => {
        const av = a.original.riskRank ?? Infinity;
        const bv = b.original.riskRank ?? Infinity;
        return av - bv;
      },
    }),
    columnHelper.accessor('factoryName', {
      header: '工廠名稱',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('industrialPark', {
      header: '產業園區',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('county', {
      header: '縣市',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('agencyName', {
      header: '督導機關',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('formTypeName', {
      header: '需填表單',
      enableSorting: false,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('status', {
      header: '狀態',
      enableSorting: true,
      enableColumnFilter: false,
    }),
    columnHelper.accessor('submittedByUsername', {
      header: '填寫人',
      enableSorting: false,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('submittedAt', {
      header: '填寫時間',
      enableSorting: true,
      enableColumnFilter: false,
      sortingFn: (a, b) => {
        const av = a.original.submittedAt ? new Date(a.original.submittedAt).getTime() : 0;
        const bv = b.original.submittedAt ? new Date(b.original.submittedAt).getTime() : 0;
        return av - bv;
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '操作',
      enableSorting: false,
      enableColumnFilter: false,
    }),
  ];

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
  });

  // ─── PDF / action handlers ────────────────────────────────

  const handleDownloadPdf = async (task: SupervisionTaskDto) => {
    if (!task.formId || !task.submissionId) return;
    setDownloadingPdfId(task.id);
    try {
      const [formDto, submission] = await Promise.all([
        formsApi.getForm(task.formId),
        submissionsApi.getSubmission(task.submissionId),
      ]);
      const schema = JSON.parse(formDto.schema) as FormSchema;
      const values = JSON.parse(submission.submissionData) as Record<string, unknown>;
      const reportField = findDownloadReportField(schema);
      const baseProperties = (reportField?.properties ?? {}) as DownloadReportFieldProperties;
      const metaFields: Field[] = [
        { id: '__m1', type: 'text', name: '__meta_factory',   label: '業者名稱' },
        { id: '__m2', type: 'text', name: '__meta_reg',       label: '統一編號' },
        { id: '__m3', type: 'text', name: '__meta_agency',    label: '督導機關' },
        { id: '__m4', type: 'text', name: '__meta_county',    label: '縣市'     },
        { id: '__m5', type: 'text', name: '__meta_submitter', label: '填寫人'   },
        { id: '__m6', type: 'text', name: '__meta_time',      label: '填寫時間' },
      ];
      const augmentedSchema: FormSchema = {
        ...schema,
        pages: [{ id: '__meta_page', title: '督導基本資訊', fields: metaFields }, ...schema.pages],
      };
      const metaValues: Record<string, unknown> = {
        __meta_factory:   task.factoryName,
        __meta_reg:       task.factoryRegistrationNo ?? '',
        __meta_agency:    task.agencyName,
        __meta_county:    task.county ?? '',
        __meta_submitter: task.submittedByUsername ?? '',
        __meta_time: task.submittedAt
          ? new Date(task.submittedAt).toLocaleString('zh-TW', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })
          : '',
      };
      const properties: DownloadReportFieldProperties = {
        ...baseProperties,
        coverTitle: `${task.factoryName}\n【${task.formTypeName}】\n督導報告`,
        showDate: true,
      };
      const { generateReport } = await import('@/components/form-fields/report/generateReport');
      await generateReport({ schema: augmentedSchema, values: { ...metaValues, ...values }, properties });
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await supervisionApi.rejectTask(rejectTarget.id);
      fetchTasks();
    } finally {
      setRejecting(false);
      setRejectTarget(null);
    }
  };

  const handleFillForm = (task: SupervisionTaskDto) => {
    if (!task.formId) return;
    if (task.status === 'Completed') {
      navigate(`/forms/${task.formId}/submissions`);
    } else if (task.submissionId) {
      navigate(`/forms/${task.formId}/submit?taskId=${task.id}&submissionId=${task.submissionId}`);
    } else {
      navigate(`/forms/${task.formId}/submit?taskId=${task.id}`);
    }
  };

  const colCount = 10;

  return (
    <MainLayout title={isAdmin ? '督導任務總覽' : '我的督導任務'}>
      <Box>
        <Typography variant="h5" fontWeight="bold" mb={0.5}>
          {isAdmin ? '督導任務總覽' : '我的督導清單'}
        </Typography>
        {isAdmin && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            管理員模式：顯示所有機關的督導任務
          </Typography>
        )}

        {/* 計畫選擇器 */}
        <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>年度督導計畫</InputLabel>
            <Select
              value={selectedCampaignId}
              label="年度督導計畫"
              onChange={e => { setSelectedCampaignId(e.target.value); setPage(0); }}
            >
              {campaigns.map(c => (
                <MenuItem key={c.id} value={c.id}>
                  {c.year} — {c.name}
                  {c.status === 'Active' && (
                    <Chip label="進行中" size="small" color="success" sx={{ ml: 1 }} />
                  )}
                  {c.status === 'Closed' && (
                    <Chip label="已結束" size="small" color="default" sx={{ ml: 1 }} />
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* 統計卡片 */}
        <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} mb={3}>
          {loading && !data ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} height={56} />
                <Skeleton variant="text" width="40%" sx={{ mx: 'auto' }} />
              </Paper>
            ))
          ) : (
            [
              { label: '全部任務', value: stats.total, color: 'primary.main' },
              { label: '未填寫', value: stats.pending, color: 'text.secondary' },
              { label: '填寫中', value: stats.inProgress, color: 'warning.main' },
              { label: '已完成', value: `${stats.completed} (${completionRate}%)`, color: 'success.main' },
            ].map(item => (
              <Paper key={item.label} variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" color={item.color}>{item.value}</Typography>
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
              </Paper>
            ))
          )}
        </Box>

        {/* 篩選工具列 */}
        <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder={isAdmin ? '搜尋工廠名稱、園區、縣市、機關...' : '搜尋工廠名稱、園區、縣市...'}
            value={searchInput}
            onChange={e => handleSearchInput(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            }}
          />
          {isAdmin && agencies.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>督導機關</InputLabel>
              <Select
                value={agencyFilter}
                label="督導機關"
                onChange={e => { setAgencyFilter(e.target.value); setPage(0); }}
              >
                <MenuItem value="">全部機關</MenuItem>
                {agencies.map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <ToggleButtonGroup
            size="small"
            value={statusFilter}
            exclusive
            onChange={(_, v) => { if (v) { setStatusFilter(v); setPage(0); } }}
          >
            <ToggleButton value="all">全部</ToggleButton>
            <ToggleButton value="Pending">未填寫</ToggleButton>
            <ToggleButton value="InProgress">填寫中</ToggleButton>
            <ToggleButton value="Completed">已完成</ToggleButton>
          </ToggleButtonGroup>
          {columnFilters.length > 0 && (
            <Button size="small" variant="outlined" color="secondary" onClick={() => setColumnFilters([])}>
              清除欄位篩選 ({columnFilters.length})
            </Button>
          )}
        </Stack>

        {/* 任務列表 */}
        {!loading && tasks.length === 0 ? (
          <Alert severity="info">
            {!data || data.total === 0
              ? isAdmin
                ? '此年度計畫尚無督導任務，請先匯入業者清冊'
                : '此年度您尚未被指派督導任務，請確認您的帳號是否已綁定至督導機關'
              : '無符合條件的任務'}
          </Alert>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id} sx={{ bgcolor: 'grey.50' }}>
                    {headerGroup.headers.map(header => {
                      const canSort = header.column.getCanSort();
                      const canFilter = header.column.getCanFilter();
                      const sortDir = header.column.getIsSorted();
                      const filterVal = (header.column.getFilterValue() as string) ?? '';
                      return (
                        <TableCell key={header.id} sx={{ fontWeight: 'bold', verticalAlign: 'top', minWidth: canFilter ? 100 : undefined }}>
                          <Box
                            display="flex"
                            alignItems="center"
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
                  <SkeletonRows cols={colCount} rows={Math.min(rowsPerPage, 10)} />
                ) : (
                  table.getRowModel().rows.map(row => {
                    const task = row.original;
                    return (
                      <TableRow
                        key={task.id}
                        hover
                        sx={{
                          opacity: task.status === 'Completed' ? 0.75 : 1,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        {/* 風險排序 */}
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" fontWeight="bold">
                            {task.riskRank ?? '—'}
                          </Typography>
                        </TableCell>
                        {/* 工廠名稱 */}
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{task.factoryName}</Typography>
                          {task.factoryRegistrationNo && (
                            <Typography variant="caption" color="text.secondary">
                              {task.factoryRegistrationNo}
                            </Typography>
                          )}
                        </TableCell>
                        {/* 產業園區 */}
                        <TableCell>
                          <Typography variant="body2">{task.industrialPark ?? '—'}</Typography>
                        </TableCell>
                        {/* 縣市 */}
                        <TableCell>
                          <Typography variant="body2">{task.county ?? '—'}</Typography>
                        </TableCell>
                        {/* 督導機關 */}
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                            {task.agencyName}
                          </Typography>
                        </TableCell>
                        {/* 需填表單 */}
                        <TableCell>
                          <Tooltip title={task.formTypeName}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                              {task.formTypeName}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        {/* 狀態 */}
                        <TableCell>
                          <Chip
                            icon={STATUS_ICON[task.status as TaskStatus] as React.ReactElement}
                            label={STATUS_LABEL[task.status as TaskStatus] ?? task.status}
                            color={STATUS_COLOR[task.status as TaskStatus] ?? 'default'}
                            size="small"
                          />
                        </TableCell>
                        {/* 填寫人 */}
                        <TableCell>
                          <Typography variant="body2">{task.submittedByUsername ?? '—'}</Typography>
                        </TableCell>
                        {/* 填寫時間 */}
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {task.submittedAt
                              ? new Date(task.submittedAt).toLocaleString('zh-TW', {
                                  year: 'numeric', month: '2-digit', day: '2-digit',
                                  hour: '2-digit', minute: '2-digit',
                                })
                              : '—'}
                          </Typography>
                        </TableCell>
                        {/* 操作 */}
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            {task.formId ? (
                              <Button
                                size="small"
                                variant={task.status === 'Completed' ? 'outlined' : 'contained'}
                                endIcon={<OpenIcon fontSize="small" />}
                                onClick={() => handleFillForm(task)}
                                color={task.status === 'Completed' ? 'success' : 'primary'}
                                disabled={task.status === 'Completed' && !isAdmin}
                              >
                                {task.status === 'Completed' ? '查看' : '填寫'}
                              </Button>
                            ) : (
                              <Tooltip title="此表單尚未綁定，請聯繫管理員">
                                <span>
                                  <Button size="small" disabled variant="outlined">未綁定</Button>
                                </span>
                              </Tooltip>
                            )}
                            {task.status === 'Completed' && task.submissionId && (
                              <Tooltip title="下載 PDF 報告">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDownloadPdf(task)}
                                    disabled={downloadingPdfId === task.id}
                                  >
                                    {downloadingPdfId === task.id
                                      ? <CircularProgress size={16} />
                                      : <PdfIcon fontSize="small" color="error" />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                            {isAdmin && task.status === 'Completed' && task.submissionId && task.formId && (
                              <Tooltip title="代填修正：以管理員身分修改已提交的表單內容，原填表人不會改變">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="info"
                                  startIcon={<AdminEditIcon fontSize="small" />}
                                  onClick={() => navigate(`/forms/${task.formId}/submit?submissionId=${task.submissionId}&taskId=${task.id}&adminEdit=true`)}
                                >
                                  代填修正
                                </Button>
                              </Tooltip>
                            )}
                            {isAdmin && task.status === 'Completed' && (
                              <Tooltip title="退回，讓機關重新填寫">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="warning"
                                  startIcon={<RejectIcon fontSize="small" />}
                                  onClick={() => setRejectTarget(task)}
                                >
                                  退回
                                </Button>
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

            {/* 欄位篩選後的筆數提示 */}
            {columnFilters.length > 0 && !loading && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                欄位篩選後顯示 {table.getRowModel().rows.length} 筆（本頁共 {tasks.length} 筆）
              </Typography>
            )}

            <TablePagination
              component="div"
              count={totalRows}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100, 200]}
              labelRowsPerPage="每頁筆數"
              labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
            />
          </>
        )}
      </Box>

      {/* 退回確認 Dialog */}
      <Dialog open={!!rejectTarget} onClose={() => !rejecting && setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>確認退回表單</DialogTitle>
        <DialogContent>
          <DialogContentText>
            退回後，<strong>{rejectTarget?.agencyName}</strong> 對業者{' '}
            <strong>{rejectTarget?.factoryName}</strong> 的表單將變為草稿狀態，
            機關使用者可在原有填寫內容的基礎上修改後重新提交。確定要退回嗎？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={rejecting}>取消</Button>
          <Button
            onClick={handleRejectConfirm}
            color="warning"
            variant="contained"
            disabled={rejecting}
          >
            {rejecting ? '處理中...' : '確認退回'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}

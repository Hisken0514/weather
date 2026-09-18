/**
 * AgencyReviewPage — 機關複查作業（登入版，資料與公開連結相同，依產業園區/機關身分自動過濾）
 * 依工廠分組顯示進度，分頁載入 + 搜尋（工廠名稱/登記編號）。點一列進到該工廠的任務明細。
 * 統計卡片可點擊篩選（工廠已完成回覆/機關已完成複查/工廠回覆有更新待重新複查），
 * 表格欄位比照「我的督導任務」用 TanStack Table 支援排序 + 欄位篩選（篩選僅套用在當前頁）。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem, Chip, Stack, Alert,
  Table, TableHead, TableRow, TableCell, TableBody, TextField, InputAdornment,
  Button, Skeleton, TablePagination, Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  OpenInNew as OpenIcon,
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
import { supervisionReplyApi } from '@/lib/api/supervisionReply';
import type { CampaignDto } from '@/types/api/supervision';
import type { AgencyReviewFactorySummaryDto, PagedAgencyReviewFactorySummaryResponse } from '@/types/api/supervisionReply';

type ProgressColor = 'default' | 'warning' | 'success';
type FilterMode = 'all' | 'factoryReplyCompleted' | 'agencyReviewCompleted' | 'needsReReview';

function progressStatus(submitted: number, total: number): { label: string; color: ProgressColor } {
  if (total === 0) return { label: '—', color: 'default' };
  if (submitted === 0) return { label: '未填寫', color: 'default' };
  if (submitted < total) return { label: '填寫中', color: 'warning' };
  return { label: '已完成', color: 'success' };
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
      onChange={(e) => onChange(e.target.value)}
      placeholder="篩選..."
      onClick={(e) => e.stopPropagation()}
      sx={{
        mt: 0.5,
        '& .MuiInputBase-root': { fontSize: 11, height: 24 },
        '& .MuiInputBase-input': { py: 0.25, px: 0.75 },
      }}
    />
  );
}

const columnHelper = createColumnHelper<AgencyReviewFactorySummaryDto>();

export function AgencyReviewPage() {
  const navigate = useNavigate();

  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [data, setData] = useState<PagedAgencyReviewFactorySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [sorting, setSorting] = useState<SortingState>([]);
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

  const handleCardClick = (mode: FilterMode) => {
    setFilterMode((prev) => (prev === mode ? 'all' : mode));
    setPage(0);
  };

  useEffect(() => {
    supervisionApi.getCampaigns().then((cs) => {
      setCampaigns(cs);
      const active = cs.find((c) => c.status === 'Active');
      setSelectedCampaignId(active?.id ?? cs[0]?.id ?? '');
    });
  }, []);

  const fetchFactories = useCallback(() => {
    if (!selectedCampaignId) return;
    setLoading(true);
    supervisionReplyApi.getMyAgencyReviewFactories(selectedCampaignId, {
      page: page + 1,
      pageSize: rowsPerPage,
      search: search || undefined,
      factoryReplyCompleted: filterMode === 'factoryReplyCompleted' ? true : undefined,
      agencyReviewCompleted: filterMode === 'agencyReviewCompleted' ? true : undefined,
      needsReReview: filterMode === 'needsReReview' ? true : undefined,
    })
      .then(res => { setData(res); })
      .finally(() => setLoading(false));
  }, [selectedCampaignId, page, rowsPerPage, search, filterMode]);

  useEffect(() => { fetchFactories(); }, [fetchFactories]);

  const factories = data?.items ?? [];
  const totalRows = data?.total ?? 0;

  const columns = [
    columnHelper.accessor('factoryName', {
      header: '工廠名稱',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('factoryRegistrationNo', {
      header: '登記編號',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('taskCount', {
      header: '任務數',
      enableSorting: true,
      enableColumnFilter: false,
    }),
    columnHelper.accessor('factoryReplySubmittedCount', {
      header: '工廠回覆',
      enableSorting: true,
      enableColumnFilter: false,
      sortingFn: (a, b) => {
        const av = a.original.taskCount === 0 ? -1 : a.original.factoryReplySubmittedCount / a.original.taskCount;
        const bv = b.original.taskCount === 0 ? -1 : b.original.factoryReplySubmittedCount / b.original.taskCount;
        return av - bv;
      },
    }),
    columnHelper.accessor('agencyReviewSubmittedCount', {
      header: '機關複查',
      enableSorting: true,
      enableColumnFilter: false,
      sortingFn: (a, b) => {
        const av = a.original.taskCount === 0 ? -1 : a.original.agencyReviewSubmittedCount / a.original.taskCount;
        const bv = b.original.taskCount === 0 ? -1 : b.original.agencyReviewSubmittedCount / b.original.taskCount;
        return av - bv;
      },
    }),
    columnHelper.display({ id: 'actions', header: '操作', enableSorting: false, enableColumnFilter: false }),
  ];

  const table = useReactTable({
    data: factories,
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
    <MainLayout title="機關複查作業">
      <Typography variant="h5" fontWeight="bold" mb={0.5}>機關複查作業</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        檢視工廠針對督導結果提出的改善回覆，並登打複查決定與裁處資訊
      </Typography>

      <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>年度督導計畫</InputLabel>
          <Select
            value={selectedCampaignId}
            label="年度督導計畫"
            onChange={(e) => { setSelectedCampaignId(e.target.value); setPage(0); }}
          >
            {campaigns.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.year} — {c.name}
                {c.status === 'Active' && <Chip label="進行中" size="small" color="success" sx={{ ml: 1 }} />}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* 統計卡片：點擊可篩選，再點一次取消篩選 */}
      <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} mb={3}>
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
              <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} height={56} />
              <Skeleton variant="text" width="40%" sx={{ mx: 'auto' }} />
            </Paper>
          ))
        ) : (
          <>
            <Paper
              variant="outlined"
              onClick={() => handleCardClick('all')}
              sx={{
                p: 2, textAlign: 'center', cursor: 'pointer',
                borderColor: filterMode === 'all' ? 'primary.main' : undefined,
                borderWidth: filterMode === 'all' ? 2 : 1,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="primary.main">{totalRows}</Typography>
              <Typography variant="caption" color="text.secondary">符合條件工廠家數</Typography>
            </Paper>
            <Paper
              variant="outlined"
              onClick={() => handleCardClick('factoryReplyCompleted')}
              sx={{
                p: 2, textAlign: 'center', cursor: 'pointer',
                borderColor: filterMode === 'factoryReplyCompleted' ? 'success.main' : undefined,
                borderWidth: filterMode === 'factoryReplyCompleted' ? 2 : 1,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {data?.factoryReplyCompletedCount ?? 0} <Typography component="span" variant="body2" color="text.secondary">/ {data?.totalBeforeFilter ?? 0}</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">工廠已完成回覆</Typography>
            </Paper>
            <Paper
              variant="outlined"
              onClick={() => handleCardClick('agencyReviewCompleted')}
              sx={{
                p: 2, textAlign: 'center', cursor: 'pointer',
                borderColor: filterMode === 'agencyReviewCompleted' ? 'success.main' : undefined,
                borderWidth: filterMode === 'agencyReviewCompleted' ? 2 : 1,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {data?.agencyReviewCompletedCount ?? 0} <Typography component="span" variant="body2" color="text.secondary">/ {data?.totalBeforeFilter ?? 0}</Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary">機關已完成複查</Typography>
            </Paper>
            <Paper
              variant="outlined"
              onClick={() => handleCardClick('needsReReview')}
              sx={{
                p: 2, textAlign: 'center', cursor: 'pointer',
                borderColor: (data?.needsReReviewFactoryCount ?? 0) > 0 || filterMode === 'needsReReview' ? 'warning.main' : undefined,
                borderWidth: filterMode === 'needsReReview' ? 2 : 1,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color={(data?.needsReReviewFactoryCount ?? 0) > 0 ? 'warning.main' : 'text.disabled'}>
                {data?.needsReReviewFactoryCount ?? 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">工廠回覆有更新待重新複查</Typography>
            </Paper>
          </>
        )}
      </Box>

      <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          placeholder="搜尋工廠名稱、登記編號..."
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
        {filterMode !== 'all' && (
          <Button size="small" variant="outlined" color="secondary" onClick={() => handleCardClick('all')}>
            清除卡片篩選
          </Button>
        )}
        {columnFilters.length > 0 && (
          <Button size="small" variant="outlined" color="secondary" onClick={() => setColumnFilters([])}>
            清除欄位篩選 ({columnFilters.length})
          </Button>
        )}
      </Stack>

      {!loading && factories.length === 0 ? (
        <Alert severity="info">
          {!data || data.totalBeforeFilter === 0
            ? '此年度計畫目前沒有需要複查登打的工廠'
            : '無符合搜尋/篩選條件的工廠'}
        </Alert>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} sx={{ bgcolor: 'grey.50' }}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const canFilter = header.column.getCanFilter();
                    const sortDir = header.column.getIsSorted();
                    const filterVal = (header.column.getFilterValue() as string) ?? '';
                    const isActions = header.column.id === 'actions';
                    return (
                      <TableCell
                        key={header.id}
                        align={isActions ? 'right' : undefined}
                        sx={{ fontWeight: 'bold', verticalAlign: 'top', minWidth: canFilter ? 100 : undefined }}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent={isActions ? 'flex-end' : undefined}
                          sx={{ cursor: canSort ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon direction={sortDir} />}
                        </Box>
                        {canFilter && (
                          <ColumnFilterInput
                            value={filterVal}
                            onChange={(v) => header.column.setFilterValue(v || undefined)}
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
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : (
                table.getRowModel().rows.map((row) => {
                  const f = row.original;
                  const factoryReplyStatus = progressStatus(f.factoryReplySubmittedCount, f.taskCount);
                  const agencyReviewStatus = progressStatus(f.agencyReviewSubmittedCount, f.taskCount);
                  return (
                    <TableRow
                      key={f.factoryId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/agency-review/factory/${f.factoryId}?campaignId=${selectedCampaignId}`)}
                    >
                      <TableCell>{f.factoryName}</TableCell>
                      <TableCell>{f.factoryRegistrationNo ?? '—'}</TableCell>
                      <TableCell align="right">{f.taskCount}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${factoryReplyStatus.label} (${f.factoryReplySubmittedCount}/${f.taskCount})`}
                          color={factoryReplyStatus.color}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <Chip
                            label={`${agencyReviewStatus.label} (${f.agencyReviewSubmittedCount}/${f.taskCount})`}
                            color={agencyReviewStatus.color}
                            size="small"
                          />
                          {f.needsReReviewCount > 0 && (
                            <Chip label={`需重新複查 (${f.needsReReviewCount})`} color="warning" size="small" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          endIcon={<OpenIcon fontSize="small" />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/agency-review/factory/${f.factoryId}?campaignId=${selectedCampaignId}`);
                          }}
                        >
                          查看明細
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {columnFilters.length > 0 && !loading && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              欄位篩選後顯示 {table.getRowModel().rows.length} 筆（本頁共 {factories.length} 筆）
            </Typography>
          )}

          <TablePagination
            component="div"
            count={totalRows}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="每頁筆數"
            labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
          />
        </>
      )}
    </MainLayout>
  );
}

export default AgencyReviewPage;

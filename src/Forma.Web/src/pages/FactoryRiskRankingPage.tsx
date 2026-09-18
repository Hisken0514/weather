/**
 * FactoryRiskRankingPage — 全台工廠風險排名
 * 匯入歷史資料（工廠指標輸入值），套用指定年度評分標準的公式現場算風險值排名。
 * 分頁 + 欄位篩選（TanStack Table），比照督導任務總覽（MyTasksPage）的作法。
 */
import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Button, FormControl, InputLabel, Select, MenuItem,
  Table, TableHead, TableBody, TableRow, TableCell, TextField,
  InputAdornment, CircularProgress, Alert, AlertTitle, Paper, Chip,
  TablePagination, Skeleton, Accordion, AccordionSummary, AccordionDetails, Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  UploadFile as UploadIcon,
  FileDownload as DownloadIcon,
  ArrowUpward as AscIcon,
  ArrowDownward as DescIcon,
  UnfoldMore as UnsortedIcon,
  ExpandMore as ExpandMoreIcon,
  InfoOutlined as ZeroFillIcon,
  TrendingUp as RankUpIcon,
  TrendingDown as RankDownIcon,
  TrendingFlat as RankFlatIcon,
} from '@mui/icons-material';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';
import { MainLayout } from '@/components/layout/MainLayout';
import { riskScoringApi } from '@/lib/api/riskScoring';
import { factoryRiskApi } from '@/lib/api/factoryRisk';
import type { SchemeListItem } from '@/types/api/riskScoring';
import type {
  FactoryRiskRankingItemDto,
  IncompleteFactoryDto,
  ImportFactoryRiskDataResult,
  SchemeDataCoverageDto,
} from '@/types/api/factoryRisk';

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

const columnHelper = createColumnHelper<FactoryRiskRankingItemDto>();

export function FactoryRiskRankingPage() {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState('');

  // 資料年度篩選：空字串＝全資料庫最新資料年度（預設）
  const [dataYearFilter, setDataYearFilter] = useState<number | ''>('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const [ranking, setRanking] = useState<FactoryRiskRankingItemDto[]>([]);
  const [incompleteFactories, setIncompleteFactories] = useState<IncompleteFactoryDto[]>([]);
  const [resolvedDataYear, setResolvedDataYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importDataYear, setImportDataYear] = useState<number | ''>('');
  const [importResult, setImportResult] = useState<ImportFactoryRiskDataResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  const [coverage, setCoverage] = useState<SchemeDataCoverageDto | null>(null);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([{ id: 'rank', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalSearch, setGlobalSearch] = useState('');

  useEffect(() => {
    riskScoringApi.getSchemes().then(list => {
      setSchemes(list);
      if (list.length > 0) setSelectedSchemeId(list[0].id);
    });
  }, []);

  useEffect(() => {
    factoryRiskApi.getAvailableDataYears().then(setAvailableYears);
  }, []);

  const loadRanking = () => {
    if (!selectedSchemeId) return;
    setLoading(true);
    setLoadError(null);
    factoryRiskApi.getRanking(selectedSchemeId, dataYearFilter || undefined)
      .then(result => {
        setRanking(result.items);
        setIncompleteFactories(result.incompleteFactories);
        setResolvedDataYear(result.resolvedDataYear);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : '載入風險排名失敗'))
      .finally(() => setLoading(false));
  };

  useEffect(loadRanking, [selectedSchemeId, dataYearFilter]);

  const loadCoverage = () => {
    if (!selectedSchemeId) return;
    setCoverageError(null);
    factoryRiskApi.getDataCoverage(selectedSchemeId, dataYearFilter || undefined)
      .then(setCoverage)
      .catch((e: unknown) => setCoverageError(e instanceof Error ? e.message : '載入資料欄位比對失敗'));
  };

  useEffect(loadCoverage, [selectedSchemeId, dataYearFilter]);

  // 匯入的是跟評分標準無關的原始資料，不需要先選標準才能匯入，但要指定這份資料的資料年度
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!importDataYear) {
      setImportError('請先填寫這份資料的資料年度');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const result = await factoryRiskApi.importExcel(file, importDataYear);
      setImportResult(result);
      factoryRiskApi.getAvailableDataYears().then(setAvailableYears);
      loadRanking();
      loadCoverage();
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : '匯入失敗');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    const scheme = schemes.find(s => s.id === selectedSchemeId);
    if (!scheme) return;
    setDownloadingTemplate(true);
    try {
      await factoryRiskApi.downloadTemplate(scheme.id, scheme.year);
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : '下載範本失敗');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const columns = [
    columnHelper.accessor('rank', {
      header: '排名',
      enableSorting: true,
      enableColumnFilter: false,
      cell: info => <Chip label={info.getValue()} size="small" color={info.getValue() <= 10 ? 'error' : 'default'} />,
    }),
    columnHelper.accessor('factoryName', {
      header: '工廠名稱',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: info => {
        const notes = info.row.original.zeroFillNotes;
        return (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Typography variant="body2" fontWeight="medium">{info.getValue()}</Typography>
            {notes.length > 0 && (
              <Tooltip title={notes.join('；')}>
                <ZeroFillIcon fontSize="small" color="warning" />
              </Tooltip>
            )}
          </Box>
        );
      },
    }),
    columnHelper.display({
      id: 'rankTrend',
      header: '排名趨勢',
      cell: info => {
        const { rank, previousYearRank } = info.row.original;
        if (previousYearRank == null) {
          return <Typography variant="body2" color="text.disabled">—</Typography>;
        }
        if (rank < previousYearRank) {
          return (
            <Tooltip title={`去年第 ${previousYearRank} 名，排名上升`}>
              <RankUpIcon fontSize="small" sx={{ color: 'error.main' }} />
            </Tooltip>
          );
        }
        if (rank > previousYearRank) {
          return (
            <Tooltip title={`去年第 ${previousYearRank} 名，排名下降`}>
              <RankDownIcon fontSize="small" sx={{ color: 'success.main' }} />
            </Tooltip>
          );
        }
        return (
          <Tooltip title="跟去年排名相同">
            <RankFlatIcon fontSize="small" sx={{ color: 'text.primary' }} />
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor('factoryRegistrationNo', {
      header: '登記編號',
      enableSorting: false,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: info => info.getValue() ?? '—',
    }),
    columnHelper.accessor('county', {
      header: '縣市',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: info => info.getValue() ?? '—',
    }),
    columnHelper.accessor('industrialPark', {
      header: '產業園區',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: info => info.getValue() ?? '—',
    }),
    columnHelper.accessor('region', {
      header: '轄區',
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: info => info.getValue() ?? '—',
    }),
    columnHelper.accessor('riskScore', {
      header: '風險值',
      enableSorting: true,
      enableColumnFilter: false,
      cell: info => <Typography variant="body2" fontWeight="bold" color="error.main">{info.getValue()}</Typography>,
    }),
    columnHelper.accessor('hazardSeverityScore', {
      header: '危害嚴重度',
      enableSorting: true,
      enableColumnFilter: false,
    }),
    columnHelper.accessor('managementRiskScore', {
      header: '危害發生機率',
      enableSorting: true,
      enableColumnFilter: false,
    }),
    columnHelper.accessor('maxHazardChemicalTypeName', {
      header: '最大危害化學品類型',
      enableSorting: false,
      enableColumnFilter: true,
      filterFn: 'includesString',
    }),
    columnHelper.accessor('maxHazardSubstanceName', {
      header: '最大使用量物質',
      enableSorting: false,
      enableColumnFilter: true,
      filterFn: 'includesString',
      cell: info => info.getValue() ?? '—',
    }),
    columnHelper.accessor('maxHazardQuantity', {
      header: '最大使用量',
      enableSorting: true,
      enableColumnFilter: false,
      cell: info => info.getValue().toLocaleString(),
    }),
  ];

  const table = useReactTable({
    data: ranking,
    columns,
    state: { sorting, columnFilters, globalFilter: globalSearch },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalSearch,
    globalFilterFn: (row, _columnId, filterValue) => {
      const s = String(filterValue).toLowerCase();
      const r = row.original;
      return r.factoryName.toLowerCase().includes(s) ||
        (r.factoryRegistrationNo?.toLowerCase().includes(s) ?? false) ||
        (r.county?.toLowerCase().includes(s) ?? false) ||
        (r.industrialPark?.toLowerCase().includes(s) ?? false);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const colCount = columns.length;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <MainLayout title="全台工廠風險排名">
      <Typography variant="h5" fontWeight="bold" mb={0.5}>全台工廠風險排名</Typography>
      <Typography variant="body2" color="text.secondary" mb={0.5}>
        歷史資料依資料年度各自保留一份快照，可切換套用不同年度評分標準的公式現場計算風險值並排名
      </Typography>
      {resolvedDataYear != null && (
        <Typography variant="body2" color="text.secondary" mb={3}>
          目前顯示資料年度：<strong>{resolvedDataYear}</strong>
          {!dataYearFilter && '（全資料庫最新，未特別指定）'}
        </Typography>
      )}

      <Box display="flex" gap={2} mb={2} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>評分標準</InputLabel>
          <Select
            value={selectedSchemeId}
            label="評分標準"
            onChange={e => setSelectedSchemeId(e.target.value)}
          >
            {schemes.map(s => (
              <MenuItem key={s.id} value={s.id}>
                {s.year} 年・{s.name}
                {s.isActive && ' ★'}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>資料年度</InputLabel>
          <Select
            value={dataYearFilter}
            label="資料年度"
            onChange={e => setDataYearFilter(e.target.value as number | '')}
          >
            <MenuItem value="">最新（自動）</MenuItem>
            {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={downloadingTemplate ? <CircularProgress size={16} /> : <DownloadIcon />}
          disabled={!selectedSchemeId || downloadingTemplate}
          onClick={handleDownloadTemplate}
        >
          下載範本
        </Button>
      </Box>

      <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField
          size="small" label="匯入資料年度" type="number" required
          value={importDataYear}
          onChange={e => setImportDataYear(e.target.value === '' ? '' : Number(e.target.value))}
          sx={{ width: 140 }}
        />
        <Button
          variant="contained"
          component="label"
          startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <UploadIcon />}
          disabled={importing}
        >
          匯入 Excel
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            hidden
            onChange={handleFileChange}
          />
        </Button>

        <TextField
          size="small"
          placeholder="搜尋工廠名稱、登記編號、縣市、產業園區..."
          value={globalSearch}
          onChange={e => setGlobalSearch(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />

        {columnFilters.length > 0 && (
          <Button size="small" variant="outlined" color="secondary" onClick={() => setColumnFilters([])}>
            清除欄位篩選 ({columnFilters.length})
          </Button>
        )}

        {!loading && ranking.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {filteredCount} 筆{filteredCount !== ranking.length && `（共 ${ranking.length} 筆）`}
          </Typography>
        )}
      </Box>

      {importError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setImportError(null)}>{importError}</Alert>
      )}

      {importResult && (
        <Alert
          severity={importResult.errors.length > 0 ? 'warning' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setImportResult(null)}
        >
          <AlertTitle>
            匯入完成：共 {importResult.totalRows} 筆，成功 {importResult.importedCount} 筆
          </AlertTitle>
          {importResult.unmatchedRegistrationNoFactoryNames.length > 0 && (
            <Box mb={1}>
              <Typography variant="body2" fontWeight={600}>
                找不到工廠登記編號（{importResult.unmatchedRegistrationNoFactoryNames.length} 家，已用工廠名稱比對）：
              </Typography>
              <Typography variant="body2" sx={{ maxHeight: 100, overflowY: 'auto' }}>
                {importResult.unmatchedRegistrationNoFactoryNames.join('、')}
              </Typography>
            </Box>
          )}
          {importResult.errors.length > 0 && (
            <Box>
              <Typography variant="body2" fontWeight={600}>錯誤（{importResult.errors.length} 筆）：</Typography>
              <Typography variant="body2" sx={{ maxHeight: 150, overflowY: 'auto' }}>
                {importResult.errors.map((err, i) => <div key={i}>{err}</div>)}
              </Typography>
            </Box>
          )}
        </Alert>
      )}

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {!loading && incompleteFactories.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <AlertTitle>
            {incompleteFactories.length} 家工廠資料不完整，套用目前標準時未列入排名
          </AlertTitle>
          <Typography variant="body2" sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {incompleteFactories.map(f => (
              <div key={f.factoryId}>{f.factoryName}：{f.reason}</div>
            ))}
          </Typography>
        </Alert>
      )}

      {coverageError && <Alert severity="error" sx={{ mb: 2 }}>{coverageError}</Alert>}

      {coverage && (
        <Accordion sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>
              資料欄位比對（排查「對應資料欄位」設錯或範本表頭打錯字）
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" mb={2}>
              目前共匯入 {coverage.totalImportedFactories} 家工廠的原始資料。下面列出這個標準每個指標／化學品類型「對應資料欄位」實際在匯入資料裡能找到幾筆值——0 筆通常代表對應資料欄位打錯字或忘記改。
            </Typography>

            <Typography variant="subtitle2" fontWeight={600} mb={1}>指標</Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>指標名稱</TableCell>
                  <TableCell>對應資料欄位</TableCell>
                  <TableCell align="right">有資料的工廠數</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coverage.indicators.map(i => (
                  <TableRow key={i.canonicalKey} sx={i.matchedFactoryCount === 0 ? { bgcolor: 'error.50' } : undefined}>
                    <TableCell>{i.indicatorName}</TableCell>
                    <TableCell><code>{i.canonicalKey}</code></TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={i.matchedFactoryCount === 0 ? 700 : 400} color={i.matchedFactoryCount === 0 ? 'error.main' : 'text.primary'}>
                        {i.matchedFactoryCount}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Typography variant="subtitle2" fontWeight={600} mb={1}>化學品類型</Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>類型名稱</TableCell>
                  <TableCell>對應政府分類</TableCell>
                  <TableCell align="right">有資料的工廠數</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coverage.chemicalTypes.map(c => (
                  <TableRow key={c.typeName} sx={c.matchedFactoryCount === 0 ? { bgcolor: 'error.50' } : undefined}>
                    <TableCell>{c.typeName}</TableCell>
                    <TableCell>{c.memberNames.length > 0 ? c.memberNames.join('、') : c.typeName}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={c.matchedFactoryCount === 0 ? 700 : 400} color={c.matchedFactoryCount === 0 ? 'error.main' : 'text.primary'}>
                        {c.matchedFactoryCount}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {(coverage.unmatchedIndicatorFields.length > 0 || coverage.unmatchedChemicalTypeNames.length > 0) && (
              <Alert severity="info">
                <AlertTitle>匯入資料裡有、但這個標準完全沒對應到的原始欄位</AlertTitle>
                <Typography variant="body2">
                  這些欄位確實存在於匯入資料裡（可能是範本表頭），但目前標準沒有任何指標／化學品類型設定要用它——如果應該要用到，去公式管理把對應資料欄位改成下面這個名稱。
                </Typography>
                {coverage.unmatchedIndicatorFields.map(f => (
                  <div key={f.rawFieldName}><code>{f.rawFieldName}</code>（{f.factoryCount} 家工廠有值）</div>
                ))}
                {coverage.unmatchedChemicalTypeNames.map(f => (
                  <div key={f.rawFieldName}>化學品類型「{f.rawFieldName}」（{f.factoryCount} 家工廠）</div>
                ))}
              </Alert>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {!loading && ranking.length === 0 ? (
        <Alert severity="info">此評分標準尚無已匯入的風險資料，請先匯入 Excel</Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
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
                        <TableCell key={header.id} sx={{ fontWeight: 'bold', verticalAlign: 'top', minWidth: canFilter ? 120 : undefined }}>
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
                  <SkeletonRows cols={colCount} rows={10} />
                ) : (
                  table.getRowModel().rows.map(row => (
                    <TableRow key={row.id} hover>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
                {!loading && filteredCount === 0 && (
                  <TableRow>
                    <TableCell colSpan={colCount} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                      無符合篩選條件的工廠
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>

          <TablePagination
            component="div"
            count={filteredCount}
            page={table.getState().pagination.pageIndex}
            onPageChange={(_, p) => table.setPageIndex(p)}
            rowsPerPage={table.getState().pagination.pageSize}
            onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="每頁筆數"
            labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
          />
        </Paper>
      )}
    </MainLayout>
  );
}

export default FactoryRiskRankingPage;

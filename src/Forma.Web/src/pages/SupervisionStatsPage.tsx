/**
 * SupervisionStatsPage — 督導成效統計
 * 顯示督導計畫內各表單的實際填寫題目與數值
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, FormControl, InputLabel, Select, MenuItem,
  Chip, CircularProgress, Stack, Paper, Alert,
  Table, TableHead, TableRow, TableCell, TableBody,
  Tooltip, TextField, InputAdornment, IconButton, Button,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  PictureAsPdf as PdfIcon,
  FileDownload as CsvIcon,
  ViewList as FormModeIcon,
  Factory as FactoryModeIcon,
} from '@mui/icons-material';
import { MainLayout } from '@/components/layout';
import { supervisionApi } from '@/lib/api/supervision';
import { formsApi } from '@/lib/api/forms';
import {
  type ColumnDef, resolveValue, extractFields, schemaToColumns,
} from '@/lib/formSubmissionDisplay';
import type {
  CampaignDto, SupervisionTaskDto, SupervisionResponseDto,
  CampaignFactorySummaryDto, FactorySupervisionSummaryDto,
} from '@/types/api/supervision';
import type { FormSchema, Field, DownloadReportField, DownloadReportFieldProperties } from '@/types/form';

/** 從回傳的 data 推導欄位清單（schema 不可用時的 fallback） */
function dataToColumns(responses: SupervisionResponseDto[]): ColumnDef[] {
  const allKeys = new Set<string>();
  responses.forEach(r => Object.keys(r.data).forEach(k => allKeys.add(k)));
  // 過濾掉純 base64 的欄位（簽名/圖片）
  return [...allKeys]
    .filter(key => {
      const sample = responses.find(r => r.data[key] != null)?.data[key];
      if (typeof sample === 'string' && sample.startsWith('data:image/')) return false;
      return true;
    })
    .map(key => ({ name: key, label: key }));
}

/** 找出 schema 中的 downloadreport 欄位（含 panel 內部） */
function findDownloadReportField(schema: FormSchema): DownloadReportField | null {
  for (const page of schema.pages) {
    for (const f of extractFields(page.fields)) {
      if (f.type === 'downloadreport') return f as DownloadReportField;
    }
    // 也搜尋頂層
    for (const f of page.fields) {
      if (f.type === 'downloadreport') return f as DownloadReportField;
    }
  }
  return null;
}

// ─── CSV 匯出 ────────────────────────────────────────────

/** 產生並下載 CSV（表頭 + 逐列字串陣列） */
function downloadCsv(header: string[], rows: string[][], filename: string) {
  // 資料欄用：保留內容，只跳脫引號
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  // 表頭用：額外把換行/多餘空白壓成單一空格，避免 CSV 欄位錯位
  const escapeHeader = (v: string) =>
    `"${v.replace(/"/g, '""').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()}"`;

  const csv = '﻿' + [
    header.map(escapeHeader).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(
  rows: SupervisionResponseDto[],
  columns: ColumnDef[],
  filename: string,
) {
  const header = ['業者名稱', '統一編號', '督導機關', '轄區', '縣市', '填寫人', '填寫時間', ...columns.map(c => c.label)];
  const body = rows.map(r => [
    r.factoryName,
    r.factoryRegistrationNo ?? '',
    r.agencyName,
    r.region ?? '',
    r.county ?? '',
    r.submittedByUsername ?? '',
    r.submittedAt ? new Date(r.submittedAt).toLocaleString('zh-TW') : '',
    ...columns.map(c => resolveValue(r.data[c.name], c.field)),
  ]);
  downloadCsv(header, body, filename);
}

function exportFactorySummaryCsv(
  items: FactorySupervisionSummaryDto[],
  formTypeNames: string[],
  filename: string,
) {
  const header = ['業者名稱', '縣市', '所轄園區', ...formTypeNames.map(n => `${n}督導結果`)];
  const body = items.map(i => [
    i.factoryName,
    i.county ?? '',
    i.industrialPark ?? '',
    ...formTypeNames.map(n => i.results[n] ?? '—'),
  ]);
  downloadCsv(header, body, filename);
}

/** 依督導結果文字決定 Chip 顏色 */
function resultChipColor(text: string): 'success' | 'error' | 'default' {
  if (text.startsWith('不符合')) return 'error';
  if (text.startsWith('符合')) return 'success';
  return 'default';
}

// ─── Page ────────────────────────────────────────────────

export function SupervisionStatsPage() {
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');

  // 檢視模式：依表單 or 依工廠為主體
  const [viewMode, setViewMode] = useState<'form' | 'factory'>('form');

  // 依工廠為主體：彙整資料
  const [factorySummary, setFactorySummary] = useState<CampaignFactorySummaryDto | null>(null);
  const [loadingFactorySummary, setLoadingFactorySummary] = useState(false);
  const [factoryRegionFilter, setFactoryRegionFilter] = useState('');
  const [factorySearch, setFactorySearch] = useState('');

  // 任務列表（取可用表單清單）
  const [tasks, setTasks] = useState<SupervisionTaskDto[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // 選擇的表單
  const [selectedFormId, setSelectedFormId] = useState('');

  // 篩選
  const [regionFilter, setRegionFilter] = useState('');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [search, setSearch] = useState('');

  // 回填數據
  const [responses, setResponses] = useState<SupervisionResponseDto[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // 表單 schema
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [schemaError, setSchemaError] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);

  // PDF 下載中的任務 ID
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // 計畫
  useEffect(() => {
    supervisionApi.getCampaigns().then(cs => {
      setCampaigns(cs);
      const active = cs.find(c => c.status === 'Active');
      setSelectedCampaignId(active?.id ?? cs[0]?.id ?? '');
    });
  }, []);

  // 計畫變更 → 載入任務
  useEffect(() => {
    if (!selectedCampaignId) return;
    setLoadingTasks(true);
    setSelectedFormId('');
    setResponses([]);
    setSchema(null);
    setSchemaError(false);
    supervisionApi.getMyTasks({ campaignId: selectedCampaignId, pageSize: 200 })
      .then(res => setTasks(res.items))
      .finally(() => setLoadingTasks(false));
  }, [selectedCampaignId]);

  // 表單選擇 → 同時載入 schema + responses
  useEffect(() => {
    if (!selectedFormId || !selectedCampaignId) return;

    setSchema(null);
    setSchemaError(false);
    setResponses([]);
    setRegionFilter('');
    setAgencyFilter('');
    setSearch('');

    // schema
    setLoadingSchema(true);
    formsApi.getForm(selectedFormId)
      .then(f => setSchema(JSON.parse(f.schema) as FormSchema))
      .catch(() => setSchemaError(true))
      .finally(() => setLoadingSchema(false));

    // responses
    setLoadingResponses(true);
    supervisionApi.getCampaignResponses(selectedCampaignId, selectedFormId)
      .then(setResponses)
      .finally(() => setLoadingResponses(false));
  }, [selectedFormId, selectedCampaignId]);

  // 依工廠為主體 → 載入彙整資料
  useEffect(() => {
    if (viewMode !== 'factory' || !selectedCampaignId) return;
    setFactoryRegionFilter('');
    setFactorySearch('');
    setLoadingFactorySummary(true);
    supervisionApi.getCampaignFactorySummary(selectedCampaignId)
      .then(setFactorySummary)
      .finally(() => setLoadingFactorySummary(false));
  }, [viewMode, selectedCampaignId]);

  // 可選表單
  const availableForms = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => { if (t.formId) map.set(t.formId, t.formTypeName); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  // 維度選項
  const regions = useMemo(() =>
    [...new Set(responses.map(r => r.region).filter(Boolean) as string[])].sort(), [responses]);
  const agencies = useMemo(() =>
    [...new Set(responses.map(r => r.agencyName))].sort(), [responses]);

  // 篩選後數據
  const filtered = useMemo(() =>
    responses.filter(r => {
      const matchRegion = !regionFilter || r.region === regionFilter;
      const matchAgency = !agencyFilter || r.agencyName === agencyFilter;
      const matchSearch = !search || (
        r.factoryName.toLowerCase().includes(search.toLowerCase()) ||
        r.agencyName.toLowerCase().includes(search.toLowerCase()) ||
        (r.county?.toLowerCase().includes(search.toLowerCase()) ?? false)
      );
      return matchRegion && matchAgency && matchSearch;
    }),
    [responses, regionFilter, agencyFilter, search]);

  // 欄位定義：優先用 schema，失敗時從 data 推導
  const columns = useMemo<ColumnDef[]>(() => {
    if (schema) return schemaToColumns(schema);
    if (responses.length > 0) return dataToColumns(responses);
    return [];
  }, [schema, responses]);

  // 依工廠為主體：轄區選項
  const factoryRegions = useMemo(() =>
    [...new Set((factorySummary?.items ?? []).map(i => i.region).filter(Boolean) as string[])].sort(),
    [factorySummary]);

  // 依工廠為主體：篩選後資料
  const filteredFactoryItems = useMemo(() => {
    const items = factorySummary?.items ?? [];
    return items.filter(i => {
      const matchRegion = !factoryRegionFilter || i.region === factoryRegionFilter;
      const matchSearch = !factorySearch || (
        i.factoryName.toLowerCase().includes(factorySearch.toLowerCase()) ||
        (i.county?.toLowerCase().includes(factorySearch.toLowerCase()) ?? false) ||
        (i.industrialPark?.toLowerCase().includes(factorySearch.toLowerCase()) ?? false)
      );
      return matchRegion && matchSearch;
    });
  }, [factorySummary, factoryRegionFilter, factorySearch]);

  const isLoading = loadingSchema || loadingResponses;

  // 下載單筆報告
  const handleDownloadReport = async (row: SupervisionResponseDto) => {
    if (!schema) return;
    setDownloadingId(row.taskId);
    try {
      const reportField = findDownloadReportField(schema);
      const baseProperties = (reportField?.properties ?? {}) as DownloadReportFieldProperties;

      // 把業者基本資訊做成合成欄位，插入 schema 第一頁
      const metaFields: Field[] = [
        { id: '__m1', type: 'text', name: '__meta_factory',    label: '業者名稱' },
        { id: '__m2', type: 'text', name: '__meta_reg',        label: '統一編號' },
        { id: '__m3', type: 'text', name: '__meta_agency',     label: '督導機關' },
        { id: '__m4', type: 'text', name: '__meta_region',     label: '轄區'     },
        { id: '__m5', type: 'text', name: '__meta_county',     label: '縣市'     },
        { id: '__m6', type: 'text', name: '__meta_submitter',  label: '填寫人'   },
        { id: '__m7', type: 'text', name: '__meta_time',       label: '填寫時間' },
      ];
      const augmentedSchema: FormSchema = {
        ...schema,
        pages: [
          { id: '__meta_page', title: '督導基本資訊', fields: metaFields },
          ...schema.pages,
        ],
      };

      // 對應的值
      const metaValues: Record<string, unknown> = {
        __meta_factory:   row.factoryName,
        __meta_reg:       row.factoryRegistrationNo ?? '',
        __meta_agency:    row.agencyName,
        __meta_region:    row.region ?? '',
        __meta_county:    row.county ?? '',
        __meta_submitter: row.submittedByUsername ?? '',
        __meta_time: row.submittedAt
          ? new Date(row.submittedAt).toLocaleString('zh-TW', {
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit',
            })
          : '',
      };

      const augmentedValues = { ...metaValues, ...(row.data as Record<string, unknown>) };

      const properties: DownloadReportFieldProperties = {
        ...baseProperties,
        coverTitle: `${row.factoryName}\n【${row.formTypeName}】\n督導報告`,
        showDate: true,
      };

      const { generateReport } = await import('@/components/form-fields/report/generateReport');
      await generateReport({ schema: augmentedSchema, values: augmentedValues, properties });
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  // 匯出篩選結果 CSV
  const handleExportCsv = () => {
    const formName = availableForms.find(([id]) => id === selectedFormId)?.[1] ?? '督導成效';
    const date = new Date().toISOString().slice(0, 10);
    exportCsv(filtered, columns, `${formName}_${date}.csv`);
  };

  // 匯出依工廠彙整結果 CSV
  const handleExportFactorySummaryCsv = () => {
    const campaignName = campaigns.find(c => c.id === selectedCampaignId)?.name ?? '督導成效';
    const date = new Date().toISOString().slice(0, 10);
    exportFactorySummaryCsv(
      filteredFactoryItems,
      factorySummary?.formTypeNames ?? [],
      `${campaignName}_依工廠彙整_${date}.csv`,
    );
  };

  return (
    <MainLayout title="督導成效統計">
      <Typography variant="h5" fontWeight="bold" mb={0.5}>督導成效統計</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        查看各表單實際回填的題目與數值，或依工廠為主體彙整各表單的督導結果
      </Typography>

      {/* ── 選擇器列 ── */}
      <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>年度督導計畫</InputLabel>
          <Select
            value={selectedCampaignId}
            label="年度督導計畫"
            onChange={e => setSelectedCampaignId(e.target.value)}
          >
            {campaigns.map(c => (
              <MenuItem key={c.id} value={c.id}>
                {c.year} — {c.name}
                {c.status === 'Active' && <Chip label="進行中" size="small" color="success" sx={{ ml: 1 }} />}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => { if (v) setViewMode(v); }}
        >
          <ToggleButton value="form">
            <FormModeIcon fontSize="small" sx={{ mr: 0.5 }} />
            依表單
          </ToggleButton>
          <ToggleButton value="factory">
            <FactoryModeIcon fontSize="small" sx={{ mr: 0.5 }} />
            依工廠為主體
          </ToggleButton>
        </ToggleButtonGroup>

        {viewMode === 'form' && (
          <FormControl size="small" sx={{ minWidth: 280 }} disabled={loadingTasks || availableForms.length === 0}>
            <InputLabel>選擇表單</InputLabel>
            <Select
              value={selectedFormId}
              label="選擇表單"
              onChange={e => setSelectedFormId(e.target.value)}
            >
              {availableForms.map(([id, name]) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {loadingTasks && viewMode === 'form' && <CircularProgress size={20} />}
      </Stack>

      {viewMode === 'factory' && (
        <>
          {/* 篩選列 */}
          <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="搜尋業者名稱、縣市、園區..."
              value={factorySearch}
              onChange={e => setFactorySearch(e.target.value)}
              sx={{ width: 260 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>轄區</InputLabel>
              <Select value={factoryRegionFilter} label="轄區" onChange={e => setFactoryRegionFilter(e.target.value)}>
                <MenuItem value="">全部轄區</MenuItem>
                {factoryRegions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
            {(factoryRegionFilter || factorySearch) && (
              <Chip
                label="清除篩選"
                size="small"
                onDelete={() => { setFactoryRegionFilter(''); setFactorySearch(''); }}
              />
            )}
            {!loadingFactorySummary && filteredFactoryItems.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CsvIcon fontSize="small" />}
                onClick={handleExportFactorySummaryCsv}
              >
                匯出 CSV
              </Button>
            )}
            {!loadingFactorySummary && factorySummary && (
              <Typography variant="caption" color="text.secondary">
                {filteredFactoryItems.length} 家工廠
                {filteredFactoryItems.length !== factorySummary.items.length && `（共 ${factorySummary.items.length} 家）`}
              </Typography>
            )}
          </Stack>

          {/* 表格 */}
          {loadingFactorySummary ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : filteredFactoryItems.length === 0 ? (
            <Alert severity="info">
              {!factorySummary || factorySummary.items.length === 0
                ? '此計畫尚無工廠資料'
                : '無符合篩選條件的記錄'}
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{
                        fontWeight: 'bold', whiteSpace: 'nowrap',
                        position: 'sticky', left: 0, bgcolor: 'grey.50', zIndex: 2,
                        borderRight: '1px solid', borderColor: 'divider',
                      }}>
                        業者名稱
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>縣市</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>所轄園區</TableCell>
                      {(factorySummary?.formTypeNames ?? []).map(name => (
                        <TableCell key={name} sx={{ fontWeight: 'bold', minWidth: 160 }}>
                          <Tooltip title={name} placement="top">
                            <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 180 }}>
                              {name} 督導結果
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFactoryItems.map(item => (
                      <TableRow key={item.factoryId} hover>
                        <TableCell sx={{
                          position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1,
                          borderRight: '1px solid', borderColor: 'divider',
                        }}>
                          <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 160 }}>
                            {item.factoryName}
                          </Typography>
                          {item.factoryRegistrationNo && (
                            <Typography variant="caption" color="text.secondary">
                              {item.factoryRegistrationNo}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{item.county ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{item.industrialPark ?? '—'}</Typography>
                        </TableCell>
                        {(factorySummary?.formTypeNames ?? []).map(name => {
                          const text = item.results[name] ?? '—';
                          return (
                            <TableCell key={name}>
                              <Chip label={text} size="small" color={resultChipColor(text)} variant="outlined" />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          )}
        </>
      )}

      {viewMode === 'form' && !selectedFormId && !loadingTasks && (
        <Alert severity="info">
          {availableForms.length === 0
            ? '此計畫尚無已綁定表單的督導任務'
            : '請選擇要查看的表單'}
        </Alert>
      )}

      {viewMode === 'form' && selectedFormId && (
        <>
          {schemaError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              無法載入表單定義，改以欄位代碼顯示（選項值無法轉換為中文）
            </Alert>
          )}

          {/* 篩選列 */}
          <Stack direction="row" spacing={2} mb={2} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="搜尋業者名稱、機關、縣市..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ width: 260 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>轄區</InputLabel>
              <Select value={regionFilter} label="轄區" onChange={e => setRegionFilter(e.target.value)}>
                <MenuItem value="">全部轄區</MenuItem>
                {regions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>督導機關</InputLabel>
              <Select value={agencyFilter} label="督導機關" onChange={e => setAgencyFilter(e.target.value)}>
                <MenuItem value="">全部機關</MenuItem>
                {agencies.map(name => <MenuItem key={name} value={name}>{name}</MenuItem>)}
              </Select>
            </FormControl>
            {(regionFilter || agencyFilter || search) && (
              <Chip
                label="清除篩選"
                size="small"
                onDelete={() => { setRegionFilter(''); setAgencyFilter(''); setSearch(''); }}
              />
            )}
            {!isLoading && filtered.length > 0 && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<CsvIcon fontSize="small" />}
                onClick={handleExportCsv}
              >
                匯出 CSV
              </Button>
            )}
            {!isLoading && (
              <Typography variant="caption" color="text.secondary">
                {filtered.length} 筆回填記錄
                {filtered.length !== responses.length && `（共 ${responses.length} 筆）`}
              </Typography>
            )}
          </Stack>

          {/* 表格 */}
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Alert severity="info">
              {responses.length === 0
                ? '此表單尚無已完成的填寫記錄'
                : '無符合篩選條件的記錄'}
            </Alert>
          ) : (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 800 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      {/* 固定欄 */}
                      <TableCell sx={{
                        fontWeight: 'bold', whiteSpace: 'nowrap',
                        position: 'sticky', left: 0, bgcolor: 'grey.50', zIndex: 2,
                        borderRight: '1px solid', borderColor: 'divider',
                      }}>
                        業者名稱
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>督導機關</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>轄區</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>縣市</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>填寫人</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>填寫時間</TableCell>
                      {schema && (
                        <TableCell sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>報告</TableCell>
                      )}
                      {/* 動態題目欄 */}
                      {columns.map(col => (
                        <TableCell key={col.name} sx={{ fontWeight: 'bold', minWidth: 140 }}>
                          <Tooltip title={col.label} placement="top">
                            <Typography variant="body2" fontWeight="bold" noWrap sx={{ maxWidth: 160 }}>
                              {col.label}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map(row => (
                      <TableRow key={row.taskId} hover>
                        {/* 固定欄值 */}
                        <TableCell sx={{
                          position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1,
                          borderRight: '1px solid', borderColor: 'divider',
                        }}>
                          <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 160 }}>
                            {row.factoryName}
                          </Typography>
                          {row.factoryRegistrationNo && (
                            <Typography variant="caption" color="text.secondary">
                              {row.factoryRegistrationNo}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>{row.agencyName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{row.region ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>{row.county ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{row.submittedByUsername ?? '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap>
                            {row.submittedAt
                              ? new Date(row.submittedAt).toLocaleString('zh-TW', {
                                  year: 'numeric', month: '2-digit', day: '2-digit',
                                  hour: '2-digit', minute: '2-digit',
                                })
                              : '—'}
                          </Typography>
                        </TableCell>
                        {schema && (
                          <TableCell>
                            <Tooltip title="下載 PDF 報告">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadReport(row)}
                                  disabled={downloadingId === row.taskId}
                                >
                                  {downloadingId === row.taskId
                                    ? <CircularProgress size={16} />
                                    : <PdfIcon fontSize="small" color="error" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        )}
                        {/* 動態題目值 */}
                        {columns.map(col => {
                          const raw = row.data[col.name];
                          const display = resolveValue(raw, col.field);
                          const isImage = typeof raw === 'string' && raw.startsWith('data:image/');
                          const isLong = display.length > 20;
                          return (
                            <TableCell key={col.name}>
                              <Tooltip
                                title={isImage ? '' : (isLong ? display : '')}
                                placement="top"
                              >
                                <Typography
                                  variant="body2"
                                  noWrap
                                  sx={{
                                    maxWidth: 160,
                                    color: display === '—' ? 'text.disabled' : 'text.primary',
                                    fontStyle: isImage ? 'italic' : 'normal',
                                  }}
                                >
                                  {display}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          )}
        </>
      )}
    </MainLayout>
  );
}

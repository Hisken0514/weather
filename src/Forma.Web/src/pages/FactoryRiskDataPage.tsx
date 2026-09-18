/**
 * FactoryRiskDataPage — 工廠原始資料維護
 * 瀏覽／新增／編輯／刪除個別工廠、個別資料年度的匯入原始資料，跟 Excel 批次匯入互補：
 * 用來排查、補齊、修正單一筆資料，不用重新匯入整份 Excel。
 * 同一家工廠可以有好幾個資料年度各自一筆快照（e.g. 114年、115年都匯入過），
 * 這裡每一列是「一家工廠 × 一個資料年度」，riskInputId 才是真正的識別碼。
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TablePagination,
  Paper, CircularProgress, Alert, AlertTitle, Dialog, DialogTitle, DialogContent,
  DialogActions, Autocomplete, Stack, Tooltip, Skeleton, Checkbox,
  FormControl, InputLabel, Select, MenuItem, Chip, Tabs, Tab,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  ShowChart as TrendIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Remove as FlatIcon,
  InfoOutlined as ZeroFillIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material';
import { MainLayout } from '@/components/layout/MainLayout';
import { factoryRiskApi } from '@/lib/api/factoryRisk';
import { riskScoringApi } from '@/lib/api/riskScoring';
import type { FactoryRiskRawDataDto, UpsertFactoryRiskRawDataRequest, FactoryTrendPointDto, FactoryYearComparisonDto } from '@/types/api/factoryRisk';
import type { SchemeListItem } from '@/types/api/riskScoring';

const OFFICIAL_CHEMICAL_TYPE_NAMES = [
  '氧化性固體',
  '易燃固體',
  '發火性液體、固體及禁水性物質',
  '易燃液體',
  '自反應物質及有機過氧化物',
  '氧化性液體',
  '可燃性高壓氣體',
];

interface IndicatorRow {
  key: string;
  value: string;
}

// 跨資料年度風險值走勢圖用的線條設定，順序決定圖例／tooltip 排列
const TREND_CHART_LINES = [
  { dataKey: 'riskScore', name: '風險值', stroke: '#6366f1', strokeWidth: 2 },
] as const;

function emptyForm(defaultDataYear: number | ''): UpsertFactoryRiskRawDataRequest {
  return {
    dataYear: defaultDataYear === '' ? 0 : defaultDataYear,
    factoryName: '',
    factoryRegistrationNo: null,
    address: null,
    industryCategory: null,
    industrialPark: null,
    region: null,
    county: null,
    maxHazardChemicalTypeName: '',
    maxHazardQuantity: 0,
    maxHazardSubstanceName: null,
    indicatorValues: {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FactoryDialog — 新增 / 編輯單一筆原始資料
// ═══════════════════════════════════════════════════════════════════════════════

interface FactoryDialogProps {
  open: boolean;
  riskInputId: string | null; // null = 新增
  defaultDataYear: number | '';
  canonicalKeyOptions: string[];
  onClose: () => void;
  onSaved: () => void;
}

function FactoryDialog({ open, riskInputId, defaultDataYear, canonicalKeyOptions, onClose, onSaved }: FactoryDialogProps) {
  const [form, setForm] = useState<UpsertFactoryRiskRawDataRequest>(emptyForm(defaultDataYear));
  const [indicatorRows, setIndicatorRows] = useState<IndicatorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (riskInputId) {
      setLoading(true);
      factoryRiskApi.getFactory(riskInputId)
        .then(f => {
          setForm({
            dataYear: f.dataYear,
            factoryName: f.factoryName,
            factoryRegistrationNo: f.factoryRegistrationNo,
            address: f.address,
            industryCategory: f.industryCategory,
            industrialPark: f.industrialPark,
            region: f.region,
            county: f.county,
            maxHazardChemicalTypeName: f.maxHazardChemicalTypeName,
            maxHazardQuantity: f.maxHazardQuantity,
            maxHazardSubstanceName: f.maxHazardSubstanceName,
            indicatorValues: f.indicatorValues,
          });
          setIndicatorRows(Object.entries(f.indicatorValues).map(([key, value]) => ({ key, value: String(value) })));
        })
        .catch((e: unknown) => setError(e instanceof Error ? e.message : '載入資料失敗'))
        .finally(() => setLoading(false));
    } else {
      setForm(emptyForm(defaultDataYear));
      setIndicatorRows([]);
    }
  }, [open, riskInputId, defaultDataYear]);

  function updateForm(patch: Partial<UpsertFactoryRiskRawDataRequest>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function addIndicatorRow() {
    setIndicatorRows(prev => [...prev, { key: '', value: '0' }]);
  }

  function updateIndicatorRow(idx: number, patch: Partial<IndicatorRow>) {
    setIndicatorRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function removeIndicatorRow(idx: number) {
    setIndicatorRows(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError(null);
    if (!form.dataYear || form.dataYear <= 0) {
      setError('資料年度為必填');
      return;
    }
    if (!form.factoryName.trim()) {
      setError('工廠名稱為必填');
      return;
    }
    if (!form.maxHazardChemicalTypeName.trim()) {
      setError('最大危害化學品類型為必填');
      return;
    }
    const indicatorValues: Record<string, number> = {};
    for (const row of indicatorRows) {
      if (!row.key.trim()) continue;
      const num = Number(row.value);
      if (Number.isNaN(num)) {
        setError(`指標「${row.key}」的值不是有效數字`);
        return;
      }
      indicatorValues[row.key] = num;
    }

    setSaving(true);
    try {
      const payload: UpsertFactoryRiskRawDataRequest = { ...form, indicatorValues };
      if (riskInputId) {
        await factoryRiskApi.updateFactory(riskInputId, payload);
      } else {
        await factoryRiskApi.createFactory(payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>{riskInputId ? '編輯原始資料' : '新增原始資料'}</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : (
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              size="small" label="資料年度" type="number" required
              helperText="這筆資料代表哪一年度的原始資料，跟套用哪個評分標準是兩件事"
              value={form.dataYear || ''}
              onChange={e => updateForm({ dataYear: e.target.value === '' ? 0 : Number(e.target.value) })}
              sx={{ width: 200 }}
            />

            <TextField size="small" label="工廠名稱" required fullWidth
              value={form.factoryName} onChange={e => updateForm({ factoryName: e.target.value })} />
            <TextField size="small" label="工廠登記編號（選填）" fullWidth
              value={form.factoryRegistrationNo ?? ''} onChange={e => updateForm({ factoryRegistrationNo: e.target.value || null })} />
            <TextField size="small" label="地址" fullWidth
              value={form.address ?? ''} onChange={e => updateForm({ address: e.target.value || null })} />

            <Box display="flex" gap={2}>
              <TextField size="small" label="產業類別" fullWidth
                value={form.industryCategory ?? ''} onChange={e => updateForm({ industryCategory: e.target.value || null })} />
              <TextField size="small" label="產業園區" fullWidth
                value={form.industrialPark ?? ''} onChange={e => updateForm({ industrialPark: e.target.value || null })} />
            </Box>
            <Box display="flex" gap={2}>
              <TextField size="small" label="轄區" fullWidth
                value={form.region ?? ''} onChange={e => updateForm({ region: e.target.value || null })} />
              <TextField size="small" label="縣市" fullWidth
                value={form.county ?? ''} onChange={e => updateForm({ county: e.target.value || null })} />
            </Box>

            <Autocomplete
              freeSolo
              size="small"
              options={OFFICIAL_CHEMICAL_TYPE_NAMES}
              value={form.maxHazardChemicalTypeName}
              onInputChange={(_, value) => updateForm({ maxHazardChemicalTypeName: value })}
              renderInput={(params) => <TextField {...params} label="最大危害化學品類型" required />}
            />
            <Box display="flex" gap={2}>
              <TextField size="small" label="最大使用量" type="number" fullWidth
                value={form.maxHazardQuantity}
                onChange={e => updateForm({ maxHazardQuantity: e.target.value === '' ? 0 : Number(e.target.value) })} />
              <TextField size="small" label="最大使用量物質名稱（選填）" fullWidth
                value={form.maxHazardSubstanceName ?? ''} onChange={e => updateForm({ maxHazardSubstanceName: e.target.value || null })} />
            </Box>

            <Typography variant="subtitle2" fontWeight={600} mt={1}>指標值</Typography>
            {indicatorRows.map((row, idx) => (
              <Box key={idx} display="flex" gap={1} alignItems="center">
                <Autocomplete
                  freeSolo
                  size="small"
                  fullWidth
                  options={canonicalKeyOptions}
                  value={row.key}
                  onInputChange={(_, value) => updateIndicatorRow(idx, { key: value })}
                  renderInput={(params) => <TextField {...params} label="對應資料欄位" />}
                />
                <TextField
                  size="small" label="值" type="number" sx={{ width: 120 }}
                  value={row.value}
                  onChange={e => updateIndicatorRow(idx, { value: e.target.value })}
                />
                <IconButton size="small" color="error" onClick={() => removeIndicatorRow(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addIndicatorRow} sx={{ alignSelf: 'flex-start' }}>
              新增指標值
            </Button>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
          {saving ? <CircularProgress size={20} /> : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TrendDialog — 單廠跨資料年度風險值走勢
// ═══════════════════════════════════════════════════════════════════════════════

interface TrendDialogProps {
  open: boolean;
  factoryId: string | null;
  schemes: SchemeListItem[];
  onClose: () => void;
}

function TrendPointRow({ point, prevScore }: { point: FactoryTrendPointDto; prevScore: number | null }) {
  let trend: 'up' | 'down' | 'flat' | null = null;
  if (point.success && point.riskScore != null && prevScore != null) {
    if (point.riskScore > prevScore) trend = 'up';
    else if (point.riskScore < prevScore) trend = 'down';
    else trend = 'flat';
  }

  return (
    <TableRow>
      <TableCell>{point.dataYear}</TableCell>
      <TableCell>{point.schemeYear != null ? `${point.schemeYear}年標準` : '—'}</TableCell>
      <TableCell align="right">
        {point.success ? (
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
            {trend === 'up' && <UpIcon fontSize="small" color="error" />}
            {trend === 'down' && <DownIcon fontSize="small" color="success" />}
            {trend === 'flat' && <FlatIcon fontSize="small" color="disabled" />}
            <Typography variant="body2" fontWeight={700}>{point.riskScore}</Typography>
          </Box>
        ) : '—'}
      </TableCell>
      <TableCell align="right">{point.success ? point.hazardSeverityScore : '—'}</TableCell>
      <TableCell align="right">{point.success ? point.managementRiskScore : '—'}</TableCell>
      <TableCell>
        {point.success ? (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Chip label="成功" size="small" color="success" variant="outlined" />
            {point.zeroFillNotes.length > 0 && (
              <Tooltip title={point.zeroFillNotes.join('；')}>
                <ZeroFillIcon fontSize="small" color="warning" />
              </Tooltip>
            )}
          </Box>
        ) : (
          <Tooltip title={point.reason ?? ''}><Chip label="無法計算" size="small" color="warning" variant="outlined" /></Tooltip>
        )}
      </TableCell>
    </TableRow>
  );
}

function TrendDialog({ open, factoryId, schemes, onClose }: TrendDialogProps) {
  const [fixedSchemeId, setFixedSchemeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [factoryName, setFactoryName] = useState('');
  const [points, setPoints] = useState<FactoryTrendPointDto[]>([]);

  const loadTrend = () => {
    if (!open || !factoryId) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await factoryRiskApi.getFactoryTrend(factoryId, fixedSchemeId || undefined);
        setFactoryName(res.factoryName);
        setPoints(res.points);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '載入趨勢失敗');
      } finally {
        setLoading(false);
      }
    };
    void run();
  };

  useEffect(() => {
    if (!open) {
      setFactoryName('');
      setPoints([]);
      setError(null);
      setFixedSchemeId('');
    }
  }, [open]);

  useEffect(loadTrend, [factoryId, fixedSchemeId]);

  // 按資料年度排序後給折線圖用；算分失敗的年度用 null 讓線在那個點斷開，不要跟前後年度誤接成一直線
  const chartData = useMemo(() => {
    return [...points]
      .sort((a, b) => a.dataYear - b.dataYear)
      .map(p => ({
        dataYear: String(p.dataYear),
        riskScore: p.success ? p.riskScore : null,
      }));
  }, [points]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{factoryName || '工廠'}風險值趨勢</DialogTitle>
      <DialogContent dividers>
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>套用標準</InputLabel>
          <Select value={fixedSchemeId} label="套用標準" onChange={e => setFixedSchemeId(e.target.value)}>
            <MenuItem value="">每個年度套用自己年度的標準</MenuItem>
            {schemes.map(s => (
              <MenuItem key={s.id} value={s.id}>固定套用：{s.year} 年・{s.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={loadTrend}>重試</Button>}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : points.length === 0 ? (
          <Alert severity="info">這家工廠沒有任何資料年度可以比較</Alert>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>資料年度</TableCell>
                <TableCell>套用的標準</TableCell>
                <TableCell align="right">風險值</TableCell>
                <TableCell align="right">危害嚴重度</TableCell>
                <TableCell align="right">危害發生機率</TableCell>
                <TableCell>狀態</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {points.map((p, idx) => (
                <TrendPointRow
                  key={p.dataYear}
                  point={p}
                  prevScore={idx > 0 && points[idx - 1].success ? points[idx - 1].riskScore : null}
                />
              ))}
            </TableBody>
          </Table>
        )}

        {!loading && points.length > 0 && (
          <Box mt={3}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={600}>風險值走勢圖</Typography>
              <Stack direction="row" spacing={1.5}>
                {TREND_CHART_LINES.map(l => (
                  <Box key={l.dataKey} display="flex" alignItems="center" gap={0.5}>
                    <Box sx={{ width: 10, height: 2, bgcolor: l.stroke, borderRadius: 1 }} />
                    <Typography variant="caption" color="text.secondary">{l.name}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
            <Box sx={{ height: 280, bgcolor: 'grey.50', border: 1, borderColor: 'divider', borderRadius: 1, pt: 2, pr: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="dataYear" tick={{ fontSize: 11 }} tickMargin={8} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} width={36} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    isAnimationActive={false}
                    cursor={{ stroke: '#d1d5db', strokeWidth: 1, strokeDasharray: '3 3' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload || payload.length === 0) return null;
                      return (
                        <Paper variant="outlined" sx={{ px: 1.5, py: 1, fontSize: 12 }}>
                          <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>{label} 年</Typography>
                          {payload.map(entry => (
                            <Typography key={entry.dataKey as string} variant="caption" display="block" sx={{ color: entry.color }}>
                              {entry.name}：{entry.value == null ? '無資料' : entry.value}
                            </Typography>
                          ))}
                        </Paper>
                      );
                    }}
                  />
                  {TREND_CHART_LINES.map(l => (
                    <Line
                      key={l.dataKey}
                      type="monotone" dataKey={l.dataKey} name={l.name}
                      stroke={l.stroke} strokeWidth={l.strokeWidth}
                      dot={{ r: 3, stroke: l.stroke, strokeWidth: 1, fill: '#fff' }}
                      activeDot={{ r: 4.5 }} connectNulls={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// YearComparisonDialog — 比較兩個資料年度的工廠名單差異
// ═══════════════════════════════════════════════════════════════════════════════

interface YearComparisonDialogProps {
  open: boolean;
  availableYears: number[];
  onClose: () => void;
}

function YearComparisonDialog({ open, availableYears, onClose }: YearComparisonDialogProps) {
  const [year1, setYear1] = useState<number | ''>('');
  const [year2, setYear2] = useState<number | ''>('');
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FactoryYearComparisonDto | null>(null);

  // 對話框開啟時，預設帶入最新的兩個資料年度（沒選過的時候才帶，不要覆蓋使用者已經選的年度）
  useEffect(() => {
    if (!open) return;
    const applyDefaults = () => {
      setYear1(prev => prev !== '' ? prev : (availableYears[1] ?? availableYears[0] ?? ''));
      setYear2(prev => prev !== '' ? prev : (availableYears[0] ?? ''));
    };
    applyDefaults();
  }, [open, availableYears]);

  const loadComparison = useCallback(() => {
    if (!open || year1 === '' || year2 === '') return;
    const run = async () => {
      if (year1 === year2) {
        setError('請選擇兩個不同的資料年度');
        setResult(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await factoryRiskApi.compareYears(year1, year2);
        setResult(res);
        setTab(0);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : '載入比較結果失敗');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [open, year1, year2]);

  useEffect(loadComparison, [loadComparison]);

  const lists = result ? [
    { label: `兩年度都有（${result.bothYears.length}）`, items: result.bothYears },
    { label: `只有 ${result.year1} 年有（${result.onlyYear1.length}）`, items: result.onlyYear1 },
    { label: `只有 ${result.year2} 年有（${result.onlyYear2.length}）`, items: result.onlyYear2 },
  ] : [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle>年度比較統計</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" gap={2} mb={2}>
          <FormControl size="small" fullWidth>
            <InputLabel>年度 A</InputLabel>
            <Select value={year1} label="年度 A" onChange={e => setYear1(e.target.value as number)}>
              {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>年度 B</InputLabel>
            <Select value={year2} label="年度 B" onChange={e => setYear2(e.target.value as number)}>
              {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
        ) : result && (
          <>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              <Chip label={`${result.year1} 年共 ${result.year1Count} 家`} size="small" />
              <Chip label={`${result.year2} 年共 ${result.year2Count} 家`} size="small" />
              <Chip label={`重複：${result.bothYears.length} 家`} size="small" color="default" variant="outlined" />
              <Chip label={`只有 ${result.year1} 年有：${result.onlyYear1.length} 家`} size="small" color="warning" variant="outlined" />
              <Chip label={`只有 ${result.year2} 年有：${result.onlyYear2.length} 家`} size="small" color="info" variant="outlined" />
            </Box>

            <Tabs value={tab} onChange={(_, v: number) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ minHeight: 36, mb: 1 }}>
              {lists.map((l, idx) => <Tab key={idx} label={l.label} sx={{ minHeight: 36, py: 0.5 }} />)}
            </Tabs>

            <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {lists[tab].items.length === 0 ? (
                <Typography variant="body2" color="text.secondary" py={3} textAlign="center">沒有工廠</Typography>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>工廠名稱</TableCell>
                      <TableCell>登記編號</TableCell>
                      <TableCell>縣市</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lists[tab].items.map(f => (
                      <TableRow key={f.factoryId}>
                        <TableCell>{f.factoryName}</TableCell>
                        <TableCell>{f.factoryRegistrationNo ?? '—'}</TableCell>
                        <TableCell>{f.county ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page
// ═══════════════════════════════════════════════════════════════════════════════

export function FactoryRiskDataPage() {
  const [items, setItems] = useState<FactoryRiskRawDataDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0); // 0-indexed for MUI TablePagination
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [canonicalKeyOptions, setCanonicalKeyOptions] = useState<string[]>([]);
  const [schemes, setSchemes] = useState<SchemeListItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRiskInputId, setEditingRiskInputId] = useState<string | null>(null);
  const [deletingFactory, setDeletingFactory] = useState<FactoryRiskRawDataDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [trendFactoryId, setTrendFactoryId] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const loadFactories = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    factoryRiskApi.getFactories({ page: page + 1, pageSize, search, dataYear: yearFilter || undefined })
      .then(res => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : '載入工廠資料失敗'))
      .finally(() => setLoading(false));
  }, [page, pageSize, search, yearFilter]);

  useEffect(loadFactories, [loadFactories]);

  const loadAvailableYears = useCallback(() => {
    factoryRiskApi.getAvailableDataYears().then(setAvailableYears);
  }, []);

  useEffect(loadAvailableYears, [loadAvailableYears]);

  // 換頁／搜尋／年度篩選時清空選取，避免誤刪不在畫面上的資料
  useEffect(() => { setSelected(new Set()); }, [page, pageSize, search, yearFilter]);

  function toggleSelect(riskInputId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(riskInputId)) next.delete(riskInputId);
      else next.add(riskInputId);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelected(prev => {
      const allSelected = items.length > 0 && items.every(f => prev.has(f.riskInputId));
      if (allSelected) return new Set();
      return new Set(items.map(f => f.riskInputId));
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await factoryRiskApi.bulkDeleteFactories([...selected]);
      setSelected(new Set());
      setBulkDeleteOpen(false);
      loadFactories();
      loadAvailableYears();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : '批次刪除失敗');
    } finally {
      setBulkDeleting(false);
    }
  }

  // 「全部刪除」不管目前搜尋／年度篩選是什麼，一律刪光資料庫裡所有資料，所以確認對話框要
  // 顯示真正未篩選的總數，不能用列表目前顯示的 total（那個會被篩選條件影響，數字對不上）
  const [trueTotal, setTrueTotal] = useState<number | null>(null);

  function openDeleteAllDialog() {
    setTrueTotal(null);
    setDeleteAllOpen(true);
    factoryRiskApi.getFactories({ page: 1, pageSize: 1 }).then(res => setTrueTotal(res.total));
  }

  async function handleDeleteAll() {
    setDeletingAll(true);
    try {
      await factoryRiskApi.deleteAllFactories();
      setSelected(new Set());
      setDeleteAllOpen(false);
      setSearch('');
      setYearFilter('');
      setPage(0);
      loadFactories();
      loadAvailableYears();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : '全部刪除失敗');
    } finally {
      setDeletingAll(false);
    }
  }

  useEffect(() => {
    riskScoringApi.getIndicatorCanonicalKeys().then(setCanonicalKeyOptions);
    riskScoringApi.getSchemes().then(setSchemes);
  }, []);

  function handleAdd() {
    setEditingRiskInputId(null);
    setDialogOpen(true);
  }

  function handleEdit(riskInputId: string) {
    setEditingRiskInputId(riskInputId);
    setDialogOpen(true);
  }

  function handleSaved() {
    loadFactories();
    loadAvailableYears();
  }

  async function handleConfirmDelete() {
    if (!deletingFactory) return;
    setDeleting(true);
    try {
      await factoryRiskApi.deleteFactory(deletingFactory.riskInputId);
      setDeletingFactory(null);
      loadFactories();
      loadAvailableYears();
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : '刪除失敗');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <MainLayout title="工廠原始資料維護">
      <Typography variant="h5" fontWeight="bold" mb={0.5}>工廠原始資料維護</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        瀏覽／新增／編輯／刪除個別工廠、個別資料年度的匯入原始資料，跟 Excel 批次匯入互補
      </Typography>

      <Box display="flex" gap={2} mb={3} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          placeholder="搜尋工廠名稱、登記編號..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          sx={{ width: 260 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>資料年度</InputLabel>
          <Select
            value={yearFilter}
            label="資料年度"
            onChange={e => { setYearFilter(e.target.value as number | ''); setPage(0); }}
          >
            <MenuItem value="">全部年度</MenuItem>
            {availableYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          新增資料
        </Button>
        <Button
          variant="outlined" startIcon={<CompareIcon />}
          onClick={() => setComparisonOpen(true)}
          disabled={availableYears.length < 2}
        >
          年度比較統計
        </Button>
        {selected.size > 0 && (
          <Button
            variant="outlined" color="error" startIcon={<DeleteIcon />}
            onClick={() => setBulkDeleteOpen(true)}
          >
            刪除已選取（{selected.size}）
          </Button>
        )}
        <Button
          variant="outlined" color="error" startIcon={<DeleteSweepIcon />}
          onClick={openDeleteAllDialog}
          disabled={total === 0}
        >
          全部刪除
        </Button>
        {!loading && (
          <Typography variant="caption" color="text.secondary">共 {total} 筆</Typography>
        )}
      </Box>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    indeterminate={selected.size > 0 && !items.every(f => selected.has(f.riskInputId))}
                    checked={items.length > 0 && items.every(f => selected.has(f.riskInputId))}
                    onChange={toggleSelectAllOnPage}
                    disabled={items.length === 0}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>資料年度</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>工廠名稱</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>登記編號</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>縣市</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>產業園區</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>最大危害化學品類型</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">最大使用量</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ color: 'text.secondary', py: 4 }}>
                    尚無工廠資料
                  </TableCell>
                </TableRow>
              ) : (
                items.map(f => (
                  <TableRow key={f.riskInputId} hover selected={selected.has(f.riskInputId)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        size="small"
                        checked={selected.has(f.riskInputId)}
                        onChange={() => toggleSelect(f.riskInputId)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={f.dataYear} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">{f.factoryName}</Typography>
                    </TableCell>
                    <TableCell>{f.factoryRegistrationNo ?? '—'}</TableCell>
                    <TableCell>{f.county ?? '—'}</TableCell>
                    <TableCell>{f.industrialPark ?? '—'}</TableCell>
                    <TableCell>{f.maxHazardChemicalTypeName}</TableCell>
                    <TableCell align="right">{f.maxHazardQuantity.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="跨年度趨勢">
                        <IconButton size="small" onClick={() => setTrendFactoryId(f.factoryId)}>
                          <TrendIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="編輯">
                        <IconButton size="small" onClick={() => handleEdit(f.riskInputId)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="刪除">
                        <IconButton size="small" color="error" onClick={() => setDeletingFactory(f)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100, 200]}
          labelRowsPerPage="每頁筆數"
          labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
        />
      </Paper>

      <FactoryDialog
        open={dialogOpen}
        riskInputId={editingRiskInputId}
        defaultDataYear={yearFilter}
        canonicalKeyOptions={canonicalKeyOptions}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
      />

      <TrendDialog
        open={!!trendFactoryId}
        factoryId={trendFactoryId}
        schemes={schemes}
        onClose={() => setTrendFactoryId(null)}
      />

      <YearComparisonDialog
        open={comparisonOpen}
        availableYears={availableYears}
        onClose={() => setComparisonOpen(false)}
      />

      <Dialog open={!!deletingFactory} onClose={() => setDeletingFactory(null)}>
        <DialogTitle>確定要刪除這筆原始資料？</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            將刪除「{deletingFactory?.factoryName}」{deletingFactory?.dataYear} 年度的原始資料（含所有指標值），此動作無法復原。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingFactory(null)} disabled={deleting}>取消</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} disabled={deleting}>
            {deleting ? <CircularProgress size={20} /> : '刪除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={bulkDeleteOpen} onClose={() => setBulkDeleteOpen(false)}>
        <DialogTitle>確定要刪除已選取的 {selected.size} 筆資料？</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            將刪除這 {selected.size} 筆原始資料（含所有指標值），此動作無法復原。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>取消</Button>
          <Button variant="contained" color="error" onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? <CircularProgress size={20} /> : '刪除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteAllOpen} onClose={() => setDeleteAllOpen(false)}>
        <DialogTitle>確定要刪除全部工廠原始資料？</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>此動作無法復原</AlertTitle>
            {trueTotal === null ? (
              <Box display="flex" alignItems="center" gap={1}><CircularProgress size={16} />正在確認實際筆數...</Box>
            ) : (
              <>將刪除資料庫裡「全部」共 {trueTotal} 筆原始資料（含所有年度、所有指標值），不受目前搜尋／年度篩選影響。刪除後要重新匯入 Excel 才能恢復。</>
            )}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllOpen(false)} disabled={deletingAll}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDeleteAll} disabled={deletingAll || trueTotal === null}>
            {deletingAll ? <CircularProgress size={20} /> : `確定刪除全部${trueTotal !== null ? ` ${trueTotal} 筆` : ''}`}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}

export default FactoryRiskDataPage;

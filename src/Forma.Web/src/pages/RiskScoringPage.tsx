import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Chip, Alert, CircularProgress,
  Accordion, AccordionSummary, AccordionDetails, Select, MenuItem,
  FormControl, InputLabel, Divider, Paper, Stack, Autocomplete,
  Checkbox, FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  CheckCircle as ActivateIcon,
  ExpandMore as ExpandMoreIcon,
  Calculate as CalcIcon,
  Science as ScienceIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MainLayout } from '@/components/layout/MainLayout';
import { RISK_COLOR, RISK_LABEL, type RiskLevel } from '@/components/hazmat-map/hazmatTypes';
import { riskScoringApi } from '@/lib/api/riskScoring';
import type {
  SchemeListItem,
  SchemeDetail,
  CreateSchemeRequest,
  CreateIndicatorDefinitionRequest,
  CreateChemicalTypeDefinitionRequest,
  CreateBandRequest,
  CreateHazardTypeLevelRequest,
  CreateQuantityThresholdRequest,
  BandDto,
  RiskIndicatorCategory,
  IndicatorValueInput,
  RiskCalculationResult,
} from '@/types/api/riskScoring';

// ─── 風險分數顏色（沿用 hazmat-map 的共用等級定義） ────────────────────────────

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 500) return 'high';
  if (score >= 200) return 'medium';
  if (score >= 100) return 'mediumLow';
  return 'low';
}

function riskColor(score: number): string {
  return RISK_COLOR[riskLevelFromScore(score)];
}

function riskLabel(score: number): string {
  return RISK_LABEL[riskLevelFromScore(score)];
}

const CATEGORY_LABELS: Record<RiskIndicatorCategory, string> = {
  Severity: '危害嚴重度',
  Probability: '危害發生機率',
};

/**
 * 公共危險物品法規固定的六大類＋可燃性高壓氣體分類。這是政府報表「工危品最大使用量
 * 之種類」欄位的固定分類，匯入資料時的化學品類型一定是這 7 個名稱之一，不會因年度
 * 改變。年度標準如果把其中幾個合併成同一個危害性等級／使用量級距（e.g. 115年把
 * 「易燃固體」「易燃液體」合併），就在「對應政府分類」多選裡勾選對應的名稱。
 */
const OFFICIAL_CHEMICAL_TYPE_NAMES = [
  '氧化性固體',
  '易燃固體',
  '發火性液體、固體及禁水性物質',
  '易燃液體',
  '自反應物質及有機過氧化物',
  '氧化性液體',
  '可燃性高壓氣體',
];

/** 離散型指標：每個級距都是 minValue===maxValue 且都有 Label，計算機才渲染成下拉選單。 */
function discreteBandsFor(indicatorId: string, bands: BandDto[]): BandDto[] | null {
  const rows = bands.filter(b => b.indicatorId === indicatorId);
  if (rows.length > 0 && rows.every(b => b.minValue != null && b.minValue === b.maxValue && b.label)) {
    return [...rows].sort((a, b) => (a.minValue ?? 0) - (b.minValue ?? 0));
  }
  return null;
}

function newId(): string {
  return crypto.randomUUID();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SortableIndicatorRow / SortableChemicalTypeRow — 指標／化學品類型管理的可拖曳列
// ═══════════════════════════════════════════════════════════════════════════════

interface SortableIndicatorRowProps {
  indicator: CreateIndicatorDefinitionRequest;
  canonicalKeyOptions: string[];
  onUpdate: (id: string, patch: Partial<CreateIndicatorDefinitionRequest>) => void;
  onDelete: (id: string) => void;
}

function SortableIndicatorRow({ indicator, canonicalKeyOptions, onUpdate, onDelete }: SortableIndicatorRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: indicator.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Box ref={setNodeRef} style={style} sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1, p: 1,
      border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', mb: 1,
    }}>
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: 'text.disabled', mt: 1, '&:active': { cursor: 'grabbing' } }}>
        <DragIcon fontSize="small" />
      </Box>
      <Stack spacing={1} sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small" label="指標名稱" fullWidth
            value={indicator.name}
            onChange={e => onUpdate(indicator.id, { name: e.target.value })}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>計分分類</InputLabel>
            <Select
              label="計分分類"
              value={indicator.category}
              onChange={e => onUpdate(indicator.id, { category: e.target.value as RiskIndicatorCategory })}
            >
              <MenuItem value="Severity">危害嚴重度</MenuItem>
              <MenuItem value="Probability">危害發生機率</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small" label="權重" type="number"
            inputProps={{ min: 1 }}
            value={indicator.weight}
            onChange={e => onUpdate(indicator.id, { weight: e.target.value === '' ? 1 : Number(e.target.value) })}
            sx={{ width: 90 }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Autocomplete
            freeSolo
            size="small"
            fullWidth
            options={canonicalKeyOptions}
            value={indicator.canonicalKey}
            onInputChange={(_, value) => onUpdate(indicator.id, { canonicalKey: value })}
            renderInput={(params) => (
              <TextField
                {...params}
                label="對應資料欄位"
                required
                error={!indicator.canonicalKey}
                helperText="決定跨年度改名後，全台工廠風險排名還能不能吃到同一批匯入資料；選既有欄位或輸入新的"
              />
            )}
          />
          <Tooltip title="預設空白 = 沒有這筆資料，套用需要這個指標的公式時該工廠會被標記資料不完整、不列入排名。像事故通報件數、有沒有列入某份名單這種欄位，空白本身就是有意義的資料（沒發生過／沒被列入），這種請勾選。">
            <FormControlLabel
              sx={{ whiteSpace: 'nowrap', ml: 0 }}
              control={
                <Checkbox
                  size="small"
                  checked={indicator.treatMissingAsZero}
                  onChange={e => onUpdate(indicator.id, { treatMissingAsZero: e.target.checked })}
                />
              }
              label="缺值視為0"
            />
          </Tooltip>
        </Box>
        <TextField
          size="small" label="說明（選填，顯示在試算表單的欄位提示）" fullWidth
          value={indicator.description ?? ''}
          onChange={e => onUpdate(indicator.id, { description: e.target.value || null })}
        />
      </Stack>
      <IconButton size="small" color="error" onClick={() => onDelete(indicator.id)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

interface SortableChemicalTypeRowProps {
  chemicalType: CreateChemicalTypeDefinitionRequest;
  onUpdate: (id: string, patch: Partial<CreateChemicalTypeDefinitionRequest>) => void;
  onDelete: (id: string) => void;
}

function SortableChemicalTypeRow({ chemicalType, onUpdate, onDelete }: SortableChemicalTypeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: chemicalType.id });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <Box ref={setNodeRef} style={style} sx={{
      display: 'flex', alignItems: 'center', gap: 1, p: 1,
      border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', mb: 1,
    }}>
      <Box {...attributes} {...listeners} sx={{ cursor: 'grab', color: 'text.disabled', '&:active': { cursor: 'grabbing' } }}>
        <DragIcon fontSize="small" />
      </Box>
      <TextField
        size="small" label="化學品類型名稱" fullWidth
        value={chemicalType.name}
        onChange={e => onUpdate(chemicalType.id, { name: e.target.value })}
      />
      <Tooltip title="這個類型對應哪些政府原始分類，匯入資料依這裡的選擇比對。空白（預設）代表直接用左邊的名稱本身比對；要把多個政府分類合併成同一個危害性等級／使用量級距時（e.g. 易燃固體＋易燃液體），把它們都勾選在同一個類型底下。">
        <Autocomplete
          multiple
          size="small"
          fullWidth
          sx={{ minWidth: 280 }}
          options={OFFICIAL_CHEMICAL_TYPE_NAMES}
          value={chemicalType.memberNames}
          onChange={(_, value) => onUpdate(chemicalType.id, { memberNames: value })}
          renderInput={(params) => <TextField {...params} label="對應政府分類（選填，合併多類時用）" />}
        />
      </Tooltip>
      <IconButton size="small" color="error" onClick={() => onDelete(chemicalType.id)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SchemeDialog — 新增 / 編輯評分標準
// ═══════════════════════════════════════════════════════════════════════════════

interface SchemeDialogProps {
  open: boolean;
  editing: SchemeDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

function SchemeDialog({ open, editing, onClose, onSaved }: SchemeDialogProps) {
  const [year, setYear] = useState(115);
  const [name, setName] = useState('');
  const [indicators, setIndicators] = useState<CreateIndicatorDefinitionRequest[]>([]);
  const [chemicalTypes, setChemicalTypes] = useState<CreateChemicalTypeDefinitionRequest[]>([]);
  const [bands, setBands] = useState<CreateBandRequest[]>([]);
  const [hazardLevels, setHazardLevels] = useState<CreateHazardTypeLevelRequest[]>([]);
  const [qtyThresholds, setQtyThresholds] = useState<CreateQuantityThresholdRequest[]>([]);
  const [matrixWeight, setMatrixWeight] = useState(1);
  const [canonicalKeyOptions, setCanonicalKeyOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!open) return;
    riskScoringApi.getIndicatorCanonicalKeys().then(setCanonicalKeyOptions);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setYear(editing.year);
      setName(editing.name);
      setIndicators(editing.indicators.map(i => ({ id: i.id, name: i.name, category: i.category, description: i.description, displayOrder: i.displayOrder, weight: i.weight, canonicalKey: i.canonicalKey, treatMissingAsZero: i.treatMissingAsZero })));
      setChemicalTypes(editing.chemicalTypes.map(c => ({ id: c.id, name: c.name, displayOrder: c.displayOrder, memberNames: c.memberNames })));
      setBands(editing.bands.map(b => ({ indicatorId: b.indicatorId, minValue: b.minValue, maxValue: b.maxValue, score: b.score, label: b.label })));
      setHazardLevels(editing.hazardTypeLevels.map(h => ({ chemicalTypeId: h.chemicalTypeId, hazardLevel: h.hazardLevel })));
      setQtyThresholds(editing.quantityThresholds.map(q => ({ chemicalTypeId: q.chemicalTypeId, level: q.level, minQuantity: q.minQuantity, maxQuantity: q.maxQuantity })));
      setMatrixWeight(editing.hazardQuantityMatrixWeight);
    } else {
      setYear(115);
      setName('');
      setIndicators([]);
      setChemicalTypes([]);
      setBands([]);
      setHazardLevels([]);
      setQtyThresholds([]);
      setMatrixWeight(1);
    }
    setError(null);
  }, [open, editing]);

  // ── 指標管理 ─────────────────────────────────────────────────────────────
  function addIndicator() {
    const id = newId();
    const name = `新指標${indicators.length + 1}`;
    // 對應資料欄位預設跟指標名稱一樣，維持好懂；改名時只要沒手動改過對應資料欄位就跟著同步
    setIndicators(prev => [...prev, { id, name, category: 'Severity', description: null, displayOrder: prev.length, weight: 1, canonicalKey: name, treatMissingAsZero: false }]);
  }

  function updateIndicator(id: string, patch: Partial<CreateIndicatorDefinitionRequest>) {
    setIndicators(prev => prev.map(i => {
      if (i.id !== id) return i;
      // 名稱變動時，若對應資料欄位還沒被手動改過（跟舊名稱一樣），一併同步成新名稱
      if (patch.name !== undefined && patch.name !== i.name && i.canonicalKey === i.name) {
        return { ...i, ...patch, canonicalKey: patch.name };
      }
      return { ...i, ...patch };
    }));
  }

  function removeIndicator(id: string) {
    setIndicators(prev => prev.filter(i => i.id !== id));
    setBands(prev => prev.filter(b => b.indicatorId !== id));
  }

  function handleIndicatorDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setIndicators(prev => {
      const oldIndex = prev.findIndex(i => i.id === active.id);
      const newIndex = prev.findIndex(i => i.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((i, idx) => ({ ...i, displayOrder: idx }));
    });
  }

  // ── 化學品類型管理 ────────────────────────────────────────────────────────
  function addChemicalType() {
    const id = newId();
    setChemicalTypes(prev => [...prev, { id, name: `新化學品類型${prev.length + 1}`, displayOrder: prev.length, memberNames: [] }]);
    setHazardLevels(prev => [...prev, { chemicalTypeId: id, hazardLevel: 1 }]);
  }

  function updateChemicalType(id: string, patch: Partial<CreateChemicalTypeDefinitionRequest>) {
    setChemicalTypes(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  function removeChemicalType(id: string) {
    setChemicalTypes(prev => prev.filter(c => c.id !== id));
    setHazardLevels(prev => prev.filter(h => h.chemicalTypeId !== id));
    setQtyThresholds(prev => prev.filter(q => q.chemicalTypeId !== id));
  }

  function handleChemicalTypeDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setChemicalTypes(prev => {
      const oldIndex = prev.findIndex(c => c.id === active.id);
      const newIndex = prev.findIndex(c => c.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((c, idx) => ({ ...c, displayOrder: idx }));
    });
  }

  // ── 分段計分規則 ─────────────────────────────────────────────────────────
  function updateBand(idx: number, field: keyof CreateBandRequest, value: string) {
    setBands(prev => {
      const next = [...prev];
      if (field === 'label') {
        next[idx] = { ...next[idx], label: value || null };
      } else {
        const parsed = value === '' ? null : Number(value);
        next[idx] = { ...next[idx], [field]: parsed } as CreateBandRequest;
      }
      return next;
    });
  }

  function addBand(indicatorId: string) {
    setBands(prev => [...prev, { indicatorId, minValue: null, maxValue: null, score: 0, label: null }]);
  }

  function removeBand(idx: number) {
    setBands(prev => prev.filter((_, i) => i !== idx));
  }

  // ── 危害性等級 ───────────────────────────────────────────────────────────
  function updateHazardLevel(chemicalTypeId: string, value: number) {
    setHazardLevels(prev => prev.map(h =>
      h.chemicalTypeId === chemicalTypeId ? { ...h, hazardLevel: value } : h
    ));
  }

  // ── 使用量級距 ───────────────────────────────────────────────────────────
  function updateQtyThreshold(idx: number, field: keyof CreateQuantityThresholdRequest, value: string) {
    setQtyThresholds(prev => {
      const next = [...prev];
      const parsed = value === '' ? null : Number(value);
      next[idx] = { ...next[idx], [field]: parsed } as CreateQuantityThresholdRequest;
      return next;
    });
  }

  function addQtyThreshold(chemicalTypeId: string) {
    const existing = qtyThresholds.filter(q => q.chemicalTypeId === chemicalTypeId);
    setQtyThresholds(prev => [...prev, {
      chemicalTypeId,
      level: existing.length + 1,
      minQuantity: 0,
      maxQuantity: null,
    }]);
  }

  function removeQtyThreshold(idx: number) {
    setQtyThresholds(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError(null);
    const missingCanonicalKey = indicators.find(i => !i.canonicalKey.trim());
    if (missingCanonicalKey) {
      setError(`指標「${missingCanonicalKey.name}」缺少對應資料欄位，請先設定再儲存`);
      return;
    }
    setSaving(true);
    try {
      const payload: CreateSchemeRequest = {
        year, name, indicators, chemicalTypes, bands,
        hazardTypeLevels: hazardLevels, quantityThresholds: qtyThresholds,
        hazardQuantityMatrixWeight: matrixWeight,
      };
      if (editing) {
        await riskScoringApi.updateScheme(editing.id, payload);
      } else {
        await riskScoringApi.createScheme(payload);
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        {editing ? `編輯評分標準：${editing.name}` : '新增評分標準'}
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* 基本資訊 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="年度"
            type="number"
            size="small"
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            sx={{ width: 120 }}
            disabled={!!editing}
          />
          <TextField
            label="標準名稱"
            size="small"
            fullWidth
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </Box>

        {!editing && indicators.length === 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            新標準預設沒有指標／化學品類型，可以直接在下方新增，或先取消、改用既有年度的「複製」功能以現有標準為範本。
          </Alert>
        )}

        {/* 指標管理 */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>指標管理（可新增／刪除／改名／拖曳排序）</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleIndicatorDragEnd}>
              <SortableContext items={indicators.map(i => i.id)} strategy={verticalListSortingStrategy}>
                {indicators.map(indicator => (
                  <SortableIndicatorRow
                    key={indicator.id}
                    indicator={indicator}
                    canonicalKeyOptions={canonicalKeyOptions}
                    onUpdate={updateIndicator}
                    onDelete={removeIndicator}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <Button size="small" startIcon={<AddIcon />} onClick={addIndicator} sx={{ mt: 1 }}>
              新增指標
            </Button>
          </AccordionDetails>
        </Accordion>

        {/* 化學品類型管理 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>化學品類型管理（可新增／刪除／改名／拖曳排序）</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChemicalTypeDragEnd}>
              <SortableContext items={chemicalTypes.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {chemicalTypes.map(chem => (
                  <SortableChemicalTypeRow key={chem.id} chemicalType={chem} onUpdate={updateChemicalType} onDelete={removeChemicalType} />
                ))}
              </SortableContext>
            </DndContext>
            <Button size="small" startIcon={<AddIcon />} onClick={addChemicalType} sx={{ mt: 1 }}>
              新增化學品類型
            </Button>
          </AccordionDetails>
        </Accordion>

        {/* 分段計分規則 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>分段計分規則</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {indicators.length === 0 && (
              <Typography variant="body2" color="text.secondary">請先在上方新增指標</Typography>
            )}
            {indicators.map(indicator => {
              const rows = bands.map((b, i) => ({ b, i }))
                .filter(({ b }) => b.indicatorId === indicator.id)
                .sort((a, b) => a.b.score - b.b.score);
              return (
                <Box key={indicator.id} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {indicator.name}
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => addBand(indicator.id)}>
                      加一行
                    </Button>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>最小值</TableCell>
                        <TableCell>最大值</TableCell>
                        <TableCell>分數</TableCell>
                        <TableCell>標籤（選填，離散值可顯示成下拉選單）</TableCell>
                        <TableCell width={40} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(({ b, i }) => (
                        <TableRow key={i}>
                          <TableCell>
                            <TextField size="small" type="number" value={b.minValue ?? ''} onChange={e => updateBand(i, 'minValue', e.target.value)} sx={{ width: 100 }} placeholder="無下限" />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={b.maxValue ?? ''} onChange={e => updateBand(i, 'maxValue', e.target.value)} sx={{ width: 100 }} placeholder="無上限" />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={b.score} onChange={e => updateBand(i, 'score', e.target.value)} sx={{ width: 80 }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" value={b.label ?? ''} onChange={e => updateBand(i, 'label', e.target.value)} sx={{ width: 160 }} placeholder="例：均已改善" />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeBand(i)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography variant="caption" color="text.secondary">尚無規則，點「加一行」新增</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              );
            })}
          </AccordionDetails>
        </Accordion>

        {/* 危害性等級 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>危害性等級</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              size="small" label="矩陣權重" type="number"
              inputProps={{ min: 1 }}
              value={matrixWeight}
              onChange={e => setMatrixWeight(e.target.value === '' ? 1 : Number(e.target.value))}
              helperText="危害性等級 × 使用量級距 併入嚴重度小計前要乘的倍數，預設 1"
              sx={{ width: 220, mb: 2 }}
            />
            {chemicalTypes.length === 0 && (
              <Typography variant="body2" color="text.secondary">請先在上方新增化學品類型</Typography>
            )}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>化學品類型</TableCell>
                  <TableCell>危害性等級</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chemicalTypes.map(chem => {
                  const entry = hazardLevels.find(h => h.chemicalTypeId === chem.id);
                  return (
                    <TableRow key={chem.id}>
                      <TableCell>{chem.name}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          inputProps={{ min: 1 }}
                          value={entry?.hazardLevel ?? 1}
                          onChange={e => updateHazardLevel(chem.id, Number(e.target.value))}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </AccordionDetails>
        </Accordion>

        {/* 使用量級距 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>使用量級距</Typography>
          </AccordionSummary>
          <AccordionDetails>
            {chemicalTypes.length === 0 && (
              <Typography variant="body2" color="text.secondary">請先在上方新增化學品類型</Typography>
            )}
            {chemicalTypes.map(chem => {
              const rows = qtyThresholds.map((q, i) => ({ q, i }))
                .filter(({ q }) => q.chemicalTypeId === chem.id)
                .sort((a, b) => a.q.level - b.q.level);
              return (
                <Box key={chem.id} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {chem.name}
                    </Typography>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => addQtyThreshold(chem.id)}>
                      加一行
                    </Button>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>級距（Level）</TableCell>
                        <TableCell>最小量（kg）</TableCell>
                        <TableCell>最大量（kg）</TableCell>
                        <TableCell width={40} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map(({ q, i }) => (
                        <TableRow key={i}>
                          <TableCell>
                            <TextField size="small" type="number" value={q.level} onChange={e => updateQtyThreshold(i, 'level', e.target.value)} sx={{ width: 80 }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={q.minQuantity} onChange={e => updateQtyThreshold(i, 'minQuantity', e.target.value)} sx={{ width: 120 }} />
                          </TableCell>
                          <TableCell>
                            <TextField size="small" type="number" value={q.maxQuantity ?? ''} onChange={e => updateQtyThreshold(i, 'maxQuantity', e.target.value)} sx={{ width: 120 }} placeholder="無上限" />
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" color="error" onClick={() => removeQtyThreshold(i)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">
                            <Typography variant="caption" color="text.secondary">尚無資料</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              );
            })}
          </AccordionDetails>
        </Accordion>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? <CircularProgress size={20} /> : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SchemeDetailDrawer — 檢視標準詳情
// ═══════════════════════════════════════════════════════════════════════════════

interface SchemeDetailDrawerProps {
  scheme: SchemeDetail | null;
  onClose: () => void;
}

function SchemeDetailView({ scheme, onClose }: SchemeDetailDrawerProps) {
  if (!scheme) return null;

  return (
    <Dialog open={!!scheme} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle>
        {scheme.year} 年・{scheme.name}
        {scheme.isActive && <Chip label="生效中" color="success" size="small" sx={{ ml: 1 }} />}
      </DialogTitle>
      <DialogContent dividers>
        {/* 分段計分規則 */}
        {scheme.indicators.map(indicator => {
          const rows = scheme.bands.filter(b => b.indicatorId === indicator.id);
          if (!rows.length) return null;
          return (
            <Box key={indicator.id} sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight={600} color="primary" sx={{ mb: 1 }}>
                {indicator.name}（{CATEGORY_LABELS[indicator.category]}）
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>最小值</TableCell>
                    <TableCell>最大值</TableCell>
                    <TableCell>分數</TableCell>
                    <TableCell>標籤</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{b.minValue ?? '—'}</TableCell>
                      <TableCell>{b.maxValue ?? '∞'}</TableCell>
                      <TableCell><strong>{b.score}</strong></TableCell>
                      <TableCell>{b.label ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          );
        })}

        <Divider sx={{ my: 2 }} />

        {/* 危害性等級 */}
        <Typography variant="body2" fontWeight={600} color="primary" sx={{ mb: 1 }}>危害性等級</Typography>
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>化學品類型</TableCell>
              <TableCell>危害性等級</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scheme.hazardTypeLevels.map(h => {
              const chem = scheme.chemicalTypes.find(c => c.id === h.chemicalTypeId);
              return (
                <TableRow key={h.id}>
                  <TableCell>{chem?.name ?? '—'}</TableCell>
                  <TableCell><strong>{h.hazardLevel}</strong></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* 使用量級距 */}
        <Typography variant="body2" fontWeight={600} color="primary" sx={{ mb: 1 }}>使用量級距</Typography>
        {scheme.chemicalTypes.map(chem => {
          const rows = scheme.quantityThresholds.filter(q => q.chemicalTypeId === chem.id);
          if (!rows.length) return null;
          return (
            <Box key={chem.id} sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">{chem.name}</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Level</TableCell>
                    <TableCell>最小量（kg）</TableCell>
                    <TableCell>最大量（kg）</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.sort((a, b) => a.level - b.level).map(q => (
                    <TableRow key={q.id}>
                      <TableCell>{q.level}</TableCell>
                      <TableCell>{q.minQuantity.toLocaleString()}</TableCell>
                      <TableCell>{q.maxQuantity != null ? q.maxQuantity.toLocaleString() : '∞'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SchemeListTab
// ═══════════════════════════════════════════════════════════════════════════════

function SchemeListTab() {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<SchemeDetail | null>(null);
  const [detailScheme, setDetailScheme] = useState<SchemeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadSchemes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await riskScoringApi.getSchemes();
      setSchemes(data);
    } catch {
      setError('載入評分標準失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSchemes(); }, [loadSchemes]);

  async function handleActivate(id: string, name: string) {
    if (!confirm(`確定將「${name}」設為生效標準？`)) return;
    try {
      await riskScoringApi.activateScheme(id);
      setSuccess(`已啟用「${name}」`);
      loadSchemes();
    } catch {
      setError('啟用失敗');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`確定刪除「${name}」？此動作無法復原。`)) return;
    try {
      await riskScoringApi.deleteScheme(id);
      setSuccess(`已刪除「${name}」`);
      loadSchemes();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '刪除失敗（生效中的標準不可刪除）');
    }
  }

  async function handleClone(id: string, year: number) {
    const newYear = Number(prompt('複製到哪個年度？', String(year + 1)));
    if (!newYear) return;
    const newName = prompt('新標準名稱？', `${newYear}年危險品風險評分標準`) || `${newYear}年危險品風險評分標準`;
    try {
      await riskScoringApi.cloneScheme(id, { newYear, newName });
      setSuccess(`已複製為 ${newYear} 年標準`);
      loadSchemes();
    } catch {
      setError('複製失敗');
    }
  }

  async function handleEdit(id: string) {
    setLoadingDetail(true);
    try {
      const detail = await riskScoringApi.getScheme(id);
      setEditingScheme(detail);
      setDialogOpen(true);
    } catch {
      setError('載入標準詳情失敗');
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleViewDetail(id: string) {
    setLoadingDetail(true);
    try {
      const detail = await riskScoringApi.getScheme(id);
      setDetailScheme(detail);
    } catch {
      setError('載入標準詳情失敗');
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditingScheme(null); setDialogOpen(true); }}
        >
          新增評分標準
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>年度</TableCell>
              <TableCell>標準名稱</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell>建立者</TableCell>
              <TableCell>建立時間</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schemes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" py={4}>尚無評分標準，請點「新增」</Typography>
                </TableCell>
              </TableRow>
            )}
            {schemes.map(s => (
              <TableRow key={s.id} hover>
                <TableCell><strong>{s.year}</strong></TableCell>
                <TableCell>
                  <Button size="small" variant="text" onClick={() => handleViewDetail(s.id)} disabled={loadingDetail}>
                    {s.name}
                  </Button>
                </TableCell>
                <TableCell>
                  {s.isActive
                    ? <Chip label="生效中" color="success" size="small" />
                    : <Chip label="草稿" size="small" />
                  }
                </TableCell>
                <TableCell>{s.createdByUsername}</TableCell>
                <TableCell>{new Date(s.createdAt).toLocaleDateString('zh-TW')}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    {!s.isActive && (
                      <Tooltip title="設為生效標準">
                        <IconButton size="small" color="success" onClick={() => handleActivate(s.id, s.name)}>
                          <ActivateIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="複製至新年度">
                      <IconButton size="small" onClick={() => handleClone(s.id, s.year)}>
                        <CloneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="編輯">
                      <IconButton size="small" onClick={() => handleEdit(s.id)} disabled={loadingDetail}>
                        <ScienceIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {!s.isActive && (
                      <Tooltip title="刪除">
                        <IconButton size="small" color="error" onClick={() => handleDelete(s.id, s.name)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <SchemeDialog
        open={dialogOpen}
        editing={editingScheme}
        onClose={() => { setDialogOpen(false); setEditingScheme(null); }}
        onSaved={() => { loadSchemes(); }}
      />
      <SchemeDetailView
        scheme={detailScheme}
        onClose={() => setDetailScheme(null)}
      />
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CalculatorTab — 風險值試算
// ═══════════════════════════════════════════════════════════════════════════════

function CalculatorTab() {
  const [schemes, setSchemes] = useState<SchemeListItem[]>([]);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string>('');
  const [schemeDetail, setSchemeDetail] = useState<SchemeDetail | null>(null);
  const [loadingScheme, setLoadingScheme] = useState(false);

  const [indicatorValues, setIndicatorValues] = useState<Record<string, number>>({});
  const [maxHazardChemicalTypeId, setMaxHazardChemicalTypeId] = useState<string>('');
  const [maxHazardQuantity, setMaxHazardQuantity] = useState(0);

  const [result, setResult] = useState<RiskCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    riskScoringApi.getSchemes().then(data => {
      setSchemes(data);
      const active = data.find(s => s.isActive);
      if (active) setSelectedSchemeId(active.id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSchemeId) { setSchemeDetail(null); return; }
    setLoadingScheme(true);
    setResult(null);
    riskScoringApi.getScheme(selectedSchemeId).then(detail => {
      setSchemeDetail(detail);
      setIndicatorValues(Object.fromEntries(detail.indicators.map(i => [i.id, 0])));
      setMaxHazardChemicalTypeId(detail.chemicalTypes[0]?.id ?? '');
      setMaxHazardQuantity(0);
    }).catch(() => {
      setError('載入評分標準內容失敗');
      setSchemeDetail(null);
    }).finally(() => setLoadingScheme(false));
  }, [selectedSchemeId]);

  async function handleCalculate() {
    if (!schemeDetail) return;
    setError(null);
    setCalculating(true);
    try {
      const indicatorValuesPayload: IndicatorValueInput[] = schemeDetail.indicators.map(i => ({
        indicatorId: i.id, value: indicatorValues[i.id] ?? 0,
      }));
      const input = {
        indicatorValues: indicatorValuesPayload,
        maxHazardChemicalTypeId,
        maxHazardQuantity,
      };
      const res = await riskScoringApi.calculateWithScheme(schemeDetail.id, input);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '計算失敗，請確認已設定生效的評分標準');
    } finally {
      setCalculating(false);
    }
  }

  const severityScores = result?.indicatorScores.filter(s => s.category === 'Severity') ?? [];
  const probabilityScores = result?.indicatorScores.filter(s => s.category === 'Probability') ?? [];

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* 輸入表單 */}
        <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>輸入廠商資料</Typography>

            {/* 評分標準選擇 */}
            <FormControl fullWidth size="small" sx={{ mb: 3 }}>
              <InputLabel>使用評分標準</InputLabel>
              <Select
                label="使用評分標準"
                value={selectedSchemeId}
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

            {loadingScheme && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={24} /></Box>}

            {!loadingScheme && !schemeDetail && (
              <Typography color="text.secondary">請先選擇一個評分標準</Typography>
            )}

            {!loadingScheme && schemeDetail && (
              <>
                {(['Severity', 'Probability'] as const).map(category => {
                  const categoryIndicators = schemeDetail.indicators.filter(i => i.category === category);
                  if (categoryIndicators.length === 0) return null;
                  return (
                    <Box key={category}>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="subtitle2" color="primary" sx={{ mb: 2 }}>{CATEGORY_LABELS[category]}</Typography>
                      {categoryIndicators.map(indicator => {
                        const discrete = discreteBandsFor(indicator.id, schemeDetail.bands);
                        if (discrete) {
                          return (
                            <FormControl key={indicator.id} fullWidth size="small" sx={{ mb: 2 }}>
                              <InputLabel>{indicator.name}</InputLabel>
                              <Select
                                label={indicator.name}
                                value={indicatorValues[indicator.id] ?? discrete[0].minValue ?? 0}
                                onChange={e => setIndicatorValues(prev => ({ ...prev, [indicator.id]: Number(e.target.value) }))}
                              >
                                {discrete.map(b => (
                                  <MenuItem key={b.id} value={b.minValue ?? 0}>{b.label}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          );
                        }
                        return (
                          <TextField
                            key={indicator.id}
                            label={indicator.name}
                            helperText={indicator.description ?? undefined}
                            type="number"
                            size="small"
                            fullWidth
                            sx={{ mb: 2 }}
                            value={indicatorValues[indicator.id] ?? 0}
                            onChange={e => setIndicatorValues(prev => ({ ...prev, [indicator.id]: Number(e.target.value) }))}
                          />
                        );
                      })}
                      {category === 'Severity' && schemeDetail.chemicalTypes.length > 0 && (
                        <>
                          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                            <InputLabel>最高危害性化學品類型</InputLabel>
                            <Select
                              label="最高危害性化學品類型"
                              value={maxHazardChemicalTypeId}
                              onChange={e => setMaxHazardChemicalTypeId(e.target.value)}
                            >
                              {schemeDetail.chemicalTypes.map(c => (
                                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            label="最高危害化學品使用量（kg）"
                            type="number"
                            size="small"
                            fullWidth
                            sx={{ mb: 2 }}
                            value={maxHazardQuantity}
                            onChange={e => setMaxHazardQuantity(Number(e.target.value))}
                          />
                        </>
                      )}
                    </Box>
                  );
                })}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={calculating ? <CircularProgress size={18} color="inherit" /> : <CalcIcon />}
                  onClick={handleCalculate}
                  disabled={calculating}
                  sx={{ mt: 1 }}
                >
                  計算風險值
                </Button>
              </>
            )}
          </Paper>
        </Box>

        {/* 計算結果 */}
        <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
          {result ? (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>計算結果</Typography>

              {/* 總分 */}
              <Box sx={{
                textAlign: 'center',
                p: 3,
                mb: 3,
                borderRadius: 2,
                bgcolor: riskColor(result.riskScore) + '20',
                border: `2px solid ${riskColor(result.riskScore)}`,
              }}>
                <Typography variant="h2" fontWeight={700} color={riskColor(result.riskScore)}>
                  {result.riskScore}
                </Typography>
                <Typography variant="h6" color={riskColor(result.riskScore)}>
                  {riskLabel(result.riskScore)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {result.schemeYear} 年標準｜危害嚴重度 {result.hazardSeverityScore} × 危害發生機率 {result.managementRiskScore}
                </Typography>
              </Box>

              {/* 危害嚴重度明細 */}
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>危害嚴重度（{result.hazardSeverityScore} 分）</Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  {severityScores.map(s => (
                    <TableRow key={s.indicatorId}>
                      <TableCell>{s.indicatorName}</TableCell>
                      <TableCell align="right">
                        {s.weight === 1 ? `${s.score} 分` : `${s.score} × ${s.weight} = ${s.score * s.weight} 分`}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell>
                      風險矩陣（危害性 {result.hazardLevel} × 使用量 {result.quantityLevel}）
                    </TableCell>
                    <TableCell align="right">
                      {result.hazardQuantityMatrixWeight === 1
                        ? `${result.hazardQuantityMatrixScore} 分`
                        : `${result.hazardQuantityMatrixScore} × ${result.hazardQuantityMatrixWeight} = ${result.hazardQuantityMatrixScore * result.hazardQuantityMatrixWeight} 分`}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {/* 危害發生機率明細 */}
              <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>危害發生機率（{result.managementRiskScore} 分）</Typography>
              <Table size="small">
                <TableBody>
                  {probabilityScores.map(s => (
                    <TableRow key={s.indicatorId}>
                      <TableCell>{s.indicatorName}</TableCell>
                      <TableCell align="right">
                        {s.weight === 1 ? `${s.score} 分` : `${s.score} × ${s.weight} = ${s.score * s.weight} 分`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary', py: 10 }}>
              <CalcIcon sx={{ fontSize: 64, opacity: 0.2, mb: 2 }} />
              <Typography>填寫左方資料後，按「計算風險值」</Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RiskScoringPage
// ═══════════════════════════════════════════════════════════════════════════════

export function RiskScoringPage() {
  const [tab, setTab] = useState(0);

  return (
    <MainLayout title="危險品風險評分標準管理">
      <Box sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="評分標準管理" />
          <Tab label="風險值試算" />
        </Tabs>
      </Box>
      {tab === 0 && <SchemeListTab />}
      {tab === 1 && <CalculatorTab />}
    </MainLayout>
  );
}

export default RiskScoringPage;

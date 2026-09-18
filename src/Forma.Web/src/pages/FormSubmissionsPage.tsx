/**
 * FormSubmissionsPage - 表單提交資料管理頁面
 * 兩個分頁：摘要 (Summary) 和 回應 (Responses)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
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
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Tooltip,
  Breadcrumbs,
  Link,
  Tab,
  Tabs,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  ArrowBack as BackIcon,
  Settings as SettingsIcon,
  Deselect as DeselectIcon,
  MoreVert as MoreIcon,
  Summarize as SummaryIcon,
  TableChart as TableIcon,
  TrendingUp as TrendingUpIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Cancel as AbandonIcon,
  Timer as TimerIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, Link as RouterLink } from 'react-router';
import { MainLayout } from '@/components/layout';
import { formsApi } from '@/lib/api/forms';
import { submissionsApi } from '@/lib/api/submissions';
import { parseProjectTheme, resolveTheme } from '@/hooks/useFormTheme';
import type { FormDto } from '@/types/api/forms';
import type { SubmissionListDto, SubmissionDto } from '@/types/api/submissions';
import type { FormSchema, Field, DownloadReportFieldProperties } from '@/types/form';

// ============================================================================
// Constants
// ============================================================================

const statusColors: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  Draft: 'warning',
  Submitted: 'success',
  Approved: 'success',
  Rejected: 'error',
};

const statusLabels: Record<string, string> = {
  Draft: '草稿',
  Submitted: '已提交',
  Approved: '已核准',
  Rejected: '已拒絕',
};

// ============================================================================
// Helper: get all input fields from schema
// ============================================================================

function getInputFields(schema: FormSchema | null): Field[] {
  if (!schema) return [];
  return schema.pages.flatMap((page) => page.fields).filter(
    (f) => !['panel', 'paneldynamic', 'html', 'section', 'hidden'].includes(f.type)
  );
}

/**
 * "Expanded field" — a flat representation.
 * For regular fields: one entry per field.
 * For matrix fields: one entry per row in the matrix.
 */
interface ExpandedField {
  /** Unique key for column identification and data lookup */
  key: string;
  /** Display label for the column header */
  label: string;
  /** The original field */
  sourceField: Field;
  /** If this is a matrix row expansion, the row id */
  matrixRowId?: string;
}

function getExpandedFields(schema: FormSchema | null): ExpandedField[] {
  const fields = getInputFields(schema);
  const expanded: ExpandedField[] = [];

  for (const field of fields) {
    if (['matrix', 'matrixdropdown', 'matrixdynamic'].includes(field.type)) {
      const props = (field as unknown as Record<string, unknown>).properties as Record<string, unknown> | undefined;
      const rows = props?.rows as Array<{ id: string; label: string }> | undefined;
      if (rows && rows.length > 0) {
        const fieldLabel = stripHtml(field.label || field.name);
        for (const row of rows) {
          expanded.push({
            key: `${field.name}::${row.id}`,
            label: `${fieldLabel} - ${stripHtml(row.label)}`,
            sourceField: field,
            matrixRowId: row.id,
          });
        }
      } else {
        // No rows defined, show as single column
        expanded.push({
          key: field.name,
          label: stripHtml(field.label || field.name),
          sourceField: field,
        });
      }
    } else {
      expanded.push({
        key: field.name,
        label: stripHtml(field.label || field.name),
        sourceField: field,
      });
    }
  }

  return expanded;
}

/** Get the display value for an expanded field from submission data */
function getExpandedValue(ef: ExpandedField, data: Record<string, unknown>): string {
  const raw = data[ef.sourceField.name];

  if (ef.matrixRowId) {
    // Matrix row: raw is an object keyed by row id
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return '-';
    const obj = raw as Record<string, unknown>;
    const cellValue = obj[ef.matrixRowId];
    if (cellValue === undefined || cellValue === null || cellValue === '__none__') return '-';

    // Resolve column label
    const props = (ef.sourceField as unknown as Record<string, unknown>).properties as Record<string, unknown> | undefined;
    const columns = props?.columns as Array<{ id: string; label: string }> | undefined;
    if (columns) {
      const col = columns.find((c) => c.id === String(cellValue));
      if (col) return stripHtml(col.label);
    }
    return String(cellValue);
  }

  return formatValue(raw, ef.sourceField);
}

/** Strip HTML tags and decode HTML entities */
function stripHtml(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

/** Resolve a choice value to its display label using field properties */
function resolveChoiceLabel(field: Field, value: string | number): string {
  const props = (field as unknown as Record<string, unknown>).properties as Record<string, unknown> | undefined;
  if (!props) return String(value);

  // For select/radio/checkbox/multiselect → properties.options
  const options = props.options as Array<{ value: string | number; label: string }> | undefined;
  if (options) {
    const match = options.find((o) => String(o.value) === String(value));
    if (match) return stripHtml(match.label);
  }

  // For imagepicker/ranking → properties.choices
  const choices = props.choices as Array<{ value: string | number; label?: string; text?: string }> | undefined;
  if (choices) {
    const match = choices.find((c) => String(c.value) === String(value));
    if (match) return stripHtml(match.label || match.text || String(match.value));
  }

  return String(value);
}

function formatValue(value: unknown, field?: Field | null): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';

  // Resolve choice values to labels
  if (field && ['select', 'radio', 'checkbox', 'multiselect', 'imagepicker', 'ranking'].includes(field.type)) {
    if (Array.isArray(value)) {
      return value.map((v) => resolveChoiceLabel(field, v)).join(', ');
    }
    return resolveChoiceLabel(field, value as string | number);
  }

  // Matrix: format as readable key-value pairs
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj).filter(([, v]) => v !== '__none__' && v !== null && v !== undefined);
    if (entries.length === 0) return '-';

    // Try to resolve row/column labels if field is matrix
    if (field && ['matrix', 'matrixdropdown', 'matrixdynamic'].includes(field.type)) {
      const mProps = (field as unknown as Record<string, unknown>).properties as Record<string, unknown> | undefined;
      const rows = mProps?.rows as Array<{ id: string; label: string }> | undefined;
      const columns = mProps?.columns as Array<{ id: string; label: string }> | undefined;
      return entries.map(([k, v]) => {
        const rowLabel = rows?.find((r) => r.id === k)?.label || k;
        const colLabel = columns?.find((c) => c.id === String(v))?.label || String(v);
        return `${stripHtml(rowLabel)}: ${stripHtml(colLabel)}`;
      }).join('; ');
    }

    return entries.map(([k, v]) => `${k}: ${v}`).join('; ');
  }

  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// ============================================================================
// Report Download Helper
// ============================================================================

function findDownloadReportField(schema: FormSchema | null): Field | null {
  if (!schema) return null;
  for (const page of schema.pages) {
    for (const field of page.fields) {
      if (field.type === 'downloadreport') return field;
    }
  }
  return null;
}

async function downloadReportForSubmission(
  schema: FormSchema,
  submissionData: Record<string, unknown>,
  reportDownloadedAt?: string,
  logoUrl?: string,
) {
  const reportField = findDownloadReportField(schema);
  if (!reportField) return;
  const properties = ('properties' in reportField ? (reportField as unknown as { properties: unknown }).properties ?? {} : {}) as DownloadReportFieldProperties;
  const reportDate = reportDownloadedAt ? new Date(reportDownloadedAt) : undefined;
  const { generateReport } = await import('@/components/form-fields/report/generateReport');
  await generateReport({ schema, values: submissionData, properties, logoUrl, reportDate });
}

// ============================================================================
// Submission Detail Dialog
// ============================================================================

interface SubmissionDetailDialogProps {
  open: boolean;
  onClose: () => void;
  submissionId: string | null;
  schema: FormSchema | null;
  logoUrl?: string;
}

function SubmissionDetailDialog({ open, onClose, submissionId, schema, logoUrl }: SubmissionDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submission, setSubmission] = useState<SubmissionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && submissionId) {
      setLoading(true);
      setError(null);
      submissionsApi.getSubmission(submissionId)
        .then(setSubmission)
        .catch((err) => setError(err instanceof Error ? err.message : '載入失敗'))
        .finally(() => setLoading(false));
    }
  }, [open, submissionId]);

  const data = useMemo(() => {
    if (!submission) return {};
    try {
      return JSON.parse(submission.submissionData);
    } catch {
      return {};
    }
  }, [submission]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>提交詳情</DialogTitle>
      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {submission && !loading && (
          <Box>
            <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                提交者：{submission.submittedByUsername || '匿名'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                提交時間：{new Date(submission.submittedAt).toLocaleString('zh-TW')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                表單版本：{submission.formVersion}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                狀態：{statusLabels[submission.status] || submission.status}
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>欄位</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>值</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    const efs = getExpandedFields(schema);
                    if (efs.length === 0 && Object.keys(data).length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={2} align="center">
                            <Typography color="text.secondary">無資料</Typography>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    // Show expanded fields with resolved values
                    return efs.map((ef) => (
                      <TableRow key={ef.key}>
                        <TableCell>{ef.label}</TableCell>
                        <TableCell>{getExpandedValue(ef, data)}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {schema && findDownloadReportField(schema) && submission && (
          <Button
            startIcon={<PdfIcon />}
            onClick={() => {
              if (schema && submission) {
                downloadReportForSubmission(schema, data, submission.reportDownloadedAt, logoUrl);
              }
            }}
          >
            下載報告
          </Button>
        )}
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================================
// Summary Tab - Stats Cards
// ============================================================================

interface StatsCardsProps {
  totalSubmissions: number;
  statusCounts: Record<string, number>;
}

function StatsCards({ totalSubmissions, statusCounts }: StatsCardsProps) {
  const submitted = statusCounts['Submitted'] || 0;
  const approved = statusCounts['Approved'] || 0;
  const rejected = statusCounts['Rejected'] || 0;
  const draft = statusCounts['Draft'] || 0;
  const completed = submitted + approved;
  const completionRate = totalSubmissions > 0 ? Math.round((completed / totalSubmissions) * 100) : 0;

  const cards = [
    {
      label: '總提交數',
      value: totalSubmissions,
      icon: <TrendingUpIcon sx={{ fontSize: 32 }} />,
      color: '#1976d2',
    },
    {
      label: '已完成',
      value: completed,
      icon: <CompleteIcon sx={{ fontSize: 32 }} />,
      color: '#2e7d32',
    },
    {
      label: '草稿',
      value: draft,
      icon: <StartIcon sx={{ fontSize: 32 }} />,
      color: '#ed6c02',
    },
    {
      label: '已拒絕',
      value: rejected,
      icon: <AbandonIcon sx={{ fontSize: 32 }} />,
      color: '#d32f2f',
    },
    {
      label: '完成率',
      value: `${completionRate}%`,
      icon: <TimerIcon sx={{ fontSize: 32 }} />,
      color: '#9c27b0',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, mb: 4 }}>
      {cards.map((card) => (
        <Card key={card.label} variant="outlined" sx={{ borderLeft: 4, borderLeftColor: card.color }}>
          <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  {card.label}
                </Typography>
                <Typography variant="h4" fontWeight="bold" sx={{ color: card.color }}>
                  {card.value}
                </Typography>
              </Box>
              <Box sx={{ color: card.color, opacity: 0.3 }}>
                {card.icon}
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

// ============================================================================
// Summary Tab - Per-question breakdown
// ============================================================================

interface QuestionBreakdownProps {
  schema: FormSchema | null;
  allSubmissionData: Record<string, unknown>[];
}

function QuestionBreakdown({ schema, allSubmissionData }: QuestionBreakdownProps) {
  const expandedFields = useMemo(() => getExpandedFields(schema), [schema]);

  // Compute per-expanded-field stats
  const fieldStats = useMemo(() => {
    return expandedFields.map((ef) => {
      const values = allSubmissionData
        .map((d) => getExpandedValue(ef, d))
        .filter((v) => v !== '-');

      const fillRate = allSubmissionData.length > 0
        ? Math.round((values.length / allSubmissionData.length) * 100)
        : 0;

      // For choice-based fields (non-matrix-row), compute value distribution
      const field = ef.sourceField;
      const isChoice = ['select', 'radio', 'checkbox', 'multiselect', 'boolean', 'rating'].includes(field.type) && !ef.matrixRowId;
      const isMatrixRow = !!ef.matrixRowId;

      let distribution: { label: string; count: number; pct: number }[] | null = null;

      if ((isChoice || isMatrixRow) && values.length > 0) {
        const counts: Record<string, number> = {};
        values.forEach((v) => {
          // Values are already resolved display labels from getExpandedValue
          counts[v] = (counts[v] || 0) + 1;
        });

        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        distribution = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([label, count]) => ({
            label,
            count,
            pct: Math.round((count / total) * 100),
          }));
      }

      return {
        key: ef.key,
        label: ef.label,
        fillRate,
        filledCount: values.length,
        totalCount: allSubmissionData.length,
        distribution,
      };
    });
  }, [expandedFields, allSubmissionData]);

  if (fieldStats.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        表單尚無欄位
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        各題填答統計
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {fieldStats.map((stat) => (
          <Paper key={stat.key} variant="outlined" sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" fontWeight={600}>
                {stat.label}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.filledCount}/{stat.totalCount} ({stat.fillRate}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stat.fillRate}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': { borderRadius: 4 },
              }}
            />
            {/* Value distribution for choice fields */}
            {stat.distribution && (
              <Box sx={{ mt: 2, pl: 1 }}>
                {stat.distribution.map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box sx={{ width: 120, flexShrink: 0 }}>
                      <Typography variant="body2" noWrap>{item.label}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, position: 'relative' }}>
                      <LinearProgress
                        variant="determinate"
                        value={item.pct}
                        sx={{
                          height: 16,
                          borderRadius: 2,
                          backgroundColor: 'grey.100',
                          '& .MuiLinearProgress-bar': { borderRadius: 2 },
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
                      {item.count} ({item.pct}%)
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        ))}
      </Box>
    </Box>
  );
}

// ============================================================================
// Summary Tab
// ============================================================================

interface SummaryTabProps {
  form: FormDto | null;
  schema: FormSchema | null;
  totalCount: number;
  allSubmissionData: Record<string, unknown>[];
  statusCounts: Record<string, number>;
}

function SummaryTab({ schema, totalCount, allSubmissionData, statusCounts }: SummaryTabProps) {
  return (
    <Box>
      <StatsCards totalSubmissions={totalCount} statusCounts={statusCounts} />
      <Divider sx={{ mb: 3 }} />
      <QuestionBreakdown schema={schema} allSubmissionData={allSubmissionData} />
    </Box>
  );
}

// ============================================================================
// Column Visibility Settings
// ============================================================================

interface ColumnSettingsProps {
  schema: FormSchema | null;
  visibleColumns: Set<string>;
  onToggleColumn: (col: string) => void;
}

function ColumnSettings({ schema, visibleColumns, onToggleColumn }: ColumnSettingsProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const expandedFields = useMemo(() => getExpandedFields(schema), [schema]);

  return (
    <>
      <Tooltip title="欄位顯示設定">
        <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { maxHeight: 400, width: 280 } } }}
      >
        <MenuItem disabled>
          <Typography variant="body2" fontWeight={600}>顯示欄位</Typography>
        </MenuItem>
        <Divider />
        {/* Built-in columns */}
        {[
          { key: '_submitter', label: '提交者' },
          { key: '_submittedAt', label: '提交時間' },
          { key: '_status', label: '狀態' },
        ].map((col) => (
          <MenuItem key={col.key} onClick={() => onToggleColumn(col.key)} dense>
            <ListItemIcon>
              <Checkbox edge="start" checked={visibleColumns.has(col.key)} size="small" />
            </ListItemIcon>
            <ListItemText>{col.label}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        {/* Field columns (expanded) */}
        {expandedFields.map((ef) => (
          <MenuItem key={ef.key} onClick={() => onToggleColumn(ef.key)} dense>
            <ListItemIcon>
              <Checkbox edge="start" checked={visibleColumns.has(ef.key)} size="small" />
            </ListItemIcon>
            <ListItemText>{ef.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

// ============================================================================
// Responses Tab
// ============================================================================

interface ResponsesTabProps {
  form: FormDto | null;
  schema: FormSchema | null;
  submissions: SubmissionListDto[];
  totalCount: number;
  page: number;
  rowsPerPage: number;
  loading: boolean;
  onChangePage: (page: number) => void;
  onChangeRowsPerPage: (size: number) => void;
  onViewSubmission: (id: string) => void;
  onDeleteSubmission: (submission: SubmissionListDto) => void;
  onDeleteSelected: (ids: string[]) => void;
  deleteLoading: string | null;
  allSubmissionData: Record<string, unknown>[];
  submissionDataMap: Record<string, Record<string, unknown>>;
  onDownloadReport?: (submission: SubmissionListDto) => void;
  hasReportField?: boolean;
}

function ResponsesTab({
  schema,
  submissions,
  totalCount,
  page,
  rowsPerPage,
  loading,
  onChangePage,
  onChangeRowsPerPage,
  onViewSubmission,
  onDeleteSubmission,
  onDeleteSelected,
  deleteLoading,
  submissionDataMap,
  onDownloadReport,
  hasReportField,
}: ResponsesTabProps) {
  const expandedFields = useMemo(() => getExpandedFields(schema), [schema]);

  // Column visibility — all columns visible by default
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const all = new Set(['_submitter', '_submittedAt', '_status']);
    expandedFields.forEach((ef) => all.add(ef.key));
    return all;
  });

  // Selection state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = submissions.length > 0 && submissions.every((s) => selected.has(s.id));
  const someSelected = submissions.some((s) => selected.has(s.id));

  // Bulk actions menu
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);

  const handleToggleColumn = useCallback((col: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(submissions.map((s) => s.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    setBulkMenuAnchor(null);
    const ids = Array.from(selected);
    if (ids.length > 0) {
      onDeleteSelected(ids);
      setSelected(new Set());
    }
  };

  const handleExportSelected = () => {
    setBulkMenuAnchor(null);
    // Build CSV from selected submissions
    const selectedIds = Array.from(selected);
    const visibleEfs = expandedFields.filter((ef) => visibleColumns.has(ef.key));
    const headers = ['提交者', '提交時間', '狀態', ...visibleEfs.map((ef) => ef.label)];

    const rows = submissions
      .filter((s) => selectedIds.includes(s.id))
      .map((s) => {
        const data = submissionDataMap[s.id] || {};
        return [
          s.submittedByUsername || '匿名',
          new Date(s.submittedAt).toLocaleString('zh-TW'),
          statusLabels[s.status] || s.status,
          ...visibleEfs.map((ef) => getExpandedValue(ef, data)),
        ];
      });

    const csvContent = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `submissions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Visible expanded field columns
  const visibleExpandedColumns = expandedFields.filter((ef) => visibleColumns.has(ef.key));

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selected.size > 0 && (
            <>
              <Typography variant="body2" color="primary">
                已選擇 {selected.size} 筆
              </Typography>
              <Tooltip title="批次操作">
                <IconButton size="small" onClick={(e) => setBulkMenuAnchor(e.currentTarget)}>
                  <MoreIcon />
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={bulkMenuAnchor}
                open={Boolean(bulkMenuAnchor)}
                onClose={() => setBulkMenuAnchor(null)}
              >
                <MenuItem onClick={handleExportSelected}>
                  <ListItemIcon><ExportIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>下載選取項目 (CSV)</ListItemText>
                </MenuItem>
                <MenuItem onClick={handleBulkDelete} sx={{ color: 'error.main' }}>
                  <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
                  <ListItemText>刪除選取項目</ListItemText>
                </MenuItem>
              </Menu>
              <Tooltip title="取消選取">
                <IconButton size="small" onClick={() => setSelected(new Set())}>
                  <DeselectIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ColumnSettings
            schema={schema}
            visibleColumns={visibleColumns}
            onToggleColumn={handleToggleColumn}
          />
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper' }}>
                <Checkbox
                  indeterminate={someSelected && !allSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  size="small"
                />
              </TableCell>
              {visibleColumns.has('_submitter') && <TableCell sx={{ whiteSpace: 'nowrap' }}>提交者</TableCell>}
              {visibleColumns.has('_submittedAt') && <TableCell sx={{ whiteSpace: 'nowrap' }}>提交時間</TableCell>}
              {visibleColumns.has('_status') && <TableCell sx={{ whiteSpace: 'nowrap' }}>狀態</TableCell>}
              {visibleExpandedColumns.map((ef) => (
                <TableCell key={ef.key} sx={{ whiteSpace: 'nowrap' }}>{ef.label}</TableCell>
              ))}
              <TableCell align="right" sx={{ width: 100, position: 'sticky', right: 0, zIndex: 2, bgcolor: 'background.paper' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={100} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={100} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">尚無提交資料</Typography>
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => {
                const data = submissionDataMap[submission.id] || {};
                return (
                  <TableRow key={submission.id} hover selected={selected.has(submission.id)}>
                    <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: selected.has(submission.id) ? 'action.selected' : 'background.paper' }}>
                      <Checkbox
                        checked={selected.has(submission.id)}
                        onChange={() => handleToggleSelect(submission.id)}
                        size="small"
                      />
                    </TableCell>
                    {visibleColumns.has('_submitter') && (
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {submission.submittedByUsername || '匿名'}
                        </Typography>
                      </TableCell>
                    )}
                    {visibleColumns.has('_submittedAt') && (
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(submission.submittedAt).toLocaleString('zh-TW')}
                        </Typography>
                      </TableCell>
                    )}
                    {visibleColumns.has('_status') && (
                      <TableCell>
                        <Chip
                          label={statusLabels[submission.status] || submission.status}
                          size="small"
                          color={statusColors[submission.status] || 'default'}
                        />
                      </TableCell>
                    )}
                    {visibleExpandedColumns.map((ef) => (
                      <TableCell key={ef.key}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                          {getExpandedValue(ef, data)}
                        </Typography>
                      </TableCell>
                    ))}
                    <TableCell align="right" sx={{ position: 'sticky', right: 0, zIndex: 1, bgcolor: selected.has(submission.id) ? 'action.selected' : 'background.paper' }}>
                      <Tooltip title="查看詳情">
                        <IconButton size="small" onClick={() => onViewSubmission(submission.id)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {hasReportField && onDownloadReport && (
                        <Tooltip title="下載報告">
                          <IconButton size="small" color="primary" onClick={() => onDownloadReport(submission)}>
                            <PdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="刪除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteSubmission(submission)}
                          disabled={deleteLoading === submission.id}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, p) => onChangePage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => onChangeRowsPerPage(parseInt(e.target.value, 10))}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="每頁筆數"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
        />
      </TableContainer>
    </Box>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export function FormSubmissionsPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormDto | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // For summary: load ALL submissions data (paginated fetch of full data)
  const [allFullSubmissions, setAllFullSubmissions] = useState<SubmissionDto[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Load form + list data
  useEffect(() => {
    if (formId) loadData();
  }, [formId, page, rowsPerPage]);

  // Load full submission data for summary when tab switches to summary
  useEffect(() => {
    if (activeTab === 0 && formId && allFullSubmissions.length === 0 && totalCount > 0) {
      loadAllSubmissions();
    }
  }, [activeTab, formId, totalCount]);

  const loadData = async () => {
    if (!formId) return;
    setLoading(true);
    setError(null);

    try {
      const [formData, submissionsData] = await Promise.all([
        formsApi.getForm(formId),
        submissionsApi.getFormSubmissions(formId, {
          pageNumber: page + 1,
          pageSize: rowsPerPage,
          sortDescending: true,
        }),
      ]);

      setForm(formData);
      setSubmissions(submissionsData.items || []);
      setTotalCount(submissionsData.totalCount || 0);

      try {
        setSchema(JSON.parse(formData.schema));
      } catch {
        console.error('Failed to parse form schema');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  };

  const loadAllSubmissions = async () => {
    if (!formId) return;
    setSummaryLoading(true);
    try {
      // Load all submissions (up to 500 for summary stats)
      const result = await submissionsApi.getFormSubmissions(formId, {
        pageNumber: 1,
        pageSize: 100,
        sortDescending: true,
      });

      // For summary, we need the full data. Load each submission's detail.
      // Optimization: only load details if count is manageable
      const items = result.items || [];
      if (items.length <= 100) {
        const details = await Promise.all(
          items.map((s) => submissionsApi.getSubmission(s.id).catch(() => null))
        );
        setAllFullSubmissions(details.filter(Boolean) as SubmissionDto[]);
      }
    } catch {
      // Silently fail for summary
    } finally {
      setSummaryLoading(false);
    }
  };

  // Parse all submission data for summary
  const allSubmissionData = useMemo(() => {
    return allFullSubmissions.map((s) => {
      try {
        return JSON.parse(s.submissionData);
      } catch {
        return {};
      }
    });
  }, [allFullSubmissions]);

  // Status counts for summary
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allFullSubmissions.forEach((s) => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [allFullSubmissions]);

  // Map submission id -> parsed data for responses table
  const submissionDataMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    allFullSubmissions.forEach((s) => {
      try {
        map[s.id] = JSON.parse(s.submissionData);
      } catch {
        map[s.id] = {};
      }
    });
    return map;
  }, [allFullSubmissions]);

  // Check if schema has downloadreport field
  const hasReportField = useMemo(() => !!findDownloadReportField(schema), [schema]);

  // Resolve logo URL for report
  const logoUrl = useMemo(() => {
    if (!form || !schema) return undefined;
    const projectTheme = parseProjectTheme(form.projectSettings);
    const resolved = resolveTheme(projectTheme, schema.settings);
    return resolved.logo;
  }, [form, schema]);

  const handleDownloadReport = async (submission: SubmissionListDto) => {
    if (!schema) return;
    try {
      const detail = await submissionsApi.getSubmission(submission.id);
      const data = JSON.parse(detail.submissionData);
      await downloadReportForSubmission(schema, data, detail.reportDownloadedAt, logoUrl);
    } catch (err) {
      alert(err instanceof Error ? err.message : '下載報告失敗');
    }
  };

  const handleViewSubmission = (id: string) => {
    setSelectedSubmissionId(id);
    setDetailDialogOpen(true);
  };

  const handleDeleteSubmission = async (submission: SubmissionListDto) => {
    if (!confirm('確定要刪除此提交嗎？此操作無法復原。')) return;
    setDeleteLoading(submission.id);
    try {
      await submissionsApi.deleteSubmission(submission.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteSelected = async (ids: string[]) => {
    if (!confirm(`確定要刪除 ${ids.length} 筆提交嗎？此操作無法復原。`)) return;
    try {
      await Promise.all(ids.map((id) => submissionsApi.deleteSubmission(id)));
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '刪除失敗');
    }
  };

  const handleExportCsv = () => {
    if (!schema || allFullSubmissions.length === 0) return;
    const allEfs = getExpandedFields(schema);
    const headers = ['提交者', '提交時間', '狀態', ...allEfs.map((ef) => ef.label)];

    const rows = allFullSubmissions.map((s) => {
      const data = (() => { try { return JSON.parse(s.submissionData); } catch { return {}; } })();
      return [
        s.submittedByUsername || '匿名',
        new Date(s.submittedAt).toLocaleString('zh-TW'),
        statusLabels[s.status] || s.status,
        ...allEfs.map((ef) => getExpandedValue(ef, data)),
      ];
    });

    const csvContent = [headers, ...rows].map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${form?.name || 'submissions'}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !form) {
    return (
      <MainLayout title="提交管理">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="提交管理">
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => navigate(-1)}>
              返回
            </Button>
          }
        >
          {error}
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`${form?.name || '表單'} - 提交管理`}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to={`/projects/${form?.projectId}`} underline="hover" color="inherit">
          {form?.projectName || '計畫'}
        </Link>
        <Typography color="text.primary">{form?.name || '表單'}</Typography>
        <Typography color="text.primary">提交管理</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              提交資料管理
            </Typography>
            <Typography variant="body2" color="text.secondary">
              共 {totalCount} 筆提交
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ExportIcon />}
          onClick={handleExportCsv}
          disabled={allFullSubmissions.length === 0}
        >
          匯出 CSV
        </Button>
      </Box>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<SummaryIcon />} iconPosition="start" label="摘要" />
          <Tab icon={<TableIcon />} iconPosition="start" label="回應" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        summaryLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <SummaryTab
            form={form}
            schema={schema}
            totalCount={totalCount}
            allSubmissionData={allSubmissionData}
            statusCounts={statusCounts}
          />
        )
      )}

      {activeTab === 1 && (
        <ResponsesTab
          form={form}
          schema={schema}
          submissions={submissions}
          totalCount={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          loading={loading}
          onChangePage={(p) => setPage(p)}
          onChangeRowsPerPage={(s) => { setRowsPerPage(s); setPage(0); }}
          onViewSubmission={handleViewSubmission}
          onDeleteSubmission={handleDeleteSubmission}
          onDeleteSelected={handleDeleteSelected}
          deleteLoading={deleteLoading}
          allSubmissionData={allSubmissionData}
          submissionDataMap={submissionDataMap}
          onDownloadReport={handleDownloadReport}
          hasReportField={hasReportField}
        />
      )}

      {/* Detail Dialog */}
      <SubmissionDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        submissionId={selectedSubmissionId}
        schema={schema}
        logoUrl={logoUrl}
      />
    </MainLayout>
  );
}

export default FormSubmissionsPage;

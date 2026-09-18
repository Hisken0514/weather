/**
 * MatrixProperties - 矩陣單選欄位專屬屬性
 */

import {
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  FormControlLabel,
  Switch,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { useSelectedField, useFormBuilderStore } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';
import type { MatrixRow, MatrixColumn } from '@/types/form';

const generateId = () => `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export function MatrixProperties() {
  const field = useSelectedField();
  const { updateField } = useFormBuilderStore();

  if (!field || field.type !== 'matrix') return null;

  const properties = field.properties || {};
  const rows: MatrixRow[] = properties.rows ?? [];
  const columns: MatrixColumn[] = properties.columns ?? [];
  const alternateRows = properties.alternateRows ?? false;
  const showHeader = properties.showHeader ?? true;

  const handleChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: { ...properties, [key]: value },
    });
  };

  // Row management
  const handleAddRow = () => {
    const newRow: MatrixRow = {
      id: generateId(),
      label: `項目 ${rows.length + 1}`,
    };
    handleChange('rows', [...rows, newRow]);
  };

  const handleUpdateRow = (rowId: string, label: string) => {
    const updatedRows = rows.map(row =>
      row.id === rowId ? { ...row, label } : row
    );
    handleChange('rows', updatedRows);
  };

  const handleDeleteRow = (rowId: string) => {
    const updatedRows = rows.filter(row => row.id !== rowId);
    handleChange('rows', updatedRows);
  };

  // Column management
  const handleAddColumn = () => {
    const newColumn: MatrixColumn = {
      id: generateId(),
      label: `選項 ${columns.length + 1}`,
    };
    handleChange('columns', [...columns, newColumn]);
  };

  const handleUpdateColumn = (colId: string, label: string) => {
    const updatedColumns = columns.map(col =>
      col.id === colId ? { ...col, label } : col
    );
    handleChange('columns', updatedColumns);
  };

  const handleDeleteColumn = (colId: string) => {
    const updatedColumns = columns.filter(col => col.id !== colId);
    handleChange('columns', updatedColumns);
  };

  // Quick add common columns
  const handleAddCommonColumns = () => {
    const commonColumns: MatrixColumn[] = [
      { id: generateId(), label: '非常不滿意' },
      { id: generateId(), label: '不滿意' },
      { id: generateId(), label: '普通' },
      { id: generateId(), label: '滿意' },
      { id: generateId(), label: '非常滿意' },
    ];
    handleChange('columns', commonColumns);
  };

  return (
    <>
      <PropertySection title="列（題目）" defaultExpanded>
        <Box sx={{ mb: 2 }}>
          {rows.length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ mb: 1 }}>
              尚未新增任何列
            </Typography>
          ) : (
            rows.map((row, index) => (
              <Paper
                key={row.id}
                variant="outlined"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  mb: 1,
                }}
              >
                <DragIcon sx={{ color: 'text.disabled', cursor: 'grab' }} />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                  {index + 1}
                </Typography>
                <TextField
                  size="small"
                  value={row.label}
                  onChange={(e) => handleUpdateRow(row.id, e.target.value)}
                  fullWidth
                  placeholder="列標籤"
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteRow(row.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddRow}
            fullWidth
          >
            新增列
          </Button>
        </Box>
      </PropertySection>

      <PropertySection title="欄（選項）" defaultExpanded>
        <Box sx={{ mb: 2 }}>
          {columns.length === 0 ? (
            <Box>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 1 }}>
                尚未新增任何欄
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={handleAddCommonColumns}
                sx={{ mb: 1 }}
              >
                快速新增：滿意度量表
              </Button>
            </Box>
          ) : (
            columns.map((col, index) => (
              <Paper
                key={col.id}
                variant="outlined"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1,
                  mb: 1,
                }}
              >
                <DragIcon sx={{ color: 'text.disabled', cursor: 'grab' }} />
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 20 }}>
                  {index + 1}
                </Typography>
                <TextField
                  size="small"
                  value={col.label}
                  onChange={(e) => handleUpdateColumn(col.id, e.target.value)}
                  fullWidth
                  placeholder="欄標籤"
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteColumn(col.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Paper>
            ))
          )}

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddColumn}
            fullWidth
          >
            新增欄
          </Button>
        </Box>
      </PropertySection>

      <PropertySection title="特殊選項">
        <FormControlLabel
          control={
            <Switch
              checked={properties.noneOption ?? false}
              onChange={(e) => handleChange('noneOption', e.target.checked)}
              size="small"
            />
          }
          label="加入「無」選項"
        />
        {properties.noneOption && (
          <TextField
            size="small"
            label="無選項標籤"
            value={properties.noneLabel ?? '不適用'}
            onChange={(e) => handleChange('noneLabel', e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          />
        )}

        <FormControlLabel
          control={
            <Switch
              checked={properties.allowOther ?? false}
              onChange={(e) => handleChange('allowOther', e.target.checked)}
              size="small"
            />
          }
          label="允許填寫「其他」"
        />
        {properties.allowOther && (
          <TextField
            size="small"
            label="其他選項標籤"
            value={properties.otherLabel ?? '其他'}
            onChange={(e) => handleChange('otherLabel', e.target.value)}
            fullWidth
            sx={{ mt: 1, mb: 2 }}
          />
        )}
      </PropertySection>

      <PropertySection title="顯示選項">
        <FormControlLabel
          control={
            <Switch
              checked={showHeader}
              onChange={(e) => handleChange('showHeader', e.target.checked)}
              size="small"
            />
          }
          label="顯示表頭"
        />

        <FormControlLabel
          control={
            <Switch
              checked={alternateRows}
              onChange={(e) => handleChange('alternateRows', e.target.checked)}
              size="small"
            />
          }
          label="交替列顏色"
        />
      </PropertySection>
    </>
  );
}

/**
 * ConditionalEditor - 共用條件編輯元件
 * 用於欄位和頁面的條件顯示/隱藏設定
 */

import {
  Box,
  TextField,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as ClearIcon,
} from '@mui/icons-material';
import type {
  Conditional,
  ConditionalAction,
  ConditionalOperator,
  Condition,
  LogicType,
  Field,
} from '@/types/form';
import { isMultiConditional, isSingleConditional } from '@/types/form';

const OPERATORS: { value: ConditionalOperator; label: string }[] = [
  { value: 'equals', label: '等於' },
  { value: 'notEquals', label: '不等於' },
  { value: 'contains', label: '包含' },
  { value: 'notContains', label: '不包含' },
  { value: 'gt', label: '大於' },
  { value: 'gte', label: '大於等於' },
  { value: 'lt', label: '小於' },
  { value: 'lte', label: '小於等於' },
  { value: 'isEmpty', label: '為空' },
  { value: 'isNotEmpty', label: '不為空' },
  { value: 'in', label: '在列表中' },
  { value: 'notIn', label: '不在列表中' },
  { value: 'startsWith', label: '開頭是' },
  { value: 'endsWith', label: '結尾是' },
];

interface ConditionalEditorProps {
  conditional?: Conditional;
  allFields: Field[];
  onChange: (conditional: Conditional) => void;
  onClear: () => void;
}

function createDefaultCondition(allFields: Field[]): Condition {
  return {
    field: allFields[0]?.name || '',
    operator: 'equals',
    value: '',
  };
}

export function ConditionalEditor({
  conditional,
  allFields,
  onChange,
  onClear,
}: ConditionalEditorProps) {
  if (!conditional) {
    // Show "Add condition" button
    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<AddIcon />}
        onClick={() => {
          const newConditional: Conditional = {
            action: 'show' as ConditionalAction,
            when: createDefaultCondition(allFields),
          };
          onChange(newConditional);
        }}
        fullWidth
        disabled={allFields.length === 0}
      >
        新增條件
      </Button>
    );
  }

  const action = conditional.action;
  const isMulti = isMultiConditional(conditional);
  const isSingle = isSingleConditional(conditional);

  // Get conditions array
  const conditions: Condition[] = isMulti
    ? conditional.conditions
    : isSingle
    ? [conditional.when]
    : [];

  const logicType: LogicType = isMulti ? conditional.logicType : 'and';

  const handleActionChange = (newAction: ConditionalAction) => {
    if (isMulti) {
      onChange({ ...conditional, action: newAction });
    } else if (isSingle) {
      onChange({ ...conditional, action: newAction });
    }
  };

  const handleConditionChange = (index: number, updates: Partial<Condition>) => {
    const newConditions = conditions.map((c, i) =>
      i === index ? { ...c, ...updates } : c
    );
    if (isSingle) {
      onChange({ action, when: newConditions[0] } as Conditional);
    } else {
      onChange({
        action,
        logicType,
        conditions: newConditions,
      } as Conditional);
    }
  };

  const handleAddCondition = () => {
    const newCondition = createDefaultCondition(allFields);
    if (isSingle) {
      // Convert to multi
      onChange({
        action,
        logicType: 'and',
        conditions: [conditional.when, newCondition],
      } as Conditional);
    } else if (isMulti) {
      onChange({
        ...conditional,
        conditions: [...conditional.conditions, newCondition],
      });
    }
  };

  const handleDeleteCondition = (index: number) => {
    if (conditions.length <= 1) {
      onClear();
      return;
    }
    const newConditions = conditions.filter((_, i) => i !== index);
    if (newConditions.length === 1) {
      // Convert back to single
      onChange({ action, when: newConditions[0] } as Conditional);
    } else {
      onChange({
        action,
        logicType,
        conditions: newConditions,
      } as Conditional);
    }
  };

  const handleLogicTypeChange = (_: unknown, newLogic: LogicType | null) => {
    if (!newLogic || !isMulti) return;
    onChange({ ...conditional, logicType: newLogic });
  };

  return (
    <Box>
      {/* Header: action + clear */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>動作</InputLabel>
          <Select
            value={action}
            onChange={(e) => handleActionChange(e.target.value as ConditionalAction)}
            label="動作"
          >
            <MenuItem value="show">顯示</MenuItem>
            <MenuItem value="hide">隱藏</MenuItem>
          </Select>
        </FormControl>
        <IconButton size="small" color="error" onClick={onClear} title="清除條件">
          <ClearIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Logic type toggle (only for multi) */}
      {isMulti && (
        <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'center' }}>
          <ToggleButtonGroup
            value={logicType}
            exclusive
            onChange={handleLogicTypeChange}
            size="small"
          >
            <ToggleButton value="and">且 (AND)</ToggleButton>
            <ToggleButton value="or">或 (OR)</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Condition list */}
      {conditions.map((condition, index) => (
        <Paper key={index} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              條件 {index + 1}
            </Typography>
            <IconButton size="small" color="error" onClick={() => handleDeleteCondition(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Field selection */}
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>當欄位</InputLabel>
            <Select
              value={condition.field}
              onChange={(e) => handleConditionChange(index, { field: e.target.value })}
              label="當欄位"
            >
              {allFields.map((f) => (
                <MenuItem key={f.id} value={f.name}>
                  {(f.label || f.name).replace(/<[^>]*>/g, '')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Operator selection */}
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <InputLabel>條件</InputLabel>
            <Select
              value={condition.operator}
              onChange={(e) =>
                handleConditionChange(index, { operator: e.target.value as ConditionalOperator })
              }
              label="條件"
            >
              {OPERATORS.map((op) => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Value (not needed for isEmpty/isNotEmpty) */}
          {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
            <TextField
              fullWidth
              size="small"
              label="值"
              value={condition.value ?? ''}
              onChange={(e) => handleConditionChange(index, { value: e.target.value })}
            />
          )}
        </Paper>
      ))}

      {/* Add condition button */}
      {allFields.length > 0 && (
        <Button
          variant="text"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddCondition}
          fullWidth
        >
          新增條件
        </Button>
      )}
    </Box>
  );
}

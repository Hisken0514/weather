/**
 * PageProperties - 頁面屬性編輯器
 */

import { useMemo } from 'react';
import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useFormBuilderStore, useSelectedPage } from '@/stores/formBuilderStore';
import { ConditionalEditor } from './common/ConditionalEditor';
import type { PageNavigationRule, ConditionalOperator, Conditional } from '@/types/form';

const generateRuleId = () => `rule-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

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
];

export function PageProperties() {
  const page = useSelectedPage();
  const { schema, updatePage } = useFormBuilderStore();

  if (!page) return null;

  const allowPrevious = page.allowPrevious ?? true;
  const navigationRules = page.navigationRules ?? [];

  // Get all fields from current page for conditional navigation
  const pageFields = page.fields.filter(f =>
    !['panel', 'paneldynamic', 'html', 'section', 'hidden'].includes(f.type)
  );

  // Get other pages for navigation targets
  const otherPages = schema.pages.filter(p => p.id !== page.id);

  const handleAllowPreviousChange = (checked: boolean) => {
    updatePage(page.id, { allowPrevious: checked });
  };

  const handleAddRule = () => {
    const newRule: PageNavigationRule = {
      id: generateRuleId(),
      fieldName: pageFields[0]?.name || '',
      operator: 'equals',
      value: '',
      targetPageId: otherPages[0]?.id || '',
    };
    updatePage(page.id, {
      navigationRules: [...navigationRules, newRule],
    });
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<PageNavigationRule>) => {
    const updatedRules = navigationRules.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    );
    updatePage(page.id, { navigationRules: updatedRules });
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = navigationRules.filter(rule => rule.id !== ruleId);
    updatePage(page.id, { navigationRules: updatedRules });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        頁面設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {page.title || '未命名頁面'}
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Allow Previous */}
      <FormControlLabel
        control={
          <Switch
            checked={allowPrevious}
            onChange={(e) => handleAllowPreviousChange(e.target.checked)}
          />
        }
        label="允許返回上一頁"
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3, ml: 6 }}>
        關閉後，使用者將無法返回前一頁
      </Typography>

      {/* Default Visible */}
      <FormControlLabel
        control={
          <Switch
            checked={page.visible !== false}
            onChange={(e) => updatePage(page.id, { visible: e.target.checked })}
          />
        }
        label="預設顯示"
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3, ml: 6 }}>
        關閉後，此頁面預設隱藏（可搭配條件顯示）
      </Typography>

      <Divider sx={{ my: 2 }} />

      {/* Conditional Navigation */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          條件跳頁
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          根據欄位值自動跳至指定頁面
        </Typography>

        {navigationRules.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            尚未設定條件跳頁規則
          </Typography>
        ) : (
          navigationRules.map((rule, index) => (
            <Paper key={rule.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  規則 {index + 1}
                </Typography>
                <IconButton size="small" color="error" onClick={() => handleDeleteRule(rule.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Field Selection */}
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>當欄位</InputLabel>
                <Select
                  value={rule.fieldName}
                  onChange={(e) => handleUpdateRule(rule.id, { fieldName: e.target.value })}
                  label="當欄位"
                >
                  {pageFields.map(f => (
                    <MenuItem key={f.id} value={f.name}>
                      {(f.label || f.name).replace(/<[^>]*>/g, '')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Operator Selection */}
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>條件</InputLabel>
                <Select
                  value={rule.operator}
                  onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value as ConditionalOperator })}
                  label="條件"
                >
                  {OPERATORS.map(op => (
                    <MenuItem key={op.value} value={op.value}>
                      {op.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Value (not needed for isEmpty/isNotEmpty) */}
              {!['isEmpty', 'isNotEmpty'].includes(rule.operator) && (
                <TextField
                  fullWidth
                  size="small"
                  label="值"
                  value={rule.value}
                  onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                  sx={{ mb: 1 }}
                />
              )}

              {/* Target Page */}
              <FormControl fullWidth size="small">
                <InputLabel>跳至頁面</InputLabel>
                <Select
                  value={rule.targetPageId}
                  onChange={(e) => handleUpdateRule(rule.id, { targetPageId: e.target.value })}
                  label="跳至頁面"
                >
                  {otherPages.map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.title || '未命名頁面'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>
          ))
        )}

        {/* Add Rule Button */}
        {pageFields.length > 0 && otherPages.length > 0 ? (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddRule}
            fullWidth
          >
            新增跳頁規則
          </Button>
        ) : (
          <Typography variant="caption" color="text.disabled">
            {pageFields.length === 0
              ? '此頁面沒有可用欄位'
              : '需要至少兩個頁面才能設定跳頁規則'}
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Page Visibility Condition */}
      <PageVisibilityCondition />
    </Box>
  );
}

// ============================================================================
// Page Visibility Condition Sub-component
// ============================================================================

function PageVisibilityCondition() {
  const page = useSelectedPage();
  const { schema, updatePage } = useFormBuilderStore();

  // All fields from ALL pages (page visibility may depend on previous pages)
  const allFields = useMemo(() => {
    return schema.pages
      .flatMap((p) => p.fields)
      .filter(
        (f) => !['panel', 'paneldynamic', 'html', 'section'].includes(f.type)
      );
  }, [schema.pages]);

  if (!page) return null;

  const handleChange = (conditional: Conditional) => {
    updatePage(page.id, { visibilityCondition: conditional });
  };

  const handleClear = () => {
    updatePage(page.id, { visibilityCondition: undefined });
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        頁面顯示條件
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
        設定此頁面何時顯示或隱藏
      </Typography>
      <ConditionalEditor
        conditional={page.visibilityCondition}
        allFields={allFields}
        onChange={handleChange}
        onClear={handleClear}
      />
    </Box>
  );
}

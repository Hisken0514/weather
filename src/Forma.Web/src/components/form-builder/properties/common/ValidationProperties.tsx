/**
 * ValidationProperties - Validation rules configuration
 */

import {
  Box,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  Typography,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';
import type { ValidationRule, ValidationRuleType } from '@/types/form';

const ruleTypes: { value: ValidationRuleType; label: string; needsValue: boolean }[] = [
  { value: 'required', label: '必填', needsValue: false },
  { value: 'minLength', label: '最小長度', needsValue: true },
  { value: 'maxLength', label: '最大長度', needsValue: true },
  { value: 'min', label: '最小值', needsValue: true },
  { value: 'max', label: '最大值', needsValue: true },
  { value: 'pattern', label: '正則表達式', needsValue: true },
  { value: 'email', label: '電子郵件格式', needsValue: false },
  { value: 'url', label: 'URL 格式', needsValue: false },
  { value: 'minSelect', label: '最少選擇數', needsValue: true },
  { value: 'maxSelect', label: '最多選擇數', needsValue: true },
  { value: 'fileSize', label: '檔案大小限制', needsValue: true },
  { value: 'fileType', label: '檔案類型限制', needsValue: true },
];

export function ValidationProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;

  const rules = field.validation?.rules || [];

  const handleAddRule = () => {
    const newRule: ValidationRule = {
      type: 'required',
      message: '此欄位為必填',
    };

    updateField(field.id, {
      validation: {
        ...field.validation,
        rules: [...rules, newRule],
      },
    });
  };

  const handleUpdateRule = (index: number, updates: Partial<ValidationRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };

    updateField(field.id, {
      validation: {
        ...field.validation,
        rules: newRules,
      },
    });
  };

  const handleDeleteRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);

    updateField(field.id, {
      validation: {
        ...field.validation,
        rules: newRules,
      },
    });
  };

  const getRuleTypeInfo = (type: ValidationRuleType) => {
    return ruleTypes.find((r) => r.value === type);
  };

  return (
    <PropertySection title="驗證規則" defaultExpanded={false}>
      <Stack spacing={2}>
        {rules.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            尚未設定驗證規則
          </Typography>
        ) : (
          rules.map((rule, index) => {
            const ruleInfo = getRuleTypeInfo(rule.type);

            return (
              <Box
                key={index}
                sx={{
                  p: 1.5,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip
                    label={ruleInfo?.label || rule.type}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteRule(index)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Stack spacing={1.5}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>規則類型</InputLabel>
                    <Select
                      value={rule.type}
                      label="規則類型"
                      onChange={(e) =>
                        handleUpdateRule(index, { type: e.target.value as ValidationRuleType })
                      }
                    >
                      {ruleTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {ruleInfo?.needsValue && (
                    <TextField
                      label="值"
                      size="small"
                      fullWidth
                      value={rule.value || ''}
                      onChange={(e) => handleUpdateRule(index, { value: e.target.value })}
                    />
                  )}

                  <TextField
                    label="錯誤訊息"
                    size="small"
                    fullWidth
                    value={rule.message}
                    onChange={(e) => handleUpdateRule(index, { message: e.target.value })}
                  />
                </Stack>
              </Box>
            );
          })
        )}

        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAddRule}
        >
          新增驗證規則
        </Button>
      </Stack>
    </PropertySection>
  );
}

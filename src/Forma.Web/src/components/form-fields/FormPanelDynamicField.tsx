/**
 * FormPanelDynamicField - 動態面板欄位組件
 * 可動態增減的可重複面板區塊
 */

import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  FormControl,
  FormLabel,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useFormContext, useFieldArray } from 'react-hook-form';
import type { PanelDynamicField as PanelDynamicFieldType, Field } from '@/types/form';
import { FieldRenderer } from './FieldRenderer';

interface FormPanelDynamicFieldProps {
  field: PanelDynamicFieldType;
  allFieldsRequired?: boolean;
}

export function FormPanelDynamicField({ field, allFieldsRequired }: FormPanelDynamicFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, required, disabled, readOnly, properties } = field;

  const minItems = properties?.minItems ?? 0;
  const maxItems = properties?.maxItems ?? 100;
  const addButtonText = properties?.addButtonText ?? '新增項目';
  const removeButtonText = properties?.removeButtonText ?? '刪除';
  const itemLabel = properties?.itemLabel ?? '項目';
  const templateFields = properties?.fields ?? [];

  const { fields: items, append, remove } = useFieldArray({
    control,
    name,
  });

  const canAdd = !disabled && !readOnly && items.length < maxItems;
  const canRemove = !disabled && !readOnly && items.length > minItems;

  const handleAdd = () => {
    if (!canAdd) return;
    // 建立新項目，包含所有欄位的預設值
    const newItem: Record<string, unknown> = { _id: Math.random().toString(36).substr(2, 9) };
    templateFields.forEach((f) => {
      newItem[f.name] = f.defaultValue ?? '';
    });
    append(newItem);
  };

  const handleRemove = (index: number) => {
    if (!canRemove) return;
    remove(index);
  };

  // 為每個項目產生具有唯一名稱的欄位定義
  const getItemFields = (itemIndex: number): Field[] => {
    return templateFields.map((f) => ({
      ...f,
      id: `${id}-${itemIndex}-${f.id}`,
      name: `${name}.${itemIndex}.${f.name}`,
    }));
  };

  return (
    <FormControl error={false} disabled={disabled} fullWidth>
      <FormLabel required={required}>{label ?? name}</FormLabel>
      {description && (
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          {description}
        </Typography>
      )}

      <Box sx={{ mt: 1 }}>
        {items.map((item, index) => (
          <Paper key={item.id} variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
            {/* 項目標題 */}
            <Box
              sx={{
                p: 1.5,
                backgroundColor: 'grey.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="subtitle2">
                {itemLabel} {index + 1}
              </Typography>
              {canRemove && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemove(index)}
                  title={removeButtonText}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* 項目內容 */}
            <Box sx={{ p: 2 }}>
              {getItemFields(index).map((childField) => (
                <Box key={childField.id} sx={{ mb: 2 }}>
                  <FieldRenderer field={childField} allFieldsRequired={allFieldsRequired} />
                </Box>
              ))}
            </Box>
          </Paper>
        ))}

        {canAdd && (
          <Button
            type="button"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            fullWidth
          >
            {addButtonText}
          </Button>
        )}
      </Box>
    </FormControl>
  );
}

export default FormPanelDynamicField;

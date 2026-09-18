/**
 * PanelDynamicProperties - 動態面板欄位屬性設定
 */

import { TextField, Stack } from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function PanelDynamicProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;
  if (field.type !== 'paneldynamic') return null;

  const properties = (field as any).properties || {};

  const handlePropertyChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: {
        ...properties,
        [key]: value,
      },
    });
  };

  return (
    <PropertySection title="動態面板設定" defaultExpanded>
      <Stack spacing={2}>
        <TextField
          label="項目標籤"
          size="small"
          fullWidth
          value={properties.itemLabel ?? ''}
          onChange={(e) => handlePropertyChange('itemLabel', e.target.value)}
          placeholder="項目"
          helperText="每個項目顯示的標籤前綴，如「項目 1」"
        />

        <TextField
          label="最少項目數"
          size="small"
          fullWidth
          type="number"
          value={properties.minItems ?? 0}
          onChange={(e) => handlePropertyChange('minItems', Number(e.target.value))}
          inputProps={{ min: 0 }}
        />

        <TextField
          label="最多項目數"
          size="small"
          fullWidth
          type="number"
          value={properties.maxItems ?? 10}
          onChange={(e) => handlePropertyChange('maxItems', Number(e.target.value))}
          inputProps={{ min: 1 }}
        />

        <TextField
          label="新增按鈕文字"
          size="small"
          fullWidth
          value={properties.addButtonText ?? ''}
          onChange={(e) => handlePropertyChange('addButtonText', e.target.value)}
          placeholder="新增"
        />

        <TextField
          label="刪除按鈕文字"
          size="small"
          fullWidth
          value={properties.removeButtonText ?? ''}
          onChange={(e) => handlePropertyChange('removeButtonText', e.target.value)}
          placeholder="刪除"
        />
      </Stack>
    </PropertySection>
  );
}

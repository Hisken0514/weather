/**
 * NumberProperties - Number/Slider field specific properties
 */

import { TextField, Stack, FormControlLabel, Switch } from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function NumberProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;

  // Only show for number-type fields
  if (!['number', 'slider'].includes(field.type)) return null;

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
    <PropertySection title="數值欄位設定" defaultExpanded>
      <Stack spacing={2}>
        <TextField
          label="最小值"
          size="small"
          fullWidth
          type="number"
          value={properties.min ?? ''}
          onChange={(e) =>
            handlePropertyChange('min', e.target.value ? parseFloat(e.target.value) : null)
          }
        />

        <TextField
          label="最大值"
          size="small"
          fullWidth
          type="number"
          value={properties.max ?? ''}
          onChange={(e) =>
            handlePropertyChange('max', e.target.value ? parseFloat(e.target.value) : null)
          }
        />

        <TextField
          label="步進值"
          size="small"
          fullWidth
          type="number"
          value={properties.step ?? 1}
          onChange={(e) =>
            handlePropertyChange('step', e.target.value ? parseFloat(e.target.value) : 1)
          }
        />

        <TextField
          label="小數位數"
          size="small"
          fullWidth
          type="number"
          value={properties.precision ?? ''}
          onChange={(e) =>
            handlePropertyChange('precision', e.target.value ? parseInt(e.target.value) : undefined)
          }
          slotProps={{
            htmlInput: { min: 0, max: 10 }
          }}
        />

        <TextField
          label="單位"
          size="small"
          fullWidth
          value={properties.unit ?? ''}
          onChange={(e) => handlePropertyChange('unit', e.target.value)}
          placeholder="例如：元、kg、%"
        />

        {field.type === 'number' && (
          <FormControlLabel
            control={
              <Switch
                checked={properties.showButtons ?? false}
                onChange={(e) => handlePropertyChange('showButtons', e.target.checked)}
              />
            }
            label="顯示加減按鈕"
          />
        )}
      </Stack>
    </PropertySection>
  );
}

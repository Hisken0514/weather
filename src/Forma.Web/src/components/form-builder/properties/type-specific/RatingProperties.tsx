/**
 * RatingProperties - Rating field specific properties
 */

import {
  TextField,
  Stack,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function RatingProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;

  // Only show for rating fields
  if (field.type !== 'rating') return null;

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
    <PropertySection title="評分欄位設定" defaultExpanded>
      <Stack spacing={2}>
        <TextField
          label="最高評分"
          size="small"
          fullWidth
          type="number"
          value={properties.maxRating ?? 5}
          onChange={(e) =>
            handlePropertyChange('maxRating', e.target.value ? parseInt(e.target.value) : 5)
          }
          slotProps={{
            htmlInput: { min: 1, max: 10 }
          }}
        />

        <FormControl size="small" fullWidth>
          <InputLabel>顯示樣式</InputLabel>
          <Select
            value={properties.displayMode ?? 'buttons'}
            label="顯示樣式"
            onChange={(e) => handlePropertyChange('displayMode', e.target.value)}
          >
            <MenuItem value="buttons">星星按鈕</MenuItem>
            <MenuItem value="dropdown">下拉選單</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={properties.allowHalf ?? false}
              onChange={(e) => handlePropertyChange('allowHalf', e.target.checked)}
            />
          }
          label="允許半星評分"
        />

        <TextField
          label="評分標籤 (逗號分隔)"
          size="small"
          fullWidth
          value={(properties.labels || []).join(', ')}
          onChange={(e) => {
            const labels = e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s);
            handlePropertyChange('labels', labels.length ? labels : undefined);
          }}
          helperText="例如：很差, 差, 普通, 好, 很好"
        />
      </Stack>
    </PropertySection>
  );
}

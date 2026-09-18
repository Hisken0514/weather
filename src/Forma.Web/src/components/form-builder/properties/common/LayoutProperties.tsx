/**
 * LayoutProperties - Layout-related field properties (width, visibility)
 */

import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';
import type { LayoutWidth } from '@/types/form';

const widthOptions: { value: LayoutWidth; label: string }[] = [
  { value: 'full', label: '全寬 (100%)' },
  { value: 'half', label: '半寬 (50%)' },
  { value: 'third', label: '三分之一 (33%)' },
  { value: 'quarter', label: '四分之一 (25%)' },
  { value: 'auto', label: '自動' },
];

export function LayoutProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;

  const handleLayoutChange = (key: string, value: unknown) => {
    updateField(field.id, {
      layout: {
        ...field.layout,
        [key]: value,
      },
    });
  };

  const handleVisibilityChange = (visible: boolean) => {
    updateField(field.id, { visible });
  };

  return (
    <PropertySection title="版面配置" defaultExpanded={false}>
      <Stack spacing={2}>
        <FormControl size="small" fullWidth>
          <InputLabel>欄位寬度</InputLabel>
          <Select
            value={field.layout?.width || 'full'}
            label="欄位寬度"
            onChange={(e) => handleLayoutChange('width', e.target.value)}
          >
            {widthOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={field.visible !== false}
              onChange={(e) => handleVisibilityChange(e.target.checked)}
            />
          }
          label="預設顯示"
        />
      </Stack>
    </PropertySection>
  );
}

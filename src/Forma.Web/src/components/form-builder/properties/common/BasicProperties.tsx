/**
 * BasicProperties - Basic field properties (placeholder, disabled, readonly)
 * Note: label and description are edited directly in the canvas
 */

import { TextField, Stack, FormControlLabel, Switch } from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function BasicProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;

  // Hide placeholder for field types that don't use it
  const noPlaceholderTypes = [
    'multipletext', 'imagepicker', 'ranking', 'matrix', 'matrixdropdown',
    'matrixdynamic', 'file', 'image', 'signature', 'boolean', 'rating',
    'panel', 'paneldynamic', 'section', 'html', 'hidden',
  ];
  const showPlaceholder = !noPlaceholderTypes.includes(field.type);

  const handleChange = (key: string, value: unknown) => {
    updateField(field.id, { [key]: value });
  };

  return (
    <PropertySection title="基本屬性" defaultExpanded>
      <Stack spacing={2}>
        {showPlaceholder && (
          <TextField
            label="佔位文字 (placeholder)"
            size="small"
            fullWidth
            value={field.placeholder || ''}
            onChange={(e) => handleChange('placeholder', e.target.value)}
          />
        )}

        <FormControlLabel
          control={
            <Switch
              checked={field.disabled || false}
              onChange={(e) => handleChange('disabled', e.target.checked)}
            />
          }
          label="停用"
        />

        <FormControlLabel
          control={
            <Switch
              checked={field.readOnly || false}
              onChange={(e) => handleChange('readOnly', e.target.checked)}
            />
          }
          label="唯讀"
        />
      </Stack>
    </PropertySection>
  );
}

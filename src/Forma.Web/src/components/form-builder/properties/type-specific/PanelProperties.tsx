/**
 * PanelProperties - Panel field specific properties
 */

import { TextField, Stack, FormControlLabel, Switch } from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function PanelProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;

  // Only show for panel fields
  if (field.type !== 'panel') return null;

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
    <PropertySection title="面板設定" defaultExpanded>
      <Stack spacing={2}>
        <TextField
          label="面板標題"
          size="small"
          fullWidth
          value={properties.title ?? ''}
          onChange={(e) => handlePropertyChange('title', e.target.value)}
        />

        <TextField
          label="面板說明"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={properties.description ?? ''}
          onChange={(e) => handlePropertyChange('description', e.target.value)}
        />

        <FormControlLabel
          control={
            <Switch
              checked={properties.collapsible ?? false}
              onChange={(e) => handlePropertyChange('collapsible', e.target.checked)}
            />
          }
          label="可折疊"
        />

        {properties.collapsible && (
          <FormControlLabel
            control={
              <Switch
                checked={properties.collapsed ?? false}
                onChange={(e) => handlePropertyChange('collapsed', e.target.checked)}
              />
            }
            label="預設收合"
          />
        )}
      </Stack>
    </PropertySection>
  );
}

/**
 * HtmlProperties - HTML 內容欄位屬性設定
 */

import { TextField, Stack } from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function HtmlProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;
  if (field.type !== 'html') return null;

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
    <PropertySection title="HTML 內容設定" defaultExpanded>
      <Stack spacing={2}>
        <TextField
          label="HTML 內容"
          size="small"
          fullWidth
          multiline
          minRows={6}
          maxRows={20}
          value={properties.content ?? ''}
          onChange={(e) => handlePropertyChange('content', e.target.value)}
          placeholder="<p>在此輸入 HTML 內容...</p>"
          helperText="支援 HTML 標籤，如 <h1>、<p>、<ul>、<table> 等"
        />
      </Stack>
    </PropertySection>
  );
}

/**
 * EndingProperties - 結束欄位專屬屬性
 */

import { Box, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useSelectedField, useFormBuilderStore } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function EndingProperties() {
  const field = useSelectedField();
  const { updateField } = useFormBuilderStore();

  if (!field || field.type !== 'ending') return null;

  const properties = field.properties || {};
  const title = properties.title ?? '';
  const message = properties.message ?? '';
  const imageUrl = properties.imageUrl ?? '';
  const alignment = properties.alignment ?? 'center';

  const handleChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: { ...properties, [key]: value },
    });
  };

  return (
    <PropertySection title="結束設定" defaultExpanded>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="標題"
          value={title}
          onChange={(e) => handleChange('title', e.target.value)}
          fullWidth
          size="small"
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="結語訊息"
          value={message}
          onChange={(e) => handleChange('message', e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={3}
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="圖片網址"
          value={imageUrl}
          onChange={(e) => handleChange('imageUrl', e.target.value)}
          fullWidth
          size="small"
          placeholder="https://..."
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>對齊方式</InputLabel>
          <Select
            value={alignment}
            onChange={(e) => handleChange('alignment', e.target.value)}
            label="對齊方式"
          >
            <MenuItem value="left">靠左</MenuItem>
            <MenuItem value="center">置中</MenuItem>
            <MenuItem value="right">靠右</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </PropertySection>
  );
}

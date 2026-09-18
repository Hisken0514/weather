/**
 * DownloadReportProperties - 下載報告欄位專屬屬性
 */

import {
  Box,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Autocomplete,
  Chip,
} from '@mui/material';
import { useSelectedField, useFormBuilderStore } from '@/stores/formBuilderStore';
import { fieldTypeDefinitions } from '../../toolbox/fieldTypeDefinitions';
import { PropertySection } from '../PropertySection';

export function DownloadReportProperties() {
  const field = useSelectedField();
  const { updateField } = useFormBuilderStore();

  if (!field || field.type !== 'downloadreport') return null;

  const properties = field.properties || {};
  const coverTitle = properties.coverTitle ?? '報告';
  const showDate = properties.showDate ?? true;
  const dateLabel = properties.dateLabel ?? '日期';
  const buttonText = properties.buttonText ?? '下載報告';
  const showLogo = properties.showLogo ?? true;
  const excludeFieldTypes = properties.excludeFieldTypes ?? ['welcome', 'ending', 'downloadreport', 'hidden', 'html'];

  // Build options for Autocomplete from fieldTypeDefinitions
  const fieldTypeOptions = fieldTypeDefinitions.map((def) => ({
    value: def.type,
    label: def.label,
  }));

  const handleChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: { ...properties, [key]: value },
    });
  };

  return (
    <PropertySection title="報告設定" defaultExpanded>
      <Box sx={{ mb: 2 }}>
        <TextField
          label="封面標題"
          value={coverTitle}
          onChange={(e) => handleChange('coverTitle', e.target.value)}
          fullWidth
          size="small"
          helperText="支援 {{欄位name}} 模板語法，如 {{公司}}輔導報告"
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showDate}
              onChange={(e) => handleChange('showDate', e.target.checked)}
            />
          }
          label="顯示日期"
        />
      </Box>
      {showDate && (
        <Box sx={{ mb: 2 }}>
          <TextField
            label="日期標籤"
            value={dateLabel}
            onChange={(e) => handleChange('dateLabel', e.target.value)}
            fullWidth
            size="small"
          />
        </Box>
      )}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="按鈕文字"
          value={buttonText}
          onChange={(e) => handleChange('buttonText', e.target.value)}
          fullWidth
          size="small"
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showLogo}
              onChange={(e) => handleChange('showLogo', e.target.checked)}
            />
          }
          label="封面顯示計畫 Logo"
        />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Autocomplete
          multiple
          size="small"
          options={fieldTypeOptions}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.value === value.value}
          value={excludeFieldTypes.map((t: string) => {
            const def = fieldTypeOptions.find((o) => o.value === t);
            return def ?? { value: t, label: t };
          })}
          onChange={(_, newValue) => {
            handleChange('excludeFieldTypes', newValue.map((v) => v.value));
          }}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.value}
                label={option.label}
                size="small"
              />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} label="排除的欄位類型" />
          )}
        />
      </Box>
      <Box sx={{ p: 1.5, backgroundColor: 'info.lighter', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          封面標題模板範例：{'{{公司}}輔導報告'}
        </Typography>
      </Box>
    </PropertySection>
  );
}

/**
 * ExpressionProperties - 計算欄位專屬屬性
 */

import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import { useSelectedField, useFormBuilderStore, useActivePageFields } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function ExpressionProperties() {
  const field = useSelectedField();
  const { updateField } = useFormBuilderStore();
  const allFields = useActivePageFields();

  if (!field || field.type !== 'expression') return null;

  const properties = field.properties || {};
  const formula = properties.formula ?? '';
  const precision = properties.precision ?? 2;
  const unit = properties.unit ?? '';
  const displayFormat = properties.displayFormat ?? 'number';

  // Get available fields for reference (exclude expression fields to avoid circular refs)
  const availableFields = allFields.filter(f =>
    f.id !== field.id &&
    !['expression', 'panel', 'paneldynamic', 'html', 'section', 'hidden'].includes(f.type)
  );

  const handleChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: { ...properties, [key]: value },
    });
  };

  return (
    <PropertySection title="計算設定" defaultExpanded>
      {/* Formula */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="計算公式"
          value={formula}
          onChange={(e) => handleChange('formula', e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder="{price} * {quantity}"
          helperText="使用 {欄位名稱} 引用其他欄位，支援 + - * / () ^ 運算"
        />
      </Box>

      {/* Available Fields Reference */}
      {availableFields.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, backgroundColor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            可用欄位（點擊插入）：
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {availableFields.map((f) => {
              // Strip HTML tags from label for display
              const labelText = (f.label || f.name).replace(/<[^>]*>/g, '');
              return (
                <Box
                  key={f.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1,
                    py: 0.5,
                    backgroundColor: 'white',
                    borderRadius: 0.5,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'grey.300',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      borderColor: 'primary.main',
                    },
                  }}
                  onClick={() => {
                    handleChange('formula', formula + `{${f.name}}`);
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    {labelText}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      backgroundColor: 'grey.200',
                      px: 0.5,
                      borderRadius: 0.5,
                    }}
                  >
                    {`{${f.name}}`}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Display Format */}
      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel>顯示格式</InputLabel>
          <Select
            value={displayFormat}
            onChange={(e) => handleChange('displayFormat', e.target.value)}
            label="顯示格式"
          >
            <MenuItem value="number">數字</MenuItem>
            <MenuItem value="currency">貨幣 (NT$)</MenuItem>
            <MenuItem value="percent">百分比 (%)</MenuItem>
            <MenuItem value="text">純文字</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Precision */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="小數位數"
          type="number"
          value={precision}
          onChange={(e) => handleChange('precision', parseInt(e.target.value) || 0)}
          fullWidth
          size="small"
          inputProps={{ min: 0, max: 10 }}
        />
      </Box>

      {/* Unit */}
      <Box sx={{ mb: 2 }}>
        <TextField
          label="單位"
          value={unit}
          onChange={(e) => handleChange('unit', e.target.value)}
          fullWidth
          size="small"
          placeholder="例如：元、公斤、件"
        />
      </Box>

      {/* Formula Examples */}
      <Box sx={{ p: 1.5, backgroundColor: 'info.lighter', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          公式範例：
        </Typography>
        <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace' }}>
          • 加總：{'{price} + {tax}'}<br />
          • 乘法：{'{price} * {quantity}'}<br />
          • 次方：{'{base} ^ 2'} 或 {'{base} ** 2'}<br />
          • BMI：{'{weight} / ({height} / 100) ^ 2'}<br />
          • 平均：{'({a} + {b} + {c}) / 3'}
        </Typography>
      </Box>
    </PropertySection>
  );
}

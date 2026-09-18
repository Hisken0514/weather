/**
 * TextProperties - Text field specific properties
 */

import { TextField, Stack, Box, Button } from '@mui/material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';

export function TextProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  if (!field) return null;

  // Only show for text-type fields
  const textTypes = ['text', 'textarea', 'email', 'phone', 'url', 'password'];
  if (!textTypes.includes(field.type)) return null;

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
    <PropertySection title="文字欄位設定" defaultExpanded>
      <Stack spacing={2}>
        <TextField
          label="最小長度"
          size="small"
          fullWidth
          type="number"
          value={properties.minLength ?? ''}
          onChange={(e) =>
            handlePropertyChange('minLength', e.target.value ? parseInt(e.target.value) : undefined)
          }
        />

        <TextField
          label="最大長度"
          size="small"
          fullWidth
          type="number"
          value={properties.maxLength ?? ''}
          onChange={(e) =>
            handlePropertyChange('maxLength', e.target.value ? parseInt(e.target.value) : undefined)
          }
        />

        {field.type === 'textarea' && (
          <TextField
            label="行數"
            size="small"
            fullWidth
            type="number"
            value={properties.rows ?? 4}
            onChange={(e) =>
              handlePropertyChange('rows', e.target.value ? parseInt(e.target.value) : 4)
            }
            slotProps={{
              htmlInput: { min: 1, max: 20 }
            }}
          />
        )}

        <TextField
          label="正則表達式 (pattern)"
          size="small"
          fullWidth
          value={properties.pattern ?? ''}
          onChange={(e) => handlePropertyChange('pattern', e.target.value || null)}
          helperText="例如：[0-9]+ 只允許數字"
        />

        <TextField
          label="輸入遮罩 (inputMask)"
          size="small"
          fullWidth
          value={properties.inputMask ?? ''}
          onChange={(e) => handlePropertyChange('inputMask', e.target.value || null)}
          helperText="9=數字, a=字母, *=任意"
        />

        {/* Common mask presets */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {[
            { label: '手機', mask: '(99)99-999-999' },
            { label: '市話', mask: '(99)9999-9999' },
            { label: '身分證', mask: 'a999999999' },
            { label: '信用卡', mask: '9999-9999-9999-9999' },
            { label: '郵遞區號', mask: '999' },
          ].map((preset) => (
            <Button
              key={preset.mask}
              size="small"
              variant="outlined"
              onClick={() => handlePropertyChange('inputMask', preset.mask)}
              sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 'auto' }}
            >
              {preset.label}
            </Button>
          ))}
          {properties.inputMask && (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => handlePropertyChange('inputMask', null)}
              sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 'auto' }}
            >
              清除
            </Button>
          )}
        </Box>
      </Stack>
    </PropertySection>
  );
}

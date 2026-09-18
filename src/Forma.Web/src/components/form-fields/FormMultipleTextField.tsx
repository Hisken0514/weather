/**
 * FormMultipleTextField - 多重文字欄位組件
 */

import { Box, Grid, TextField, FormControl, FormHelperText } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { MultipleTextField as MultipleTextFieldType } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormMultipleTextFieldProps {
  field: MultipleTextFieldType;
}

export function FormMultipleTextField({ field }: FormMultipleTextFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, required, disabled, readOnly, properties } = field;

  const items = properties?.items ?? [];
  const colCount = properties?.colCount ?? 2;

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={{}}
      rules={{
        validate: required
          ? (value) => {
              const vals = value || {};
              return Object.values(vals).some((v) => v !== '' && v !== undefined && v !== null) || '此欄位為必填';
            }
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const values = controllerField.value || {};

        const handleItemChange = (itemName: string, value: string) => {
          controllerField.onChange({
            ...values,
            [itemName]: value,
          });
        };

        return (
          <Box>
            <FieldLabel label={label} required={required} />
            <FormControl error={!!error} disabled={disabled} fullWidth>
              <Grid container spacing={2}>
                {items.map((item) => (
                  <Grid size={{ xs: 12, md: 12 / colCount }} key={item.name}>
                    <TextField
                      id={`${id}-${item.name}`}
                      label={item.label}
                      placeholder={item.placeholder || `請輸入${item.label}...`}
                      value={values[item.name] || ''}
                      onChange={(e) => handleItemChange(item.name, e.target.value)}
                      disabled={disabled}
                      slotProps={{
                        input: {
                          readOnly: readOnly,
                        },
                      }}
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                ))}
              </Grid>

              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
            <FieldDescription description={description} />
          </Box>
        );
      }}
    />
  );
}

export default FormMultipleTextField;

/**
 * FormNumberField - 數值輸入欄位組件
 * 支援類型: number, slider
 */

import { TextField, Slider, Box, Typography, InputAdornment } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { NumberField as NumberFieldType } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormNumberFieldProps {
  field: NumberFieldType;
}

export function FormNumberField({ field }: FormNumberFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, placeholder, required, disabled, readOnly, properties } = field;

  const min = properties?.min ?? undefined;
  const max = properties?.max ?? undefined;
  const step = properties?.step ?? 1;
  const unit = properties?.unit;

  // Slider 模式
  if (field.type === 'slider') {
    return (
      <Controller
        name={name}
        control={control}
        defaultValue={field.defaultValue ?? (min ?? 0)}
        rules={{ required: required ? '此欄位為必填' : false }}
        render={({ field: controllerField, fieldState: { error } }) => (
          <Box sx={{ width: '100%' }}>
            <FieldLabel label={label} required={required} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Slider
                {...controllerField}
                id={id}
                min={min ?? 0}
                max={max ?? 100}
                step={step}
                disabled={disabled || readOnly}
                valueLabelDisplay="auto"
                onChange={(_, value) => controllerField.onChange(value)}
              />
              <Typography variant="body2" sx={{ minWidth: 60 }}>
                {controllerField.value}
                {unit && ` ${unit}`}
              </Typography>
            </Box>
            {error && (
              <Typography variant="caption" color="error">
                {error.message}
              </Typography>
            )}
            <FieldDescription description={description} />
          </Box>
        )}
      />
    );
  }

  // Number 輸入模式
  return (
    <Controller
      name={name}
      control={control}
      defaultValue={field.defaultValue ?? ''}
      rules={{ required: required ? '此欄位為必填' : false }}
      render={({ field: controllerField, fieldState: { error } }) => (
        <Box>
          <FieldLabel label={label} required={required} htmlFor={id} />
          <TextField
            {...controllerField}
            id={id}
            placeholder={placeholder}
            disabled={disabled}
            slotProps={{
              input: {
                readOnly: readOnly,
                endAdornment: unit ? <InputAdornment position="end">{unit}</InputAdornment> : undefined,
              },
            }}
            type="number"
            error={!!error}
            helperText={error?.message}
            fullWidth
            variant="outlined"
            inputProps={{
              min,
              max,
              step,
            }}
            onChange={(e) => {
              const value = e.target.value === '' ? '' : Number(e.target.value);
              controllerField.onChange(value);
            }}
          />
          <FieldDescription description={description} />
        </Box>
      )}
    />
  );
}

export default FormNumberField;

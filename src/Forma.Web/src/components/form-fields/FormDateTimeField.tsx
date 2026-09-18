/**
 * FormDateTimeField - 日期時間欄位組件
 * 支援類型: date, time, datetime
 */

import { Box, TextField } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { DateTimeField as DateTimeFieldType } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormDateTimeFieldProps {
  field: DateTimeFieldType;
}

export function FormDateTimeField({ field }: FormDateTimeFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, placeholder, required, disabled, readOnly, properties } = field;

  // 根據類型決定 input type
  const getInputType = () => {
    switch (field.type) {
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'date';
    }
  };

  const minDate = properties?.minDate ?? undefined;
  const maxDate = properties?.maxDate ?? undefined;

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
              },
            }}
            type={getInputType()}
            error={!!error}
            helperText={error?.message}
            fullWidth
            variant="outlined"
            inputProps={{
              min: minDate,
              max: maxDate,
            }}
          />
          <FieldDescription description={description} />
        </Box>
      )}
    />
  );
}

export default FormDateTimeField;

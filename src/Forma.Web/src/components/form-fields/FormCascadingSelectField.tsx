/**
 * FormCascadingSelectField - 階層式聯動下拉選單
 */

import {
  Box,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { CascadingSelectField as CascadingSelectFieldType, CascadingOption } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormCascadingSelectFieldProps {
  field: CascadingSelectFieldType;
}

export function FormCascadingSelectField({ field }: FormCascadingSelectFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, required, disabled, readOnly, properties } = field;

  const levels = properties?.levels ?? [];
  const rootOptions = properties?.options ?? [];

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={field.defaultValue ?? []}
      rules={{
        validate: required
          ? (value) => (Array.isArray(value) && value.length > 0 && value.some((v: string) => v !== '')) || '此欄位為必填'
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const values: string[] = Array.isArray(controllerField.value) ? controllerField.value : [];

        const getOptionsForLevel = (levelIndex: number): CascadingOption[] => {
          if (levelIndex === 0) return rootOptions;
          let current = rootOptions;
          for (let i = 0; i < levelIndex; i++) {
            const selected = current.find((o) => o.value === values[i]);
            if (!selected?.children) return [];
            current = selected.children;
          }
          return current;
        };

        const handleChange = (levelIndex: number, newValue: string) => {
          const newValues = [...values];
          newValues[levelIndex] = newValue;
          // Clear subsequent levels
          for (let i = levelIndex + 1; i < levels.length; i++) {
            newValues[i] = '';
          }
          controllerField.onChange(newValues);
        };

        return (
          <Box>
            <FieldLabel label={label} required={required} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {levels.map((level, idx) => {
                const levelOptions = getOptionsForLevel(idx);
                const isDisabled = disabled || readOnly || (idx > 0 && !values[idx - 1]);

                return (
                  <FormControl
                    key={idx}
                    size="small"
                    sx={{ minWidth: 150, flex: 1 }}
                    error={!!error}
                    disabled={isDisabled}
                  >
                    <InputLabel>{level.label}</InputLabel>
                    <Select
                      value={values[idx] ?? ''}
                      label={level.label}
                      onChange={(e) => handleChange(idx, e.target.value as string)}
                      readOnly={readOnly}
                    >
                      <MenuItem value="">
                        <em>{level.placeholder ?? '請選擇'}</em>
                      </MenuItem>
                      {levelOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              })}
            </Box>
            {error && <FormHelperText error>{error.message}</FormHelperText>}
            <FieldDescription description={description} />
          </Box>
        );
      }}
    />
  );
}

export default FormCascadingSelectField;

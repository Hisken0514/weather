/**
 * FormSelectField - 選擇欄位組件
 * 支援類型: select, multiselect, radio, checkbox
 */

import { useState } from 'react';
import {
  FormControl,
  FormHelperText,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  OutlinedInput,
  Box,
  Chip,
  TextField,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { SelectField as SelectFieldType } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormSelectFieldProps {
  field: SelectFieldType;
}

export function FormSelectField({ field }: FormSelectFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, required, disabled, readOnly, properties } = field;
  const [otherText, setOtherText] = useState('');

  const options = properties?.options ?? [];
  const colCount = properties?.colCount ?? 1;
  const allowOther = properties?.allowOther ?? false;
  const otherLabel = properties?.otherLabel ?? '其他';
  const noneOption = properties?.noneOption ?? false;
  const noneLabel = '無';

  // Radio 單選
  if (field.type === 'radio') {
    return (
      <Controller
        name={name}
        control={control}
        defaultValue={field.defaultValue ?? ''}
        rules={{ required: required ? '此欄位為必填' : false }}
        render={({ field: controllerField, fieldState: { error } }) => (
          <Box>
            <FieldLabel label={label} required={required} />
            <FormControl error={!!error} disabled={disabled} fullWidth>
              <RadioGroup
                {...controllerField}
                id={id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                }}
                onChange={(e) => {
                  controllerField.onChange(e.target.value);
                  if (e.target.value !== '__other__') {
                    setOtherText('');
                  }
                }}
              >
                {noneOption && (
                  <FormControlLabel
                    value=""
                    control={<Radio />}
                    label={noneLabel}
                    disabled={readOnly}
                  />
                )}
                {options.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    value={option.value}
                    control={<Radio />}
                    label={option.label}
                    disabled={option.disabled || readOnly}
                  />
                ))}
                {allowOther && (
                  <FormControlLabel
                    value="__other__"
                    control={<Radio />}
                    label={otherLabel}
                    disabled={readOnly}
                  />
                )}
              </RadioGroup>
              {allowOther && controllerField.value === '__other__' && (
                <TextField
                  size="small"
                  placeholder={`請輸入${otherLabel}...`}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  disabled={disabled || readOnly}
                  sx={{ mt: 1, ml: 4 }}
                />
              )}
              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
            <FieldDescription description={description} />
          </Box>
        )}
      />
    );
  }

  // Checkbox 多選
  if (field.type === 'checkbox') {
    return (
      <Controller
        name={name}
        control={control}
        defaultValue={field.defaultValue ?? []}
        rules={{
          validate: required
            ? (value) => (Array.isArray(value) && value.length > 0) || '此欄位為必填'
            : undefined,
        }}
        render={({ field: controllerField, fieldState: { error } }) => {
          const selectedValues = Array.isArray(controllerField.value) ? controllerField.value : [];

          const handleChange = (optionValue: string | number, checked: boolean) => {
            if (checked) {
              controllerField.onChange([...selectedValues, optionValue]);
            } else {
              controllerField.onChange(selectedValues.filter((v: string | number) => v !== optionValue));
              if (optionValue === '__other__') {
                setOtherText('');
              }
            }
          };

          return (
            <Box>
              <FieldLabel label={label} required={required} />
              <FormControl error={!!error} disabled={disabled} fullWidth>
                <FormGroup
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                  }}
                >
                  {noneOption && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedValues.includes('')}
                          onChange={(e) => handleChange('', e.target.checked)}
                          disabled={readOnly}
                        />
                      }
                      label={noneLabel}
                    />
                  )}
                  {options.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      control={
                        <Checkbox
                          checked={selectedValues.includes(option.value)}
                          onChange={(e) => handleChange(option.value, e.target.checked)}
                          disabled={option.disabled || readOnly}
                        />
                      }
                      label={option.label}
                    />
                  ))}
                  {allowOther && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedValues.includes('__other__')}
                          onChange={(e) => handleChange('__other__', e.target.checked)}
                          disabled={readOnly}
                        />
                      }
                      label={otherLabel}
                    />
                  )}
                </FormGroup>
                {allowOther && selectedValues.includes('__other__') && (
                  <TextField
                    size="small"
                    placeholder={`請輸入${otherLabel}...`}
                    value={otherText}
                    onChange={(e) => setOtherText(e.target.value)}
                    disabled={disabled || readOnly}
                    sx={{ mt: 1, ml: 4 }}
                  />
                )}
                {error && <FormHelperText>{error.message}</FormHelperText>}
              </FormControl>
              <FieldDescription description={description} />
            </Box>
          );
        }}
      />
    );
  }

  // Select 下拉選單（單選或多選）
  const isMultiple = field.type === 'multiselect';

  // Build all options including none and other
  const allOptions = [
    ...(noneOption ? [{ value: '', label: noneLabel }] : []),
    ...options,
    ...(allowOther ? [{ value: '__other__', label: otherLabel }] : []),
  ];

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={field.defaultValue ?? (isMultiple ? [] : '')}
      rules={{
        validate: required
          ? (value) => {
              if (isMultiple) return (Array.isArray(value) && value.length > 0) || '此欄位為必填';
              return (value !== '' && value !== undefined && value !== null) || '此欄位為必填';
            }
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => (
        <Box>
          <FieldLabel label={label} required={required} />
          <FormControl error={!!error} disabled={disabled} fullWidth>
            <Select
              {...controllerField}
              id={id}
              multiple={isMultiple}
              input={<OutlinedInput />}
              readOnly={readOnly}
              displayEmpty
              onChange={(e) => {
                controllerField.onChange(e.target.value);
                if (e.target.value !== '__other__' && !isMultiple) {
                  setOtherText('');
                }
                if (isMultiple) {
                  const values = e.target.value as (string | number)[];
                  if (!values.includes('__other__')) {
                    setOtherText('');
                  }
                }
              }}
              renderValue={(selected) => {
                if (isMultiple) {
                  const selectedArray = selected as (string | number)[];
                  if (selectedArray.length === 0) {
                    return <em>請選擇</em>;
                  }
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedArray.map((value) => {
                        if (value === '__other__') {
                          return <Chip key={value} label={otherText || otherLabel} size="small" />;
                        }
                        if (value === '') {
                          return <Chip key="none" label={noneLabel} size="small" />;
                        }
                        const option = options.find((o) => o.value === value);
                        return <Chip key={value} label={option?.label ?? value} size="small" />;
                      })}
                    </Box>
                  );
                }
                if (selected === '' && noneOption) {
                  return noneLabel;
                }
                if (!selected && selected !== '') {
                  return <em>請選擇</em>;
                }
                if (selected === '__other__') {
                  return otherText || otherLabel;
                }
                const option = options.find((o) => o.value === selected);
                return option?.label ?? selected;
              }}
            >
              {allOptions.map((option) => (
                <MenuItem key={option.value || 'none'} value={option.value} disabled={(option as { disabled?: boolean }).disabled}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {allowOther && (
              (isMultiple ? (controllerField.value as (string | number)[])?.includes('__other__') : controllerField.value === '__other__')
            ) && (
              <TextField
                size="small"
                placeholder={`請輸入${otherLabel}...`}
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                disabled={disabled || readOnly}
                sx={{ mt: 1 }}
                fullWidth
              />
            )}
            {error && <FormHelperText>{error.message}</FormHelperText>}
          </FormControl>
          <FieldDescription description={description} />
        </Box>
      )}
    />
  );
}

export default FormSelectField;

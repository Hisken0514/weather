/**
 * FormBooleanField - 布林欄位組件
 * 支援顯示樣式: switch, radio, checkbox
 */

import {
  Box,
  FormControl,
  FormHelperText,
  FormControlLabel,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { BooleanField as BooleanFieldType } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormBooleanFieldProps {
  field: BooleanFieldType;
}

export function FormBooleanField({ field }: FormBooleanFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, required, disabled, readOnly, properties } = field;

  const displayStyle = properties?.displayStyle ?? 'switch';
  const labelTrue = properties?.labelTrue ?? '是';
  const labelFalse = properties?.labelFalse ?? '否';

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={field.defaultValue ?? false}
      rules={{
        validate: required
          ? (value) => value === true || '此欄位為必填'
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        // Radio 樣式
        if (displayStyle === 'radio') {
          return (
            <Box>
              <FieldLabel label={label} required={required} />
              <FormControl error={!!error} disabled={disabled} fullWidth>
                <RadioGroup
                  row
                  value={controllerField.value ? 'true' : 'false'}
                  onChange={(e) => controllerField.onChange(e.target.value === 'true')}
                >
                  <FormControlLabel
                    value="true"
                    control={<Radio />}
                    label={labelTrue}
                    disabled={readOnly}
                  />
                  <FormControlLabel
                    value="false"
                    control={<Radio />}
                    label={labelFalse}
                    disabled={readOnly}
                  />
                </RadioGroup>
                {error && <FormHelperText>{error.message}</FormHelperText>}
              </FormControl>
              <FieldDescription description={description} />
            </Box>
          );
        }

        // Checkbox 樣式
        if (displayStyle === 'checkbox') {
          return (
            <Box>
              <FormControl error={!!error} disabled={disabled} fullWidth>
                <FormControlLabel
                  control={
                    <Checkbox
                      id={id}
                      checked={!!controllerField.value}
                      onChange={(e) => controllerField.onChange(e.target.checked)}
                      disabled={readOnly}
                    />
                  }
                  label={
                    <Box
                      component="span"
                      sx={{
                        '& b, & strong': { fontWeight: 700 },
                        '& i, & em': { fontStyle: 'italic' },
                        '& u': { textDecoration: 'underline' },
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: label ?? name }} />
                      {required && <span style={{ color: 'red' }}> *</span>}
                    </Box>
                  }
                />
                {error && <FormHelperText>{error.message}</FormHelperText>}
              </FormControl>
              <FieldDescription description={description} />
            </Box>
          );
        }

        // Switch 樣式 (預設)
        return (
          <Box>
            <FormControl error={!!error} disabled={disabled} fullWidth>
              <FormControlLabel
                control={
                  <Switch
                    id={id}
                    checked={!!controllerField.value}
                    onChange={(e) => controllerField.onChange(e.target.checked)}
                    disabled={readOnly}
                  />
                }
                label={
                  <Box
                    component="span"
                    sx={{
                      '& b, & strong': { fontWeight: 700 },
                      '& i, & em': { fontStyle: 'italic' },
                      '& u': { textDecoration: 'underline' },
                    }}
                  >
                    <span dangerouslySetInnerHTML={{ __html: label ?? name }} />
                    {required && <span style={{ color: 'red' }}> *</span>}
                  </Box>
                }
              />
              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
            <FieldDescription description={description} />
          </Box>
        );
      }}
    />
  );
}

export default FormBooleanField;

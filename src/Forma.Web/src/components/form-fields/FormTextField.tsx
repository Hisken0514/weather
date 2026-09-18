/**
 * FormTextField - 文字輸入欄位組件
 * 支援類型: text, textarea, email, phone, url, password
 * 支援輸入遮罩 (inputMask)
 */

import { useCallback } from 'react';
import { Box, TextField as MuiTextField } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { TextField as TextFieldType } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormTextFieldProps {
  field: TextFieldType;
}

/**
 * 輸入遮罩處理
 * 9 = 數字
 * a = 字母
 * * = 任意字元
 * 其他字元為固定字元
 */
function applyMask(value: string, mask: string): string {
  if (!mask || !value) return value;

  let result = '';
  let valueIndex = 0;

  for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
    const maskChar = mask[i];
    const inputChar = value[valueIndex];

    if (maskChar === '9') {
      // 只接受數字
      if (/\d/.test(inputChar)) {
        result += inputChar;
        valueIndex++;
      } else {
        // 跳過非數字
        valueIndex++;
        i--; // 重試當前遮罩位置
      }
    } else if (maskChar === 'a') {
      // 只接受字母
      if (/[a-zA-Z]/.test(inputChar)) {
        result += inputChar;
        valueIndex++;
      } else {
        valueIndex++;
        i--;
      }
    } else if (maskChar === '*') {
      // 接受任意字元
      result += inputChar;
      valueIndex++;
    } else {
      // 固定字元
      result += maskChar;
      // 如果輸入的字元就是固定字元，跳過它
      if (inputChar === maskChar) {
        valueIndex++;
      }
    }
  }

  return result;
}

/**
 * 從遮罩值中提取純數值（用於存儲）
 */
function extractRawValue(value: string, mask: string): string {
  if (!mask || !value) return value;

  let result = '';
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    // 只保留遮罩中對應位置是 9, a, * 的字元
    const maskIndex = Math.min(i, mask.length - 1);
    const maskChar = mask[maskIndex];
    if (maskChar === '9' || maskChar === 'a' || maskChar === '*') {
      if (!/[^a-zA-Z0-9]/.test(char) || maskChar === '*') {
        result += char;
      }
    } else if (char !== maskChar) {
      // 如果不是固定字元，也保留
      result += char;
    }
  }
  return result;
}

export function FormTextField({ field }: FormTextFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, placeholder, required, disabled, readOnly, properties } = field;

  const inputMask = properties?.inputMask;

  // 根據類型決定 input type
  const getInputType = () => {
    switch (field.type) {
      case 'email':
        return 'email';
      case 'password':
        return 'password';
      case 'url':
        return 'url';
      case 'phone':
        return 'tel';
      default:
        return 'text';
    }
  };

  // 是否為多行文字
  const isMultiline = field.type === 'textarea';
  const rows = properties?.rows ?? 4;

  // 處理遮罩輸入
  const handleMaskedChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      onChange: (value: string) => void
    ) => {
      if (!inputMask) {
        onChange(e.target.value);
        return;
      }

      const rawInput = e.target.value;
      // 提取純數值再套用遮罩
      const rawValue = extractRawValue(rawInput, inputMask);
      const maskedValue = applyMask(rawValue, inputMask);
      onChange(maskedValue);
    },
    [inputMask]
  );

  // 生成 placeholder 從遮罩
  const getMaskPlaceholder = () => {
    if (!inputMask) return placeholder;
    if (placeholder) return placeholder;

    // 將遮罩轉換為 placeholder
    return inputMask
      .replace(/9/g, '_')
      .replace(/a/g, '_')
      .replace(/\*/g, '_');
  };

  return (
    <Box>
      <FieldLabel label={label} required={required} htmlFor={id} />
      <Controller
        name={name}
        control={control}
        defaultValue={field.defaultValue ?? ''}
        rules={{ required: required ? '此欄位為必填' : false }}
        render={({ field: controllerField, fieldState: { error } }) => (
          <MuiTextField
            {...controllerField}
            onChange={(e) => handleMaskedChange(e, controllerField.onChange)}
            id={id}
            placeholder={getMaskPlaceholder()}
            disabled={disabled}
            slotProps={{
              input: {
                readOnly: readOnly,
              },
            }}
            type={getInputType()}
            multiline={isMultiline}
            rows={isMultiline ? rows : undefined}
            error={!!error}
            helperText={error?.message}
            fullWidth
            variant="outlined"
            inputProps={{
              minLength: properties?.minLength,
              maxLength: inputMask ? inputMask.length : properties?.maxLength,
              pattern: properties?.pattern ?? undefined,
            }}
          />
        )}
      />
      <FieldDescription description={description} />
    </Box>
  );
}

export default FormTextField;

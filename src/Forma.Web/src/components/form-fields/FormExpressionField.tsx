/**
 * FormExpressionField - 計算欄位組件
 * 用於顯示根據其他欄位計算的結果（唯讀）
 */

import { useEffect, useMemo } from 'react';
import {
  FormControl,
  FormLabel,
  FormHelperText,
  Typography,
  Paper,
} from '@mui/material';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { ExpressionField as ExpressionFieldType } from '@/types/form';

interface FormExpressionFieldProps {
  field: ExpressionFieldType;
}

export function FormExpressionField({ field }: FormExpressionFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, disabled, properties } = field;

  const formula = properties?.formula ?? '';
  const precision = properties?.precision ?? 2;
  const unit = properties?.unit ?? '';
  const displayFormat = properties?.displayFormat ?? 'number';

  // 監聽所有表單值的變化
  const formValues = useWatch({ control });

  // 解析公式並計算結果
  const calculateResult = useMemo(() => {
    if (!formula) return null;

    try {
      // 簡單的公式解析：將 {fieldName} 替換為實際值
      let expression = formula;
      const fieldPattern = /\{([^}]+)\}/g;
      let match;

      while ((match = fieldPattern.exec(formula)) !== null) {
        const fieldName = match[1];
        const fieldValue = formValues?.[fieldName];
        const numValue = Number(fieldValue) || 0;
        expression = expression.replace(match[0], String(numValue));
      }

      // 安全地評估數學表達式（支援基本運算和次方）
      // 將 ^ 轉換為 ** (JavaScript 次方運算符)
      expression = expression.replace(/\^/g, '**');

      // 移除所有非數學字符以防止注入（允許 * 連續出現作為次方）
      const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
      if (sanitized !== expression.replace(/\s/g, '')) {
        console.warn('Expression contains invalid characters');
        return null;
      }

      // 使用 Function 來安全地計算表達式
      const result = new Function(`return ${sanitized}`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return null;
      }

      return result;
    } catch (error) {
      console.warn('Expression evaluation failed:', error);
      return null;
    }
  }, [formula, formValues]);

  // 格式化顯示結果
  const formattedResult = useMemo(() => {
    if (calculateResult === null) return '-';

    const rounded = Number(calculateResult.toFixed(precision));

    switch (displayFormat) {
      case 'currency':
        return new Intl.NumberFormat('zh-TW', {
          style: 'currency',
          currency: 'TWD',
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(rounded);

      case 'percent':
        return new Intl.NumberFormat('zh-TW', {
          style: 'percent',
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(rounded / 100);

      case 'text':
        return String(rounded);

      case 'number':
      default:
        return new Intl.NumberFormat('zh-TW', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(rounded);
    }
  }, [calculateResult, displayFormat, precision]);

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={null}
      render={({ field: controllerField }) => {
        // 當計算結果改變時更新表單值
        useEffect(() => {
          if (calculateResult !== controllerField.value) {
            controllerField.onChange(calculateResult);
          }
        }, [calculateResult, controllerField]);

        return (
          <FormControl disabled={disabled} fullWidth>
            <FormLabel>{label ?? name}</FormLabel>

            <Paper
              variant="outlined"
              sx={{
                mt: 1,
                p: 2,
                backgroundColor: 'grey.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h6" color={calculateResult === null ? 'textSecondary' : 'textPrimary'}>
                {formattedResult}
              </Typography>
              {unit && (
                <Typography variant="body2" color="textSecondary">
                  {unit}
                </Typography>
              )}
            </Paper>

            <FormHelperText>{description}</FormHelperText>
          </FormControl>
        );
      }}
    />
  );
}

export default FormExpressionField;

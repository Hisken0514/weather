/**
 * FormMatrixField - 矩陣欄位組件 (單選矩陣)
 * 支援「無」和「其他」選項
 */

import { useState } from 'react';
import {
  FormControl,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  Paper,
  useMediaQuery,
  useTheme,
  Box,
  Typography,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { MatrixField as MatrixFieldType, MatrixColumn } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormMatrixFieldProps {
  field: MatrixFieldType;
}

export function FormMatrixField({ field }: FormMatrixFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, required, disabled, readOnly, properties } = field;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const rows = properties?.rows ?? [];
  const columns = properties?.columns ?? [];
  const alternateRows = properties?.alternateRows ?? false;
  const showHeader = properties?.showHeader ?? true;

  // Special options
  const noneOption = properties?.noneOption ?? false;
  const noneLabel = properties?.noneLabel ?? '不適用';
  const allowOther = properties?.allowOther ?? false;
  const otherLabel = properties?.otherLabel ?? '其他';

  // Track "other" text for each row
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});

  // Build all columns including special ones
  const allColumns: MatrixColumn[] = [
    ...(noneOption ? [{ id: '__none__', label: noneLabel }] : []),
    ...columns,
    ...(allowOther ? [{ id: '__other__', label: otherLabel }] : []),
  ];

  // 響應式模式設定
  const responsiveMode = properties?.responsiveMode;
  const mobileMode = responsiveMode?.mobile ?? 'stack';

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={{}}
      rules={{
        validate: required
          ? (value) => {
              const vals = value || {};
              return (rows.length > 0 && rows.every((r) => vals[r.id])) || '請完成所有列的選擇';
            }
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const values = controllerField.value || {};

        const handleChange = (rowId: string, columnId: string) => {
          if (disabled || readOnly) return;
          controllerField.onChange({
            ...values,
            [rowId]: columnId,
          });
          // Clear other text if not selecting "other"
          if (columnId !== '__other__' && otherTexts[rowId]) {
            setOtherTexts(prev => {
              const next = { ...prev };
              delete next[rowId];
              return next;
            });
          }
        };

        const handleOtherTextChange = (rowId: string, text: string) => {
          setOtherTexts(prev => ({ ...prev, [rowId]: text }));
        };

        // 手機版堆疊顯示
        if (isMobile && mobileMode === 'stack') {
          return (
            <FormControl error={!!error} disabled={disabled} fullWidth>
              <FieldLabel label={label ?? name} required={required} />

              <Box sx={{ mt: 1 }}>
                {rows.map((row) => (
                  <Paper key={row.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
                    <Typography
                      variant="subtitle2"
                      gutterBottom
                      dangerouslySetInnerHTML={{ __html: row.label }}
                    />
                    <RadioGroup
                      value={values[row.id] || ''}
                      onChange={(e) => handleChange(row.id, e.target.value)}
                    >
                      {allColumns.map((col) => (
                        <FormControlLabel
                          key={col.id}
                          value={col.id}
                          control={<Radio size="small" />}
                          label={<span dangerouslySetInnerHTML={{ __html: col.label }} />}
                          disabled={disabled || readOnly}
                        />
                      ))}
                    </RadioGroup>
                    {/* Other text input */}
                    {allowOther && values[row.id] === '__other__' && (
                      <TextField
                        size="small"
                        placeholder={`請說明...`}
                        value={otherTexts[row.id] || ''}
                        onChange={(e) => handleOtherTextChange(row.id, e.target.value)}
                        disabled={disabled || readOnly}
                        fullWidth
                        sx={{ mt: 1, ml: 4 }}
                      />
                    )}
                  </Paper>
                ))}
              </Box>

              {error?.message && <FormHelperText>{error.message}</FormHelperText>}
              <FieldDescription description={description} />
            </FormControl>
          );
        }

        // 桌面版表格顯示
        return (
          <FormControl error={!!error} disabled={disabled} fullWidth>
            <FieldLabel label={label ?? name} required={required} />

            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                {showHeader && (
                  <TableHead>
                    <TableRow>
                      <TableCell />
                      {allColumns.map((col) => (
                        <TableCell
                          key={col.id}
                          align="center"
                          dangerouslySetInnerHTML={{ __html: col.label }}
                        />
                      ))}
                    </TableRow>
                  </TableHead>
                )}
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <>
                      <TableRow
                        key={row.id}
                        sx={{
                          backgroundColor:
                            alternateRows && rowIndex % 2 === 1
                              ? 'action.hover'
                              : 'inherit',
                        }}
                      >
                        <TableCell
                          component="th"
                          scope="row"
                          dangerouslySetInnerHTML={{ __html: row.label }}
                        />
                        {allColumns.map((col) => (
                          <TableCell key={col.id} align="center">
                            <Radio
                              checked={values[row.id] === col.id}
                              onChange={() => handleChange(row.id, col.id)}
                              disabled={disabled || readOnly}
                              size="small"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                      {/* Other text input row */}
                      {allowOther && values[row.id] === '__other__' && (
                        <TableRow key={`${row.id}-other`}>
                          <TableCell colSpan={allColumns.length + 1}>
                            <TextField
                              size="small"
                              placeholder={`${row.label} - 請說明...`}
                              value={otherTexts[row.id] || ''}
                              onChange={(e) => handleOtherTextChange(row.id, e.target.value)}
                              disabled={disabled || readOnly}
                              fullWidth
                              sx={{ ml: 2 }}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {error?.message && <FormHelperText>{error.message}</FormHelperText>}
            <FieldDescription description={description} />
          </FormControl>
        );
      }}
    />
  );
}

export default FormMatrixField;

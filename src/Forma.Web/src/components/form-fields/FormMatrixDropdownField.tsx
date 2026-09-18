/**
 * FormMatrixDropdownField - 矩陣下拉欄位組件
 * 每行每列可以有不同類型的輸入（如下拉、文字等）
 */

import {
  FormControl,
  FormLabel,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  Box,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import type { MatrixDropdownField as MatrixDropdownFieldType } from '@/types/form';

interface FormMatrixDropdownFieldProps {
  field: MatrixDropdownFieldType;
}

export function FormMatrixDropdownField({ field }: FormMatrixDropdownFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, required, disabled, readOnly, properties } = field;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const rows = properties?.rows ?? [];
  const columns = properties?.columns ?? [];
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
              return (Object.keys(vals).length > 0) || '此欄位為必填';
            }
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const values = controllerField.value || {};

        const handleCellChange = (rowId: string, columnName: string, value: string) => {
          if (disabled || readOnly) return;
          controllerField.onChange({
            ...values,
            [rowId]: {
              ...(values[rowId] || {}),
              [columnName]: value,
            },
          });
        };

        const getCellValue = (rowId: string, columnName: string): string => {
          return values[rowId]?.[columnName] || '';
        };

        const renderCell = (rowId: string, column: typeof columns[0]) => {
          const value = getCellValue(rowId, column.name);

          switch (column.cellType) {
            case 'select':
            case 'radio':
              return (
                <Select
                  value={value}
                  onChange={(e) => handleCellChange(rowId, column.name, e.target.value)}
                  size="small"
                  fullWidth
                  disabled={disabled || readOnly}
                >
                  <MenuItem value="">
                    <em>請選擇</em>
                  </MenuItem>
                  {column.options?.map((opt) => (
                    <MenuItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              );

            case 'checkbox':
            case 'boolean':
              return (
                <Select
                  value={value}
                  onChange={(e) => handleCellChange(rowId, column.name, e.target.value)}
                  size="small"
                  fullWidth
                  disabled={disabled || readOnly}
                >
                  <MenuItem value="">
                    <em>請選擇</em>
                  </MenuItem>
                  <MenuItem value="true">是</MenuItem>
                  <MenuItem value="false">否</MenuItem>
                </Select>
              );

            case 'number':
              return (
                <TextField
                  type="number"
                  value={value}
                  onChange={(e) => handleCellChange(rowId, column.name, e.target.value)}
                  size="small"
                  fullWidth
                  disabled={disabled}
                  slotProps={{ input: { readOnly } }}
                />
              );

            default:
              return (
                <TextField
                  value={value}
                  onChange={(e) => handleCellChange(rowId, column.name, e.target.value)}
                  size="small"
                  fullWidth
                  disabled={disabled}
                  slotProps={{ input: { readOnly } }}
                />
              );
          }
        };

        // 手機版堆疊顯示
        if (isMobile && mobileMode === 'stack') {
          return (
            <FormControl error={!!error} disabled={disabled} fullWidth>
              <FormLabel required={required}>{label ?? name}</FormLabel>

              <Box sx={{ mt: 1 }}>
                {rows.map((row) => (
                  <Card key={row.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        {row.label}
                      </Typography>
                      {columns.map((col) => (
                        <Box key={col.name} sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="textSecondary">
                            {col.label}
                          </Typography>
                          {renderCell(row.id, col)}
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <FormHelperText>{error?.message ?? description}</FormHelperText>
            </FormControl>
          );
        }

        // 桌面版表格顯示
        return (
          <FormControl error={!!error} disabled={disabled} fullWidth>
            <FormLabel required={required}>{label ?? name}</FormLabel>

            <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    {columns.map((col) => (
                      <TableCell key={col.name} align="center">
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell component="th" scope="row">
                        {row.label}
                      </TableCell>
                      {columns.map((col) => (
                        <TableCell key={col.name} align="center">
                          {renderCell(row.id, col)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <FormHelperText>{error?.message ?? description}</FormHelperText>
          </FormControl>
        );
      }}
    />
  );
}

export default FormMatrixDropdownField;

/**
 * FormMatrixDynamicField - 動態矩陣欄位組件
 * 可動態增減行的矩陣
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
  IconButton,
  Button,
  useMediaQuery,
  useTheme,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Controller, useFormContext } from 'react-hook-form';
import type { MatrixDynamicField as MatrixDynamicFieldType } from '@/types/form';

interface FormMatrixDynamicFieldProps {
  field: MatrixDynamicFieldType;
}

interface RowData {
  _id: string;
  [key: string]: string;
}

export function FormMatrixDynamicField({ field }: FormMatrixDynamicFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, required, disabled, readOnly, properties } = field;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const columns = properties?.columns ?? [];
  const minRowCount = properties?.minRowCount ?? 0;
  const maxRowCount = properties?.maxRowCount ?? 100;
  const addRowText = properties?.addRowText ?? '新增一列';
  const removeRowText = properties?.removeRowText ?? '刪除';
  const responsiveMode = properties?.responsiveMode;
  const mobileMode = responsiveMode?.mobile ?? 'stack';

  const generateId = () => Math.random().toString(36).substr(2, 9);

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={[]}
      rules={{
        validate: required
          ? (value) => (Array.isArray(value) && value.length > 0) || '此欄位為必填'
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const rows: RowData[] = controllerField.value || [];

        const handleAddRow = () => {
          if (disabled || readOnly || rows.length >= maxRowCount) return;
          const newRow: RowData = { _id: generateId() };
          columns.forEach((col) => {
            newRow[col.name] = '';
          });
          controllerField.onChange([...rows, newRow]);
        };

        const handleRemoveRow = (index: number) => {
          if (disabled || readOnly || rows.length <= minRowCount) return;
          const newRows = rows.filter((_, i) => i !== index);
          controllerField.onChange(newRows);
        };

        const handleCellChange = (index: number, columnName: string, value: string) => {
          if (disabled || readOnly) return;
          const newRows = [...rows];
          newRows[index] = { ...newRows[index], [columnName]: value };
          controllerField.onChange(newRows);
        };

        const renderCell = (rowIndex: number, column: typeof columns[0]) => {
          const value = rows[rowIndex]?.[column.name] || '';

          switch (column.cellType) {
            case 'select':
            case 'radio':
              return (
                <Select
                  value={value}
                  onChange={(e) => handleCellChange(rowIndex, column.name, e.target.value)}
                  size="small"
                  fullWidth
                  disabled={disabled || readOnly}
                >
                  <MenuItem value="">
                    <em>請選擇</em>
                  </MenuItem>
                </Select>
              );

            case 'number':
              return (
                <TextField
                  type="number"
                  value={value}
                  onChange={(e) => handleCellChange(rowIndex, column.name, e.target.value)}
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
                  onChange={(e) => handleCellChange(rowIndex, column.name, e.target.value)}
                  size="small"
                  fullWidth
                  disabled={disabled}
                  slotProps={{ input: { readOnly } }}
                />
              );
          }
        };

        const canAddRow = !disabled && !readOnly && rows.length < maxRowCount;
        const canRemoveRow = !disabled && !readOnly && rows.length > minRowCount;

        // 手機版堆疊顯示
        if (isMobile && mobileMode === 'stack') {
          return (
            <FormControl error={!!error} disabled={disabled} fullWidth>
              <FormLabel required={required}>{label ?? name}</FormLabel>

              <Box sx={{ mt: 1 }}>
                {rows.map((row, rowIndex) => (
                  <Card key={row._id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        第 {rowIndex + 1} 列
                      </Typography>
                      {columns.map((col) => (
                        <Box key={col.name} sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="textSecondary">
                            {col.label}
                          </Typography>
                          {renderCell(rowIndex, col)}
                        </Box>
                      ))}
                    </CardContent>
                    {canRemoveRow && (
                      <CardActions>
                        <Button
                          type="button"
                          size="small"
                          color="error"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleRemoveRow(rowIndex)}
                        >
                          {removeRowText}
                        </Button>
                      </CardActions>
                    )}
                  </Card>
                ))}

                {canAddRow && (
                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleAddRow}
                    fullWidth
                  >
                    {addRowText}
                  </Button>
                )}
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
                    {columns.map((col) => (
                      <TableCell key={col.name}>{col.label}</TableCell>
                    ))}
                    {canRemoveRow && <TableCell width={60} />}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, rowIndex) => (
                    <TableRow key={row._id}>
                      {columns.map((col) => (
                        <TableCell key={col.name}>
                          {renderCell(rowIndex, col)}
                        </TableCell>
                      ))}
                      {canRemoveRow && (
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemoveRow(rowIndex)}
                            title={removeRowText}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {canAddRow && (
              <Box sx={{ mt: 1 }}>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddRow}
                >
                  {addRowText}
                </Button>
              </Box>
            )}

            <FormHelperText>{error?.message ?? description}</FormHelperText>
          </FormControl>
        );
      }}
    />
  );
}

export default FormMatrixDynamicField;

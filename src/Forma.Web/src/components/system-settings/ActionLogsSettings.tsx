/**
 * ActionLogsSettings - 操作日誌
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  TextField,
  Pagination,
  Stack,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { logsApi } from '@/lib/api/logs';
import type { ActionLogDto, ActionLogQueryParams } from '@/types/api/logs';

export function ActionLogsSettings() {
  const [logs, setLogs] = useState<ActionLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: ActionLogQueryParams = {
        pageNumber: page,
        pageSize,
        searchTerm: search || undefined,
        sortDescending: true,
      };
      const res = await logsApi.getActionLogs(params);
      setLogs(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>操作日誌</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="搜尋日誌..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          size="small"
          sx={{ minWidth: 300 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>操作類型</TableCell>
                <TableCell>操作名稱</TableCell>
                <TableCell>使用者</TableCell>
                <TableCell>目標</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleString('zh-TW')}
                  </TableCell>
                  <TableCell>{log.actionType}</TableCell>
                  <TableCell>{log.actionName}</TableCell>
                  <TableCell>{log.userName || '-'}</TableCell>
                  <TableCell>
                    {log.entityType ? `${log.entityType}${log.entityName ? ` (${log.entityName})` : ''}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.isSuccess ? '成功' : '失敗'}
                      size="small"
                      color={log.isSuccess ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.ipAddress || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>無日誌記錄</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Stack alignItems="center" sx={{ mt: 2 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Stack>
          )}
        </>
      )}
    </Box>
  );
}

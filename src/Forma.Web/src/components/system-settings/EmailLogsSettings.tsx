/**
 * EmailLogsSettings - 郵件日誌
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
import { emailLogsApi } from '@/lib/api/emailLogs';
import type { EmailLogDto, EmailLogQueryParams } from '@/types/api/emailLogs';

export function EmailLogsSettings() {
  const [logs, setLogs] = useState<EmailLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const pageSize = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: EmailLogQueryParams = {
        pageNumber: page,
        pageSize,
        searchTerm: search || undefined,
        sortDescending: true,
      };
      const res = await emailLogsApi.getLogs(params);
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
      <Typography variant="h6" gutterBottom>郵件日誌</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="搜尋郵件日誌..."
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
                <TableCell>寄送時間</TableCell>
                <TableCell>收件者</TableCell>
                <TableCell>主旨</TableCell>
                <TableCell>範本</TableCell>
                <TableCell>狀態</TableCell>
                <TableCell>錯誤訊息</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(log.sentAt).toLocaleString('zh-TW')}
                  </TableCell>
                  <TableCell>
                    {log.recipientName ? `${log.recipientName} <${log.recipientEmail}>` : log.recipientEmail}
                  </TableCell>
                  <TableCell>{log.subject}</TableCell>
                  <TableCell>
                    {log.templateKey ? (
                      <Chip label={log.templateKey} size="small" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.isSuccess ? '成功' : '失敗'}
                      size="small"
                      color={log.isSuccess ? 'success' : 'error'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      color="error"
                      sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {log.errorMessage || '-'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>無郵件日誌</Typography>
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

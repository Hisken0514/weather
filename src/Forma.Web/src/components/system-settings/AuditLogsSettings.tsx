/**
 * AuditLogsSettings - 帳號稽核紀錄
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { logsApi } from '@/lib/api/logs';
import type { AuditLogDto, AuditLogQueryParams } from '@/types/api/logs';

const ACTION_LABELS: Record<string, string> = {
  USER_CREATED: '建立帳號',
  USER_UPDATED: '修改資料',
  USER_ACTIVATED: '啟用帳號',
  USER_DEACTIVATED: '停用帳號',
  PASSWORD_CHANGED: '變更密碼',
};

const ACTION_COLORS: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  USER_CREATED: 'success',
  USER_UPDATED: 'info',
  USER_ACTIVATED: 'success',
  USER_DEACTIVATED: 'warning',
  PASSWORD_CHANGED: 'warning',
};

export function AuditLogsSettings() {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const pageSize = 20;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params: AuditLogQueryParams = {
        pageNumber: page,
        pageSize,
        search: search || undefined,
        action: actionFilter || undefined,
        descending: true,
      };
      const res = await logsApi.getAuditLogs(params);
      setLogs(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>帳號稽核紀錄</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        記錄所有帳號申請、建立、修改、啟用、停用及密碼變更操作。
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          placeholder="搜尋操作者或動作..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          size="small"
          sx={{ minWidth: 250 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>動作類型</InputLabel>
          <Select
            label="動作類型"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          >
            <MenuItem value="">全部</MenuItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <MenuItem key={key} value={key}>{label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>時間</TableCell>
                <TableCell>操作者</TableCell>
                <TableCell>動作</TableCell>
                <TableCell>對象帳號 ID</TableCell>
                <TableCell>異動內容</TableCell>
                <TableCell>來源 IP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString('zh-TW')}
                  </TableCell>
                  <TableCell>{log.userName || log.userId || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={ACTION_LABELS[log.action] ?? log.action}
                      size="small"
                      color={ACTION_COLORS[log.action] ?? 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'text.secondary' }}>
                    {log.entityId ?? '-'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    {log.changes ? (
                      <Tooltip title={<pre style={{ margin: 0, fontSize: '0.75rem' }}>{JSON.stringify(JSON.parse(log.changes), null, 2)}</pre>} placement="left">
                        <Typography
                          variant="body2"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'help',
                            color: 'text.secondary',
                            fontSize: '0.8rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {log.changes.length > 60 ? `${log.changes.slice(0, 60)}…` : log.changes}
                        </Typography>
                      </Tooltip>
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {log.ipAddress || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>無稽核紀錄</Typography>
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

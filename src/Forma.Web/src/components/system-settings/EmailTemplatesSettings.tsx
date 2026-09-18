/**
 * EmailTemplatesSettings - 信件範本管理
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
} from '@mui/icons-material';
import { emailTemplatesApi } from '@/lib/api/emailTemplates';
import type { EmailTemplateDto, UpdateEmailTemplateRequest } from '@/types/api/emailTemplates';

export function EmailTemplatesSettings() {
  const [templates, setTemplates] = useState<EmailTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmailTemplateDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);
  const [editTestVars, setEditTestVars] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await emailTemplatesApi.getAll();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (t: EmailTemplateDto) => {
    setEditing(t);
    setEditName(t.name);
    setEditSubject(t.subject);
    setEditHtml(t.htmlContent);
    setEditEnabled(t.isEnabled);
    setEditTestVars({ ...t.testVariables });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const req: UpdateEmailTemplateRequest = {
        name: editName,
        subject: editSubject,
        htmlContent: editHtml,
        isEnabled: editEnabled,
        testVariables: editTestVars,
      };
      await emailTemplatesApi.update(editing.id, req);
      setDialogOpen(false);
      setSuccess('範本已更新');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!editing) return;
    try {
      await emailTemplatesApi.sendTest({
        templateId: editing.id,
        recipientEmail: '', // backend uses current user
        variables: editTestVars,
      });
      setSuccess('測試信已寄出');
    } catch (err) {
      setError(err instanceof Error ? err.message : '寄送失敗');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>信件範本管理</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Template List */}
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>範本名稱</TableCell>
            <TableCell>狀態</TableCell>
            <TableCell>範本鍵值</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {templates.map((t) => (
            <TableRow key={t.id} hover>
              <TableCell>{t.name}</TableCell>
              <TableCell>
                <Chip
                  label={t.isEnabled ? '啟用' : '停用'}
                  size="small"
                  color={t.isEnabled ? 'success' : 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                  {t.templateKey}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="編輯">
                  <IconButton size="small" onClick={() => openEdit(t)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {templates.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography color="text.secondary" sx={{ py: 3 }}>尚無信件範本</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editing?.name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControlLabel
              control={<Switch checked={editEnabled} onChange={(e) => setEditEnabled(e.target.checked)} />}
              label="啟用此範本"
            />
            <TextField
              label="範本名稱"
              size="small"
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <TextField
              label="郵件主旨"
              size="small"
              fullWidth
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
            />
            <TextField
              label="HTML 內容"
              multiline
              rows={10}
              fullWidth
              value={editHtml}
              onChange={(e) => setEditHtml(e.target.value)}
              InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
            />

            {/* Available variables */}
            {editing && editing.availableVariables.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>可用變數</Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {editing.availableVariables.map((v) => (
                    <Chip key={v} label={`{{${v}}}`} size="small" variant="outlined" />
                  ))}
                </Box>
              </Box>
            )}

            {/* Test variables */}
            {editing && editing.availableVariables.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>測試變數</Typography>
                <Stack spacing={1}>
                  {editing.availableVariables.map((v) => (
                    <TextField
                      key={v}
                      label={`{{${v}}}`}
                      size="small"
                      value={editTestVars[v] || ''}
                      onChange={(e) => setEditTestVars({ ...editTestVars, [v]: e.target.value })}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSendTest} color="secondary">發送測試信</Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? '儲存中...' : '儲存'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

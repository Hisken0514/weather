/**
 * EmailSettings - 電子郵件 SMTP 設定
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { settingsApi } from '@/lib/api/settings';
import type { EmailSettingsDto } from '@/types/api/settings';

export function EmailSettings() {
  const [settings, setSettings] = useState<EmailSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getEmailSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入設定失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await settingsApi.updateEmailSettings(settings);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
  if (!settings) return <Alert severity="error">{error || '無法載入設定'}</Alert>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>電子郵件設定 (SMTP)</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>設定已儲存</Alert>}

      <Stack spacing={2.5} sx={{ maxWidth: 500 }}>
        <TextField
          label="SMTP 伺服器"
          required
          fullWidth
          size="small"
          value={settings.smtpServer}
          onChange={(e) => setSettings({ ...settings, smtpServer: e.target.value })}
        />
        <TextField
          label="端口"
          required
          type="number"
          size="small"
          value={settings.port}
          onChange={(e) => setSettings({ ...settings, port: Number(e.target.value) })}
          sx={{ width: 150 }}
        />
        <TextField
          label="使用者名稱"
          required
          fullWidth
          size="small"
          value={settings.userName}
          onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
        />
        <TextField
          label="密碼"
          type="password"
          fullWidth
          size="small"
          value={settings.password}
          onChange={(e) => setSettings({ ...settings, password: e.target.value })}
          helperText="留空表示不修改"
        />
        <TextField
          label="寄件者名稱"
          required
          fullWidth
          size="small"
          value={settings.senderName}
          onChange={(e) => setSettings({ ...settings, senderName: e.target.value })}
        />
        <TextField
          label="寄件者信箱"
          required
          fullWidth
          size="small"
          value={settings.senderEmail}
          onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableSsl}
              onChange={(e) => setSettings({ ...settings, enableSsl: e.target.checked })}
            />
          }
          label="啟用 SSL/TLS"
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
          建議啟用以確保連線安全
        </Typography>
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </Box>
    </Box>
  );
}

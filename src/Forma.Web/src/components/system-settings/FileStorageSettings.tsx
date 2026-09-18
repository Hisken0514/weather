/**
 * FileStorageSettings - 檔案儲存設定
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import { settingsApi } from '@/lib/api/settings';
import type { FileStorageSettingsDto } from '@/types/api/settings';

export function FileStorageSettings() {
  const [settings, setSettings] = useState<FileStorageSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getFileStorageSettings();
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
      await settingsApi.updateFileStorageSettings(settings);
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
      <Typography variant="h6" gutterBottom>檔案儲存設定</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>設定已儲存</Alert>}

      <Stack spacing={2.5} sx={{ maxWidth: 500 }}>
        <TextField
          label="上傳路徑"
          required
          fullWidth
          size="small"
          value={settings.uploadPath}
          onChange={(e) => setSettings({ ...settings, uploadPath: e.target.value })}
          helperText="檔案上傳的伺服器路徑"
        />
        <TextField
          label="允許的副檔名"
          required
          fullWidth
          size="small"
          value={settings.allowedExtensions}
          onChange={(e) => setSettings({ ...settings, allowedExtensions: e.target.value })}
          helperText="以逗號分隔，例如: .jpg,.png,.pdf"
        />
        <TextField
          label="最大檔案大小 (MB)"
          required
          type="number"
          size="small"
          value={settings.maxFileSizeInMB}
          onChange={(e) => setSettings({ ...settings, maxFileSizeInMB: Number(e.target.value) })}
          helperText="單一檔案上傳大小限制"
          sx={{ width: 200 }}
        />
      </Stack>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Fido2Settings - FIDO2 / Passkey 系統設定
 * 管理員啟用/停用 FIDO2 功能
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { settingsApi } from '@/lib/api/settings';
import type { Fido2SettingsDto } from '@/types/api/settings';

export function Fido2Settings() {
  const [settings, setSettings] = useState<Fido2SettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await settingsApi.getFido2Settings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入設定失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await settingsApi.updateFido2Settings(settings);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存設定失敗');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!settings) {
    return <Alert severity="error">{error || '無法載入設定'}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        FIDO2 / Passkey 設定
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        管理系統的 FIDO2 / Passkey 無密碼登入功能。啟用後，使用者可在個人設定中註冊安全金鑰或生物辨識裝置。
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          設定已儲存
        </Alert>
      )}

      <Box sx={{ pl: 2, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={settings.enableFido2}
              onChange={(e) => setSettings({ ...settings, enableFido2: e.target.checked })}
            />
          }
          label="啟用 FIDO2 / Passkey 無密碼登入"
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
          啟用後，使用者可使用安全金鑰（如 YubiKey）、指紋辨識或臉部辨識進行登入，
          無需輸入密碼。支援 WebAuthn 標準。
        </Typography>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </Box>
    </Box>
  );
}

export default Fido2Settings;

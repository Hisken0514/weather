/**
 * PasskeySettings - 使用者 Passkey 管理
 * 使用者在個人設定中管理自己的安全金鑰
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Key as KeyIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { fido2Api } from '@/lib/api/fido2';
import type { Fido2CredentialInfo, Fido2SettingsDto } from '@/types/api/settings';

// WebAuthn 瀏覽器 API helpers
async function registerPasskey(deviceName?: string): Promise<boolean> {
  try {
    // 1. 取得註冊選項
    const options = await fido2Api.startRegistration(deviceName);

    // 2. 呼叫瀏覽器 WebAuthn API
    const credential = await navigator.credentials.create({
      publicKey: parseCreationOptions(options),
    }) as PublicKeyCredential | null;

    if (!credential) throw new Error('使用者取消了註冊');

    // 3. 將結果送回伺服器
    const attestationResponse = credential.response as AuthenticatorAttestationResponse;
    const transports = typeof attestationResponse.getTransports === 'function'
      ? attestationResponse.getTransports()
      : [];

    await fido2Api.completeRegistration(
      {
        id: credential.id,
        rawId: bufferToBase64Url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: bufferToBase64Url(attestationResponse.attestationObject),
          clientDataJSON: bufferToBase64Url(attestationResponse.clientDataJSON),
          transports,
        },
        clientExtensionResults: credential.getClientExtensionResults(),
      },
      deviceName,
    );

    return true;
  } catch (err) {
    console.error('Passkey registration failed:', err);
    throw err;
  }
}

// Parse server options to browser-compatible format
function parseCreationOptions(options: PublicKeyCredentialCreationOptions): PublicKeyCredentialCreationOptions {
  // The server returns base64url-encoded buffers; browser API expects ArrayBuffers
  const parsed = { ...options } as unknown as Record<string, unknown>;

  // challenge
  if (typeof (options as unknown as Record<string, unknown>).challenge === 'string') {
    parsed.challenge = base64UrlToBuffer(options.challenge as unknown as string);
  }

  // user.id
  const user = options.user as unknown as Record<string, unknown>;
  if (user && typeof user.id === 'string') {
    parsed.user = { ...user, id: base64UrlToBuffer(user.id as string) };
  }

  // excludeCredentials
  if (Array.isArray(options.excludeCredentials)) {
    parsed.excludeCredentials = options.excludeCredentials.map((c: PublicKeyCredentialDescriptor) => ({
      ...c,
      id: typeof c.id === 'string' ? base64UrlToBuffer(c.id as unknown as string) : c.id,
    }));
  }

  return parsed as unknown as PublicKeyCredentialCreationOptions;
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('zh-TW');
}

export function PasskeySettings() {
  const [credentials, setCredentials] = useState<Fido2CredentialInfo[]>([]);
  const [fido2Status, setFido2Status] = useState<Fido2SettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [status, creds] = await Promise.all([
        fido2Api.getStatus(),
        fido2Api.getCredentials().catch(() => [] as Fido2CredentialInfo[]),
      ]);
      setFido2Status(status);
      setCredentials(creds);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      setError(null);
      await registerPasskey(deviceName || undefined);
      setSuccess('安全金鑰已成功註冊');
      setRegisterDialogOpen(false);
      setDeviceName('');
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '註冊失敗';
      setError(msg);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setError(null);
      await fido2Api.deleteCredential(deleteId);
      setSuccess('憑證已刪除');
      setDeleteId(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '刪除失敗');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const isEnabled = fido2Status?.enableFido2 ?? false;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        安全金鑰 / Passkey
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        管理您的安全金鑰與 Passkey，用於無密碼登入。
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {!isEnabled ? (
        <Alert severity="info">
          系統尚未啟用 FIDO2 / Passkey 功能。請聯絡系統管理員開啟此功能。
        </Alert>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setRegisterDialogOpen(true)}
            >
              註冊新的安全金鑰
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>裝置名稱</TableCell>
                  <TableCell>註冊時間</TableCell>
                  <TableCell>最後使用</TableCell>
                  <TableCell align="right">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {credentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <KeyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">
                        尚未註冊任何安全金鑰
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  credentials.map((cred) => (
                    <TableRow key={cred.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <KeyIcon fontSize="small" color="action" />
                          <Typography>
                            {cred.deviceName || '未命名的安全金鑰'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(cred.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {cred.lastUsedAt ? (
                          <Chip
                            label={formatDate(cred.lastUsedAt)}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            從未使用
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="刪除">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteId(cred.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* 註冊 Dialog */}
      <Dialog
        open={registerDialogOpen}
        onClose={() => !registering && setRegisterDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>註冊安全金鑰</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            請為此安全金鑰取一個名稱（例如「MacBook 指紋」、「YubiKey」），
            然後依照瀏覽器提示完成註冊。
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="裝置名稱（選填）"
            placeholder="例如：MacBook 指紋"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            disabled={registering}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterDialogOpen(false)} disabled={registering}>
            取消
          </Button>
          <Button variant="contained" onClick={handleRegister} disabled={registering}>
            {registering ? '請依瀏覽器提示操作...' : '開始註冊'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 刪除確認 Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>確認刪除</DialogTitle>
        <DialogContent>
          <Typography>
            確定要刪除此安全金鑰嗎？刪除後將無法使用此金鑰登入。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>取消</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            刪除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default PasskeySettings;

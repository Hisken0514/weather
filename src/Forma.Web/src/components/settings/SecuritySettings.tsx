/**
 * SecuritySettings - 安全設定組件
 * 包含 Cookie/Token、Security Headers、CORS 設定及快速模板
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Stack,
  InputLabel,
  FormControl,
  FormHelperText,
} from '@mui/material';
import { settingsApi } from '@/lib/api/settings';
import type { SecuritySettingsDto, SecurityHeadersSettingsDto, CorsSettingsDto } from '@/types/api/settings';

type TemplateMode = 'strict' | 'standard' | 'relaxed';

const TEMPLATES: Record<TemplateMode, { label: string; description: string; headers: SecurityHeadersSettingsDto }> = {
  strict: {
    label: '嚴格模式',
    description: '最高安全性，適合金融/醫療系統，可能影響部分功能',
    headers: {
      enableXssProtection: true,
      enableNoSniff: true,
      xFrameOptions: 'DENY',
      enableHsts: true,
      hstsMaxAgeSeconds: 63072000,
      hstsIncludeSubDomains: true,
      referrerPolicy: 'no-referrer',
      enableCsp: true,
      cspReportOnly: false,
      cspDefaultSrc: "'none'",
      cspScriptSrc: "'self'",
      cspStyleSrc: "'self'",
      cspImgSrc: "'self' data:",
      cspFontSrc: "'self'",
      cspConnectSrc: "'self'",
      cspFrameSrc: "'none'",
      cspFrameAncestors: "'none'",
    },
  },
  standard: {
    label: '標準模式',
    description: '平衡安全性與相容性，推薦大多數場景使用',
    headers: {
      enableXssProtection: true,
      enableNoSniff: true,
      xFrameOptions: 'SAMEORIGIN',
      enableHsts: true,
      hstsMaxAgeSeconds: 31536000,
      hstsIncludeSubDomains: true,
      referrerPolicy: 'strict-origin-when-cross-origin',
      enableCsp: false,
      cspReportOnly: true,
      cspDefaultSrc: "'self'",
      cspScriptSrc: "'self' 'unsafe-inline' 'unsafe-eval'",
      cspStyleSrc: "'self' 'unsafe-inline'",
      cspImgSrc: "'self' data: https:",
      cspFontSrc: "'self' data:",
      cspConnectSrc: "'self' https: wss:",
      cspFrameSrc: "'self'",
      cspFrameAncestors: "'self'",
    },
  },
  relaxed: {
    label: '寬鬆模式',
    description: '較低安全限制，僅適合開發測試環境',
    headers: {
      enableXssProtection: false,
      enableNoSniff: false,
      xFrameOptions: '',
      enableHsts: false,
      hstsMaxAgeSeconds: 0,
      hstsIncludeSubDomains: false,
      referrerPolicy: 'no-referrer-when-downgrade',
      enableCsp: false,
      cspReportOnly: true,
      cspDefaultSrc: "'self'",
      cspScriptSrc: "'self' 'unsafe-inline' 'unsafe-eval'",
      cspStyleSrc: "'self' 'unsafe-inline'",
      cspImgSrc: "*",
      cspFontSrc: "*",
      cspConnectSrc: "*",
      cspFrameSrc: "*",
      cspFrameAncestors: "*",
    },
  },
};

function detectTemplate(headers: SecurityHeadersSettingsDto): TemplateMode | null {
  for (const [key, tmpl] of Object.entries(TEMPLATES) as [TemplateMode, typeof TEMPLATES[TemplateMode]][]) {
    const t = tmpl.headers;
    if (
      headers.enableXssProtection === t.enableXssProtection &&
      headers.enableNoSniff === t.enableNoSniff &&
      headers.xFrameOptions === t.xFrameOptions &&
      headers.enableHsts === t.enableHsts &&
      headers.referrerPolicy === t.referrerPolicy &&
      headers.enableCsp === t.enableCsp
    ) {
      return key;
    }
  }
  return null;
}

export function SecuritySettings() {
  const [security, setSecurity] = useState<SecuritySettingsDto | null>(null);
  const [headers, setHeaders] = useState<SecurityHeadersSettingsDto | null>(null);
  const [cors, setCors] = useState<CorsSettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [secData, hdrData, corsData] = await Promise.all([
        settingsApi.getSecuritySettings(),
        settingsApi.getSecurityHeadersSettings(),
        settingsApi.getCorsSettings(),
      ]);
      setSecurity(secData);
      setHeaders(hdrData);
      setCors(corsData);
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
    if (!security || !headers || !cors) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      await Promise.all([
        settingsApi.updateSecuritySettings(security),
        settingsApi.updateSecurityHeadersSettings(headers),
        settingsApi.updateCorsSettings(cors),
      ]);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (mode: TemplateMode) => {
    setHeaders({ ...TEMPLATES[mode].headers });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (!security || !headers || !cors) {
    return <Alert severity="error">{error || '無法載入設定'}</Alert>;
  }

  const currentTemplate = detectTemplate(headers);

  return (
    <Box>
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

      {/* ===== 帳號鎖定設定 ===== */}
      <Typography variant="h6" gutterBottom>
        帳號鎖定設定
      </Typography>
      <Box sx={{ pl: 2, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={security.enableLoginLockout}
              onChange={(e) => setSecurity({ ...security, enableLoginLockout: e.target.checked })}
            />
          }
          label="啟用登入失敗鎖定"
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <TextField
            label="最大失敗次數"
            type="number"
            size="small"
            value={security.maxFailedAttempts}
            onChange={(e) => setSecurity({ ...security, maxFailedAttempts: Number(e.target.value) })}
            disabled={!security.enableLoginLockout}
          />
          <TextField
            label="鎖定時長（分鐘）"
            type="number"
            size="small"
            value={security.lockoutDurationMinutes}
            onChange={(e) => setSecurity({ ...security, lockoutDurationMinutes: Number(e.target.value) })}
            disabled={!security.enableLoginLockout}
          />
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ===== Cookie 安全設定 ===== */}
      <Typography variant="h6" gutterBottom>
        Cookie 安全設定
      </Typography>
      <Box sx={{ pl: 2, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={security.cookieHttpOnly}
              onChange={(e) => setSecurity({ ...security, cookieHttpOnly: e.target.checked })}
            />
          }
          label="HttpOnly（建議開啟，防止 JavaScript 存取 Cookie）"
        />
        <FormControlLabel
          control={
            <Switch
              checked={security.cookieSecure}
              onChange={(e) => setSecurity({ ...security, cookieSecure: e.target.checked })}
            />
          }
          label="Secure（僅透過 HTTPS 傳送 Cookie）"
        />
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            SameSite 設定
          </Typography>
          <Select
            size="small"
            value={security.cookieSameSite}
            onChange={(e) => setSecurity({ ...security, cookieSameSite: e.target.value })}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="Strict">Strict</MenuItem>
            <MenuItem value="Lax">Lax</MenuItem>
            <MenuItem value="None">None</MenuItem>
          </Select>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ===== Token 效期設定 ===== */}
      <Typography variant="h6" gutterBottom>
        Token 效期設定
      </Typography>
      <Box sx={{ pl: 2, mb: 3, display: 'flex', gap: 2 }}>
        <TextField
          label="Access Token 效期（分鐘）"
          type="number"
          size="small"
          value={security.accessTokenExpirationMinutes}
          onChange={(e) => setSecurity({ ...security, accessTokenExpirationMinutes: Number(e.target.value) })}
          inputProps={{ min: 1 }}
        />
        <TextField
          label="Refresh Token 效期（天）"
          type="number"
          size="small"
          value={security.refreshTokenExpirationDays}
          onChange={(e) => setSecurity({ ...security, refreshTokenExpirationDays: Number(e.target.value) })}
          inputProps={{ min: 1 }}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ===== Security Headers ===== */}
      <Typography variant="h6" gutterBottom>
        Security Headers
      </Typography>

      {/* 快速模板 */}
      <Box sx={{ pl: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          快速模板
          {currentTemplate && (
            <Chip
              label={`目前使用模板：${TEMPLATES[currentTemplate].label}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 1 }}
            />
          )}
        </Typography>
        <Stack direction="row" spacing={1}>
          {(Object.entries(TEMPLATES) as [TemplateMode, typeof TEMPLATES[TemplateMode]][]).map(
            ([key, tmpl]) => (
              <Card
                key={key}
                variant={currentTemplate === key ? 'elevation' : 'outlined'}
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  border: currentTemplate === key ? 2 : 1,
                  borderColor: currentTemplate === key ? 'primary.main' : 'divider',
                  '&:hover': { borderColor: 'primary.light' },
                }}
                onClick={() => applyTemplate(key)}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {tmpl.label}
                    {currentTemplate === key && (
                      <Chip label="目前" size="small" color="primary" sx={{ ml: 1, height: 20 }} />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tmpl.description}
                  </Typography>
                </CardContent>
              </Card>
            ),
          )}
        </Stack>
      </Box>

      <Box sx={{ pl: 2, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={headers.enableXssProtection}
              onChange={(e) => setHeaders({ ...headers, enableXssProtection: e.target.checked })}
            />
          }
          label="X-XSS-Protection — 啟用瀏覽器內建的 XSS 過濾器"
        />
        <FormControlLabel
          control={
            <Switch
              checked={headers.enableNoSniff}
              onChange={(e) => setHeaders({ ...headers, enableNoSniff: e.target.checked })}
            />
          }
          label="X-Content-Type-Options: nosniff — 防止瀏覽器 MIME 類型嗅探"
        />

        <Box sx={{ mt: 1, mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>X-Frame-Options</InputLabel>
            <Select
              label="X-Frame-Options"
              value={headers.xFrameOptions}
              onChange={(e) => setHeaders({ ...headers, xFrameOptions: e.target.value })}
            >
              <MenuItem value="DENY">DENY</MenuItem>
              <MenuItem value="SAMEORIGIN">SAMEORIGIN</MenuItem>
              <MenuItem value="">不設定</MenuItem>
            </Select>
            <FormHelperText>防止網頁被嵌入 iframe（Clickjacking 防護）</FormHelperText>
          </FormControl>
        </Box>

        {/* HSTS */}
        <FormControlLabel
          control={
            <Switch
              checked={headers.enableHsts}
              onChange={(e) => setHeaders({ ...headers, enableHsts: e.target.checked })}
            />
          }
          label="HSTS (Strict-Transport-Security) — 強制瀏覽器使用 HTTPS 連線"
        />
        {headers.enableHsts && (
          <Box sx={{ display: 'flex', gap: 2, mt: 1, ml: 4 }}>
            <TextField
              label="Max-Age (秒)"
              type="number"
              size="small"
              value={headers.hstsMaxAgeSeconds}
              onChange={(e) => setHeaders({ ...headers, hstsMaxAgeSeconds: Number(e.target.value) })}
              helperText="31536000 = 1 年"
              inputProps={{ min: 0 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={headers.hstsIncludeSubDomains}
                  onChange={(e) => setHeaders({ ...headers, hstsIncludeSubDomains: e.target.checked })}
                />
              }
              label="包含子網域"
            />
          </Box>
        )}

        {/* Referrer-Policy */}
        <Box sx={{ mt: 2 }}>
          <FormControl size="small" sx={{ minWidth: 300 }}>
            <InputLabel>Referrer-Policy</InputLabel>
            <Select
              label="Referrer-Policy"
              value={headers.referrerPolicy}
              onChange={(e) => setHeaders({ ...headers, referrerPolicy: e.target.value })}
            >
              <MenuItem value="no-referrer">no-referrer</MenuItem>
              <MenuItem value="no-referrer-when-downgrade">no-referrer-when-downgrade</MenuItem>
              <MenuItem value="origin">origin</MenuItem>
              <MenuItem value="origin-when-cross-origin">origin-when-cross-origin</MenuItem>
              <MenuItem value="same-origin">same-origin</MenuItem>
              <MenuItem value="strict-origin">strict-origin</MenuItem>
              <MenuItem value="strict-origin-when-cross-origin">strict-origin-when-cross-origin</MenuItem>
              <MenuItem value="unsafe-url">unsafe-url</MenuItem>
            </Select>
            <FormHelperText>控制 Referer header 的傳送策略</FormHelperText>
          </FormControl>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ===== CSP ===== */}
      <Typography variant="h6" gutterBottom>
        Content Security Policy (CSP)
      </Typography>
      <Box sx={{ pl: 2, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={headers.enableCsp}
              onChange={(e) => setHeaders({ ...headers, enableCsp: e.target.checked })}
            />
          }
          label="啟用 CSP — 限制資源載入來源，防止 XSS 和資料注入攻擊"
        />
        {headers.enableCsp && (
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={headers.cspReportOnly}
                  onChange={(e) => setHeaders({ ...headers, cspReportOnly: e.target.checked })}
                />
              }
              label="Report-Only 模式 — 僅報告違規，不阻擋（測試用）"
            />
            <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
              修改 CSP 設定可能導致網頁功能異常，建議先使用 Report-Only 模式測試
            </Alert>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="default-src" size="small" fullWidth value={headers.cspDefaultSrc} onChange={(e) => setHeaders({ ...headers, cspDefaultSrc: e.target.value })} />
              <TextField label="script-src" size="small" fullWidth value={headers.cspScriptSrc} onChange={(e) => setHeaders({ ...headers, cspScriptSrc: e.target.value })} />
              <TextField label="style-src" size="small" fullWidth value={headers.cspStyleSrc} onChange={(e) => setHeaders({ ...headers, cspStyleSrc: e.target.value })} />
              <TextField label="img-src" size="small" fullWidth value={headers.cspImgSrc} onChange={(e) => setHeaders({ ...headers, cspImgSrc: e.target.value })} />
              <TextField label="font-src" size="small" fullWidth value={headers.cspFontSrc} onChange={(e) => setHeaders({ ...headers, cspFontSrc: e.target.value })} />
              <TextField label="connect-src" size="small" fullWidth value={headers.cspConnectSrc} onChange={(e) => setHeaders({ ...headers, cspConnectSrc: e.target.value })} />
              <TextField label="frame-src" size="small" fullWidth value={headers.cspFrameSrc} onChange={(e) => setHeaders({ ...headers, cspFrameSrc: e.target.value })} />
              <TextField label="frame-ancestors" size="small" fullWidth value={headers.cspFrameAncestors} onChange={(e) => setHeaders({ ...headers, cspFrameAncestors: e.target.value })} />
            </Box>
          </>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* ===== CORS 設定 ===== */}
      <Typography variant="h6" gutterBottom>
        CORS 設定
      </Typography>
      <Box sx={{ pl: 2, mb: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={cors.trustProxyHeaders}
              onChange={(e) => setCors({ ...cors, trustProxyHeaders: e.target.checked })}
            />
          }
          label="信任 Proxy Headers — 信任 X-Forwarded-For、X-Real-IP 等 headers"
        />
        <FormControlLabel
          control={
            <Switch
              checked={cors.allowCredentials}
              onChange={(e) => setCors({ ...cors, allowCredentials: e.target.checked })}
            />
          }
          label="允許憑證 — 允許跨域請求攜帶 Cookie"
        />
        <Box sx={{ mt: 2 }}>
          <TextField
            label="允許的來源"
            multiline
            rows={4}
            fullWidth
            size="small"
            value={cors.allowedOrigins}
            onChange={(e) => setCors({ ...cors, allowedOrigins: e.target.value })}
            helperText="每行一個來源，例如 https://example.com。留空表示使用環境變數設定"
          />
        </Box>
      </Box>

      {/* ===== 儲存按鈕 ===== */}
      <Box sx={{ mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </Box>
    </Box>
  );
}

export default SecuritySettings;

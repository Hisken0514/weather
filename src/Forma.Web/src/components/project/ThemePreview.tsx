/**
 * ThemePreview - 主題即時預覽組件
 * 模擬瀏覽器視窗，顯示卡片模式或一般模式下的表單樣式
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Smartphone as PhoneIcon,
  Computer as DesktopIcon,
} from '@mui/icons-material';
import type { ProjectTheme } from '@/types/api/projects';

interface ThemePreviewProps {
  theme: ProjectTheme;
}

/** 模擬問題資料 */
const MOCK_QUESTION = {
  label: '您對這次活動的滿意度如何？',
  description: '請根據您的實際體驗選擇',
};

function TrafficLights() {
  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#febc2e' }} />
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28c840' }} />
    </Box>
  );
}

/** 卡片模式預覽 */
function CardPreview({ theme }: { theme: ProjectTheme }) {
  const bgColor = theme.backgroundColor || '#f5f5f5';
  const cardBg = theme.cardBackgroundColor || '#ffffff';
  const cardBorder = theme.cardBorderColor || '#e0e0e0';
  const cardRadius = theme.cardBorderRadius ?? 8;
  const brandColor = theme.brandColor || '#1976d2';
  const questionColor = theme.questionColor || '#000000';
  const fontFamily = theme.fontFamily || 'inherit';

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      {theme.logo && (
        <Box sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          bgcolor: theme.logoBackgroundColor,
          borderRadius: `${cardRadius}px`,
          p: 0.5,
        }}>
          <Box
            component="img"
            src={theme.logo}
            alt="Logo"
            sx={{ maxWidth: 80, maxHeight: 28, objectFit: 'contain' }}
          />
        </Box>
      )}

      {/* Progress */}
      {!theme.hideProgressBar && (
        <Box sx={{ width: '100%', maxWidth: 220, mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
            <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary' }}>
              進度
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary' }}>
              1 / 5
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={20}
            sx={{
              height: 3,
              borderRadius: 1.5,
              bgcolor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                borderRadius: 1.5,
                bgcolor: brandColor,
              },
            }}
          />
        </Box>
      )}

      {/* Card */}
      <Paper
        elevation={4}
        sx={{
          width: '100%',
          maxWidth: 220,
          borderRadius: `${cardRadius}px`,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              color: questionColor,
              fontFamily,
              mb: 0.5,
            }}
          >
            {MOCK_QUESTION.label}
          </Typography>
          <Typography
            sx={{
              fontSize: 9,
              color: brandColor,
              fontFamily,
              mb: 1,
            }}
          >
            {MOCK_QUESTION.description}
          </Typography>

          {/* Mock input */}
          <Box
            sx={{
              height: 24,
              borderRadius: 0.5,
              bgcolor: theme.inputColor || '#ffffff',
              border: `1px solid ${theme.inputBorderColor || '#cccccc'}`,
              mb: 1,
            }}
          />

          {/* Mock button row */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 0.5,
                bgcolor: brandColor,
                color: '#fff',
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              下一題
            </Box>
          </Box>
        </Box>

        {/* Powered by */}
        <Box sx={{ borderTop: `1px solid ${cardBorder}`, py: 0.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 7, color: 'text.disabled' }}>
            Powered by <strong>Forma</strong>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

/** 一般模式預覽 */
function ClassicPreview({ theme }: { theme: ProjectTheme }) {
  const bgColor = theme.backgroundColor || '#f5f5f5';
  const cardBg = theme.cardBackgroundColor || '#ffffff';
  const cardBorder = theme.cardBorderColor || '#e0e0e0';
  const cardRadius = theme.cardBorderRadius ?? 8;
  const brandColor = theme.brandColor || '#1976d2';
  const questionColor = theme.questionColor || '#000000';
  const fontFamily = theme.fontFamily || 'inherit';

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        p: 2,
        overflow: 'hidden',
      }}
    >
      {/* Classic form container */}
      <Paper
        elevation={1}
        sx={{
          width: '100%',
          maxWidth: 240,
          borderRadius: `${cardRadius}px`,
          bgcolor: cardBg,
          border: `1px solid ${cardBorder}`,
          overflow: 'hidden',
        }}
      >
        {/* Logo + Title */}
        <Box sx={{ p: 1.5, pb: 1 }}>
          {theme.logo && (
            <Box sx={{
              mb: 1,
              bgcolor: theme.logoBackgroundColor,
              borderRadius: 0.5,
              display: 'inline-block',
              p: 0.5,
            }}>
              <Box
                component="img"
                src={theme.logo}
                alt="Logo"
                sx={{ maxWidth: 80, maxHeight: 28, objectFit: 'contain' }}
              />
            </Box>
          )}

          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              color: questionColor,
              fontFamily,
              textAlign: 'center',
              mb: 0.5,
            }}
          >
            活動意見調查
          </Typography>
          <Typography
            sx={{
              fontSize: 9,
              color: 'text.secondary',
              fontFamily,
              textAlign: 'center',
              mb: 1,
            }}
          >
            請填寫以下問題
          </Typography>

          {/* Progress bar */}
          {!theme.hideProgressBar && (
            <LinearProgress
              variant="determinate"
              value={40}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: 'grey.200',
                mb: 1,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  bgcolor: brandColor,
                },
              }}
            />
          )}
        </Box>

        {/* Mock fields */}
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          {/* Q1 */}
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: questionColor, fontFamily, mb: 0.25 }}>
              1. {MOCK_QUESTION.label}
            </Typography>
            <Box
              sx={{
                height: 22,
                borderRadius: 0.5,
                bgcolor: theme.inputColor || '#ffffff',
                border: `1px solid ${theme.inputBorderColor || '#cccccc'}`,
              }}
            />
          </Box>

          {/* Q2 */}
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 600, color: questionColor, fontFamily, mb: 0.25 }}>
              2. 您最喜歡哪個環節？
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {['演講分享', '工作坊', '交流時間'].map((opt) => (
                <Box key={opt} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{
                    width: 10, height: 10, borderRadius: '50%',
                    border: `1.5px solid ${theme.inputBorderColor || '#cccccc'}`,
                    bgcolor: theme.inputColor || '#ffffff',
                  }} />
                  <Typography sx={{ fontSize: 9, color: questionColor, fontFamily }}>{opt}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Submit */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Box
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 0.5,
                bgcolor: brandColor,
                color: '#fff',
                fontSize: 9,
                fontWeight: 600,
              }}
            >
              提交
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Footer */}
      <Typography sx={{ fontSize: 7, color: 'text.disabled', mt: 1 }}>
        由 Forma 表單建構器產生
      </Typography>
    </Box>
  );
}

export function ThemePreview({ theme }: ThemePreviewProps) {
  const [mode, setMode] = useState<'card' | 'classic'>('card');
  const [key, setKey] = useState(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Browser frame */}
      <Paper
        variant="outlined"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          minHeight: 'calc(65vh - 150px)',
        }}
      >
        {/* Title bar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.5,
            py: 1,
            bgcolor: 'grey.100',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <TrafficLights />
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Preview
          </Typography>
          <Tooltip title="重新開始">
            <IconButton size="small" onClick={() => setKey((k) => k + 1)} sx={{ p: 0.25 }}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Preview content */}
        <Box key={key} sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {mode === 'card' ? (
            <CardPreview theme={theme} />
          ) : (
            <ClassicPreview theme={theme} />
          )}
        </Box>
      </Paper>

      {/* Mode toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => { if (v) setMode(v); }}
          size="small"
        >
          <ToggleButton value="card" sx={{ px: 2, py: 0.5, textTransform: 'none', fontSize: 13 }}>
            <PhoneIcon sx={{ fontSize: 16, mr: 0.5 }} />
            卡片模式
          </ToggleButton>
          <ToggleButton value="classic" sx={{ px: 2, py: 0.5, textTransform: 'none', fontSize: 13 }}>
            <DesktopIcon sx={{ fontSize: 16, mr: 0.5 }} />
            一般模式
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
}

export default ThemePreview;

/**
 * ProjectThemeSettings - 計畫主題設定組件
 */

import {
  Box,
  Typography,
  Stack,
  FormControlLabel,
  Switch,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import { FilePicker, type SelectedFile } from '@/components/common';
import type { ProjectTheme } from '@/types/api/projects';

const FONT_OPTIONS = [
  { value: '', label: '預設' },
  { value: 'Noto Sans TC', label: 'Noto Sans TC' },
  { value: 'Noto Serif TC', label: 'Noto Serif TC' },
  { value: 'Microsoft JhengHei', label: '微軟正黑體' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
];

const BG_COLORS = ['#ffffff', '#f0ebf8', '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f5f5f5'];

interface ProjectThemeSettingsProps {
  theme: ProjectTheme;
  onChange: (theme: ProjectTheme) => void;
  projectId?: string;
}

function ColorPicker({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value?: string;
  presets?: string[];
  onChange: (color: string) => void;
}) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {presets?.map((color) => (
          <Box
            key={color}
            onClick={() => onChange(color)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              backgroundColor: color,
              border: value === color ? '2px solid' : '1px solid',
              borderColor: value === color ? 'primary.main' : 'divider',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main' },
            }}
          />
        ))}
        <TextField
          type="color"
          size="small"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          sx={{ width: 60, '& input': { p: 0.5, height: 32, cursor: 'pointer' } }}
        />
      </Box>
    </Box>
  );
}

export function ProjectThemeSettings({ theme, onChange, projectId }: ProjectThemeSettingsProps) {
  const update = (partial: Partial<ProjectTheme>) => {
    onChange({ ...theme, ...partial });
  };

  return (
    <Stack spacing={3}>
      {/* 標誌 */}
      <Box>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          標誌 (Logo)
        </Typography>
        <Stack spacing={2}>
          <FilePicker
            value={theme.logo ? [{
              id: theme.logoFileId || 'logo',
              name: 'Logo',
              size: 0,
              type: 'image/*',
              url: theme.logo,
            }] : []}
            onChange={(files: SelectedFile[]) => {
              if (files.length > 0) {
                update({ logo: files[0].url || '', logoFileId: files[0].id });
              } else {
                update({ logo: undefined, logoFileId: undefined });
              }
            }}
            accept="image/*"
            maxSize={5 * 1024 * 1024}
            maxFiles={1}
            compact
            label=""
            entityType="project"
            entityId={projectId}
            isPublic
          />
          <ColorPicker
            label="Logo 背景色"
            value={theme.logoBackgroundColor}
            presets={['#ffffff', '#000000', '#f5f5f5']}
            onChange={(c) => update({ logoBackgroundColor: c })}
          />
        </Stack>
      </Box>

      {/* 背景樣式 */}
      <Box>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          背景樣式
        </Typography>
        <ColorPicker
          label="背景顏色"
          value={theme.backgroundColor}
          presets={BG_COLORS}
          onChange={(c) => update({ backgroundColor: c })}
        />
      </Box>

      {/* 表單樣式設定 */}
      <Box>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          表單樣式
        </Typography>
        <Stack spacing={2}>
          <ColorPicker
            label="品牌顏色"
            value={theme.brandColor}
            presets={['#1976d2', '#9c27b0', '#2e7d32', '#ed6c02', '#d32f2f']}
            onChange={(c) => update({ brandColor: c })}
          />
          <ColorPicker
            label="問題文字顏色"
            value={theme.questionColor}
            presets={['#000000', '#333333', '#1976d2']}
            onChange={(c) => update({ questionColor: c })}
          />
          <ColorPicker
            label="輸入欄位背景色"
            value={theme.inputColor}
            presets={['#ffffff', '#f5f5f5', '#fafafa']}
            onChange={(c) => update({ inputColor: c })}
          />
          <ColorPicker
            label="輸入邊框色"
            value={theme.inputBorderColor}
            presets={['#cccccc', '#e0e0e0', '#1976d2']}
            onChange={(c) => update({ inputBorderColor: c })}
          />
        </Stack>
      </Box>

      {/* 卡片樣式 */}
      <Box>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          卡片樣式
        </Typography>
        <Stack spacing={2}>
          <ColorPicker
            label="卡片背景色"
            value={theme.cardBackgroundColor}
            presets={['#ffffff', '#fafafa', '#f5f5f5']}
            onChange={(c) => update({ cardBackgroundColor: c })}
          />
          <ColorPicker
            label="卡片邊框色"
            value={theme.cardBorderColor}
            presets={['#e0e0e0', '#cccccc', '#1976d2']}
            onChange={(c) => update({ cardBorderColor: c })}
          />
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              卡片圓角: {theme.cardBorderRadius ?? 8}px
            </Typography>
            <Slider
              value={theme.cardBorderRadius ?? 8}
              onChange={(_, v) => update({ cardBorderRadius: v as number })}
              min={0}
              max={24}
              step={1}
              valueLabelDisplay="auto"
            />
          </Box>
        </Stack>
      </Box>

      {/* 其他 */}
      <Box>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          其他設定
        </Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={theme.hideProgressBar || false}
                onChange={(e) => update({ hideProgressBar: e.target.checked })}
              />
            }
            label="隱藏進度列"
          />
          <FormControl size="small" fullWidth>
            <InputLabel>字型</InputLabel>
            <Select
              value={theme.fontFamily || ''}
              label="字型"
              onChange={(e) => update({ fontFamily: e.target.value || undefined })}
            >
              {FONT_OPTIONS.map((font) => (
                <MenuItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value || 'inherit' }}>
                    {font.label}
                  </span>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* 覆寫控制 */}
      <Box>
        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
          覆寫控制
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={theme.allowFormOverride !== false}
              onChange={(e) => update({ allowFormOverride: e.target.checked })}
            />
          }
          label="允許表單覆寫主題設定"
        />
        <Typography variant="caption" color="text.secondary" display="block">
          關閉後，此計畫下的表單將無法自訂外觀設定
        </Typography>
      </Box>
    </Stack>
  );
}

export default ProjectThemeSettings;

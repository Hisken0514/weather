/**
 * FormBuilder - Main 3-panel layout for form building
 */

import { useState, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  TextField,
  Divider,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Visibility as PreviewIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Settings as SettingsIcon,
  Image as ImageIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import { UserMenu } from '@/components/auth';
import { DndProvider } from './dnd/DndProvider';
import { FieldToolbox } from './toolbox/FieldToolbox';
import { FormCanvas } from './canvas/FormCanvas';
import { PropertyEditor } from './properties/PropertyEditor';

// Panel widths
const TOOLBOX_WIDTH = 280;
const PROPERTY_EDITOR_WIDTH = 320;

// Available fonts
const FONT_OPTIONS = [
  { value: 'default', label: '預設' },
  { value: 'Noto Sans TC', label: 'Noto Sans TC' },
  { value: 'Noto Serif TC', label: 'Noto Serif TC' },
  { value: 'Microsoft JhengHei', label: '微軟正黑體' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
];

export function FormBuilder() {
  const navigate = useNavigate();
  const { schema, updateSettings, loadSchema } = useFormBuilderStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePreview = () => {
    navigate('/preview');
  };

  const handleExport = () => {
    // Export schema as JSON
    const json = JSON.stringify(schema, null, 2);
    console.log('Form Schema:', json);

    // Create download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schema.metadata.title || 'form'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const importedSchema = JSON.parse(json);

        // Basic validation
        if (!importedSchema.version || !importedSchema.pages) {
          alert('無效的表單檔案格式');
          return;
        }

        loadSchema(importedSchema);
        alert('表單匯入成功！');
      } catch (error) {
        console.error('Import error:', error);
        alert('匯入失敗：檔案格式錯誤');
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 0, mr: 2 }}>
            {schema.metadata.title || '表單建構器'}
          </Typography>

          <Box sx={{ flex: 1 }} />

          {/* Actions */}
          <Tooltip title="復原">
            <IconButton disabled>
              <UndoIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="重做">
            <IconButton disabled>
              <RedoIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="表單設定">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            sx={{ ml: 1 }}
          >
            預覽
          </Button>

          <Tooltip title="匯入表單">
            <IconButton onClick={handleImport} sx={{ ml: 1 }}>
              <ImportIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={handleExport}
            sx={{ ml: 1 }}
          >
            匯出
          </Button>

          {/* User Menu */}
          <UserMenu />

          {/* Hidden file input for import */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <DndProvider>
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel - Toolbox */}
          <Box sx={{ width: TOOLBOX_WIDTH, flexShrink: 0 }}>
            <FieldToolbox />
          </Box>

          {/* Center Panel - Canvas */}
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <FormCanvas />
          </Box>

          {/* Right Panel - Property Editor */}
          <Box sx={{ width: PROPERTY_EDITOR_WIDTH, flexShrink: 0 }}>
            <PropertyEditor />
          </Box>
        </Box>
      </DndProvider>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>表單設定</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3}>
            {/* 回應設定 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                回應設定
              </Typography>
              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={schema.settings?.allFieldsRequired || false}
                      onChange={(e) => updateSettings({ allFieldsRequired: e.target.checked })}
                    />
                  }
                  label="所有問題設為必填"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={schema.settings?.showProgressBar || false}
                      onChange={(e) => updateSettings({ showProgressBar: e.target.checked })}
                    />
                  }
                  label="顯示進度列"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={schema.settings?.shuffleQuestions || false}
                      onChange={(e) => updateSettings({ shuffleQuestions: e.target.checked })}
                    />
                  }
                  label="隨機決定問題順序"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={!schema.settings?.allowMultipleSubmissions}
                      onChange={(e) => updateSettings({ allowMultipleSubmissions: !e.target.checked })}
                    />
                  }
                  label="限回覆一次"
                />
              </Stack>
            </Box>

            <Divider />

            {/* 外觀設定 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                外觀設定
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    背景顏色
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['#ffffff', '#f0ebf8', '#e3f2fd', '#e8f5e9', '#fff3e0', '#fce4ec', '#f5f5f5'].map((color) => (
                      <Box
                        key={color}
                        onClick={() => updateSettings({ backgroundColor: color })}
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                          backgroundColor: color,
                          border: schema.settings?.backgroundColor === color ? '2px solid' : '1px solid',
                          borderColor: schema.settings?.backgroundColor === color ? 'primary.main' : 'divider',
                          cursor: 'pointer',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    首頁圖片網址
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="https://example.com/image.jpg"
                    value={schema.settings?.headerImage || ''}
                    onChange={(e) => updateSettings({ headerImage: e.target.value })}
                    InputProps={{
                      startAdornment: <ImageIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* 文字樣式 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                文字樣式
              </Typography>
              <Stack spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>字型</InputLabel>
                  <Select
                    value={schema.settings?.headerStyle?.fontFamily || 'default'}
                    label="字型"
                    onChange={(e) => {
                      const fontFamily = e.target.value;
                      updateSettings({
                        headerStyle: { ...schema.settings?.headerStyle, fontFamily },
                        questionStyle: { ...schema.settings?.questionStyle, fontFamily },
                        descriptionStyle: { ...schema.settings?.descriptionStyle, fontFamily },
                      });
                    }}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <MenuItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value === 'default' ? 'inherit' : font.value }}>
                          {font.label}
                        </span>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      頁首字體大小
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={schema.settings?.headerStyle?.fontSize || 24}
                      onChange={(e) => updateSettings({
                        headerStyle: { ...schema.settings?.headerStyle, fontSize: Number(e.target.value) }
                      })}
                      InputProps={{ endAdornment: 'px' }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      問題字體大小
                    </Typography>
                    <TextField
                      size="small"
                      type="number"
                      fullWidth
                      value={schema.settings?.questionStyle?.fontSize || 16}
                      onChange={(e) => updateSettings({
                        questionStyle: { ...schema.settings?.questionStyle, fontSize: Number(e.target.value) }
                      })}
                      InputProps={{ endAdornment: 'px' }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    說明文字字體大小
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={schema.settings?.descriptionStyle?.fontSize || 14}
                    onChange={(e) => updateSettings({
                      descriptionStyle: { ...schema.settings?.descriptionStyle, fontSize: Number(e.target.value) }
                    })}
                    InputProps={{ endAdornment: 'px' }}
                    sx={{ width: 150 }}
                  />
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * FormEditorPage - 表單編輯頁面
 * 載入表單並使用 FormBuilder 編輯，支援儲存到 API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Switch,
  TextField as MuiTextField,
  Divider,
  Stack,
  Select,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Radio,
  RadioGroup,
  FormLabel,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Visibility as PreviewIcon,
  Publish as PublishIcon,
  Unpublished as UnpublishIcon,
  LockOpen as UnlockIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  FileUpload as ImportIcon,
  FileDownload as ExportIcon,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  ArrowDropUp as ArrowDropUpIcon,
  SaveAlt as SaveAltIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useNavigate, useParams, useSearchParams, Link as RouterLink } from 'react-router';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import { formsApi } from '@/lib/api/forms';
import { projectsApi } from '@/lib/api/projects';
import { DndProvider } from '@/components/form-builder/dnd/DndProvider';
import { FieldToolbox } from '@/components/form-builder/toolbox/FieldToolbox';
import { FormCanvas } from '@/components/form-builder/canvas/FormCanvas';
import { PropertyEditor } from '@/components/form-builder/properties/PropertyEditor';
import { UserMenu } from '@/components/auth';
import { FilePicker, type SelectedFile } from '@/components/common';
import { parseProjectTheme } from '@/hooks/useFormTheme';
import { TemplateImportDialog } from '@/components/form-builder/templates/TemplateImportDialog';
import { TemplateSaveDialog } from '@/components/form-builder/templates/TemplateSaveDialog';
import { useAuthStore } from '@/stores/authStore';
import type { FormDto } from '@/types/api/forms';
import type { ProjectDto } from '@/types/api/projects';

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

export function FormEditorPage() {
  const { projectId, formId } = useParams<{ projectId: string; formId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // from=/supervision 表示從督導管理進來，返回時導回督導頁
  const backTo = searchParams.get('from') || `/projects/${projectId}`;
  const { schema, loadSchema, updateSettings, undo, redo, canUndo, canRedo } = useFormBuilderStore();
  const { user } = useAuthStore();
  // LockUnlockForms = 1n << 33n (需要 BigInt 做位元運算)
  const hasLockPermission = !!user && (BigInt(user.permissions) & (1n << 33n)) !== 0n;

  // 判斷是否為建立模式（沒有 formId 表示建立新表單）
  const isCreateMode = !formId;

  const [loading, setLoading] = useState(!isCreateMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [form, setForm] = useState<FormDto | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(isCreateMode);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templateImportOpen, setTemplateImportOpen] = useState(false);
  const [templateSaveOpen, setTemplateSaveOpen] = useState(false);
  const [templateOverwriteOpen, setTemplateOverwriteOpen] = useState(false);
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // 追蹤是否已載入，避免從預覽返回時重新載入覆蓋未儲存的變更
  const hasLoadedRef = useRef(false);
  // 記錄上次儲存/載入時的 schema JSON，用於比對是否有變更
  const savedSchemaRef = useRef<string | null>(null);

  // 載入表單資料
  useEffect(() => {
    // 如果已載入過，跳過（從預覽返回時）
    if (hasLoadedRef.current) return;

    if (projectId) {
      if (isCreateMode) {
        // 建立模式：載入計畫資訊，初始化空白表單
        loadProjectOnly();
      } else if (formId) {
        // 編輯模式：載入表單資料
        loadFormData();
      }
      hasLoadedRef.current = true;
    }
  }, [projectId, formId]);

  const loadProjectOnly = async () => {
    if (!projectId) return;
    try {
      const projectData = await projectsApi.getProject(projectId);
      setProject(projectData);
      // 初始化空白 schema
      loadSchema({
        version: '1.0',
        id: `form-${Date.now()}`,
        metadata: { title: '新表單', description: '' },
        pages: [{ id: 'page-1', title: '第1頁', fields: [] }],
        settings: {},
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    }
  };

  // 監聽 schema 變化，比對已儲存的快照來判斷是否有未儲存變更
  useEffect(() => {
    if (savedSchemaRef.current === null) return;
    const current = JSON.stringify(schema);
    setHasUnsavedChanges(current !== savedSchemaRef.current);
  }, [schema]);

  const loadFormData = async () => {
    if (!projectId || !formId) return;

    setLoading(true);
    setError(null);

    try {
      const [projectData, formData] = await Promise.all([
        projectsApi.getProject(projectId),
        formsApi.getForm(formId),
      ]);

      setProject(projectData);
      setForm(formData);

      // 載入 schema 到 store
      if (formData.schema) {
        try {
          const parsedSchema = JSON.parse(formData.schema);
          loadSchema(parsedSchema);
        } catch {
          console.error('Failed to parse form schema');
          setError('表單結構解析失敗');
        }
      }

      savedSchemaRef.current = formData.schema || null;
      setHasUnsavedChanges(false);
      setLastSavedAt(formData.updatedAt ? new Date(formData.updatedAt) : new Date(formData.createdAt));
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // 儲存表單
  const handleSave = useCallback(async () => {
    if (!projectId) return;

    setSaving(true);

    try {
      if (isCreateMode) {
        // 建立模式：建立新表單
        const result = await formsApi.createForm(projectId, {
          name: schema.metadata.title || '新表單',
          description: schema.metadata.description || '',
          schema: JSON.stringify(schema),
        });
        // 建立成功後導向編輯頁面（替換當前 URL）
        savedSchemaRef.current = JSON.stringify(schema);
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        navigate(`/projects/${projectId}/forms/${result.id}/edit`, { replace: true });
        setSnackbar({
          open: true,
          message: '表單已建立',
          severity: 'success',
        });
      } else if (formId && form) {
        // 編輯模式：更新表單
        await formsApi.updateForm(formId, {
          name: schema.metadata.title || form.name,
          description: schema.metadata.description,
          schema: JSON.stringify(schema),
          accessControl: form.accessControl,
          isActive: form.isActive,
        });
        savedSchemaRef.current = JSON.stringify(schema);
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        setSnackbar({
          open: true,
          message: '儲存成功',
          severity: 'success',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '儲存失敗';
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, formId, form, schema, isCreateMode, navigate]);

  // 發布表單
  const handlePublish = async () => {
    if (!formId || isCreateMode) return;

    // 先儲存
    await handleSave();

    try {
      const published = await formsApi.publishForm(formId);
      if (published.accessControl === 'Public') {
        const publicUrl = `${window.location.origin}/public/forms/${formId}`;
        await navigator.clipboard.writeText(publicUrl).catch(() => {});
        setSnackbar({
          open: true,
          message: `表單已發布！公開連結已複製：${publicUrl}`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: '表單已發布',
          severity: 'success',
        });
      }
      // 重新載入表單資料
      loadFormData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '發布失敗';
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    }
  };

  // 取消發布
  const handleUnpublish = async () => {
    if (!formId || isCreateMode) return;
    try {
      const updated = await formsApi.unpublishForm(formId);
      setForm(updated);
      setSnackbar({ open: true, message: '已取消發布，表單回到草稿狀態', severity: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '取消發布失敗';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  // 鎖定表單
  const handleLock = async () => {
    if (!formId || isCreateMode) return;
    try {
      const updated = await formsApi.lockForm(formId);
      setForm(updated);
      setSnackbar({ open: true, message: '表單已鎖定', severity: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '鎖定失敗';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  // 解鎖表單
  const handleUnlock = async () => {
    if (!formId || isCreateMode) return;
    try {
      const updated = await formsApi.unlockForm(formId);
      setForm(updated);
      setSnackbar({ open: true, message: '表單已解鎖', severity: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : '解鎖失敗';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  // 預覽表單（建立模式不可用）
  const handlePreview = () => {
    if (isCreateMode) return;
    // 導航到預覽頁面
    navigate(`/projects/${projectId}/forms/${formId}/preview`);
  };

  // 匯出 JSON
  const handleExportJson = () => {
    const dataStr = JSON.stringify(schema, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${schema.metadata.title || 'form'}-schema.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 匯入 JSON
  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedSchema = JSON.parse(text);
        // 驗證基本結構
        if (!importedSchema.version || !importedSchema.pages) {
          throw new Error('無效的表單結構');
        }
        loadSchema(importedSchema);
        setHasUnsavedChanges(true);
        setSnackbar({
          open: true,
          message: '匯入成功',
          severity: 'success',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '匯入失敗';
        setSnackbar({
          open: true,
          message,
          severity: 'error',
        });
      }
    };
    input.click();
  };

  // 返回（從哪來就回哪去）
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation(backTo);
      setShowUnsavedDialog(true);
    } else {
      navigate(backTo);
    }
  };

  // 處理未儲存對話框確認
  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  // 處理未儲存對話框儲存
  const handleSaveAndNavigate = async () => {
    await handleSave();
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, undo, redo]);

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Alert severity="error">{error}</Alert>
        <Button variant="contained" onClick={() => navigate(backTo)}>
          返回
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Bar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          {/* Back & Breadcrumbs */}
          <IconButton edge="start" onClick={handleBack} sx={{ mr: 1 }}>
            <BackIcon />
          </IconButton>

          <Breadcrumbs sx={{ flexGrow: 0, mr: 2 }}>
            <Link
              component={RouterLink}
              to={backTo}
              underline="hover"
              color="inherit"
              sx={{ fontSize: '0.875rem' }}
            >
              {backTo === '/supervision' ? '督導管理' : (project?.name || '計畫')}
            </Link>
            <Typography color="text.primary" sx={{ fontSize: '0.875rem' }}>
              {schema.metadata.title || form?.name || '表單'}
            </Typography>
          </Breadcrumbs>

          {/* Version & Status indicator */}
          {!isCreateMode && form && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
              <Typography variant="caption" color="text.secondary">
                v{form.version}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: form.publishedAt ? 'success.light' : 'warning.light',
                  color: form.publishedAt ? 'success.dark' : 'warning.dark',
                }}
              >
                {form.publishedAt ? '已發布' : '草稿'}
              </Typography>
              {form.isLocked && (
                <Tooltip title={`已鎖定${form.lockedByUsername ? ` (${form.lockedByUsername})` : ''}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'warning.main' }}>
                    <LockIcon fontSize="small" />
                    <Typography variant="caption" color="warning.main">已鎖定</Typography>
                  </Box>
                </Tooltip>
              )}
            </Box>
          )}

          {/* Save status indicator */}
          {hasUnsavedChanges ? (
            <Typography variant="caption" color="warning.main" sx={{ mr: 2 }}>
              (未儲存)
            </Typography>
          ) : lastSavedAt ? (
            <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
              已儲存於 {lastSavedAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          ) : null}

          <Box sx={{ flex: 1 }} />

          {/* Actions */}
          <Tooltip title="復原 (Ctrl+Z)">
            <span>
              <IconButton disabled={!canUndo()} onClick={undo}>
                <UndoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="重做 (Ctrl+Y)">
            <span>
              <IconButton disabled={!canRedo()} onClick={redo}>
                <RedoIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title="表單設定">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="匯入範本">
            <IconButton onClick={() => setTemplateImportOpen(true)} sx={{ ml: 1 }}>
              <ImportIcon />
            </IconButton>
          </Tooltip>

          <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 0.5 }}>
            <Tooltip title="存為範本">
              <IconButton onClick={() => setTemplateSaveOpen(true)}>
                <SaveAltIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="覆蓋範本">
              <IconButton
                onClick={(e) => setTemplateMenuAnchor(e.currentTarget)}
                sx={{ p: 0.25, ml: -0.5 }}
                size="small"
              >
                <ArrowDropUpIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Menu
            anchorEl={templateMenuAnchor}
            open={Boolean(templateMenuAnchor)}
            onClose={() => setTemplateMenuAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <MenuItem onClick={() => { setTemplateMenuAnchor(null); setTemplateOverwriteOpen(true); }}>
              覆蓋範本
            </MenuItem>
          </Menu>

          <Tooltip title="匯入 JSON">
            <IconButton onClick={handleImportJson}>
              <ImportIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="匯出 JSON">
            <IconButton onClick={handleExportJson}>
              <ExportIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            disabled={isCreateMode}
            sx={{ ml: 1 }}
          >
            預覽
          </Button>

          <Tooltip title="儲存 (Ctrl+S)">
            <Button
              variant="outlined"
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges || (!!form?.isLocked && !hasLockPermission)}
              sx={{ ml: 1 }}
            >
              {isCreateMode ? '建立' : '儲存'}
            </Button>
          </Tooltip>

          {/* 鎖定/解鎖 */}
          {!isCreateMode && form && hasLockPermission && !form.isLocked && (
            <Tooltip title="鎖定後其他人無法編輯">
              <Button
                variant="outlined"
                color="warning"
                startIcon={<LockIcon />}
                onClick={handleLock}
                sx={{ ml: 1 }}
              >
                鎖定
              </Button>
            </Tooltip>
          )}
          {!isCreateMode && form && hasLockPermission && form.isLocked && (
            <Tooltip title="解除鎖定">
              <Button
                variant="outlined"
                color="warning"
                startIcon={<UnlockIcon />}
                onClick={handleUnlock}
                sx={{ ml: 1 }}
              >
                解鎖
              </Button>
            </Tooltip>
          )}

          {/* 發布 / 取消發布 */}
          {!isCreateMode && form && !form.publishedAt && (!form.isLocked || hasLockPermission) && (
            <Button
              variant="contained"
              startIcon={<PublishIcon />}
              onClick={handlePublish}
              sx={{ ml: 1 }}
            >
              發布
            </Button>
          )}
          {!isCreateMode && form && form.publishedAt && hasLockPermission && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<UnpublishIcon />}
              onClick={handleUnpublish}
              sx={{ ml: 1 }}
            >
              取消發布
            </Button>
          )}

          {!isCreateMode && form && form.accessControl === 'Public' && form.publishedAt && (
            <Tooltip title="複製公開連結">
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={() => {
                  const url = `${window.location.origin}/public/forms/${form.id}`;
                  navigator.clipboard.writeText(url);
                  setSnackbar({ open: true, message: '公開連結已複製', severity: 'success' });
                }}
                sx={{ ml: 1 }}
              >
                公開連結
              </Button>
            </Tooltip>
          )}

          {/* User Menu */}
          <UserMenu />
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
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FormCanvas projectTheme={parseProjectTheme(project?.settings)} />
          </Box>

          {/* Right Panel - Property Editor */}
          <Box sx={{ width: PROPERTY_EDITOR_WIDTH, flexShrink: 0 }}>
            <PropertyEditor />
          </Box>
        </Box>
      </DndProvider>

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onClose={() => setShowUnsavedDialog(false)}>
        <DialogTitle>未儲存的變更</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您有未儲存的變更。要在離開前儲存嗎？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUnsavedDialog(false)}>
            取消
          </Button>
          <Button onClick={handleDiscardChanges} color="error">
            不儲存
          </Button>
          <Button onClick={handleSaveAndNavigate} variant="contained">
            儲存
          </Button>
        </DialogActions>
      </Dialog>

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

            {/* 顯示模式 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                顯示模式
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={schema.settings?.displayMode?.default || 'classic'}
                  onChange={(e) => {
                    const mode = e.target.value as 'classic' | 'card';
                    updateSettings({
                      displayMode: {
                        ...schema.settings?.displayMode,
                        default: mode,
                      },
                    });
                  }}
                >
                  <FormControlLabel value="classic" control={<Radio />} label="經典模式（所有欄位顯示在頁面上）" />
                  <FormControlLabel value="card" control={<Radio />} label="卡片模式（一次顯示一題，適合手機填寫）" />
                </RadioGroup>
              </FormControl>

              {(schema.settings?.displayMode?.default === 'card') && (
                <FormControlLabel
                  sx={{ mt: 1, ml: 0.5 }}
                  control={
                    <Switch
                      checked={schema.settings?.displayMode?.forceCardOnDesktop || false}
                      onChange={(e) => updateSettings({
                        displayMode: {
                          ...schema.settings?.displayMode,
                          forceCardOnDesktop: e.target.checked,
                        },
                      })}
                    />
                  }
                  label="所有裝置一致使用卡片模式（關閉時桌面裝置顯示經典模式）"
                />
              )}
            </Box>

            <Divider />

            {/* 存取控制 */}
            {!isCreateMode && form && (
              <>
                <Box>
                  <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                    存取控制
                  </Typography>
                  <FormControl component="fieldset">
                    <RadioGroup
                      value={form.accessControl || 'Private'}
                      onChange={async (e) => {
                        const newAccessControl = e.target.value;
                        try {
                          const updated = await formsApi.updateForm(formId!, {
                            name: schema.metadata.title || form.name,
                            description: schema.metadata.description,
                            schema: JSON.stringify(schema),
                            accessControl: newAccessControl,
                            isActive: form.isActive,
                          });
                          setForm(updated);
                          setSnackbar({ open: true, message: '存取控制已更新', severity: 'success' });
                        } catch {
                          setSnackbar({ open: true, message: '更新失敗', severity: 'error' });
                        }
                      }}
                    >
                      <FormControlLabel value="Public" control={<Radio />} label="公開（任何人皆可填寫，不需登入）" />
                      <FormControlLabel value="Private" control={<Radio />} label="私人（需登入且為專案成員）" />
                      <FormControlLabel value="Restricted" control={<Radio />} label="限制（需登入且獲授權）" />
                    </RadioGroup>
                  </FormControl>

                  {form.accessControl === 'Public' && form.publishedAt && (
                    <Box sx={{ mt: 2 }}>
                      <FormLabel sx={{ fontSize: '0.875rem' }}>公開連結</FormLabel>
                      <MuiTextField
                        size="small"
                        fullWidth
                        value={`${window.location.origin}/public/forms/${form.id}`}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/public/forms/${form.id}`);
                                  setSnackbar({ open: true, message: '已複製連結', severity: 'success' });
                                }}
                              >
                                <CopyIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}

                  {form.accessControl === 'Public' && !form.publishedAt && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      表單需先發布才能透過公開連結填寫。
                    </Alert>
                  )}
                </Box>
                <Divider />
              </>
            )}

            {/* 外觀設定 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                外觀設定
              </Typography>

              {(() => {
                const projectTheme = parseProjectTheme(project?.settings);
                const allowOverride = projectTheme?.allowFormOverride !== false;

                if (!allowOverride) {
                  return (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      此計畫不允許表單自訂外觀，所有表單使用計畫主題。
                    </Alert>
                  );
                }

                return (
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={schema.settings?.useCustomTheme || false}
                          onChange={(e) => updateSettings({ useCustomTheme: e.target.checked })}
                        />
                      }
                      label="啟用自訂樣式（覆寫計畫主題）"
                    />

                    {!schema.settings?.useCustomTheme ? (
                      <Alert severity="info">
                        目前使用計畫主題設定。如需自訂外觀，請開啟上方開關。
                      </Alert>
                    ) : (
                      <>
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
                            首頁圖片
                          </Typography>
                          <FilePicker
                            value={schema.settings?.headerImage ? [{
                              id: (schema.settings as Record<string, unknown>).headerImageFileId as string || 'header-image',
                              name: '首頁圖片',
                              size: 0,
                              type: 'image/*',
                              url: schema.settings.headerImage,
                            }] : []}
                            onChange={(files: SelectedFile[]) => {
                              if (files.length > 0) {
                                updateSettings({
                                  headerImage: files[0].url || '',
                                  headerImageFileId: files[0].id,
                                } as Record<string, unknown>);
                              } else {
                                updateSettings({
                                  headerImage: undefined,
                                  headerImageFileId: undefined,
                                } as Record<string, unknown>);
                              }
                            }}
                            accept="image/*"
                            maxSize={5 * 1024 * 1024}
                            maxFiles={1}
                            compact
                            label=""
                            entityType="form"
                            entityId={formId}
                            isPublic
                          />
                        </Box>
                      </>
                    )}
                  </Stack>
                );
              })()}
            </Box>

            <Divider />

            {/* 文字樣式 */}
            {schema.settings?.useCustomTheme && (
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
                    <MuiTextField
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
                    <MuiTextField
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
                  <MuiTextField
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
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>關閉</Button>
        </DialogActions>
      </Dialog>

      {/* Template Import Dialog */}
      <TemplateImportDialog
        open={templateImportOpen}
        onClose={() => setTemplateImportOpen(false)}
        onImported={() => {
          setHasUnsavedChanges(true);
          setSnackbar({ open: true, message: '範本匯入成功', severity: 'success' });
        }}
      />

      {/* Template Save Dialog */}
      <TemplateSaveDialog
        open={templateSaveOpen}
        onClose={() => setTemplateSaveOpen(false)}
        mode="form"
        data={schema}
        onSaved={() => setSnackbar({ open: true, message: '已存為範本', severity: 'success' })}
      />

      {/* Template Overwrite Dialog */}
      <TemplateSaveDialog
        open={templateOverwriteOpen}
        onClose={() => setTemplateOverwriteOpen(false)}
        mode="form"
        data={schema}
        saveMode="overwrite"
        onSaved={() => setSnackbar({ open: true, message: '範本已覆蓋', severity: 'success' })}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default FormEditorPage;

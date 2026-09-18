/**
 * TemplateSaveDialog - 將表單/頁面/欄位存為範本，或覆蓋現有範本
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  InputAdornment,
  CircularProgress,
  Box,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { templatesApi } from '@/lib/api/templates';
import type { TemplateListDto } from '@/types/api/templates';

export interface TemplateSaveDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'form' | 'page' | 'field';
  data: unknown;
  /** 'create' = 存為新範本, 'overwrite' = 覆蓋現有範本 */
  saveMode?: 'create' | 'overwrite';
  onSaved?: () => void;
}

const MODE_LABELS: Record<string, string> = {
  form: '表單範本',
  page: '頁面範本',
  field: '欄位範本',
};

export function TemplateSaveDialog({ open, onClose, mode, data, saveMode = 'create', onSaved }: TemplateSaveDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Overwrite mode state
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<TemplateListDto[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await templatesApi.getTemplates({
        category: mode,
        searchTerm: search || undefined,
        pageSize: 50,
      });
      setTemplates(res.items || []);
    } catch {
      // silent
    } finally {
      setListLoading(false);
    }
  }, [mode, search]);

  useEffect(() => {
    if (open && saveMode === 'overwrite') {
      fetchTemplates();
      setSelectedId(null);
    }
  }, [open, saveMode, fetchTemplates]);

  const handleSave = async () => {
    if (saveMode === 'create' && !name.trim()) return;
    if (saveMode === 'overwrite' && !selectedId) return;

    setLoading(true);
    setError(null);
    try {
      if (saveMode === 'overwrite' && selectedId) {
        const detail = await templatesApi.getTemplate(selectedId);
        await templatesApi.updateTemplate(selectedId, {
          name: detail.name,
          description: detail.description,
          category: mode,
          schema: JSON.stringify(data),
          isPublic: detail.isPublic,
        });
      } else {
        await templatesApi.createTemplate({
          name: name.trim(),
          description: description.trim() || undefined,
          category: mode,
          schema: JSON.stringify(data),
          isPublic,
        });
      }
      handleClose();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIsPublic(false);
    setError(null);
    setSearch('');
    setSelectedId(null);
    onClose();
  };

  const isOverwrite = saveMode === 'overwrite';
  const title = isOverwrite ? `覆蓋${MODE_LABELS[mode]}` : `存為${MODE_LABELS[mode]}`;
  const canSubmit = isOverwrite ? !!selectedId : !!name.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {isOverwrite ? (
            <>
              <TextField
                placeholder="搜尋範本..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              {listLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : templates.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  沒有找到可覆蓋的{MODE_LABELS[mode]}
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: 300, overflow: 'auto', border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  {templates.map((t) => (
                    <ListItemButton
                      key={t.id}
                      selected={selectedId === t.id}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <ListItemText
                        primary={t.name}
                        secondary={t.description}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </>
          ) : (
            <>
              <TextField
                label="範本名稱"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                required
                autoFocus
              />
              <TextField
                label="描述（選填）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                multiline
                rows={3}
              />
              <FormControlLabel
                control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
                label="公開範本（所有使用者可使用）"
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>取消</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || !canSubmit}>
          {loading ? '儲存中...' : isOverwrite ? '覆蓋' : '儲存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

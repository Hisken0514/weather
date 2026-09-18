/**
 * TemplateImportDialog - 匯入範本對話框，支援表單/頁面/欄位三種粒度
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Box,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { templatesApi } from '@/lib/api/templates';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import type { TemplateListDto } from '@/types/api/templates';
import type { FormSchema, FormPage, Field } from '@/types/form';

interface TemplateImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

const CATEGORIES = ['form', 'page', 'field'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  form: '表單',
  page: '頁面',
  field: '欄位',
};

export function TemplateImportDialog({ open, onClose, onImported }: TemplateImportDialogProps) {
  const [tabIndex, setTabIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [templates, setTemplates] = useState<TemplateListDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TemplateListDto | null>(null);
  const [importing, setImporting] = useState(false);

  const { loadSchema } = useFormBuilderStore();
  const addField = useFormBuilderStore((s) => s.addField);

  const category = CATEGORIES[tabIndex];

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await templatesApi.getTemplates({
        category,
        searchTerm: search || undefined,
        pageSize: 50,
      });
      setTemplates(response.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
      setSelected(null);
    }
  }, [open, fetchTemplates]);

  const handleImport = async () => {
    if (!selected) return;
    setImporting(true);
    setError(null);
    try {
      const detail = await templatesApi.getTemplate(selected.id);
      const parsed = JSON.parse(detail.schema);

      if (category === 'form') {
        const formSchema = parsed as FormSchema;
        if (!formSchema.version || !formSchema.pages) {
          throw new Error('無效的表單結構');
        }
        loadSchema(formSchema);
      } else if (category === 'page') {
        const page = parsed as FormPage;
        if (!page.fields) {
          throw new Error('無效的頁面結構');
        }
        // Insert as a new page via store
        const store = useFormBuilderStore.getState();
        const newSchema = structuredClone(store.schema);
        const newPageId = `page-${Date.now()}`;
        newSchema.pages.push({ ...page, id: newPageId });
        loadSchema(newSchema);
      } else if (category === 'field') {
        const field = parsed as Field;
        if (!field.type) {
          throw new Error('無效的欄位結構');
        }
        addField({ ...field, type: field.type } as { type: Field['type']; [key: string]: unknown });
      }

      onClose();
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '匯入失敗');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>匯入範本</DialogTitle>
      <DialogContent sx={{ minHeight: 400 }}>
        <Tabs value={tabIndex} onChange={(_, v) => { setTabIndex(v); setSelected(null); }} sx={{ mb: 2 }}>
          {CATEGORIES.map((cat) => (
            <Tab key={cat} label={CATEGORY_LABELS[cat]} />
          ))}
        </Tabs>

        <TextField
          placeholder="搜尋範本..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : templates.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">沒有找到{CATEGORY_LABELS[category]}範本</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
            {templates.map((t) => (
              <Card
                key={t.id}
                variant={selected?.id === t.id ? 'elevation' : 'outlined'}
                sx={{
                  border: selected?.id === t.id ? 2 : 1,
                  borderColor: selected?.id === t.id ? 'primary.main' : 'divider',
                }}
              >
                <CardActionArea onClick={() => setSelected(t)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                      {t.name}
                    </Typography>
                    {t.description && (
                      <Typography variant="body2" color="text.secondary" sx={{
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>
                        {t.description}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                      <Chip label={CATEGORY_LABELS[category]} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
                        使用 {t.usageCount} 次
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleImport} disabled={!selected || importing}>
          {importing ? '匯入中...' : '匯入'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

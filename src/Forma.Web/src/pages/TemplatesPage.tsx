/**
 * TemplatesPage - 範本管理頁面
 * 顯示範本列表，支援搜尋、分類篩選、建立/編輯/刪除範本
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Pagination,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  FormControlLabel,
  Switch,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  ContentCopy as TemplateIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { MainLayout } from '@/components/layout';
import { useConfirm } from '@/hooks/useConfirm';
import { templatesApi } from '@/lib/api/templates';
import type { TemplateListDto, TemplateDto, CreateTemplateRequest, GetTemplatesParams } from '@/types/api/templates';

// ---- Template Card ----

interface TemplateCardProps {
  template: TemplateListDto;
  onEdit: (template: TemplateListDto) => void;
  onDelete: (template: TemplateListDto) => void;
  onView: (template: TemplateListDto) => void;
}

function TemplateCard({ template, onEdit, onDelete, onView }: TemplateCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main' }}>
            <TemplateIcon />
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip
              icon={template.isPublic ? <PublicIcon sx={{ fontSize: 14 }} /> : <PrivateIcon sx={{ fontSize: 14 }} />}
              label={template.isPublic ? '公開' : '私人'}
              size="small"
              color={template.isPublic ? 'success' : 'default'}
              variant="outlined"
            />
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }}>
              <MoreIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Typography variant="h6" fontWeight="bold" gutterBottom noWrap>
          {template.name}
        </Typography>

        {template.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              mb: 1,
            }}
          >
            {template.description}
          </Typography>
        )}

        {template.category && (
          <Chip
            label={
              template.category === 'form' ? '表單' :
              template.category === 'page' ? '頁面' :
              template.category === 'field' ? '欄位' :
              template.category
            }
            size="small"
            variant="outlined"
            color={
              template.category === 'form' ? 'primary' :
              template.category === 'page' ? 'secondary' :
              template.category === 'field' ? 'info' :
              'default'
            }
            sx={{ mt: 1 }}
          />
        )}

        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Typography variant="caption" color="text.secondary">
            使用 {template.usageCount} 次
          </Typography>
        </Box>
      </CardContent>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {template.createdByUsername}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(template.createdAt).toLocaleDateString('zh-TW')}
        </Typography>
      </CardActions>

      <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => { setAnchorEl(null); onView(template); }}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>查看</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setAnchorEl(null); onEdit(template); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>編輯</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchorEl(null); onDelete(template); }} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>刪除</ListItemText>
        </MenuItem>
      </Menu>
    </Card>
  );
}

// ---- Create/Edit Dialog ----

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingTemplate?: TemplateDto | null;
}

function TemplateDialog({ open, onClose, onSaved, editingTemplate }: TemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!editingTemplate;

  const { control, handleSubmit, reset, formState: { errors } } = useForm<CreateTemplateRequest>({
    defaultValues: {
      name: '',
      description: '',
      category: '',
      schema: '{}',
      isPublic: false,
    },
  });

  useEffect(() => {
    if (open && editingTemplate) {
      reset({
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        category: editingTemplate.category || '',
        schema: editingTemplate.schema,
        isPublic: editingTemplate.isPublic,
      });
    } else if (open) {
      reset({ name: '', description: '', category: '', schema: '{}', isPublic: false });
    }
  }, [open, editingTemplate, reset]);

  const onSubmit = async (data: CreateTemplateRequest) => {
    setLoading(true);
    setError(null);
    try {
      if (isEditing && editingTemplate) {
        await templatesApi.updateTemplate(editingTemplate.id, {
          name: data.name,
          description: data.description,
          category: data.category,
          schema: data.schema,
          isPublic: data.isPublic,
        });
      } else {
        await templatesApi.createTemplate(data);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? '編輯範本' : '建立範本'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Controller
            name="name"
            control={control}
            rules={{ required: '請輸入範本名稱' }}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="範本名稱"
                error={!!errors.name}
                helperText={errors.name?.message}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="分類"
                placeholder="例如：問卷調查、活動報名"
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={3}
                label="描述"
                placeholder="範本說明（選填）"
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="schema"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={6}
                label="表單結構 (JSON)"
                placeholder='{"version":"1.0","pages":[...]}'
                sx={{ mb: 2 }}
                InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
              />
            )}
          />

          <Controller
            name="isPublic"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={field.onChange} />}
                label="公開範本（所有使用者可使用）"
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>取消</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? '儲存中...' : (isEditing ? '更新' : '建立')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---- View Dialog ----

function ViewTemplateDialog({ open, onClose, template }: { open: boolean; onClose: () => void; template: TemplateDto | null }) {
  if (!template) return null;

  let prettySchema = template.schema;
  try { prettySchema = JSON.stringify(JSON.parse(template.schema), null, 2); } catch { /* keep raw */ }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{template.name}</DialogTitle>
      <DialogContent dividers>
        {template.description && (
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {template.description}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {template.category && <Chip label={template.category} size="small" />}
          <Chip
            label={template.isPublic ? '公開' : '私人'}
            size="small"
            color={template.isPublic ? 'success' : 'default'}
          />
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>
            使用 {template.usageCount} 次 | 建立者：{template.createdByUsername}
          </Typography>
        </Box>
        <Typography variant="subtitle2" gutterBottom>表單結構</Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            bgcolor: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
            maxHeight: 400,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
          }}
        >
          {prettySchema}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>關閉</Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Skeleton ----

function TemplatesSkeleton() {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
          <Skeleton variant="rounded" height={220} />
        </Grid>
      ))}
    </Grid>
  );
}

// ---- Main Page ----

export function TemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateListDto[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateDto | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<TemplateDto | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });
  const { confirmDialog, ConfirmComponent } = useConfirm();

  const pageSize = 12;

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: GetTemplatesParams = {
        pageNumber: currentPage,
        pageSize,
        searchTerm: searchTerm || undefined,
        category: categoryFilter || undefined,
      };
      const response = await templatesApi.getTemplates(params);
      setTemplates(response.items || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, categoryFilter]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleEdit = async (template: TemplateListDto) => {
    try {
      const detail = await templatesApi.getTemplate(template.id);
      setEditingTemplate(detail);
      setDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: '載入範本失敗', severity: 'error' });
    }
  };

  const handleView = async (template: TemplateListDto) => {
    try {
      const detail = await templatesApi.getTemplate(template.id);
      setViewingTemplate(detail);
      setViewDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: '載入範本失敗', severity: 'error' });
    }
  };

  const handleDelete = async (template: TemplateListDto) => {
    const confirmed = await confirmDialog({
      cardTitle: '刪除範本',
      message: `確定要刪除「${template.name}」嗎？此操作無法復原。`,
      buttonConfirm: '刪除',
      confirmStyle: 'bg-red-600',
    });
    if (!confirmed) return;

    try {
      await templatesApi.deleteTemplate(template.id);
      setSnackbar({ open: true, message: '範本已刪除', severity: 'success' });
      loadTemplates();
    } catch (err) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : '刪除失敗', severity: 'error' });
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const handleSaved = () => {
    setSnackbar({ open: true, message: editingTemplate ? '範本已更新' : '範本已建立', severity: 'success' });
    loadTemplates();
  };

  return (
    <MainLayout title="範本管理">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              範本
            </Typography>
            <Typography variant="body1" color="text.secondary">
              管理表單範本，快速建立新表單
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            建立範本
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="搜尋範本..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[
              { value: '', label: '全部' },
              { value: 'form', label: '表單' },
              { value: 'page', label: '頁面' },
              { value: 'field', label: '欄位' },
            ].map((cat) => (
              <Chip
                key={cat.value}
                label={cat.label}
                variant={categoryFilter === cat.value ? 'filled' : 'outlined'}
                color={categoryFilter === cat.value ? 'primary' : 'default'}
                onClick={() => { setCategoryFilter(cat.value); setCurrentPage(1); }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadTemplates}>重試</Button>
        }>
          {error}
        </Alert>
      )}

      {loading ? (
        <TemplatesSkeleton />
      ) : templates.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <TemplateIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            尚無範本
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {searchTerm ? '找不到符合條件的範本' : '建立您的第一個範本'}
          </Typography>
          {!searchTerm && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
              建立範本
            </Button>
          )}
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {templates.map((template) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
                <TemplateCard
                  template={template}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onView={handleView}
                />
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      <TemplateDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTemplate(null); }}
        onSaved={handleSaved}
        editingTemplate={editingTemplate}
      />

      <ViewTemplateDialog
        open={viewDialogOpen}
        onClose={() => { setViewDialogOpen(false); setViewingTemplate(null); }}
        template={viewingTemplate}
      />

      {ConfirmComponent}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
}

export default TemplatesPage;

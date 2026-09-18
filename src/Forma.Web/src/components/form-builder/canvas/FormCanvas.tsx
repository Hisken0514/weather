/**
 * FormCanvas - Center panel for building forms (Google Forms-like)
 */

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  SaveAlt as SaveTemplateIcon,
  ArrowDropUp as ArrowDropUpIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { TemplateSaveDialog } from '../templates/TemplateSaveDialog';
import { useDroppable } from '@dnd-kit/core';
import { DroppableCanvas } from './DroppableCanvas';
import { useFormBuilderStore, useActivePageFields } from '@/stores/formBuilderStore';
import { createPageTabId } from '../dnd/droppableIds';
import { useFormTheme } from '@/hooks/useFormTheme';
import type { FormPage } from '@/types/form';
import type { ProjectTheme } from '@/types/api/projects';

// Droppable Page Tab Component - accepts field drops to move fields to this page
interface DroppablePageTabProps {
  page: FormPage;
  index: number;
  totalPages: number;
  isActive: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: () => void;
  onStartEdit: (e: React.MouseEvent) => void;
  onSaveTitle: () => void;
  onCancelEdit: () => void;
  onTitleChange: (value: string) => void;
  onOpenSettings: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveLeft: (e: React.MouseEvent) => void;
  onMoveRight: (e: React.MouseEvent) => void;
  onSaveAsTemplate: (e: React.MouseEvent) => void;
  onOverwriteTemplate: (e: React.MouseEvent) => void;
  canDelete: boolean;
}

function DroppablePageTab({
  page,
  index,
  totalPages,
  isActive,
  isEditing,
  editingTitle,
  onSelect,
  onStartEdit,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
  onOpenSettings,
  onDelete,
  onMoveLeft,
  onMoveRight,
  onSaveAsTemplate,
  onOverwriteTemplate,
  canDelete,
}: DroppablePageTabProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: createPageTabId(page.id),
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 1.5,
        py: 1,
        borderBottom: isActive ? 2 : 0,
        borderColor: isActive ? 'primary.main' : 'transparent',
        backgroundColor: isOver
          ? 'primary.light'
          : isActive
            ? 'background.paper'
            : 'transparent',
        cursor: 'pointer',
        minWidth: 'fit-content',
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: isOver
            ? 'primary.light'
            : isActive
              ? 'background.paper'
              : 'action.hover',
        },
      }}
      onClick={onSelect}
    >
      {/* Drag/Reorder Indicator */}
      <DragIcon
        sx={{
          fontSize: 16,
          color: 'text.disabled',
          mr: 0.5,
        }}
      />

      {isEditing ? (
        <TextField
          size="small"
          value={editingTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onBlur={onSaveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveTitle();
            if (e.key === 'Escape') onCancelEdit();
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
          sx={{ width: 100 }}
        />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'primary.main' : 'text.primary',
            }}
          >
            {page.title || `第${index + 1}頁`}
          </Typography>
          {isActive && (
            <>
              {/* Move Left Button */}
              {index > 0 && (
                <Tooltip title="左移">
                  <IconButton
                    size="small"
                    onClick={onMoveLeft}
                    sx={{ p: 0.25 }}
                  >
                    <ChevronLeftIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              {/* Move Right Button */}
              {index < totalPages - 1 && (
                <Tooltip title="右移">
                  <IconButton
                    size="small"
                    onClick={onMoveRight}
                    sx={{ p: 0.25 }}
                  >
                    <ChevronRightIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton
                size="small"
                onClick={onStartEdit}
                sx={{ p: 0.25, ml: 0.5 }}
              >
                <EditIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Tooltip title="頁面設定">
                <IconButton
                  size="small"
                  onClick={onOpenSettings}
                  sx={{ p: 0.25 }}
                >
                  <SettingsIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="存為頁面範本">
                <IconButton
                  size="small"
                  onClick={onSaveAsTemplate}
                  sx={{ p: 0.25 }}
                >
                  <SaveTemplateIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="覆蓋頁面範本">
                <IconButton
                  size="small"
                  onClick={onOverwriteTemplate}
                  sx={{ p: 0.25 }}
                >
                  <ArrowDropUpIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              {canDelete && (
                <IconButton
                  size="small"
                  onClick={onDelete}
                  sx={{ p: 0.25 }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </>
          )}
        </Box>
      )}

      {/* Drop indicator */}
      {isOver && !isActive && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: 'primary.main',
          }}
        />
      )}
    </Box>
  );
}

interface FormCanvasProps {
  projectTheme?: ProjectTheme;
}

export function FormCanvas({ projectTheme }: FormCanvasProps = {}) {
  const {
    schema,
    activePageId,
    setActivePage,
    addPage,
    deletePage,
    updatePageTitle,
    movePage,
    updateMetadata,
    selectField,
    selectPage,
  } = useFormBuilderStore();

  const fields = useActivePageFields();
  const resolvedTheme = useFormTheme(projectTheme, schema.settings);

  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingFormTitle, setEditingFormTitle] = useState(false);
  const [editingFormDescription, setEditingFormDescription] = useState(false);
  const [savePageTemplateId, setSavePageTemplateId] = useState<string | null>(null);
  const [overwritePageTemplateId, setOverwritePageTemplateId] = useState<string | null>(null);

  const pageForTemplate = savePageTemplateId ? schema.pages.find((p) => p.id === savePageTemplateId) : null;
  const pageForOverwrite = overwritePageTemplateId ? schema.pages.find((p) => p.id === overwritePageTemplateId) : null;

  const handleAddPage = () => {
    addPage();
  };

  const handleDeletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (schema.pages.length > 1) {
      deletePage(pageId);
    }
  };

  const handleStartEditTitle = (pageId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPageId(pageId);
    setEditingTitle(currentTitle || '');
  };

  const handleSaveTitle = () => {
    if (editingPageId) {
      updatePageTitle(editingPageId, editingTitle);
      setEditingPageId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingPageId(null);
  };

  const handleCanvasClick = () => {
    selectField(null);
  };

  const handleOpenPageSettings = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    selectPage(pageId);
  };

  const handleMovePageLeft = (pageId: string, currentIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      movePage(pageId, currentIndex - 1);
    }
  };

  const handleMovePageRight = (pageId: string, currentIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < schema.pages.length - 1) {
      movePage(pageId, currentIndex + 1);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Form Title Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: resolvedTheme.backgroundColor || schema.settings?.backgroundColor || 'background.paper',
        }}
      >
        {/* Logo */}
        {resolvedTheme.logo && (
          <Box sx={{ mb: 2, backgroundColor: resolvedTheme.logoBackgroundColor, p: 0.5, borderRadius: `${resolvedTheme.cardBorderRadius ?? 8}px`, display: 'inline-block' }}>
            <Box
              component="img"
              src={resolvedTheme.logo}
              alt="Logo"
              sx={{
                maxWidth: 200,
                maxHeight: 60,
                objectFit: 'contain',
              }}
            />
          </Box>
        )}

        {editingFormTitle ? (
          <TextField
            value={schema.metadata.title}
            onChange={(e) => updateMetadata({ title: e.target.value })}
            onBlur={() => setEditingFormTitle(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setEditingFormTitle(false);
            }}
            variant="standard"
            fullWidth
            autoFocus
            sx={{
              '& .MuiInput-root': {
                fontSize: '1.5rem',
                fontWeight: 'bold',
              },
            }}
          />
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              '&:hover .edit-icon': {
                opacity: 1,
              },
            }}
            onClick={() => setEditingFormTitle(true)}
          >
            <Typography variant="h5" fontWeight="bold">
              {schema.metadata.title || '新表單'}
            </Typography>
            <EditIcon
              className="edit-icon"
              sx={{
                fontSize: 20,
                color: 'text.secondary',
                opacity: 0.5,
                transition: 'opacity 0.2s',
              }}
            />
          </Box>
        )}

        {/* Form Description */}
        {editingFormDescription ? (
          <TextField
            value={schema.metadata.description || ''}
            onChange={(e) => updateMetadata({ description: e.target.value })}
            onBlur={() => setEditingFormDescription(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditingFormDescription(false);
            }}
            placeholder="表單說明（選填）"
            variant="standard"
            fullWidth
            multiline
            autoFocus
            sx={{
              mt: 1,
              '& .MuiInput-root': {
                fontSize: '0.95rem',
              },
            }}
          />
        ) : (
          <Box
            sx={{
              mt: 1,
              cursor: 'text',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
              borderRadius: 1,
              py: 0.5,
            }}
            onClick={() => setEditingFormDescription(true)}
          >
            <Typography
              variant="body2"
              color={schema.metadata.description ? 'text.primary' : 'text.secondary'}
            >
              {schema.metadata.description || '點擊新增表單說明...'}
            </Typography>
          </Box>
        )}

        {/* Page count indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {fields.length} 個欄位
          </Typography>
        </Box>
      </Box>

      {/* Page Tabs - Droppable for fields */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'grey.50',
          display: 'flex',
          alignItems: 'center',
          px: 1,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flex: 1,
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'grey.400',
              borderRadius: 2,
            },
          }}
        >
          {schema.pages.map((page, index) => (
            <DroppablePageTab
              key={page.id}
              page={page}
              index={index}
              totalPages={schema.pages.length}
              isActive={activePageId === page.id}
              isEditing={editingPageId === page.id}
              editingTitle={editingTitle}
              onSelect={() => setActivePage(page.id)}
              onStartEdit={(e) => handleStartEditTitle(page.id, page.title || '', e)}
              onSaveTitle={handleSaveTitle}
              onCancelEdit={handleCancelEdit}
              onTitleChange={setEditingTitle}
              onOpenSettings={(e) => handleOpenPageSettings(page.id, e)}
              onDelete={(e) => handleDeletePage(page.id, e)}
              onMoveLeft={(e) => handleMovePageLeft(page.id, index, e)}
              onMoveRight={(e) => handleMovePageRight(page.id, index, e)}
              onSaveAsTemplate={(e) => { e.stopPropagation(); setSavePageTemplateId(page.id); }}
              onOverwriteTemplate={(e) => { e.stopPropagation(); setOverwritePageTemplateId(page.id); }}
              canDelete={schema.pages.length > 1}
            />
          ))}
        </Box>

        <Tooltip title="新增頁面">
          <IconButton onClick={handleAddPage} size="small" sx={{ mr: 1 }}>
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Canvas Content */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#f0ebf8', // Google Forms purple-ish background
        }}
        onClick={handleCanvasClick}
      >
        <Box
          sx={{
            maxWidth: 720,
            mx: 'auto',
            p: 3,
          }}
        >
          <DroppableCanvas fields={fields} />
        </Box>
      </Box>
      {/* Save Page as Template Dialog */}
      <TemplateSaveDialog
        open={!!savePageTemplateId}
        onClose={() => setSavePageTemplateId(null)}
        mode="page"
        data={pageForTemplate}
      />
      {/* Overwrite Page Template Dialog */}
      <TemplateSaveDialog
        open={!!overwritePageTemplateId}
        onClose={() => setOverwritePageTemplateId(null)}
        mode="page"
        data={pageForOverwrite}
        saveMode="overwrite"
      />
    </Paper>
  );
}

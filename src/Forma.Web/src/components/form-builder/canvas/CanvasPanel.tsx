/**
 * CanvasPanel - Panel container with Google Forms-like style
 */

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Collapse,
  TextField,
  Divider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Layers as PanelIcon,
  ViewStream as DynamicPanelIcon,
} from '@mui/icons-material';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import { createPanelId, createFieldId } from '../dnd/droppableIds';
import { SortableFieldWrapper } from './SortableFieldWrapper';
import type { PanelField, PanelDynamicField } from '@/types/form';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';

interface CanvasPanelProps {
  field: PanelField | PanelDynamicField;
  isSelected: boolean;
  isDragging: boolean;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: DraggableAttributes;
  isDynamic?: boolean;
}

export function CanvasPanel({
  field,
  isSelected,
  isDragging,
  dragListeners,
  dragAttributes,
  isDynamic = false,
}: CanvasPanelProps) {
  const { selectField, deleteField, duplicateField, updateField } = useFormBuilderStore();
  const [expanded, setExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const panelId = createPanelId(field.id);
  const nestedFields = field.properties?.fields || [];
  const nestedFieldIds = nestedFields.map((f) => createFieldId(f.id));

  // Type-safe property access for properties that differ between Panel and PanelDynamic
  const props = field.properties as unknown as Record<string, unknown>;
  const panelTitle = (props?.title as string) || (props?.itemLabel as string) || '';
  const isCollapsible = !isDynamic && (props?.collapsible as boolean);

  // Make panel droppable
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: panelId,
    data: {
      type: 'panel',
      field,
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectField(field.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteField(field.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateField(field.id);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleTitleChange = (newTitle: string) => {
    // For dynamic panels, use 'itemLabel' instead of 'title'
    const titleKey = isDynamic ? 'itemLabel' : 'title';
    updateField(field.id, {
      properties: {
        ...field.properties,
        [titleKey]: newTitle,
      },
    });
  };

  const handleCollapsibleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    updateField(field.id, {
      properties: {
        ...field.properties,
        collapsible: e.target.checked,
      },
    });
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: isSelected ? 'primary.main' : isOver ? 'secondary.main' : 'divider',
        borderRadius: 2,
        boxShadow: isSelected ? 2 : 1,
        overflow: 'hidden',
        opacity: isDragging ? 0.5 : 1,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      {/* Panel Header */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Drag Handle */}
          <Box
            {...dragListeners}
            {...dragAttributes}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              color: 'text.disabled',
              '&:hover': { color: 'text.secondary' },
              '&:active': { cursor: 'grabbing' },
              mt: 1,
            }}
          >
            <DragIcon />
          </Box>

          {/* Panel Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1,
              backgroundColor: isDynamic ? 'secondary.main' : 'info.main',
              color: 'white',
              flexShrink: 0,
            }}
          >
            {isDynamic ? <DynamicPanelIcon /> : <PanelIcon />}
          </Box>

          {/* Panel Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Editable Title */}
            {isEditingTitle || isSelected ? (
              <TextField
                value={panelTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditingTitle(false);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingTitle(true);
                }}
                placeholder={isDynamic ? '動態面板標題' : '面板標題'}
                variant="standard"
                fullWidth
                autoFocus={isEditingTitle}
                sx={{
                  '& .MuiInput-root': {
                    fontSize: '1.1rem',
                    fontWeight: 500,
                  },
                }}
              />
            ) : (
              <Typography
                variant="body1"
                fontWeight="medium"
                sx={{ py: 0.5, fontSize: '1.1rem' }}
              >
                {panelTitle || field.label || (isDynamic ? '動態面板' : '面板')}
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {nestedFields.length} 個欄位
            </Typography>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title="複製">
              <IconButton size="small" onClick={handleDuplicate}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="刪除">
              <IconButton size="small" onClick={handleDelete} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={handleToggle}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Divider />
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          backgroundColor: 'grey.50',
        }}
      >
        {isDynamic ? (
          <Typography variant="body2" color="text.secondary">
            使用者可新增 {(props?.minItems as number) || 0} ~ {(props?.maxItems as number) || '無限'} 組
          </Typography>
        ) : (
          <FormControlLabel
            control={
              <Switch
                checked={isCollapsible}
                onChange={handleCollapsibleChange}
                onClick={(e) => e.stopPropagation()}
                size="small"
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                可折疊
              </Typography>
            }
            labelPlacement="start"
            sx={{ mr: 0 }}
          />
        )}
      </Box>

      {/* Panel Content */}
      <Collapse in={expanded}>
        <Box
          ref={setDroppableRef}
          sx={{
            p: 2,
            minHeight: 80,
            backgroundColor: isOver ? 'secondary.50' : 'grey.50',
            borderTop: 1,
            borderColor: 'divider',
            transition: 'background-color 0.2s ease',
          }}
        >
          {nestedFields.length === 0 ? (
            <Box
              sx={{
                py: 3,
                textAlign: 'center',
                border: '2px dashed',
                borderColor: isOver ? 'secondary.main' : 'divider',
                borderRadius: 1,
                backgroundColor: 'background.paper',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {isDynamic ? '拖曳欄位到此動態面板中（使用者可新增多組）' : '拖曳欄位到此面板中'}
              </Typography>
            </Box>
          ) : (
            <SortableContext
              items={nestedFieldIds}
              strategy={verticalListSortingStrategy}
            >
              {nestedFields.map((nestedField) => (
                <SortableFieldWrapper
                  key={nestedField.id}
                  field={nestedField}
                  containerId={panelId}
                />
              ))}
            </SortableContext>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

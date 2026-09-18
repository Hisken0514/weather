/**
 * CanvasHtml - HTML content field card for the form builder
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Divider,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Code as HtmlIcon,
} from '@mui/icons-material';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import type { HtmlField } from '@/types/form';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';

interface CanvasHtmlProps {
  field: HtmlField;
  isSelected: boolean;
  isDragging: boolean;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: DraggableAttributes;
}

export function CanvasHtml({
  field,
  isSelected,
  isDragging,
  dragListeners,
  dragAttributes,
}: CanvasHtmlProps) {
  const { selectField, deleteField, duplicateField, updateField } = useFormBuilderStore();
  const [isEditing, setIsEditing] = useState(false);

  const htmlContent = field.properties?.content || '<p>在此輸入 HTML 內容</p>';

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

  const handleContentChange = (newContent: string) => {
    updateField(field.id, {
      properties: {
        ...field.properties,
        content: newContent,
      },
    });
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderRadius: 2,
        boxShadow: isSelected ? 2 : 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 2,
          borderColor: isSelected ? 'primary.main' : 'grey.400',
        },
      }}
    >
      {/* Header */}
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

          {/* HTML Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1,
              backgroundColor: 'warning.main',
              color: 'white',
              flexShrink: 0,
            }}
          >
            <HtmlIcon />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
              HTML 內容
            </Typography>

            {isEditing || isSelected ? (
              <TextField
                value={htmlContent}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                placeholder="<p>輸入 HTML...</p>"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                size="small"
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                  },
                }}
              />
            ) : (
              <Box
                sx={{
                  p: 1.5,
                  backgroundColor: 'grey.100',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            )}
          </Box>

          {/* Actions */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
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
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Divider />
      <Box
        sx={{
          px: 2,
          py: 1,
          backgroundColor: 'grey.50',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          支援基本 HTML 標籤
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * DraggableFieldItem - Draggable field type item in toolbox
 */

import { useDraggable } from '@dnd-kit/core';
import { Box, Typography, Paper } from '@mui/material';
import * as Icons from '@mui/icons-material';
import { createToolboxId } from '../dnd/droppableIds';
import type { FieldTypeDefinition } from './fieldTypeDefinitions';

interface DraggableFieldItemProps {
  definition: FieldTypeDefinition;
}

export function DraggableFieldItem({ definition }: DraggableFieldItemProps) {
  const id = createToolboxId(definition.type);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: {
      type: 'toolbox',
      fieldType: definition.type,
    },
  });

  const IconComponent = (Icons as Record<string, React.ElementType>)[definition.icon] || Icons.HelpOutline;

  return (
    <Paper
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      elevation={isDragging ? 0 : 1}
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'grab',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': {
          elevation: 3,
          backgroundColor: 'action.hover',
          transform: 'translateY(-1px)',
        },
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 1,
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
        }}
      >
        <IconComponent fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight="medium" noWrap>
          {definition.label}
        </Typography>
      </Box>
    </Paper>
  );
}

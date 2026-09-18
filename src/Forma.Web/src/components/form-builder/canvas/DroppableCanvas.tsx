/**
 * DroppableCanvas - Drop zone wrapper for the canvas
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box } from '@mui/material';
import { CANVAS_ROOT_ID, createFieldId } from '../dnd/droppableIds';
import { SortableFieldWrapper } from './SortableFieldWrapper';
import { EmptyCanvasPlaceholder } from './EmptyCanvasPlaceholder';
import type { Field } from '@/types/form';

interface DroppableCanvasProps {
  fields: Field[];
}

export function DroppableCanvas({ fields }: DroppableCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: CANVAS_ROOT_ID,
    data: {
      type: 'canvas',
    },
  });

  const fieldIds = fields.map((f) => createFieldId(f.id));

  return (
    <Box
      ref={setNodeRef}
      sx={{
        flex: 1,
        p: 2,
        minHeight: 400,
        backgroundColor: isOver ? 'primary.50' : 'transparent',
        transition: 'background-color 0.2s ease',
        borderRadius: 1,
      }}
    >
      {fields.length === 0 ? (
        <EmptyCanvasPlaceholder />
      ) : (
        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
          {fields.map((field) => (
            <SortableFieldWrapper
              key={field.id}
              field={field}
              containerId={CANVAS_ROOT_ID}
            />
          ))}
        </SortableContext>
      )}
    </Box>
  );
}

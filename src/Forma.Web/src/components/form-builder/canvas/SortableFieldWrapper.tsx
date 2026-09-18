/**
 * SortableFieldWrapper - Wraps CanvasField with sortable functionality
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box } from '@mui/material';
import { CanvasField } from './CanvasField';
import { CanvasPanel } from './CanvasPanel';
import { CanvasHtml } from './CanvasHtml';
import { createFieldId } from '../dnd/droppableIds';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import type { Field } from '@/types/form';

interface SortableFieldWrapperProps {
  field: Field;
  containerId: string;
}

export function SortableFieldWrapper({ field, containerId }: SortableFieldWrapperProps) {
  const { selectedFieldId } = useFormBuilderStore();
  const isSelected = selectedFieldId === field.id;

  const sortableId = createFieldId(field.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId,
    data: {
      type: 'field',
      field,
      containerId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Render panel with nested fields (panel type)
  if (field.type === 'panel') {
    return (
      <Box ref={setNodeRef} style={style} sx={{ mb: 1.5 }}>
        <CanvasPanel
          field={field}
          isSelected={isSelected}
          isDragging={isDragging}
          dragListeners={listeners}
          dragAttributes={attributes}
        />
      </Box>
    );
  }

  // Render dynamic panel (paneldynamic type)
  if (field.type === 'paneldynamic') {
    return (
      <Box ref={setNodeRef} style={style} sx={{ mb: 1.5 }}>
        <CanvasPanel
          field={field}
          isSelected={isSelected}
          isDragging={isDragging}
          dragListeners={listeners}
          dragAttributes={attributes}
          isDynamic
        />
      </Box>
    );
  }

  // Render HTML content
  if (field.type === 'html') {
    return (
      <Box ref={setNodeRef} style={style} sx={{ mb: 1.5 }}>
        <CanvasHtml
          field={field}
          isSelected={isSelected}
          isDragging={isDragging}
          dragListeners={listeners}
          dragAttributes={attributes}
        />
      </Box>
    );
  }

  // Render regular field
  return (
    <Box ref={setNodeRef} style={style} sx={{ mb: 1.5 }}>
      <CanvasField
        field={field}
        isSelected={isSelected}
        isDragging={isDragging}
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </Box>
  );
}

/**
 * DndProvider - DnD Context Provider with sensors and collision detection
 */

import { useMemo, useState, useCallback, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import { DragOverlayContent } from './DragOverlayContent';
import { parseId, isToolboxItem, CANVAS_ROOT_ID } from './droppableIds';
import { createDefaultField, getFieldTypeDefinition } from '../toolbox/fieldTypeDefinitions';
import type { FieldType } from '@/types/form';

interface DndProviderProps {
  children: ReactNode;
}

export function DndProvider({ children }: DndProviderProps) {
  const { addField, moveField, moveFieldToPage } = useFormBuilderStore();

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [, setOverId] = useState<UniqueIdentifier | null>(null);

  // Configure sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Custom collision detection: combine strategies for better UX
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    // Check for pointer collisions first
    const pointerCollisions = pointerWithin(args);

    // Priority 1: Panel collisions (for nesting fields in panels)
    const panelCollision = pointerCollisions.find((c) => String(c.id).startsWith('panel-'));
    if (panelCollision) {
      return [panelCollision];
    }

    // Priority 2: Page-tab collisions (for moving fields between pages)
    const pageTabCollision = pointerCollisions.find((c) => String(c.id).startsWith('page-tab-'));
    if (pageTabCollision) {
      return [pageTabCollision];
    }

    // Use closest center for sortable field positions
    const closestCollisions = closestCenter(args);

    // Priority 3: Field collision (for reordering)
    const fieldCollision = closestCollisions.find((collision) => {
      const id = String(collision.id);
      return id.startsWith('field-');
    });

    if (fieldCollision) {
      return [fieldCollision];
    }

    // Priority 4: Canvas root
    if (pointerCollisions.length > 0) {
      const canvasCollision = pointerCollisions.find((c) => String(c.id) === CANVAS_ROOT_ID);
      if (canvasCollision) {
        return [canvasCollision];
      }
      return pointerCollisions;
    }

    // Fall back to rect intersection
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }

    return closestCollisions;
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id ?? null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      const activeParsed = parseId(activeIdStr);
      const overParsed = parseId(overIdStr);

      // Case 1: Dragging from toolbox to canvas
      if (activeParsed.type === 'toolbox') {
        const fieldType = activeParsed.originalId as FieldType;
        const definition = getFieldTypeDefinition(fieldType);

        if (!definition) return;

        const newField = createDefaultField(fieldType);

        // Determine drop position and parent
        let dropIndex: number | undefined;
        let parentId: string | undefined;

        if (overParsed.type === 'canvas') {
          // Dropped on canvas root
          dropIndex = undefined;
        } else if (overParsed.type === 'panel') {
          // Dropped on a panel
          parentId = overParsed.originalId;
          dropIndex = undefined;
        } else if (overParsed.type === 'field') {
          // Dropped on another field - insert after it
          // The index will be calculated in the store based on sortable context
          const sortableData = over.data.current?.sortable;
          if (sortableData) {
            dropIndex = sortableData.index + 1;
            // Check if the field is inside a panel
            if (sortableData.containerId && sortableData.containerId !== CANVAS_ROOT_ID) {
              const containerParsed = parseId(sortableData.containerId);
              if (containerParsed.type === 'panel') {
                parentId = containerParsed.originalId;
              }
            }
          }
        }

        addField(newField, dropIndex, parentId);
      }
      // Case 2: Reordering fields on canvas
      else if (activeParsed.type === 'field' && overParsed.type === 'field') {
        if (activeIdStr === overIdStr) return;

        const sortableData = over.data.current?.sortable;
        if (sortableData) {
          const newIndex = sortableData.index;

          // Determine parent container
          let parentId: string | undefined;
          if (sortableData.containerId && sortableData.containerId !== CANVAS_ROOT_ID) {
            const containerParsed = parseId(sortableData.containerId);
            if (containerParsed.type === 'panel') {
              parentId = containerParsed.originalId;
            }
          }

          moveField(activeParsed.originalId, newIndex, parentId);
        }
      }
      // Case 3: Moving field to canvas root, panel, or another page
      else if (activeParsed.type === 'field') {
        if (overParsed.type === 'canvas') {
          // Move to end of canvas
          moveField(activeParsed.originalId, Infinity, undefined);
        } else if (overParsed.type === 'panel') {
          // Move to panel
          moveField(activeParsed.originalId, Infinity, overParsed.originalId);
        } else if (overParsed.type === 'page-tab') {
          // Move field to another page
          moveFieldToPage(activeParsed.originalId, overParsed.originalId);
        }
      }
    },
    [addField, moveField, moveFieldToPage]
  );

  // Get drag data for overlay
  const dragData = useMemo(() => {
    if (!activeId) return null;

    const parsed = parseId(String(activeId));
    return {
      type: parsed.type,
      id: parsed.originalId,
      isToolboxItem: isToolboxItem(String(activeId)),
    };
  }, [activeId]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {dragData && <DragOverlayContent type={dragData.type} id={dragData.id} />}
      </DragOverlay>
    </DndContext>
  );
}

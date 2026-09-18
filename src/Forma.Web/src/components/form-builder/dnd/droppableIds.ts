/**
 * DnD ID Constants and Utilities
 */

// Prefixes for different draggable types
export const DND_PREFIXES = {
  TOOLBOX: 'toolbox',
  FIELD: 'field',
  CANVAS: 'canvas',
  PANEL: 'panel',
  PAGE_TAB: 'page-tab',
} as const;

// Canvas root drop zone ID
export const CANVAS_ROOT_ID = 'canvas-root';

// Create toolbox item ID
export const createToolboxId = (fieldType: string): string => {
  return `${DND_PREFIXES.TOOLBOX}-${fieldType}`;
};

// Create canvas field ID
export const createFieldId = (fieldId: string): string => {
  return `${DND_PREFIXES.FIELD}-${fieldId}`;
};

// Create panel drop zone ID
export const createPanelId = (panelId: string): string => {
  return `${DND_PREFIXES.PANEL}-${panelId}`;
};

// Create page tab drop zone ID
export const createPageTabId = (pageId: string): string => {
  return `${DND_PREFIXES.PAGE_TAB}-${pageId}`;
};

// Parse ID to get type and original ID
export const parseId = (
  id: string
): { type: 'toolbox' | 'field' | 'panel' | 'canvas' | 'page-tab' | 'unknown'; originalId: string } => {
  if (id === CANVAS_ROOT_ID) {
    return { type: 'canvas', originalId: '' };
  }

  if (id.startsWith(`${DND_PREFIXES.TOOLBOX}-`)) {
    return { type: 'toolbox', originalId: id.replace(`${DND_PREFIXES.TOOLBOX}-`, '') };
  }

  if (id.startsWith(`${DND_PREFIXES.FIELD}-`)) {
    return { type: 'field', originalId: id.replace(`${DND_PREFIXES.FIELD}-`, '') };
  }

  if (id.startsWith(`${DND_PREFIXES.PANEL}-`)) {
    return { type: 'panel', originalId: id.replace(`${DND_PREFIXES.PANEL}-`, '') };
  }

  if (id.startsWith(`${DND_PREFIXES.PAGE_TAB}-`)) {
    return { type: 'page-tab', originalId: id.replace(`${DND_PREFIXES.PAGE_TAB}-`, '') };
  }

  return { type: 'unknown', originalId: id };
};

// Check if ID is a toolbox item
export const isToolboxItem = (id: string): boolean => {
  return id.startsWith(`${DND_PREFIXES.TOOLBOX}-`);
};

// Check if ID is a canvas field
export const isCanvasField = (id: string): boolean => {
  return id.startsWith(`${DND_PREFIXES.FIELD}-`);
};

// Check if ID is a droppable container
export const isDroppableContainer = (id: string): boolean => {
  return id === CANVAS_ROOT_ID || id.startsWith(`${DND_PREFIXES.PANEL}-`);
};

// Get the parent container ID from a field ID
export const getParentContainerId = (_id: string, parentPanelId?: string): string => {
  return parentPanelId ? createPanelId(parentPanelId) : CANVAS_ROOT_ID;
};

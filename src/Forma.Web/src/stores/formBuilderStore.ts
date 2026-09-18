/**
 * Form Builder Store - Zustand state management
 */

import { create } from 'zustand';
import type { Field, FieldType, FormSchema, FormPage, FormSettings } from '@/types/form';

// Generate unique ID
const generateId = () => `field-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Type for adding new fields - more flexible than Partial<Field>
type NewFieldData = {
  type: FieldType;
  label?: string;
  name?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
};

const MAX_HISTORY = 50;

interface FormBuilderState {
  schema: FormSchema;
  activePageId: string | null;
  selectedFieldId: string | null;
  selectedPageId: string | null; // When a page tab is selected for editing
  isPreviewMode: boolean;

  // History
  history: FormSchema[];
  historyIndex: number;

  // Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addField: (field: NewFieldData, index?: number, parentId?: string) => void;
  updateField: (fieldId: string, updates: Partial<Field>) => void;
  deleteField: (fieldId: string) => void;
  moveField: (fieldId: string, newIndex: number, newParentId?: string) => void;
  selectField: (fieldId: string | null) => void;
  selectPage: (pageId: string | null) => void;
  duplicateField: (fieldId: string) => void;
  togglePreviewMode: () => void;
  setActivePage: (pageId: string) => void;
  addPage: () => void;
  deletePage: (pageId: string) => void;
  updatePage: (pageId: string, updates: Partial<FormPage>) => void;
  updatePageTitle: (pageId: string, title: string) => void;
  movePage: (pageId: string, newIndex: number) => void;
  moveFieldToPage: (fieldId: string, targetPageId: string) => void;
  updateMetadata: (updates: Partial<FormSchema['metadata']>) => void;
  updateSettings: (updates: Partial<FormSettings>) => void;
  resetSchema: () => void;
  loadSchema: (schema: FormSchema) => void;
}

// Default empty schema
const createDefaultSchema = (): FormSchema => ({
  version: '1.0',
  id: generateId(),
  metadata: {
    title: '新表單',
    description: '',
    language: 'zh-TW',
    submitButtonText: '提交',
    successMessage: '感謝您的提交！',
  },
  settings: {
    allowDraft: false,
    showProgressBar: true,
    displayMode: {
      default: 'classic',
    },
  },
  pages: [
    {
      id: 'page-1',
      title: '第1頁',
      fields: [],
    },
  ],
});

// Helper: Find field in nested structure
const findFieldInFields = (
  fields: Field[],
  fieldId: string
): { field: Field; parent: Field[] | null; index: number } | null => {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field.id === fieldId) {
      return { field, parent: fields, index: i };
    }
    // Check nested fields in panel
    if (field.type === 'panel' && field.properties?.fields) {
      const result = findFieldInFields(field.properties.fields, fieldId);
      if (result) return result;
    }
    if (field.type === 'paneldynamic' && field.properties?.fields) {
      const result = findFieldInFields(field.properties.fields, fieldId);
      if (result) return result;
    }
  }
  return null;
};

// Helper: Find field across all pages
const findField = (
  pages: FormPage[],
  fieldId: string
): { field: Field; parent: Field[]; index: number; pageId: string } | null => {
  for (const page of pages) {
    const result = findFieldInFields(page.fields, fieldId);
    if (result && result.parent) {
      return { ...result, parent: result.parent, pageId: page.id };
    }
  }
  return null;
};

// Helper: Remove field from fields array
const removeFieldFromFields = (fields: Field[], fieldId: string): boolean => {
  const index = fields.findIndex((f) => f.id === fieldId);
  if (index !== -1) {
    fields.splice(index, 1);
    return true;
  }
  // Check nested
  for (const field of fields) {
    if (field.type === 'panel' && field.properties?.fields) {
      if (removeFieldFromFields(field.properties.fields, fieldId)) return true;
    }
    if (field.type === 'paneldynamic' && field.properties?.fields) {
      if (removeFieldFromFields(field.properties.fields, fieldId)) return true;
    }
  }
  return false;
};

// Helper: Deep clone a field with new IDs
const cloneFieldWithNewId = (field: Field): Field => {
  const newId = generateId();
  const cloned = { ...field, id: newId, name: `${field.name}_copy` };

  // Clone nested fields if panel
  if (cloned.type === 'panel' && cloned.properties?.fields) {
    cloned.properties = {
      ...cloned.properties,
      fields: cloned.properties.fields.map(cloneFieldWithNewId),
    };
  }
  if (cloned.type === 'paneldynamic' && cloned.properties?.fields) {
    cloned.properties = {
      ...cloned.properties,
      fields: cloned.properties.fields.map(cloneFieldWithNewId),
    };
  }

  return cloned;
};

// Helper: Get target fields array
const getTargetFields = (pages: FormPage[], activePageId: string, parentId?: string): Field[] | null => {
  const page = pages.find((p) => p.id === activePageId);
  if (!page) return null;

  if (!parentId) {
    return page.fields;
  }

  // Find parent panel or paneldynamic
  const parentResult = findFieldInFields(page.fields, parentId);
  if (parentResult && (parentResult.field.type === 'panel' || parentResult.field.type === 'paneldynamic') && parentResult.field.properties) {
    return parentResult.field.properties.fields;
  }

  return null;
};

// Helper: push current schema to history, truncating future
function pushHistory(state: FormBuilderState): Pick<FormBuilderState, 'history' | 'historyIndex'> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(structuredClone(state.schema));
  // Cap history size
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }
  return { history: newHistory, historyIndex: newHistory.length - 1 };
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  schema: createDefaultSchema(),
  activePageId: 'page-1',
  selectedFieldId: null,
  selectedPageId: null,
  isPreviewMode: false,
  history: [structuredClone(createDefaultSchema())],
  historyIndex: 0,

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        schema: structuredClone(state.history[newIndex]),
        historyIndex: newIndex,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        schema: structuredClone(state.history[newIndex]),
        historyIndex: newIndex,
      };
    });
  },

  addField: (partialField, index, parentId) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const activePageId = state.activePageId || newSchema.pages[0]?.id;

      if (!activePageId) return state;

      const targetFields = getTargetFields(newSchema.pages, activePageId, parentId);
      if (!targetFields) return state;

      const newField: Field = {
        ...partialField,
        id: generateId(),
        name: partialField.name || `field_${Date.now()}`,
        label: partialField.label || '新欄位',
        type: partialField.type,
      } as Field;

      if (index !== undefined && index >= 0 && index <= targetFields.length) {
        targetFields.splice(index, 0, newField);
      } else {
        targetFields.push(newField);
      }

      const hist = pushHistory({ ...state, schema: state.schema });
      return { schema: newSchema, selectedFieldId: newField.id, history: [...hist.history.slice(0, hist.historyIndex + 1), structuredClone(newSchema)], historyIndex: hist.historyIndex + 1 };
    });
  },

  updateField: (fieldId, updates) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const result = findField(newSchema.pages, fieldId);

      if (result) {
        Object.assign(result.field, updates);
      }

      const h = pushHistory(state);
      return { schema: newSchema, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  deleteField: (fieldId) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);

      for (const page of newSchema.pages) {
        if (removeFieldFromFields(page.fields, fieldId)) break;
      }

      const h = pushHistory(state);
      return {
        schema: newSchema,
        selectedFieldId: state.selectedFieldId === fieldId ? null : state.selectedFieldId,
        history: [...h.history, structuredClone(newSchema)],
        historyIndex: h.historyIndex + 1,
      };
    });
  },

  moveField: (fieldId, newIndex, newParentId) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const activePageId = state.activePageId || newSchema.pages[0]?.id;

      if (!activePageId) return state;

      // Find and remove the field from its current location
      const result = findField(newSchema.pages, fieldId);
      if (!result) return state;

      const fieldCopy = structuredClone(result.field);
      result.parent.splice(result.index, 1);

      // Get target location
      const targetFields = getTargetFields(newSchema.pages, activePageId, newParentId);
      if (!targetFields) return state;

      // Insert at new position
      const insertIndex = Math.min(newIndex, targetFields.length);
      targetFields.splice(insertIndex, 0, fieldCopy);

      const h = pushHistory(state);
      return { schema: newSchema, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  selectField: (fieldId) => {
    set({ selectedFieldId: fieldId, selectedPageId: null });
  },

  selectPage: (pageId) => {
    set({ selectedPageId: pageId, selectedFieldId: null });
  },

  duplicateField: (fieldId) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const result = findField(newSchema.pages, fieldId);

      if (result) {
        const clonedField = cloneFieldWithNewId(result.field);
        result.parent.splice(result.index + 1, 0, clonedField);
        const h = pushHistory(state);
        return { schema: newSchema, selectedFieldId: clonedField.id, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
      }

      return state;
    });
  },

  togglePreviewMode: () => {
    set((state) => ({ isPreviewMode: !state.isPreviewMode }));
  },

  setActivePage: (pageId) => {
    set({ activePageId: pageId, selectedFieldId: null, selectedPageId: null });
  },

  addPage: () => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const newPageId = `page-${Date.now()}`;
      const pageNumber = newSchema.pages.length + 1;

      newSchema.pages.push({
        id: newPageId,
        title: `第${pageNumber}頁`,
        fields: [],
      });

      const h = pushHistory(state);
      return { schema: newSchema, activePageId: newPageId, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  deletePage: (pageId) => {
    set((state) => {
      if (state.schema.pages.length <= 1) return state;

      const newSchema = structuredClone(state.schema);
      const index = newSchema.pages.findIndex((p) => p.id === pageId);

      if (index !== -1) {
        newSchema.pages.splice(index, 1);
        const newActivePage = newSchema.pages[Math.min(index, newSchema.pages.length - 1)];
        const h = pushHistory(state);
        return {
          schema: newSchema,
          activePageId: newActivePage?.id || null,
          selectedFieldId: null,
          history: [...h.history, structuredClone(newSchema)],
          historyIndex: h.historyIndex + 1,
        };
      }

      return state;
    });
  },

  updatePageTitle: (pageId, title) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const page = newSchema.pages.find((p) => p.id === pageId);

      if (page) {
        page.title = title;
      }

      const h = pushHistory(state);
      return { schema: newSchema, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  movePage: (pageId, newIndex) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const currentIndex = newSchema.pages.findIndex((p) => p.id === pageId);

      if (currentIndex === -1 || currentIndex === newIndex) return state;

      const [page] = newSchema.pages.splice(currentIndex, 1);
      newSchema.pages.splice(newIndex, 0, page);

      const h = pushHistory(state);
      return { schema: newSchema, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  moveFieldToPage: (fieldId, targetPageId) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);

      // Find and remove the field from its current location
      const result = findField(newSchema.pages, fieldId);
      if (!result) return state;

      // Don't move if already on target page
      if (result.pageId === targetPageId) return state;

      const fieldCopy = structuredClone(result.field);
      result.parent.splice(result.index, 1);

      // Find target page and add field to it
      const targetPage = newSchema.pages.find((p) => p.id === targetPageId);
      if (!targetPage) return state;

      targetPage.fields.push(fieldCopy);

      const h = pushHistory(state);
      return { schema: newSchema, activePageId: targetPageId, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  updatePage: (pageId, updates) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      const page = newSchema.pages.find((p) => p.id === pageId);

      if (page) {
        Object.assign(page, updates);
      }

      const h = pushHistory(state);
      return { schema: newSchema, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  updateMetadata: (updates) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      newSchema.metadata = { ...newSchema.metadata, ...updates };
      const h = pushHistory(state);
      return { schema: newSchema, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  updateSettings: (updates) => {
    set((state) => {
      const newSchema = structuredClone(state.schema);
      newSchema.settings = { ...newSchema.settings, ...updates };
      const h = pushHistory(state);
      return { schema: newSchema, history: [...h.history, structuredClone(newSchema)], historyIndex: h.historyIndex + 1 };
    });
  },

  resetSchema: () => {
    const defaultSchema = createDefaultSchema();
    set({
      schema: defaultSchema,
      activePageId: 'page-1',
      selectedFieldId: null,
      selectedPageId: null,
      isPreviewMode: false,
      history: [structuredClone(defaultSchema)],
      historyIndex: 0,
    });
  },

  loadSchema: (schema) => {
    set({
      schema,
      activePageId: schema.pages[0]?.id || null,
      selectedFieldId: null,
      selectedPageId: null,
      isPreviewMode: false,
      history: [structuredClone(schema)],
      historyIndex: 0,
    });
  },
}));

// Selectors
export const useActivePageFields = () => {
  const { schema, activePageId } = useFormBuilderStore();
  const page = schema.pages.find((p) => p.id === activePageId);
  return page?.fields || [];
};

export const useSelectedField = () => {
  const { schema, selectedFieldId } = useFormBuilderStore();
  if (!selectedFieldId) return null;

  const result = findField(schema.pages, selectedFieldId);
  return result?.field || null;
};

export const useActivePage = () => {
  const { schema, activePageId } = useFormBuilderStore();
  return schema.pages.find((p) => p.id === activePageId) || null;
};

export const useSelectedPage = () => {
  const { schema, selectedPageId } = useFormBuilderStore();
  if (!selectedPageId) return null;
  return schema.pages.find((p) => p.id === selectedPageId) || null;
};

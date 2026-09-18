/**
 * Form Builder - Unified exports
 */

export { DndProvider } from './dnd/DndProvider';
export { FieldToolbox } from './toolbox/FieldToolbox';
export { FormCanvas } from './canvas/FormCanvas';
export { PropertyEditor } from './properties/PropertyEditor';
export { FormPreview } from './preview/FormPreview';

// Re-export store
export { useFormBuilderStore, useActivePageFields, useSelectedField, useActivePage } from '@/stores/formBuilderStore';

// Re-export field type definitions
export {
  fieldCategories,
  fieldTypeDefinitions,
  getFieldTypeDefinition,
  getFieldTypesByCategory,
  createDefaultField,
  type FieldTypeDefinition,
  type FieldCategory,
  type FieldCategoryInfo,
} from './toolbox/fieldTypeDefinitions';

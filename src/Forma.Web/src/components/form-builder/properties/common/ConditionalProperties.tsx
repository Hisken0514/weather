/**
 * ConditionalProperties - 欄位條件顯示設定
 */

import { useMemo } from 'react';
import { useSelectedField, useFormBuilderStore } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';
import { ConditionalEditor } from './ConditionalEditor';
import type { Conditional, Field } from '@/types/form';

export function ConditionalProperties() {
  const field = useSelectedField();
  const { schema, updateField } = useFormBuilderStore();

  // Get all fields from all pages, excluding self and layout types
  const allFields = useMemo(() => {
    if (!field) return [];
    return schema.pages
      .flatMap((page) => page.fields)
      .filter(
        (f) =>
          f.id !== field.id &&
          !['panel', 'paneldynamic', 'html', 'section'].includes(f.type)
      );
  }, [schema.pages, field]);

  if (!field) return null;

  // Layout/display types don't need conditional visibility
  if (['welcome', 'ending'].includes(field.type)) return null;

  const handleChange = (conditional: Conditional) => {
    updateField(field.id, { conditional } as Partial<Field>);
  };

  const handleClear = () => {
    updateField(field.id, { conditional: undefined } as Partial<Field>);
  };

  return (
    <PropertySection title="條件顯示">
      <ConditionalEditor
        conditional={field.conditional}
        allFields={allFields}
        onChange={handleChange}
        onClear={handleClear}
      />
    </PropertySection>
  );
}

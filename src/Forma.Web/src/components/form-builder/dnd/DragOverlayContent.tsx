/**
 * DragOverlayContent - Visual feedback during drag
 */

import { Paper, Box, Typography } from '@mui/material';
import * as Icons from '@mui/icons-material';
import { getFieldTypeDefinition } from '../toolbox/fieldTypeDefinitions';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import type { FieldType } from '@/types/form';

interface DragOverlayContentProps {
  type: 'toolbox' | 'field' | 'panel' | 'canvas' | 'page-tab' | 'unknown';
  id: string;
}

export function DragOverlayContent({ type, id }: DragOverlayContentProps) {
  if (type === 'toolbox') {
    return <ToolboxItemOverlay fieldType={id as FieldType} />;
  }

  if (type === 'field') {
    return <CanvasFieldOverlay fieldId={id} />;
  }

  return null;
}

function ToolboxItemOverlay({ fieldType }: { fieldType: FieldType }) {
  const definition = getFieldTypeDefinition(fieldType);

  if (!definition) return null;

  const IconComponent = (Icons as Record<string, React.ElementType>)[definition.icon] || Icons.HelpOutline;

  return (
    <Paper
      elevation={8}
      sx={{
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'primary.main',
        color: 'white',
        minWidth: 150,
        cursor: 'grabbing',
        transform: 'rotate(3deg)',
      }}
    >
      <IconComponent fontSize="small" />
      <Typography variant="body2" fontWeight="medium">
        {definition.label}
      </Typography>
    </Paper>
  );
}

function CanvasFieldOverlay({ fieldId }: { fieldId: string }) {
  const { schema } = useFormBuilderStore();

  // Find field in schema
  const findField = (fieldId: string) => {
    for (const page of schema.pages) {
      const found = findFieldRecursive(page.fields, fieldId);
      if (found) return found;
    }
    return null;
  };

  const findFieldRecursive = (fields: any[], targetId: string): any => {
    for (const field of fields) {
      if (field.id === targetId) return field;
      if (field.properties?.fields) {
        const found = findFieldRecursive(field.properties.fields, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const field = findField(fieldId);

  if (!field) return null;

  const definition = getFieldTypeDefinition(field.type);
  const IconComponent = definition
    ? (Icons as Record<string, React.ElementType>)[definition.icon] || Icons.HelpOutline
    : Icons.HelpOutline;

  return (
    <Paper
      elevation={8}
      sx={{
        p: 2,
        minWidth: 200,
        backgroundColor: 'background.paper',
        border: '2px solid',
        borderColor: 'primary.main',
        cursor: 'grabbing',
        opacity: 0.9,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconComponent color="primary" fontSize="small" />
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {field.label || field.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {definition?.label || field.type}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

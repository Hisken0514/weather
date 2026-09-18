/**
 * ToolboxCategory - Collapsible category section in toolbox
 */

import { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import { DraggableFieldItem } from './DraggableFieldItem';
import type { FieldCategoryInfo, FieldTypeDefinition } from './fieldTypeDefinitions';

interface ToolboxCategoryProps {
  category: FieldCategoryInfo;
  fields: FieldTypeDefinition[];
  defaultExpanded?: boolean;
}

export function ToolboxCategory({ category, fields, defaultExpanded = true }: ToolboxCategoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const IconComponent = (Icons as Record<string, React.ElementType>)[category.icon] || Icons.Folder;

  if (fields.length === 0) return null;

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1,
          px: 1,
          cursor: 'pointer',
          borderRadius: 1,
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconComponent fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            {category.label}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            ({fields.length})
          </Typography>
        </Box>
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Stack spacing={0.5} sx={{ pl: 1, pr: 1, pb: 1 }}>
          {fields.map((field) => (
            <DraggableFieldItem key={field.type} definition={field} />
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

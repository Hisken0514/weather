/**
 * PropertySection - Collapsible section in property editor
 */

import { useState } from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

interface PropertySectionProps {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export function PropertySection({ title, defaultExpanded = true, children }: PropertySectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box sx={{ mb: 2 }}>
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
          backgroundColor: 'grey.100',
          '&:hover': {
            backgroundColor: 'grey.200',
          },
        }}
      >
        <Typography variant="subtitle2" fontWeight="bold">
          {title}
        </Typography>
        <IconButton size="small" sx={{ p: 0 }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ pt: 2, px: 1 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}

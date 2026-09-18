/**
 * FormPanelField - 面板欄位組件
 * 用於將多個欄位組織成一個可折疊的區塊
 */

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import type { PanelField as PanelFieldType } from '@/types/form';
import { FieldRenderer } from './FieldRenderer';

interface FormPanelFieldProps {
  field: PanelFieldType;
  allFieldsRequired?: boolean;
}

export function FormPanelField({ field, allFieldsRequired }: FormPanelFieldProps) {
  const { name, label, description, disabled, properties } = field;

  const title = properties?.title ?? label ?? name;
  const panelDescription = properties?.description ?? description;
  const collapsible = properties?.collapsible ?? false;
  const initialCollapsed = properties?.collapsed ?? false;
  const fields = properties?.fields ?? [];

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {/* 面板標題 */}
      <Box
        sx={{
          p: 2,
          backgroundColor: 'grey.50',
          borderBottom: collapsed ? 'none' : '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: collapsible ? 'pointer' : 'default',
        }}
        onClick={handleToggle}
      >
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight="medium"
            sx={{
              '& b, & strong': { fontWeight: 700 },
              '& i, & em': { fontStyle: 'italic' },
              '& u': { textDecoration: 'underline' },
              '& a': { color: 'primary.main', textDecoration: 'underline' },
            }}
            dangerouslySetInnerHTML={{ __html: title }}
          />
          {panelDescription && !collapsed && (
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{
                '& b, & strong': { fontWeight: 600 },
                '& i, & em': { fontStyle: 'italic' },
                '& u': { textDecoration: 'underline' },
                '& a': { color: 'primary.main', textDecoration: 'underline' },
              }}
              dangerouslySetInnerHTML={{ __html: panelDescription }}
            />
          )}
        </Box>
        {collapsible && (
          <IconButton size="small" onClick={handleToggle}>
            {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        )}
      </Box>

      {/* 面板內容 */}
      <Collapse in={!collapsed}>
        <Box sx={{ p: 2 }}>
          {fields.map((childField) => (
            <Box key={childField.id} sx={{ mb: 2 }}>
              <FieldRenderer field={childField} allFieldsRequired={allFieldsRequired} />
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

export default FormPanelField;

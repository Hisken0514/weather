/**
 * PropertyEditor - Right panel for editing selected field or page properties
 */

import { useState } from 'react';
import { Box, Paper, Typography, Chip, Button, Menu, MenuItem } from '@mui/material';
import * as Icons from '@mui/icons-material';
import { useFormBuilderStore, useSelectedField, useSelectedPage } from '@/stores/formBuilderStore';
import { TemplateSaveDialog } from '../templates/TemplateSaveDialog';
import { getFieldTypeDefinition } from '../toolbox/fieldTypeDefinitions';

// Property Sections
import { BasicProperties } from './common/BasicProperties';
import { LayoutProperties } from './common/LayoutProperties';
import { ValidationProperties } from './common/ValidationProperties';
import { ConditionalProperties } from './common/ConditionalProperties';

// Type-specific Properties
import { TextProperties } from './type-specific/TextProperties';
import { MultipleTextProperties } from './type-specific/MultipleTextProperties';
import { NumberProperties } from './type-specific/NumberProperties';
import { SelectProperties } from './type-specific/SelectProperties';
import { RatingProperties } from './type-specific/RatingProperties';
import { PanelProperties } from './type-specific/PanelProperties';
import { PanelDynamicProperties } from './type-specific/PanelDynamicProperties';
import { ExpressionProperties } from './type-specific/ExpressionProperties';
import { MatrixProperties } from './type-specific/MatrixProperties';
import { ImagePickerProperties } from './type-specific/ImagePickerProperties';
import { CascadingSelectProperties } from './type-specific/CascadingSelectProperties';
import { HtmlProperties } from './type-specific/HtmlProperties';
import { WelcomeProperties } from './type-specific/WelcomeProperties';
import { EndingProperties } from './type-specific/EndingProperties';
import { DownloadReportProperties } from './type-specific/DownloadReportProperties';

// Page Properties
import { PageProperties } from './PageProperties';

export function PropertyEditor() {
  const { deleteField, duplicateField } = useFormBuilderStore();
  const field = useSelectedField();
  const page = useSelectedPage();
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [overwriteTemplateOpen, setOverwriteTemplateOpen] = useState(false);
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);

  // Show page properties if a page is selected
  if (page) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: 1,
          borderColor: 'divider',
          backgroundColor: 'grey.50',
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            屬性編輯器
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <PageProperties />
        </Box>
      </Paper>
    );
  }

  // Show empty state if nothing is selected
  if (!field) {
    return (
      <Paper
        elevation={0}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: 1,
          borderColor: 'divider',
          backgroundColor: 'grey.50',
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            屬性編輯器
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Icons.TouchApp sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            選擇欄位或頁面以編輯屬性
          </Typography>
          <Typography variant="body2" color="text.disabled">
            點擊畫布上的欄位，或點擊頁籤的設定圖示
          </Typography>
        </Box>
      </Paper>
    );
  }

  const definition = getFieldTypeDefinition(field.type);
  const IconComponent = definition
    ? (Icons as Record<string, React.ElementType>)[definition.icon] || Icons.HelpOutline
    : Icons.HelpOutline;

  const handleDelete = () => {
    deleteField(field.id);
  };

  const handleDuplicate = () => {
    duplicateField(field.id);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: 1,
        borderColor: 'divider',
        backgroundColor: 'grey.50',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          屬性編輯器
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 1,
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
            }}
          >
            <IconComponent fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight="medium"
              noWrap
              sx={{
                '& b, & strong': { fontWeight: 700 },
                '& i, & em': { fontStyle: 'italic' },
                '& u': { textDecoration: 'underline' },
              }}
              dangerouslySetInnerHTML={{ __html: field.label || field.name }}
            />
            <Chip
              label={definition?.label || field.type}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>
        </Box>
      </Box>

      {/* Properties Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
        }}
      >
        {/* Basic Properties - always shown */}
        <BasicProperties />

        {/* Type-specific Properties */}
        <TextProperties />
        <MultipleTextProperties />
        <NumberProperties />
        <SelectProperties />
        <ImagePickerProperties />
        <RatingProperties />
        <PanelProperties />
        <PanelDynamicProperties />
        <ExpressionProperties />
        <MatrixProperties />
        <CascadingSelectProperties />
        <HtmlProperties />
        <WelcomeProperties />
        <EndingProperties />
        <DownloadReportProperties />

        {/* Layout Properties */}
        <LayoutProperties />

        {/* Validation Properties */}
        <ValidationProperties />

        {/* Conditional Properties */}
        <ConditionalProperties />
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
        }}
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<Icons.ContentCopy />}
          onClick={handleDuplicate}
          sx={{ flex: 1 }}
        >
          複製
        </Button>
        <Box sx={{ flex: 1, display: 'flex' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Icons.SaveAlt />}
            onClick={() => setSaveTemplateOpen(true)}
            sx={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          >
            存為範本
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setTemplateMenuAnchor(e.currentTarget)}
            sx={{ minWidth: 0, px: 0.5, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: 0 }}
          >
            <Icons.ArrowDropUp fontSize="small" />
          </Button>
          <Menu
            anchorEl={templateMenuAnchor}
            open={Boolean(templateMenuAnchor)}
            onClose={() => setTemplateMenuAnchor(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <MenuItem onClick={() => { setTemplateMenuAnchor(null); setOverwriteTemplateOpen(true); }}>
              覆蓋範本
            </MenuItem>
          </Menu>
        </Box>
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<Icons.Delete />}
          onClick={handleDelete}
          sx={{ flex: 1 }}
        >
          刪除
        </Button>
      </Box>

      <TemplateSaveDialog
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        mode="field"
        data={field}
      />
      <TemplateSaveDialog
        open={overwriteTemplateOpen}
        onClose={() => setOverwriteTemplateOpen(false)}
        mode="field"
        data={field}
        saveMode="overwrite"
      />
    </Paper>
  );
}

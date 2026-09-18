/**
 * FieldToolbox - Left panel with categorized draggable field types
 */

import { useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { ToolboxCategory } from './ToolboxCategory';
import {
  fieldCategories,
  fieldTypeDefinitions,
  getFieldTypesByCategory,
} from './fieldTypeDefinitions';

export function FieldToolbox() {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter fields based on search query
  const filteredFieldsByCategory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) {
      return fieldCategories.map((category) => ({
        category,
        fields: getFieldTypesByCategory(category.id),
      }));
    }

    // Search in label and description
    const filtered = fieldTypeDefinitions.filter(
      (def) =>
        def.label.toLowerCase().includes(query) ||
        def.description.toLowerCase().includes(query)
    );

    // Group by category
    return fieldCategories.map((category) => ({
      category,
      fields: filtered.filter((def) => def.category === category.id),
    }));
  }, [searchQuery]);

  const hasResults = filteredFieldsByCategory.some((cat) => cat.fields.length > 0);

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRight: 1,
        borderColor: 'divider',
        backgroundColor: 'grey.50',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          欄位工具箱
        </Typography>
        <TextField
          size="small"
          placeholder="搜尋欄位..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {/* Field Categories */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1,
        }}
      >
        {!hasResults ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              找不到符合的欄位
            </Typography>
          </Box>
        ) : (
          filteredFieldsByCategory.map(({ category, fields }) => (
            <ToolboxCategory
              key={category.id}
              category={category}
              fields={fields}
              defaultExpanded={!searchQuery}
            />
          ))
        )}
      </Box>

      {/* Footer hint */}
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
          拖曳欄位到畫布上
        </Typography>
      </Box>
    </Paper>
  );
}

/**
 * CascadingSelectProperties - 階層選單欄位屬性編輯器
 */

import { useState } from 'react';
import {
  Box,
  TextField,
  Stack,
  Button,
  IconButton,
  Typography,
  Breadcrumbs,
  Link,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';
import type { CascadingOption } from '@/types/form';

export function CascadingSelectProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();
  const [path, setPath] = useState<number[]>([]);

  if (!field || field.type !== 'cascadingselect') return null;

  const properties = (field as any).properties || {};
  const levels: { label: string; placeholder?: string }[] = properties.levels || [];
  const rootOptions: CascadingOption[] = properties.options || [];

  const handlePropertyChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: { ...properties, [key]: value },
    });
  };

  // Level management
  const handleAddLevel = () => {
    handlePropertyChange('levels', [...levels, { label: `第${levels.length + 1}層` }]);
  };

  const handleUpdateLevel = (index: number, label: string) => {
    const newLevels = [...levels];
    newLevels[index] = { ...newLevels[index], label };
    handlePropertyChange('levels', newLevels);
  };

  const handleDeleteLevel = (index: number) => {
    if (levels.length <= 1) return;
    handlePropertyChange('levels', levels.filter((_, i) => i !== index));
  };

  // Navigate into options tree
  const getCurrentOptions = (): CascadingOption[] => {
    let current = rootOptions;
    for (const idx of path) {
      if (!current[idx]?.children) return [];
      current = current[idx].children!;
    }
    return current;
  };

  const setOptionsAtPath = (newOptions: CascadingOption[]): CascadingOption[] => {
    if (path.length === 0) return newOptions;
    const newRoot = JSON.parse(JSON.stringify(rootOptions)) as CascadingOption[];
    let current = newRoot;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].children!;
    }
    const lastIdx = path[path.length - 1];
    if (!current[lastIdx].children) current[lastIdx].children = [];
    current[lastIdx].children = newOptions;
    return newRoot;
  };

  const handleAddOption = () => {
    const current = getCurrentOptions();
    const newOption: CascadingOption = {
      value: `opt${Date.now()}`,
      label: `選項 ${current.length + 1}`,
    };
    handlePropertyChange('options', setOptionsAtPath([...current, newOption]));
  };

  const handleUpdateOption = (index: number, updates: Partial<CascadingOption>) => {
    const current = [...getCurrentOptions()];
    current[index] = { ...current[index], ...updates };
    handlePropertyChange('options', setOptionsAtPath(current));
  };

  const handleDeleteOption = (index: number) => {
    const current = getCurrentOptions().filter((_, i) => i !== index);
    handlePropertyChange('options', setOptionsAtPath(current));
    // If navigated into a deleted item, go back
    if (path.length > 0) {
      const parentOptions = (() => {
        let c = rootOptions;
        for (let i = 0; i < path.length - 1; i++) c = c[path[i]].children!;
        return c;
      })();
      if (index >= parentOptions.length) {
        setPath(path.slice(0, -1));
      }
    }
  };

  const navigateInto = (index: number) => {
    setPath([...path, index]);
  };

  const navigateTo = (depth: number) => {
    setPath(path.slice(0, depth));
  };

  const currentOptions = getCurrentOptions();
  const currentDepth = path.length;
  const hasMoreLevels = currentDepth < levels.length - 1;

  // Build breadcrumb labels
  const breadcrumbs: { label: string; depth: number }[] = [{ label: '全部', depth: 0 }];
  {
    let opts = rootOptions;
    for (let i = 0; i < path.length; i++) {
      breadcrumbs.push({ label: opts[path[i]]?.label ?? '?', depth: i + 1 });
      opts = opts[path[i]]?.children ?? [];
    }
  }

  return (
    <PropertySection title="階層選單設定" defaultExpanded>
      <Stack spacing={2}>
        {/* Level management */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            層級名稱
          </Typography>
          <Stack spacing={1}>
            {levels.map((level, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  value={level.label}
                  onChange={(e) => handleUpdateLevel(idx, e.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeleteLevel(idx)}
                  disabled={levels.length <= 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddLevel}
            sx={{ mt: 1 }}
          >
            新增層級
          </Button>
        </Box>

        {/* Options tree editor */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            選項資料
          </Typography>

          {path.length > 0 && (
            <Breadcrumbs sx={{ mb: 1 }}>
              {breadcrumbs.map((bc, i) =>
                i < breadcrumbs.length - 1 ? (
                  <Link
                    key={i}
                    component="button"
                    variant="body2"
                    underline="hover"
                    onClick={() => navigateTo(bc.depth)}
                  >
                    {bc.label}
                  </Link>
                ) : (
                  <Typography key={i} variant="body2" color="text.primary">
                    {bc.label}
                  </Typography>
                )
              )}
            </Breadcrumbs>
          )}

          <List dense sx={{ border: 1, borderColor: 'divider', borderRadius: 1, mb: 1 }}>
            {currentOptions.length === 0 && (
              <ListItem>
                <ListItemText secondary="尚無選項" />
              </ListItem>
            )}
            {currentOptions.map((opt, idx) => (
              <ListItem
                key={idx}
                sx={{
                  borderBottom: idx < currentOptions.length - 1 ? 1 : 0,
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1, flex: 1, alignItems: 'center', mr: 1 }}>
                  <TextField
                    size="small"
                    placeholder="選項名稱"
                    value={opt.label}
                    onChange={(e) => handleUpdateOption(idx, { label: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                </Box>
                <ListItemSecondaryAction>
                  {hasMoreLevels && (
                    <IconButton size="small" onClick={() => navigateInto(idx)}>
                      <ChevronRightIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton size="small" color="error" onClick={() => handleDeleteOption(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddOption}
          >
            新增選項
          </Button>
        </Box>
      </Stack>
    </PropertySection>
  );
}

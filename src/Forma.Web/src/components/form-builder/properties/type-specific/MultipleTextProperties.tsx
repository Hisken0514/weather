/**
 * MultipleTextProperties - Multiple text field specific properties
 */

import {
  Box,
  TextField,
  Stack,
  Button,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';
import type { MultipleTextItem } from '@/types/form';

interface SortableItemProps {
  item: MultipleTextItem;
  index: number;
  onUpdate: (index: number, updates: Partial<MultipleTextItem>) => void;
  onDelete: (index: number) => void;
}

function SortableItem({ item, index, onUpdate, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Default placeholder based on label
  const defaultPlaceholder = `請輸入${item.label}...`;

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          {...attributes}
          {...listeners}
          sx={{
            cursor: 'grab',
            color: 'text.disabled',
            display: 'flex',
            alignItems: 'center',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIcon fontSize="small" />
        </Box>

        <TextField
          size="small"
          label="標籤"
          value={item.label}
          onChange={(e) => onUpdate(index, { label: e.target.value })}
          sx={{ flex: 1 }}
        />

        <IconButton size="small" onClick={() => onDelete(index)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>

      <TextField
        size="small"
        label="佔位文字"
        placeholder={defaultPlaceholder}
        value={item.placeholder || ''}
        onChange={(e) => onUpdate(index, { placeholder: e.target.value })}
        fullWidth
        helperText={!item.placeholder ? `預設：${defaultPlaceholder}` : undefined}
      />
    </Box>
  );
}

export function MultipleTextProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!field) return null;

  // Only show for multipletext fields
  if (field.type !== 'multipletext') return null;

  const properties = (field as unknown as Record<string, unknown>).properties as { items?: MultipleTextItem[]; colCount?: number } || {};
  const items: MultipleTextItem[] = properties.items || [];

  const handlePropertyChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: {
        ...properties,
        [key]: value,
      },
    });
  };

  const handleAddItem = () => {
    const newItem: MultipleTextItem = {
      name: `item${Date.now()}`,
      label: `項目 ${items.length + 1}`,
      placeholder: '',
    };
    handlePropertyChange('items', [...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<MultipleTextItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    handlePropertyChange('items', newItems);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) return; // Keep at least one item
    const newItems = items.filter((_, i) => i !== index);
    handlePropertyChange('items', newItems);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.name === active.id);
      const newIndex = items.findIndex((item) => item.name === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      handlePropertyChange('items', newItems);
    }
  };

  return (
    <PropertySection title="文字欄位設定" defaultExpanded>
      <Stack spacing={2}>
        {/* Items List */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            欄位列表
          </Typography>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.name)}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1}>
                {items.map((item, index) => (
                  <SortableItem
                    key={item.name}
                    item={item}
                    index={index}
                    onUpdate={handleUpdateItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddItem}
            sx={{ mt: 1 }}
          >
            新增欄位
          </Button>
        </Box>

        {/* Column count */}
        <FormControl size="small" fullWidth>
          <InputLabel>每行欄數</InputLabel>
          <Select
            value={properties.colCount ?? 1}
            label="每行欄數"
            onChange={(e) => handlePropertyChange('colCount', e.target.value)}
          >
            {[1, 2, 3, 4].map((col) => (
              <MenuItem key={col} value={col}>
                {col} 欄
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </PropertySection>
  );
}

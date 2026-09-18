/**
 * SelectProperties - Select/Radio/Checkbox field specific properties
 */

import {
  Box,
  TextField,
  Stack,
  Button,
  IconButton,
  Typography,
  FormControlLabel,
  Switch,
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
import type { FieldOption } from '@/types/form';

interface SortableOptionProps {
  option: FieldOption;
  index: number;
  onUpdate: (index: number, updates: Partial<FieldOption>) => void;
  onDelete: (index: number) => void;
}

function SortableOption({ option, index, onUpdate, onDelete }: SortableOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(option.value) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'background.paper',
      }}
    >
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
        placeholder="值"
        value={option.value}
        onChange={(e) => onUpdate(index, { value: e.target.value })}
        sx={{ width: 100 }}
      />

      <TextField
        size="small"
        placeholder="標籤"
        value={option.label}
        onChange={(e) => onUpdate(index, { label: e.target.value })}
        sx={{ flex: 1 }}
      />

      <IconButton size="small" onClick={() => onDelete(index)} color="error">
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export function SelectProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!field) return null;

  // Only show for select-type fields
  const selectTypes = ['select', 'multiselect', 'radio', 'checkbox'];
  if (!selectTypes.includes(field.type)) return null;

  const properties = (field as any).properties || {};
  const options: FieldOption[] = properties.options || [];

  const handlePropertyChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: {
        ...properties,
        [key]: value,
      },
    });
  };

  const handleAddOption = () => {
    const newOption: FieldOption = {
      value: `option${options.length + 1}`,
      label: `選項 ${options.length + 1}`,
    };
    handlePropertyChange('options', [...options, newOption]);
  };

  const handleUpdateOption = (index: number, updates: Partial<FieldOption>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    handlePropertyChange('options', newOptions);
  };

  const handleDeleteOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    handlePropertyChange('options', newOptions);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((o) => String(o.value) === active.id);
      const newIndex = options.findIndex((o) => String(o.value) === over.id);
      const newOptions = arrayMove(options, oldIndex, newIndex);
      handlePropertyChange('options', newOptions);
    }
  };

  const isMultiple = field.type === 'multiselect' || field.type === 'checkbox';

  return (
    <PropertySection title="選項設定" defaultExpanded>
      <Stack spacing={2}>
        {/* Options List */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            選項列表
          </Typography>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={options.map((o) => String(o.value))}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1}>
                {options.map((option, index) => (
                  <SortableOption
                    key={String(option.value)}
                    option={option}
                    index={index}
                    onUpdate={handleUpdateOption}
                    onDelete={handleDeleteOption}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddOption}
            sx={{ mt: 1 }}
          >
            新增選項
          </Button>
        </Box>

        {/* Column count for radio/checkbox */}
        {(field.type === 'radio' || field.type === 'checkbox') && (
          <FormControl size="small" fullWidth>
            <InputLabel>每行欄數</InputLabel>
            <Select
              value={properties.colCount ?? 1}
              label="每行欄數"
              onChange={(e) => handlePropertyChange('colCount', e.target.value)}
            >
              {[1, 2, 3, 4, 6].map((col) => (
                <MenuItem key={col} value={col}>
                  {col} 欄
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Additional options */}
        <FormControlLabel
          control={
            <Switch
              checked={properties.allowOther ?? false}
              onChange={(e) => handlePropertyChange('allowOther', e.target.checked)}
            />
          }
          label="允許填寫「其他」"
        />

        {properties.allowOther && (
          <TextField
            label="「其他」標籤"
            size="small"
            fullWidth
            value={properties.otherLabel ?? '其他'}
            onChange={(e) => handlePropertyChange('otherLabel', e.target.value)}
          />
        )}

        <FormControlLabel
          control={
            <Switch
              checked={properties.noneOption ?? false}
              onChange={(e) => handlePropertyChange('noneOption', e.target.checked)}
            />
          }
          label="加入「無」選項"
        />

        {isMultiple && (
          <FormControlLabel
            control={
              <Switch
                checked={properties.selectAllOption ?? false}
                onChange={(e) => handlePropertyChange('selectAllOption', e.target.checked)}
              />
            }
            label="加入「全選」選項"
          />
        )}

        {isMultiple && (
          <>
            <TextField
              label="最少選擇數"
              size="small"
              fullWidth
              type="number"
              value={properties.minSelect ?? ''}
              onChange={(e) =>
                handlePropertyChange('minSelect', e.target.value ? parseInt(e.target.value) : null)
              }
            />
            <TextField
              label="最多選擇數"
              size="small"
              fullWidth
              type="number"
              value={properties.maxSelect ?? ''}
              onChange={(e) =>
                handlePropertyChange('maxSelect', e.target.value ? parseInt(e.target.value) : null)
              }
            />
          </>
        )}
      </Stack>
    </PropertySection>
  );
}

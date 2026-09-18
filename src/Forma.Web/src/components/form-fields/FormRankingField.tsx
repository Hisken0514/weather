/**
 * FormRankingField - 排序欄位組件
 * 使用 dnd-kit 實現拖拉排序
 */

import {
  FormControl,
  FormLabel,
  FormHelperText,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { DragIndicator as DragIcon } from '@mui/icons-material';
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
import { Controller, useFormContext } from 'react-hook-form';
import type { RankingField as RankingFieldType } from '@/types/form';

interface SortableItemProps {
  id: string;
  label: string;
  index: number;
  disabled?: boolean;
}

function SortableItem({ id, label, index, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 0.5,
        border: 1,
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderRadius: 1,
        backgroundColor: isDragging ? 'action.selected' : 'background.paper',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <ListItemIcon
        {...attributes}
        {...listeners}
        sx={{
          minWidth: 40,
          cursor: disabled ? 'default' : 'grab',
          '&:active': { cursor: disabled ? 'default' : 'grabbing' },
        }}
      >
        <DragIcon />
      </ListItemIcon>
      <Typography
        variant="body2"
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 2,
          fontSize: 12,
        }}
      >
        {index + 1}
      </Typography>
      <ListItemText primary={label} />
    </ListItem>
  );
}

interface FormRankingFieldProps {
  field: RankingFieldType;
}

export function FormRankingField({ field }: FormRankingFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, required, disabled, readOnly, properties } = field;

  const choices = properties?.choices ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={choices.map((c) => c.value)}
      render={({ field: controllerField, fieldState: { error } }) => {
        const items: string[] = controllerField.value || choices.map((c) => c.value);

        const handleDragEnd = (event: DragEndEvent) => {
          if (disabled || readOnly) return;

          const { active, over } = event;

          if (over && active.id !== over.id) {
            const oldIndex = items.indexOf(active.id as string);
            const newIndex = items.indexOf(over.id as string);
            const newItems = arrayMove(items, oldIndex, newIndex);
            controllerField.onChange(newItems);
          }
        };

        const getLabel = (value: string) => {
          const choice = choices.find((c) => c.value === value);
          return choice?.label ?? value;
        };

        return (
          <FormControl error={!!error} disabled={disabled} fullWidth>
            <FormLabel required={required}>{label ?? name}</FormLabel>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1 }}>
              拖拉項目以調整排序
            </Typography>

            <Paper variant="outlined" sx={{ p: 1 }}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={items} strategy={verticalListSortingStrategy}>
                  <List disablePadding>
                    {items.map((value, index) => (
                      <SortableItem
                        key={value}
                        id={value}
                        label={getLabel(value)}
                        index={index}
                        disabled={disabled || readOnly}
                      />
                    ))}
                  </List>
                </SortableContext>
              </DndContext>
            </Paper>

            <FormHelperText>{error?.message ?? description}</FormHelperText>
          </FormControl>
        );
      }}
    />
  );
}

export default FormRankingField;

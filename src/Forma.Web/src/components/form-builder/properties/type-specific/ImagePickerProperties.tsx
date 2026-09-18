/**
 * ImagePickerProperties - ImagePicker field specific properties
 */

import { useRef } from 'react';
import {
  Box,
  TextField,
  Stack,
  Button,
  IconButton,
  Typography,
  FormControlLabel,
  Switch,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Image as ImageIcon,
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
import { useState } from 'react';
import { useFormBuilderStore, useSelectedField } from '@/stores/formBuilderStore';
import { PropertySection } from '../PropertySection';
import { filesApi } from '@/lib/api/files';
import type { ImagePickerChoice } from '@/types/form';

interface SortableChoiceProps {
  choice: ImagePickerChoice;
  index: number;
  onUpdate: (index: number, updates: Partial<ImagePickerChoice>) => void;
  onDelete: (index: number) => void;
}

function SortableChoice({ choice, index, onUpdate, onDelete }: SortableChoiceProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: choice.value });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('檔案大小不能超過 5MB');
      return;
    }

    setUploading(true);
    try {
      const result = await filesApi.upload(file, { isPublic: true });
      onUpdate(index, { imageUrl: filesApi.download(result.id) });
    } catch (err) {
      alert('上傳失敗');
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'background.paper',
      }}
    >
      {/* Drag Handle */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          color: 'text.disabled',
          display: 'flex',
          alignItems: 'center',
          mt: 0.5,
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIcon fontSize="small" />
      </Box>

      {/* Image Preview / Upload */}
      <Box
        onClick={handleImageClick}
        sx={{
          width: 64,
          height: 64,
          borderRadius: 1,
          border: '2px dashed',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: 'grey.100',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'grey.200',
          },
        }}
      >
        {uploading ? (
          <CircularProgress size={24} />
        ) : choice.imageUrl ? (
          <Box
            component="img"
            src={choice.imageUrl}
            alt={choice.label || ''}
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <ImageIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Value & Label */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack spacing={0.5}>
          <TextField
            size="small"
            placeholder="值"
            value={choice.value}
            onChange={(e) => onUpdate(index, { value: e.target.value })}
            fullWidth
            variant="standard"
          />
          <TextField
            size="small"
            placeholder="標籤"
            value={choice.label || ''}
            onChange={(e) => onUpdate(index, { label: e.target.value })}
            fullWidth
            variant="standard"
          />
        </Stack>
      </Box>

      {/* Delete */}
      <IconButton size="small" onClick={() => onDelete(index)} color="error">
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

export function ImagePickerProperties() {
  const { updateField } = useFormBuilderStore();
  const field = useSelectedField();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!field) return null;

  // Only show for imagepicker fields
  if (field.type !== 'imagepicker') return null;

  const properties = (field as any).properties || {};
  const choices: ImagePickerChoice[] = properties.choices || [];

  const handlePropertyChange = (key: string, value: unknown) => {
    updateField(field.id, {
      properties: {
        ...properties,
        [key]: value,
      },
    });
  };

  const handleAddChoice = () => {
    const newChoice: ImagePickerChoice = {
      value: `choice${choices.length + 1}`,
      label: `選項 ${choices.length + 1}`,
      imageUrl: '',
    };
    handlePropertyChange('choices', [...choices, newChoice]);
  };

  const handleUpdateChoice = (index: number, updates: Partial<ImagePickerChoice>) => {
    const newChoices = [...choices];
    newChoices[index] = { ...newChoices[index], ...updates };
    handlePropertyChange('choices', newChoices);
  };

  const handleDeleteChoice = (index: number) => {
    const newChoices = choices.filter((_, i) => i !== index);
    handlePropertyChange('choices', newChoices);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = choices.findIndex((c) => c.value === active.id);
      const newIndex = choices.findIndex((c) => c.value === over.id);
      const newChoices = arrayMove(choices, oldIndex, newIndex);
      handlePropertyChange('choices', newChoices);
    }
  };

  return (
    <PropertySection title="圖片選項設定" defaultExpanded>
      <Stack spacing={2}>
        {/* Choices List */}
        <Box>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={choices.map((c) => c.value)}
              strategy={verticalListSortingStrategy}
            >
              <Stack spacing={1}>
                {choices.map((choice, index) => (
                  <SortableChoice
                    key={choice.value}
                    choice={choice}
                    index={index}
                    onUpdate={handleUpdateChoice}
                    onDelete={handleDeleteChoice}
                  />
                ))}
              </Stack>
            </SortableContext>
          </DndContext>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAddChoice}
            sx={{ mt: 1 }}
            fullWidth
          >
            新增選項
          </Button>
        </Box>

        {/* Display Options */}
        <FormControlLabel
          control={
            <Switch
              checked={properties.multiSelect ?? false}
              onChange={(e) => handlePropertyChange('multiSelect', e.target.checked)}
            />
          }
          label="允許多選"
        />

        <FormControlLabel
          control={
            <Switch
              checked={properties.showLabel ?? true}
              onChange={(e) => handlePropertyChange('showLabel', e.target.checked)}
            />
          }
          label="顯示標籤"
        />

        {/* Image Size */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            label="圖片寬度"
            size="small"
            type="number"
            value={properties.imageWidth ?? 150}
            onChange={(e) => handlePropertyChange('imageWidth', parseInt(e.target.value) || 150)}
            InputProps={{ endAdornment: <Typography variant="caption">px</Typography> }}
            sx={{ flex: 1 }}
          />
          <TextField
            label="圖片高度"
            size="small"
            type="number"
            value={properties.imageHeight ?? 150}
            onChange={(e) => handlePropertyChange('imageHeight', parseInt(e.target.value) || 150)}
            InputProps={{ endAdornment: <Typography variant="caption">px</Typography> }}
            sx={{ flex: 1 }}
          />
        </Box>
      </Stack>
    </PropertySection>
  );
}

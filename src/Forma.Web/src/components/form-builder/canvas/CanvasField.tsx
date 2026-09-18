/**
 * CanvasField - Google Forms-like field card with rich text editing and image support
 */

import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  ListSubheader,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  DragIndicator as DragIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  FormatBold as BoldIcon,
  FormatItalic as ItalicIcon,
  FormatUnderlined as UnderlineIcon,
  Link as LinkIcon,
  FormatClear as ClearFormatIcon,
  Image as ImageIcon,
  FormatAlignLeft as AlignLeftIcon,
  FormatAlignCenter as AlignCenterIcon,
  FormatAlignRight as AlignRightIcon,
  Edit as EditImageIcon,
  MoreVert as MoreIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import { useFormBuilderStore } from '@/stores/formBuilderStore';
import {
  fieldCategories,
  getFieldTypesByCategory,
  getFieldTypeDefinition,
} from '../toolbox/fieldTypeDefinitions';
import type { Field, FieldType, FieldImage } from '@/types/form';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';

interface CanvasFieldProps {
  field: Field;
  isSelected: boolean;
  isDragging: boolean;
  dragListeners?: SyntheticListenerMap;
  dragAttributes?: DraggableAttributes;
}

export function CanvasField({
  field,
  isSelected,
  isDragging,
  dragListeners,
  dragAttributes,
}: CanvasFieldProps) {
  const { schema, selectField, deleteField, duplicateField, updateField } = useFormBuilderStore();
  const allFieldsRequired = schema.settings?.allFieldsRequired ?? false;
  const [imageMenuAnchor, setImageMenuAnchor] = useState<null | HTMLElement>(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [showDescription, setShowDescription] = useState(!!field.description);
  const [editingDescription, setEditingDescription] = useState(false);
  const [activeEditable, setActiveEditable] = useState<'label' | 'description' | null>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const isComposingRef = useRef(false); // Track IME composition state

  const definition = getFieldTypeDefinition(field.type);
  const IconComponent = definition
    ? (Icons as Record<string, React.ElementType>)[definition.icon] || Icons.HelpOutline
    : Icons.HelpOutline;

  // Sync editable content with field label
  useEffect(() => {
    if (editableRef.current && !editableRef.current.contains(document.activeElement)) {
      editableRef.current.innerHTML = field.label || '';
    }
  }, [field.label]);

  // Sync description content
  useEffect(() => {
    if (descriptionRef.current && !descriptionRef.current.contains(document.activeElement)) {
      descriptionRef.current.innerHTML = field.description || '';
    }
  }, [field.description]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectField(field.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteField(field.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    duplicateField(field.id);
  };

  const handleTypeChange = (newType: FieldType) => {
    const newDefinition = getFieldTypeDefinition(newType);
    updateField(field.id, {
      type: newType,
      properties: newDefinition?.defaultProperties,
    } as Partial<Field>);
  };

  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    updateField(field.id, { required: e.target.checked });
  };

  // Save label to store - called on blur or when needed
  const saveLabelToStore = () => {
    if (editableRef.current) {
      const newLabel = editableRef.current.innerHTML;
      if (newLabel !== field.label) {
        updateField(field.id, { label: newLabel });
      }
    }
  };

  // Save description to store - called on blur or when needed
  const saveDescriptionToStore = () => {
    if (descriptionRef.current) {
      const newDescription = descriptionRef.current.innerHTML;
      if (newDescription !== field.description) {
        updateField(field.id, { description: newDescription });
      }
    }
  };

  // IME composition handlers for Chinese/Japanese input
  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
  };

  // Save current selection
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

  // Restore saved selection
  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
  };

  // Rich text formatting - works on currently active editable element
  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Update the appropriate field based on which element is active
    if (activeEditable === 'label') {
      saveLabelToStore();
    } else if (activeEditable === 'description') {
      saveDescriptionToStore();
    }
  };

  const insertLink = () => {
    saveSelection();
    const url = prompt('輸入連結網址：');
    if (url) {
      restoreSelection();
      applyFormat('createLink', url);
    }
  };

  // Render formatting toolbar - use onMouseDown with preventDefault to keep focus in editable
  const renderToolbar = () => {
    const handleToolbarMouseDown = (e: React.MouseEvent, action: () => void) => {
      e.preventDefault(); // Prevent focus from leaving the contentEditable
      e.stopPropagation();
      action();
    };

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          py: 0.5,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.preventDefault()}
      >
        <Tooltip title="粗體">
          <IconButton
            size="small"
            onMouseDown={(e) => handleToolbarMouseDown(e, () => applyFormat('bold'))}
          >
            <BoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="斜體">
          <IconButton
            size="small"
            onMouseDown={(e) => handleToolbarMouseDown(e, () => applyFormat('italic'))}
          >
            <ItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="底線">
          <IconButton
            size="small"
            onMouseDown={(e) => handleToolbarMouseDown(e, () => applyFormat('underline'))}
          >
            <UnderlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="插入連結">
          <IconButton
            size="small"
            onMouseDown={(e) => handleToolbarMouseDown(e, insertLink)}
          >
            <LinkIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="移除格式">
          <IconButton
            size="small"
            onMouseDown={(e) => handleToolbarMouseDown(e, () => applyFormat('removeFormat'))}
          >
            <ClearFormatIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  // Image handling
  const handleAddImage = () => {
    const url = prompt('輸入圖片網址：');
    if (url) {
      updateField(field.id, {
        image: { url, alignment: 'center' },
      });
    }
  };

  const handleImageAlignment = (alignment: FieldImage['alignment']) => {
    if (field.image) {
      updateField(field.id, {
        image: { ...field.image, alignment },
      });
    }
    setImageMenuAnchor(null);
  };

  const handleChangeImage = () => {
    const url = prompt('輸入新圖片網址：', field.image?.url);
    if (url) {
      updateField(field.id, {
        image: { ...field.image, url },
      });
    }
    setImageMenuAnchor(null);
  };

  const handleRemoveImage = () => {
    updateField(field.id, { image: undefined });
    setImageMenuAnchor(null);
  };

  // More menu handlers
  const handleAddDescription = () => {
    setShowDescription(true);
    setMoreMenuAnchor(null);
  };

  // Render field input preview based on type
  const renderFieldPreview = () => {
    const previewStyles = {
      container: {
        mt: 2,
        pt: 2,
        borderTop: '1px dashed',
        borderColor: 'divider',
      },
      textInput: {
        borderBottom: '1px dotted',
        borderColor: 'text.disabled',
        py: 1,
        color: 'text.disabled',
        fontSize: '0.9rem',
      },
      textArea: {
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1.5,
        color: 'text.disabled',
        fontSize: '0.9rem',
        minHeight: 80,
      },
      optionRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        py: 0.5,
        color: 'text.secondary',
        fontSize: '0.9rem',
      },
    };

    // Get options from field.properties.options for select/radio/checkbox fields
    const fieldProperties = 'properties' in field
      ? (field.properties as { options?: Array<{ value: string; label: string }> } | undefined)
      : undefined;
    const fieldOptions = fieldProperties?.options;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={previewStyles.textInput}>
              {field.type === 'text' && '簡答文字'}
              {field.type === 'email' && 'example@email.com'}
              {field.type === 'phone' && '電話號碼'}
              {field.type === 'url' && 'https://...'}
            </Box>
          </Box>
        );

      case 'password':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={previewStyles.textInput}>••••••••</Box>
          </Box>
        );

      case 'textarea':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={previewStyles.textArea}>長文字回答...</Box>
          </Box>
        );

      case 'number':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={previewStyles.textInput}>數字</Box>
          </Box>
        );

      case 'select':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'text.disabled',
                fontSize: '0.9rem',
              }}
            >
              <span>請選擇</span>
              <Icons.ArrowDropDown />
            </Box>
          </Box>
        );

      case 'radio': {
        const radioOptions = fieldOptions || [{ value: '1', label: '選項 1' }, { value: '2', label: '選項 2' }];
        return (
          <Box sx={previewStyles.container}>
            {radioOptions.slice(0, 4).map((opt, i) => (
              <Box key={i} sx={previewStyles.optionRow}>
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: 'text.disabled',
                    flexShrink: 0,
                  }}
                />
                <Box
                  component="span"
                  dangerouslySetInnerHTML={{ __html: opt.label }}
                />
              </Box>
            ))}
            {radioOptions.length > 4 && (
              <Typography variant="caption" color="text.disabled">
                ... 還有 {radioOptions.length - 4} 個選項
              </Typography>
            )}
          </Box>
        );
      }

      case 'checkbox': {
        const checkboxOptions = fieldOptions || [{ value: '1', label: '選項 1' }, { value: '2', label: '選項 2' }];
        return (
          <Box sx={previewStyles.container}>
            {checkboxOptions.slice(0, 4).map((opt, i) => (
              <Box key={i} sx={previewStyles.optionRow}>
                <Box
                  sx={{
                    width: 18,
                    height: 18,
                    borderRadius: 0.5,
                    border: '2px solid',
                    borderColor: 'text.disabled',
                    flexShrink: 0,
                  }}
                />
                <Box
                  component="span"
                  dangerouslySetInnerHTML={{ __html: opt.label }}
                />
              </Box>
            ))}
            {checkboxOptions.length > 4 && (
              <Typography variant="caption" color="text.disabled">
                ... 還有 {checkboxOptions.length - 4} 個選項
              </Typography>
            )}
          </Box>
        );
      }

      case 'boolean':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={previewStyles.optionRow}>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid', borderColor: 'text.disabled' }} />
                <span>是</span>
              </Box>
              <Box sx={previewStyles.optionRow}>
                <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid', borderColor: 'text.disabled' }} />
                <span>否</span>
              </Box>
            </Box>
          </Box>
        );

      case 'date':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'text.disabled',
                fontSize: '0.9rem',
              }}
            >
              <span>年 / 月 / 日</span>
              <Icons.CalendarMonth sx={{ fontSize: 20 }} />
            </Box>
          </Box>
        );

      case 'time':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'text.disabled',
                fontSize: '0.9rem',
              }}
            >
              <span>時 : 分</span>
              <Icons.AccessTime sx={{ fontSize: 20 }} />
            </Box>
          </Box>
        );

      case 'datetime':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'text.disabled',
                fontSize: '0.9rem',
              }}
            >
              <span>年 / 月 / 日 時 : 分</span>
              <Icons.Event sx={{ fontSize: 20 }} />
            </Box>
          </Box>
        );

      case 'file':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                color: 'text.disabled',
                fontSize: '0.9rem',
              }}
            >
              <Icons.CloudUpload sx={{ fontSize: 32, mb: 0.5 }} />
              <Box>點擊或拖曳上傳檔案</Box>
            </Box>
          </Box>
        );

      case 'image':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                color: 'text.disabled',
                fontSize: '0.9rem',
              }}
            >
              <Icons.AddPhotoAlternate sx={{ fontSize: 32, mb: 0.5 }} />
              <Box>點擊或拖曳上傳圖片</Box>
            </Box>
          </Box>
        );

      case 'signature':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                fontSize: '0.9rem',
                backgroundColor: 'grey.50',
              }}
            >
              <Icons.Draw sx={{ mr: 1, fontSize: 20 }} />
              簽名區域
            </Box>
          </Box>
        );

      case 'slider':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.disabled' }}>
              <Typography variant="caption">0</Typography>
              <Box
                sx={{
                  flex: 1,
                  height: 4,
                  backgroundColor: 'grey.300',
                  borderRadius: 2,
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                  }}
                />
              </Box>
              <Typography variant="caption">100</Typography>
            </Box>
          </Box>
        );

      case 'rating':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={{ display: 'flex', gap: 0.5, color: 'text.disabled' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Icons.StarBorder key={i} sx={{ fontSize: 28 }} />
              ))}
            </Box>
          </Box>
        );

      case 'ranking': {
        const rankingOptions = fieldOptions || [{ value: '1', label: '項目 1' }, { value: '2', label: '項目 2' }, { value: '3', label: '項目 3' }];
        return (
          <Box sx={previewStyles.container}>
            {rankingOptions.slice(0, 4).map((opt, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  py: 0.5,
                  color: 'text.secondary',
                  fontSize: '0.9rem',
                }}
              >
                <Icons.DragIndicator sx={{ fontSize: 18, color: 'text.disabled' }} />
                <span>{i + 1}. </span>
                <Box
                  component="span"
                  dangerouslySetInnerHTML={{ __html: opt.label }}
                />
              </Box>
            ))}
            {rankingOptions.length > 4 && (
              <Typography variant="caption" color="text.disabled">
                ... 還有 {rankingOptions.length - 4} 個項目
              </Typography>
            )}
          </Box>
        );
      }

      case 'multipletext': {
        const multipletextProps = (field as unknown as Record<string, unknown>).properties as { items?: Array<{ name: string; label: string; placeholder?: string }> } | undefined;
        const textItems = multipletextProps?.items || [{ name: 'item1', label: '項目 1' }, { name: 'item2', label: '項目 2' }];
        return (
          <Box sx={previewStyles.container}>
            {textItems.map((item, i) => (
              <Box key={item.name || i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 80, flexShrink: 0 }}>{item.label}</Typography>
                <Box sx={{ ...previewStyles.textInput, flex: 1 }}>{item.placeholder || `請輸入${item.label}...`}</Box>
              </Box>
            ))}
          </Box>
        );
      }

      case 'multiselect':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'text.disabled',
                fontSize: '0.9rem',
              }}
            >
              <span>選擇多個項目</span>
              <Icons.ArrowDropDown />
            </Box>
          </Box>
        );

      case 'imagepicker':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[1, 2, 3].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 60,
                    height: 60,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.disabled',
                  }}
                >
                  <Icons.Image sx={{ fontSize: 24 }} />
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'matrix':
      case 'matrixdropdown':
      case 'matrixdynamic': {
        const props = field.properties as { rows?: { id: string; label: string }[]; columns?: { id: string; label: string }[] } | undefined;
        const matrixRows = props?.rows ?? [{ id: '1', label: '列 1' }, { id: '2', label: '列 2' }];
        const matrixCols = props?.columns ?? [{ id: '1', label: '選項 1' }, { id: '2', label: '選項 2' }];
        const displayRows = matrixRows.slice(0, 4); // Show max 4 rows in preview
        const displayCols = matrixCols.slice(0, 4); // Show max 4 columns in preview
        return (
          <Box sx={previewStyles.container}>
            <Box sx={{ fontSize: '0.85rem', color: 'text.disabled', overflowX: 'auto' }}>
              {/* Header row */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1, minWidth: 'fit-content' }}>
                <Box sx={{ width: 100, flexShrink: 0 }} />
                {displayCols.map((col) => (
                  <Box
                    key={col.id}
                    sx={{ width: 60, flexShrink: 0, textAlign: 'center', fontSize: '0.75rem' }}
                    dangerouslySetInnerHTML={{ __html: col.label }}
                  />
                ))}
                {matrixCols.length > 4 && (
                  <Box sx={{ width: 40, textAlign: 'center', fontSize: '0.75rem' }}>...</Box>
                )}
              </Box>
              {/* Data rows */}
              {displayRows.map((row) => (
                <Box key={row.id} sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.5, minWidth: 'fit-content' }}>
                  <Box
                    sx={{ width: 100, flexShrink: 0, color: 'text.secondary', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    dangerouslySetInnerHTML={{ __html: row.label }}
                  />
                  {displayCols.map((col) => (
                    <Box key={col.id} sx={{ width: 60, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid', borderColor: 'text.disabled' }} />
                    </Box>
                  ))}
                  {matrixCols.length > 4 && (
                    <Box sx={{ width: 40, textAlign: 'center' }}>...</Box>
                  )}
                </Box>
              ))}
              {matrixRows.length > 4 && (
                <Box sx={{ color: 'text.disabled', fontSize: '0.75rem', mt: 1 }}>
                  ... 還有 {matrixRows.length - 4} 列
                </Box>
              )}
            </Box>
          </Box>
        );
      }

      case 'section':
        return (
          <Box sx={previewStyles.container}>
            <Divider sx={{ my: 1 }} />
          </Box>
        );

      case 'hidden':
      case 'expression':
        return (
          <Box sx={previewStyles.container}>
            <Box sx={{ color: 'text.disabled', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {field.type === 'hidden' ? '（隱藏欄位 - 僅供後端使用）' : '（計算欄位 - 自動計算結果）'}
            </Box>
          </Box>
        );

      case 'html':
        return (
          <Box sx={previewStyles.container}>
            <Box
              sx={{
                color: 'text.secondary',
                fontSize: '0.85rem',
                maxHeight: 80,
                overflow: 'hidden',
                opacity: 0.7,
                '& *': { margin: 0, padding: 0 },
              }}
              dangerouslySetInnerHTML={{ __html: (field as any).properties?.content || '<p style="color:#999">HTML 內容區塊</p>' }}
            />
          </Box>
        );

      case 'panel':
      case 'paneldynamic':
        return null; // Panels render their own content

      default:
        return null;
    }
  };

  // Build grouped menu items for type selector
  const renderTypeMenuItems = () => {
    const items: React.ReactNode[] = [];

    fieldCategories.forEach((category) => {
      const categoryFields = getFieldTypesByCategory(category.id);
      if (categoryFields.length === 0) return;

      items.push(
        <ListSubheader key={`header-${category.id}`} sx={{ backgroundColor: 'grey.100' }}>
          {category.label}
        </ListSubheader>
      );

      categoryFields.forEach((fieldDef) => {
        const FieldIcon = (Icons as Record<string, React.ElementType>)[fieldDef.icon] || Icons.HelpOutline;
        items.push(
          <MenuItem key={fieldDef.type} value={fieldDef.type}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FieldIcon fontSize="small" color="action" />
              <Typography variant="body2">{fieldDef.label}</Typography>
            </Box>
          </MenuItem>
        );
      });
    });

    return items;
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: isSelected ? 'primary.main' : 'divider',
        borderRadius: 2,
        boxShadow: isSelected ? 2 : 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        opacity: isDragging ? 0.5 : 1,
        overflow: 'hidden',
        '&:hover': {
          boxShadow: 2,
          borderColor: isSelected ? 'primary.main' : 'grey.400',
        },
      }}
    >
      {/* Main Content Area */}
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Drag Handle */}
          <Box
            {...dragListeners}
            {...dragAttributes}
            sx={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'grab',
              color: 'text.disabled',
              '&:hover': { color: 'text.secondary' },
              '&:active': { cursor: 'grabbing' },
              mt: 1,
            }}
          >
            <DragIcon />
          </Box>

          {/* Field Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 1,
              backgroundColor: 'primary.main',
              color: 'white',
              flexShrink: 0,
            }}
          >
            <IconComponent />
          </Box>

          {/* Field Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Editable Label - contenteditable for rich text */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Box
                  ref={editableRef}
                  contentEditable={isSelected}
                  suppressContentEditableWarning
                  onFocus={() => setActiveEditable('label')}
                  onBlur={saveLabelToStore}
                  onClick={(e) => e.stopPropagation()}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  dangerouslySetInnerHTML={{ __html: field.label || '' }}
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 500,
                    py: 0.5,
                    outline: 'none',
                    minHeight: '1.5em',
                    '&:empty::before': {
                      content: '"問題標題"',
                      color: 'text.secondary',
                    },
                    '&:focus': {
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                    },
                  }}
                />
              </Box>

              {/* Add Image Button */}
              {!field.image && isSelected && (
                <Tooltip title="新增圖片">
                  <IconButton size="small" onClick={handleAddImage}>
                    <ImageIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {/* Rich Text Toolbar - shown when selected */}
            {isSelected && (
              <Box sx={{ mt: 1, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                {renderToolbar()}
              </Box>
            )}

            {/* Type Selector */}
            <Box sx={{ mt: 1 }}>
              <Select
                value={field.type}
                onChange={(e) => handleTypeChange(e.target.value as FieldType)}
                onClick={(e) => e.stopPropagation()}
                size="small"
                sx={{
                  minWidth: 180,
                  '& .MuiSelect-select': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.75,
                  },
                }}
              >
                {renderTypeMenuItems()}
              </Select>
            </Box>

            {/* Description field - shown when enabled */}
            {(showDescription || field.description) && isSelected && (
              <Box sx={{ mt: 1.5 }}>
                <Box
                  ref={descriptionRef}
                  contentEditable
                  suppressContentEditableWarning
                  onFocus={() => {
                    setEditingDescription(true);
                    setActiveEditable('description');
                  }}
                  onBlur={() => {
                    setEditingDescription(false);
                    saveDescriptionToStore();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onCompositionStart={handleCompositionStart}
                  onCompositionEnd={handleCompositionEnd}
                  dangerouslySetInnerHTML={{ __html: field.description || '' }}
                  sx={{
                    fontSize: '0.9rem',
                    color: 'text.secondary',
                    py: 0.5,
                    outline: 'none',
                    minHeight: '1.5em',
                    '&:empty::before': {
                      content: '"說明文字"',
                      color: 'text.disabled',
                    },
                    '&:focus': {
                      borderBottom: '2px solid',
                      borderColor: 'secondary.main',
                    },
                  }}
                />
                {/* Description toolbar - shown when editing description */}
                {editingDescription && (
                  <Box sx={{ borderBottom: '2px solid', borderColor: 'secondary.main' }}>
                    {renderToolbar()}
                  </Box>
                )}
              </Box>
            )}

            {/* Show description when not editing */}
            {field.description && !isSelected && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
                dangerouslySetInnerHTML={{ __html: field.description }}
              />
            )}
          </Box>

          {/* Actions */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Tooltip title="複製">
              <IconButton size="small" onClick={handleDuplicate}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="刪除">
              <IconButton size="small" onClick={handleDelete} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Field Image */}
        {field.image && (
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              justifyContent: field.image.alignment === 'left' ? 'flex-start' :
                field.image.alignment === 'right' ? 'flex-end' : 'center',
            }}
          >
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={field.image.url}
                alt={field.image.alt || ''}
                style={{
                  maxWidth: '100%',
                  maxHeight: 300,
                  borderRadius: 4,
                }}
              />
              {isSelected && (
                <IconButton
                  size="small"
                  onClick={(e) => setImageMenuAnchor(e.currentTarget)}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    '&:hover': { backgroundColor: 'white' },
                  }}
                >
                  <EditImageIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        )}

        {/* Image Menu */}
        <Menu
          anchorEl={imageMenuAnchor}
          open={Boolean(imageMenuAnchor)}
          onClose={() => setImageMenuAnchor(null)}
        >
          <MenuItem onClick={() => handleImageAlignment('left')}>
            <ListItemIcon><AlignLeftIcon fontSize="small" /></ListItemIcon>
            <ListItemText>靠左對齊</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleImageAlignment('center')}>
            <ListItemIcon><AlignCenterIcon fontSize="small" /></ListItemIcon>
            <ListItemText>置中對齊</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleImageAlignment('right')}>
            <ListItemIcon><AlignRightIcon fontSize="small" /></ListItemIcon>
            <ListItemText>靠右對齊</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleChangeImage}>
            <ListItemIcon><ImageIcon fontSize="small" /></ListItemIcon>
            <ListItemText>變更</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleRemoveImage}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            <ListItemText>移除</ListItemText>
          </MenuItem>
        </Menu>

        {/* User Input Preview */}
        {renderFieldPreview()}
      </Box>

      {/* Footer with Required Toggle and More Menu */}
      <Divider />
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          backgroundColor: 'grey.50',
          gap: 1,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={field.required || allFieldsRequired}
              onChange={handleRequiredChange}
              onClick={(e) => e.stopPropagation()}
              size="small"
              disabled={allFieldsRequired}
            />
          }
          label={
            <Typography variant="body2" color={allFieldsRequired ? 'primary.main' : 'text.secondary'}>
              必填{allFieldsRequired && ' (全域)'}
            </Typography>
          }
          labelPlacement="start"
          sx={{ mr: 0 }}
        />

        {/* More Menu */}
        <Tooltip title="更多選項">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMoreMenuAnchor(e.currentTarget);
            }}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={moreMenuAnchor}
          open={Boolean(moreMenuAnchor)}
          onClose={() => setMoreMenuAnchor(null)}
        >
          <MenuItem onClick={handleAddDescription}>
            <ListItemIcon><DescriptionIcon fontSize="small" /></ListItemIcon>
            <ListItemText>說明</ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}

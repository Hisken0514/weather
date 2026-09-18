/**
 * FormImagePickerField - 圖片選擇欄位組件
 */

import {
  Box,
  FormControl,
  FormLabel,
  FormHelperText,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material';
import { CheckCircle as CheckIcon } from '@mui/icons-material';
import { Controller, useFormContext } from 'react-hook-form';
import type { ImagePickerField as ImagePickerFieldType } from '@/types/form';

interface FormImagePickerFieldProps {
  field: ImagePickerFieldType;
}

export function FormImagePickerField({ field }: FormImagePickerFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, required, disabled, readOnly, properties } = field;

  const choices = properties?.choices ?? [];
  const multiSelect = properties?.multiSelect ?? false;
  const showLabel = properties?.showLabel ?? true;
  const imageWidth = properties?.imageWidth ?? 150;
  const imageHeight = properties?.imageHeight ?? 150;

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={multiSelect ? [] : ''}
      rules={{
        validate: required
          ? (value) => {
              if (multiSelect) return (Array.isArray(value) && value.length > 0) || '此欄位為必填';
              return (value !== '' && value !== undefined && value !== null) || '此欄位為必填';
            }
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const selectedValues = multiSelect
          ? (controllerField.value as string[]) || []
          : controllerField.value;

        const isSelected = (value: string) => {
          if (multiSelect) {
            return selectedValues.includes(value);
          }
          return selectedValues === value;
        };

        const handleSelect = (value: string) => {
          if (disabled || readOnly) return;

          if (multiSelect) {
            const newValues = isSelected(value)
              ? (selectedValues as string[]).filter((v) => v !== value)
              : [...(selectedValues as string[]), value];
            controllerField.onChange(newValues);
          } else {
            controllerField.onChange(value);
          }
        };

        return (
          <FormControl error={!!error} disabled={disabled} fullWidth>
            <FormLabel required={required}>{label ?? name}</FormLabel>

            <ImageList
              sx={{ mt: 1 }}
              cols={Math.min(choices.length, 4)}
              gap={8}
            >
              {choices.map((choice) => (
                <ImageListItem
                  key={choice.value}
                  onClick={() => handleSelect(choice.value)}
                  sx={{
                    cursor: disabled || readOnly ? 'default' : 'pointer',
                    border: 2,
                    borderColor: isSelected(choice.value) ? 'primary.main' : 'transparent',
                    borderRadius: 1,
                    overflow: 'hidden',
                    position: 'relative',
                    opacity: disabled ? 0.5 : 1,
                    '&:hover': {
                      borderColor: disabled || readOnly ? undefined : 'primary.light',
                    },
                  }}
                >
                  <img
                    src={choice.imageUrl}
                    alt={choice.label ?? choice.value}
                    loading="lazy"
                    style={{
                      width: imageWidth,
                      height: imageHeight,
                      objectFit: 'cover',
                    }}
                  />
                  {isSelected(choice.value) && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        color: 'primary.main',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                      }}
                    >
                      <CheckIcon />
                    </Box>
                  )}
                  {showLabel && choice.label && (
                    <ImageListItemBar
                      title={choice.label}
                      position="below"
                    />
                  )}
                </ImageListItem>
              ))}
            </ImageList>

            <FormHelperText>{error?.message ?? description}</FormHelperText>
          </FormControl>
        );
      }}
    />
  );
}

export default FormImagePickerField;

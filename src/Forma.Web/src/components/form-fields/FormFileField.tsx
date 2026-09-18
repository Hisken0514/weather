/**
 * FormFileField - 檔案上傳欄位組件
 * 支援類型: file, image
 * 使用 FilePicker 組件實現立即上傳
 */

import { FormControl, FormHelperText } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { FilePicker, type SelectedFile } from '@/components/common';
import { FieldLabel } from './FieldLabel';
import type { FileField as FileFieldType } from '@/types/form';

interface FormFileFieldProps {
  field: FileFieldType;
  allFieldsRequired?: boolean;
}

export function FormFileField({ field, allFieldsRequired }: FormFileFieldProps) {
  const { control } = useFormContext();
  const { name, label, description, required, disabled, readOnly, properties } = field;

  const isRequired = required || allFieldsRequired;
  const accept = properties?.accept?.join(',') ?? (field.type === 'image' ? 'image/*' : undefined);
  const maxSize = properties?.maxSize ?? 10 * 1024 * 1024; // 預設 10MB
  const maxFiles = properties?.maxFiles ?? 1;
  const multiple = properties?.multiple ?? maxFiles > 1;

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={[]}
      rules={{
        validate: (value) => {
          if (isRequired && (!value || value.length === 0)) {
            return '此欄位為必填';
          }
          return true;
        },
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const files: SelectedFile[] = controllerField.value || [];

        return (
          <FormControl error={!!error} disabled={disabled} fullWidth>
            <FieldLabel
              label={label ?? name}
              required={isRequired}
            />

            <FilePicker
              value={files}
              onChange={(newFiles) => controllerField.onChange(newFiles)}
              multiple={multiple}
              accept={accept}
              maxSize={maxSize}
              maxFiles={maxFiles}
              disabled={disabled || readOnly}
              error={error?.message}
              compact
              hideFileBrowser
            />

            {!error && description && (
              <FormHelperText>{description}</FormHelperText>
            )}
          </FormControl>
        );
      }}
    />
  );
}

export default FormFileField;

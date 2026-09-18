/**
 * FormRatingField - 評分欄位組件
 */

import { FormControl, FormHelperText, Rating, Box, Typography } from '@mui/material';
import { Star as StarIcon } from '@mui/icons-material';
import { Controller, useFormContext } from 'react-hook-form';
import type { RatingField as RatingFieldType } from '@/types/form';
import { FieldLabel, FieldDescription } from './FieldLabel';

interface FormRatingFieldProps {
  field: RatingFieldType;
}

export function FormRatingField({ field }: FormRatingFieldProps) {
  const { control } = useFormContext();
  const { id, name, label, description, required, disabled, readOnly, properties } = field;

  const maxRating = properties?.maxRating ?? 5;
  const allowHalf = properties?.allowHalf ?? false;
  const labels = properties?.labels ?? [];

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={field.defaultValue ?? null}
      rules={{
        validate: required
          ? (value) => (value !== null && value !== undefined && value !== 0) || '此欄位為必填'
          : undefined,
      }}
      render={({ field: controllerField, fieldState: { error } }) => {
        const currentLabel =
          controllerField.value && labels.length > 0
            ? labels[Math.ceil(controllerField.value) - 1]
            : null;

        return (
          <Box>
            <FieldLabel label={label} required={required} />
            <FormControl error={!!error} disabled={disabled} fullWidth>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Rating
                  id={id}
                  value={controllerField.value}
                  onChange={(_, newValue) => controllerField.onChange(newValue)}
                  max={maxRating}
                  precision={allowHalf ? 0.5 : 1}
                  disabled={disabled}
                  readOnly={readOnly}
                  emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
                />
                {currentLabel && (
                  <Typography variant="body2" color="textSecondary">
                    {currentLabel}
                  </Typography>
                )}
              </Box>
              {error && <FormHelperText>{error.message}</FormHelperText>}
            </FormControl>
            <FieldDescription description={description} />
          </Box>
        );
      }}
    />
  );
}

export default FormRatingField;

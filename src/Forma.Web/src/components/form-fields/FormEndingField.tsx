/**
 * FormEndingField - 結束區塊欄位
 */

import { Box, Typography, Divider } from '@mui/material';
import type { EndingField } from '@/types/form';

interface FormEndingFieldProps {
  field: EndingField;
}

export function FormEndingField({ field }: FormEndingFieldProps) {
  const props = field.properties ?? {};
  const alignment = props.alignment ?? 'center';

  return (
    <Box
      id={field.id}
      sx={{
        textAlign: alignment,
        py: 3,
        px: 2,
      }}
    >
      <Divider sx={{ mb: 3 }} />
      {props.imageUrl && (
        <Box
          component="img"
          src={props.imageUrl}
          alt=""
          sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', mb: 2 }}
        />
      )}
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        {props.title || field.label || '感謝您的填寫'}
      </Typography>
      {props.message && (
        <Typography variant="body1" color="text.secondary">
          {props.message}
        </Typography>
      )}
    </Box>
  );
}

export default FormEndingField;

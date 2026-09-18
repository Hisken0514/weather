/**
 * FormWelcomeField - 歡迎區塊欄位
 */

import { Box, Typography, Divider } from '@mui/material';
import type { WelcomeField } from '@/types/form';

interface FormWelcomeFieldProps {
  field: WelcomeField;
}

export function FormWelcomeField({ field }: FormWelcomeFieldProps) {
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
      {props.imageUrl && (
        <Box
          component="img"
          src={props.imageUrl}
          alt=""
          sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', mb: 2 }}
        />
      )}
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        {props.title || field.label || '歡迎'}
      </Typography>
      {props.subtitle && (
        <Typography variant="body1" color="text.secondary">
          {props.subtitle}
        </Typography>
      )}
      <Divider sx={{ mt: 3 }} />
    </Box>
  );
}

export default FormWelcomeField;

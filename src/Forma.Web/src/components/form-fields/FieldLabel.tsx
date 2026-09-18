/**
 * FieldLabel - Renders field label with HTML support
 * Parses rich text HTML tags like <b>, <i>, <u>, <a>
 */

import { Box, Typography } from '@mui/material';

interface FieldLabelProps {
  label?: string;
  required?: boolean;
  htmlFor?: string;
}

export function FieldLabel({ label, required, htmlFor }: FieldLabelProps) {
  if (!label) return null;

  return (
    <Typography
      component="label"
      htmlFor={htmlFor}
      sx={{
        display: 'block',
        mb: 0.5,
        fontWeight: 500,
        fontSize: '0.95rem',
        '& b, & strong': { fontWeight: 700 },
        '& i, & em': { fontStyle: 'italic' },
        '& u': { textDecoration: 'underline' },
        '& a': { color: 'primary.main', textDecoration: 'underline' },
      }}
    >
      <Box
        component="span"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      {required && (
        <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>
          *
        </Box>
      )}
    </Typography>
  );
}

interface FieldDescriptionProps {
  description?: string;
}

export function FieldDescription({ description }: FieldDescriptionProps) {
  if (!description) return null;

  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{
        mt: 0.5,
        '& b, & strong': { fontWeight: 600 },
        '& i, & em': { fontStyle: 'italic' },
        '& u': { textDecoration: 'underline' },
        '& a': { color: 'primary.main', textDecoration: 'underline' },
      }}
      dangerouslySetInnerHTML={{ __html: description }}
    />
  );
}

export default FieldLabel;

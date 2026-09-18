/**
 * FormHtmlField - HTML 內容欄位組件
 * 用於顯示靜態 HTML 內容，例如說明文字、條款等
 */

import { Box } from '@mui/material';
import type { HtmlField as HtmlFieldType } from '@/types/form';

interface FormHtmlFieldProps {
  field: HtmlFieldType;
}

export function FormHtmlField({ field }: FormHtmlFieldProps) {
  const { id, properties, disabled } = field;

  const content = properties?.content ?? '';

  return (
    <Box
      id={id}
      sx={{
        opacity: disabled ? 0.6 : 1,
        '& a': {
          color: 'primary.main',
        },
        '& h1, & h2, & h3, & h4, & h5, & h6': {
          mt: 2,
          mb: 1,
        },
        '& p': {
          mb: 1,
        },
        '& ul, & ol': {
          pl: 3,
          mb: 1,
        },
        '& li': {
          mb: 0.5,
        },
        '& table': {
          borderCollapse: 'collapse',
          width: '100%',
          mb: 2,
        },
        '& th, & td': {
          border: '1px solid',
          borderColor: 'divider',
          p: 1,
        },
        '& th': {
          backgroundColor: 'grey.100',
        },
        '& blockquote': {
          borderLeft: '4px solid',
          borderColor: 'primary.main',
          pl: 2,
          ml: 0,
          color: 'text.secondary',
          fontStyle: 'italic',
        },
        '& code': {
          backgroundColor: 'grey.100',
          px: 0.5,
          borderRadius: 0.5,
          fontFamily: 'monospace',
        },
        '& pre': {
          backgroundColor: 'grey.100',
          p: 2,
          borderRadius: 1,
          overflow: 'auto',
          '& code': {
            backgroundColor: 'transparent',
            p: 0,
          },
        },
        '& hr': {
          border: 'none',
          borderTop: '1px solid',
          borderColor: 'divider',
          my: 2,
        },
        '& img': {
          maxWidth: '100%',
          height: 'auto',
        },
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default FormHtmlField;

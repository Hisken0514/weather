/**
 * FormDownloadReportField - 下載報告欄位
 * 在填寫模式下產生 PDF 報告供下載
 */

import { useState, useCallback } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { useFormContext } from 'react-hook-form';
import type { DownloadReportField, FormSchema } from '@/types/form';

interface FormDownloadReportFieldProps {
  field: DownloadReportField;
  schema?: FormSchema;
  logoUrl?: string;
}

export function FormDownloadReportField({ field, schema, logoUrl }: FormDownloadReportFieldProps) {
  const props = field.properties ?? {};
  const buttonText = props.buttonText || '下載報告';
  const [generating, setGenerating] = useState(false);

  // Always call the hook — returns null-ish methods when not inside FormProvider
  const formContext = useFormContext();
  const hasFormContext = !!formContext?.getValues;

  const isEditorMode = !hasFormContext || !schema;

  const handleDownload = useCallback(async () => {
    if (!hasFormContext || !schema) return;
    setGenerating(true);
    try {
      const values = formContext.getValues();
      const { generateReport } = await import('./report/generateReport');
      await generateReport({ schema, values, properties: props, logoUrl });
      // Record download time in form values for submission
      formContext.setValue('__reportDownloadedAt', new Date().toISOString());
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  }, [hasFormContext, formContext, schema, props, logoUrl]);

  return (
    <Box id={field.id} sx={{ py: 2, textAlign: 'center' }}>
      <Button
        variant="contained"
        size="large"
        startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
        onClick={handleDownload}
        disabled={generating || isEditorMode}
      >
        {generating ? '產生中...' : buttonText}
      </Button>
      {isEditorMode && (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
          （填寫時才可下載報告）
        </Typography>
      )}
    </Box>
  );
}

export default FormDownloadReportField;

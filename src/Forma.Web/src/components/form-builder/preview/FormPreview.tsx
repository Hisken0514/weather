/**
 * FormPreview - Preview mode for the form
 */

import { useState, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, Button, Divider, LinearProgress, Stepper, Step, StepLabel } from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
} from '@mui/icons-material';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { FieldRenderer } from '@/components/form-fields';
import { isFieldVisible, isPageVisible } from '@/lib/conditionEvaluator';
import { useFormBuilderStore } from '@/stores/formBuilderStore';

// Progress tracker component
function ProgressTracker({ fields, control, watchValues }: { fields: { name: string; visible?: boolean; required?: boolean; conditional?: unknown }[]; control: unknown; watchValues?: Record<string, unknown> }) {
  const [progress, setProgress] = useState(0);
  const [filledCount, setFilledCount] = useState(0);
  const values = useWatch({ control: control as never });

  useEffect(() => {
    // Filter out hidden fields (visible=false + conditional)
    const visibleFields = watchValues
      ? fields.filter((f) => isFieldVisible(f as { visible?: boolean; conditional?: import('@/types/form').Conditional }, watchValues))
      : fields;
    if (visibleFields.length === 0) {
      setProgress(100);
      setFilledCount(0);
      return;
    }

    let filled = 0;
    visibleFields.forEach((field) => {
      const value = values?.[field.name];
      if (value !== undefined && value !== null && value !== '' &&
          !(Array.isArray(value) && value.length === 0)) {
        filled++;
      }
    });

    setFilledCount(filled);
    setProgress(Math.round((filled / visibleFields.length) * 100));
  }, [values, fields, watchValues]);

  return (
    <Box sx={{ px: 2, py: 1.5, backgroundColor: 'grey.100', borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          填寫進度
        </Typography>
        <Typography variant="body2" fontWeight="medium" color="primary.main">
          {fields.length === 0 ? '無欄位' : `${filledCount}/${fields.length} (${progress}%)`}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'grey.300',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
          }
        }}
      />
    </Box>
  );
}

export function FormPreview() {
  const { togglePreviewMode, schema } = useFormBuilderStore();
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const methods = useForm({
    mode: 'onChange',
  });

  const watchedValues = methods.watch();

  // Compute visible pages
  const visiblePages = useMemo(() => {
    return schema.pages.filter((page) =>
      isPageVisible(page, watchedValues)
    );
  }, [schema.pages, watchedValues]);

  const totalPages = visiblePages.length;
  const currentPage = visiblePages[currentPageIndex] ?? visiblePages[0];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === totalPages - 1;

  // Ensure currentPageIndex stays in bounds
  useEffect(() => {
    if (currentPageIndex >= totalPages && totalPages > 0) {
      setCurrentPageIndex(totalPages - 1);
    }
  }, [currentPageIndex, totalPages]);

  // All visible input fields for progress bar
  const allInputFields = useMemo(() => {
    return visiblePages
      .flatMap((page) => page.fields)
      .filter((f) => !['panel', 'paneldynamic', 'html', 'section', 'hidden', 'welcome', 'ending', 'downloadreport'].includes(f.type));
  }, [visiblePages]);

  const showProgressBar = schema.settings?.showProgressBar ?? true;

  const handleSubmit = (data: Record<string, unknown>) => {
    console.log('Preview form data:', data);
    alert('表單資料已記錄到 Console');
  };

  const handleNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300,
        p: 4,
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: 800,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'primary.main',
            color: 'white',
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight="bold">
              表單預覽
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {schema.metadata.title}
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="inherit"
            startIcon={<CloseIcon />}
            onClick={togglePreviewMode}
            sx={{ color: 'primary.main' }}
          >
            關閉預覽
          </Button>
        </Box>

        {/* Progress Bar */}
        {showProgressBar && (
          <ProgressTracker fields={allInputFields} control={methods.control} watchValues={watchedValues} />
        )}

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {/* Form Metadata */}
          {schema.metadata.description && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                {schema.metadata.description}
              </Typography>
            </Box>
          )}

          {/* Page Stepper */}
          {totalPages > 1 && (
            <Box sx={{ mb: 3 }}>
              <Stepper activeStep={currentPageIndex} alternativeLabel>
                {visiblePages.map((page, index) => (
                  <Step key={page.id}>
                    <StepLabel>{page.title || `${index + 1}`}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {/* Page Title */}
          {currentPage?.title && totalPages > 1 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {currentPage.title}
              </Typography>
              {currentPage.description && (
                <Typography variant="body2" color="text.secondary">
                  {currentPage.description}
                </Typography>
              )}
              <Divider sx={{ mt: 2 }} />
            </Box>
          )}

          {/* Form Fields */}
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(handleSubmit)}>
              {!currentPage || currentPage.fields.length === 0 ? (
                <Box
                  sx={{
                    py: 8,
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="body1" color="text.secondary">
                    此頁面尚無欄位
                  </Typography>
                </Box>
              ) : (
                <>
                  {currentPage.fields.map((field) => {
                    // Check field.visible + conditional visibility
                    if (!isFieldVisible(field, watchedValues)) return null;
                    return (
                      <Box key={field.id} sx={{ mb: 3 }}>
                        <FieldRenderer field={field} />
                      </Box>
                    );
                  })}

                  {/* Navigation / Submit */}
                  <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<PrevIcon />}
                      onClick={handlePrevPage}
                      disabled={isFirstPage}
                      sx={{ visibility: isFirstPage ? 'hidden' : 'visible' }}
                    >
                      上一頁
                    </Button>

                    {totalPages > 1 && (
                      <Typography variant="body2" color="text.secondary">
                        {currentPageIndex + 1} / {totalPages}
                      </Typography>
                    )}

                    {isLastPage ? (
                      <Button type="submit" variant="contained" size="large">
                        {schema.metadata.submitButtonText || '提交'}
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        endIcon={<NextIcon />}
                        onClick={handleNextPage}
                      >
                        下一頁
                      </Button>
                    )}
                  </Box>
                </>
              )}
            </form>
          </FormProvider>
        </Box>
      </Paper>
    </Box>
  );
}

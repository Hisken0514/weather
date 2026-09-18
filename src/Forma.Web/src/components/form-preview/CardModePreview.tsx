/**
 * CardModePreview - 卡片模式表單預覽
 * 一次顯示一個問題，適合手機/平板使用
 */

import { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useForm, FormProvider } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { FieldRenderer } from '@/components/form-fields';
import { isFieldVisible, isPageVisible } from '@/lib/conditionEvaluator';
import type { FormSchema, Field } from '@/types/form';
import type { ResolvedTheme } from '@/hooks/useFormTheme';

interface CardModePreviewProps {
  schema: FormSchema;
  onSubmit?: (data: Record<string, unknown>) => void;
  resolvedTheme?: ResolvedTheme;
}

export function CardModePreview({ schema, onSubmit, resolvedTheme }: CardModePreviewProps) {
  const methods = useForm({
    mode: 'onChange',
  });

  const watchedValues = methods.watch();

  // Flatten all fields from visible pages, filter hidden fields
  const questionFields = useMemo(() => {
    const visiblePages = schema.pages.filter((page) =>
      isPageVisible(page, watchedValues)
    );
    const allFields = visiblePages.flatMap((page) => page.fields);
    return allFields
      .filter((f) => !['section', 'hidden', 'downloadreport'].includes(f.type))
      .filter((f) => isFieldVisible(f, watchedValues));
  }, [schema.pages, watchedValues]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const totalQuestions = questionFields.length;
  // Keep currentIndex in bounds when fields become hidden
  const safeIndex = Math.min(currentIndex, Math.max(0, totalQuestions - 1));
  if (safeIndex !== currentIndex && totalQuestions > 0) {
    setCurrentIndex(safeIndex);
  }
  const currentField = questionFields[safeIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const allFieldsRequired = schema.settings?.allFieldsRequired ?? false;

  const handleNext = async () => {
    // Collect field names to validate for the current card, including inside panel/paneldynamic
    const NON_INPUT_TYPES = ['panel', 'paneldynamic', 'html', 'section', 'hidden', 'welcome', 'ending', 'downloadreport'];
    const collectFieldNames = (fields: Field[], prefix = ''): string[] => {
      const names: string[] = [];
      for (const f of fields) {
        if (f.type === 'panel') {
          const panelFields = (f.properties as { fields?: Field[] }).fields ?? [];
          names.push(...collectFieldNames(panelFields, prefix));
        } else if (f.type === 'paneldynamic') {
          const dynFields = (f.properties as { fields?: Field[] }).fields ?? [];
          const items = (methods.getValues()[f.name] as unknown[]) ?? [];
          items.forEach((_, idx) => {
            names.push(...collectFieldNames(dynFields, `${f.name}.${idx}`));
          });
        } else if (!NON_INPUT_TYPES.includes(f.type)) {
          names.push(prefix ? `${prefix}.${f.name}` : f.name);
        }
      }
      return names;
    };

    if (currentField) {
      const fieldNames = collectFieldNames([currentField]);
      if (fieldNames.length > 0) {
        const valid = await methods.trigger(fieldNames);
        if (!valid) return;
      }
    }

    if (isLastQuestion) {
      // Submit form
      methods.handleSubmit((data) => {
        onSubmit?.(data);
      })();
    } else {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstQuestion) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Get current field value to determine if user can proceed
  // For panel/paneldynamic, always enable button (validation is done in handleNext via trigger)
  const currentValue = methods.watch(currentField?.name);
  const hasValue = currentValue !== undefined && currentValue !== null && currentValue !== '' &&
    !(Array.isArray(currentValue) && currentValue.length === 0);
  const isPanelType = currentField?.type === 'panel' || currentField?.type === 'paneldynamic';
  const isRequired = currentField?.required || allFieldsRequired;
  const canProceed = isPanelType || !isRequired || hasValue;

  if (totalQuestions === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
        }}
      >
        <Typography color="text.secondary">
          表單尚無問題
        </Typography>
      </Box>
    );
  }

  // Animation variants for card transitions
  const cardVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: resolvedTheme?.backgroundColor || schema.settings?.backgroundColor || 'grey.100',
        position: 'relative',
      }}
    >
      {/* Logo - Top Left */}
      {(resolvedTheme?.logo || schema.settings?.headerImage) && (
        <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 10, backgroundColor: resolvedTheme?.logoBackgroundColor, p: 0.5, borderRadius: `${resolvedTheme?.cardBorderRadius ?? 8}px` }}>
          <Box
            component="img"
            src={resolvedTheme?.logo || schema.settings?.headerImage}
            alt="Logo"
            sx={{
              maxWidth: 150,
              maxHeight: 50,
              objectFit: 'contain',
            }}
          />
        </Box>
      )}

      {/* Main Content Area - Centered */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          overflow: 'hidden',
        }}
      >
        {/* Progress Bar - Fixed above card */}
        <Box sx={{ mb: 2, px: 1, width: '100%', maxWidth: 480 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              進度
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {currentIndex + 1} / {totalQuestions}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'grey.300',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundColor: 'primary.main',
                transition: 'transform 0.3s ease',
              },
            }}
          />
        </Box>

        {/* Card with Animation */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            style={{
              width: '100%',
              maxWidth: 480,
            }}
          >
            <Paper
              elevation={8}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Card Content */}
              <Box
                sx={{
                  p: 3,
                  flex: 1,
                  overflow: 'auto',
                  maxHeight: '60vh',
                }}
              >
                {/* Display-only fields render their own content */}
                {currentField && ['welcome', 'ending', 'html'].includes(currentField.type) ? (
                  <FormProvider {...methods}>
                    <FieldRenderer
                      field={currentField}
                      allFieldsRequired={allFieldsRequired}
                    />
                  </FormProvider>
                ) : (
                  <>
                    {/* Question Label */}
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      sx={{
                        mb: 1,
                        '& b, & strong': { fontWeight: 700 },
                        '& i, & em': { fontStyle: 'italic' },
                        '& u': { textDecoration: 'underline' },
                      }}
                      dangerouslySetInnerHTML={{ __html: currentField?.label || '' }}
                    />

                    {/* Question Description */}
                    {currentField?.description && (
                      <Typography
                        variant="body2"
                        color="primary.main"
                        sx={{
                          mb: 3,
                          '& b, & strong': { fontWeight: 600 },
                          '& i, & em': { fontStyle: 'italic' },
                          '& a': { color: 'primary.main' },
                        }}
                        dangerouslySetInnerHTML={{ __html: currentField.description }}
                      />
                    )}

                    {/* Field Input */}
                    <FormProvider {...methods}>
                      <Box sx={{ mt: 2 }}>
                        <FieldRenderer
                          field={currentField}
                          allFieldsRequired={allFieldsRequired}
                        />
                      </Box>
                    </FormProvider>
                  </>
                )}
              </Box>

              {/* Card Footer - Navigation */}
              <Box
                sx={{
                  p: 2,
                  pt: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                {/* Previous Button */}
                <IconButton
                  onClick={handlePrev}
                  disabled={isFirstQuestion}
                  sx={{
                    opacity: isFirstQuestion ? 0 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <PrevIcon />
                </IconButton>

                {/* Next/Submit Button */}
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={!canProceed}
                  endIcon={isLastQuestion ? <CheckIcon /> : <NextIcon />}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    fontWeight: 600,
                  }}
                >
                  {isLastQuestion ? '提交' : '下一題'}
                </Button>
              </Box>

              {/* Powered by */}
              <Box
                sx={{
                  py: 1.5,
                  textAlign: 'center',
                  borderTop: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.disabled">
                  Powered by <strong>Forma</strong>
                </Typography>
              </Box>
            </Paper>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}

export default CardModePreview;

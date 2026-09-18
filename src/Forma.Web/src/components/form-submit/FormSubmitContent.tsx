/**
 * FormSubmitContent - 共用表單填寫內容元件
 * 被 FormSubmitPage（登入版）與 PublicFormSubmitPage（公開版）共用
 * 支援主題、Logo、卡片模式、圓角等設定
 */

import { useState, useEffect, useMemo } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  AppBar,
  Toolbar,
  Container,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as PrevIcon,
  CheckCircle as SuccessIcon,
  Save as SaveDraftIcon,
} from '@mui/icons-material';
import { useForm, FormProvider, useWatch } from 'react-hook-form';
import { FieldRenderer } from '@/components/form-fields';
import { CardModePreview } from '@/components/form-preview';
import { resolveTheme, parseProjectTheme } from '@/hooks/useFormTheme';
import type { ResolvedTheme } from '@/hooks/useFormTheme';
import type { FormDto } from '@/types/api/forms';
import type { Field, FormSchema, PageNavigationRule } from '@/types/form';
import { evaluateOperator, isFieldVisible, isPageVisible } from '@/lib/conditionEvaluator';

// ---- Sub-components ----

function ProgressTracker({ fields, control, watchValues }: { fields: Field[]; control: unknown; watchValues?: Record<string, unknown> }) {
  const [progress, setProgress] = useState(0);
  const [filledCount, setFilledCount] = useState(0);
  const values = useWatch({ control: control as never });

  useEffect(() => {
    // Filter out hidden fields from progress calculation
    const visibleFields = watchValues
      ? fields.filter((f) => isFieldVisible(f as Field, watchValues))
      : fields;
    if (visibleFields.length === 0) { setProgress(100); setFilledCount(0); return; }
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
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary">填寫進度</Typography>
        <Typography variant="body2" fontWeight="medium" color="primary.main">
          {fields.length === 0 ? '無欄位' : `${filledCount}/${fields.length} (${progress}%)`}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.300', '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
      />
    </Box>
  );
}

function SuccessScreen({ message, theme }: { message?: string; theme: ResolvedTheme }) {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center', borderRadius: `${theme.cardBorderRadius ?? 8}px` }}>
        <SuccessIcon sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
        <Typography variant="h4" gutterBottom fontWeight="bold">
          提交成功
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {message || '感謝您的填寫，您的回覆已成功送出。'}
        </Typography>
      </Paper>
    </Container>
  );
}

// ---- Main component ----

export interface FormSubmitContentProps {
  form: FormDto;
  schema: FormSchema;
  /** 是否顯示 AppBar（私人版顯示，公開版不顯示） */
  showAppBar?: boolean;
  /** 是否允許儲存草稿 */
  allowDraft?: boolean;
  /** 預設表單值（用於載入既有草稿/退回的 submission） */
  defaultValues?: Record<string, unknown>;
  /** 提交 handler */
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** 儲存草稿 handler */
  onSaveDraft?: (data: Record<string, unknown>) => Promise<void>;
  /** 關閉/返回 handler */
  onClose?: () => void;
  /** 是否正在提交 */
  submitting: boolean;
  /** 是否已提交成功 */
  submitted: boolean;
  /** 外部 project settings JSON（若 form.projectSettings 不可用時使用） */
  projectSettingsJson?: string;
}

export function FormSubmitContent({
  form,
  schema,
  showAppBar = true,
  allowDraft = false,
  defaultValues,
  onSubmit,
  onSaveDraft,
  onClose,
  submitting,
  submitted,
  projectSettingsJson,
}: FormSubmitContentProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  });

  const methods = useForm({ mode: 'onChange', defaultValues });

  // 當 defaultValues 變化時（如異步載入既有 submission），重設表單值
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      methods.reset(defaultValues);
    }
  }, [defaultValues]);

  // Resolve theme
  const projectTheme = parseProjectTheme(form.projectSettings || projectSettingsJson);
  const resolvedTheme = resolveTheme(projectTheme, schema.settings);

  // Determine display mode (card vs classic)
  const muiTheme = useTheme();
  const isDesktop = useMediaQuery(muiTheme.breakpoints.up('md'));
  const defaultDisplayMode = schema.settings?.displayMode?.default;
  const forceCardOnDesktop = schema.settings?.displayMode?.forceCardOnDesktop ?? false;
  // 卡片模式：設定為 card 時，桌面預設用經典，除非開啟「所有裝置一致」
  const useCardMode = defaultDisplayMode === 'card' && (forceCardOnDesktop || !isDesktop);

  const bgColor = resolvedTheme.backgroundColor || schema.settings?.backgroundColor || 'grey.100';
  const borderRadius = resolvedTheme.cardBorderRadius ?? 8;
  const fontFamily = resolvedTheme.fontFamily && resolvedTheme.fontFamily !== 'default'
    ? resolvedTheme.fontFamily
    : undefined;

  // Card mode submit
  const handleCardSubmit = async (data: Record<string, unknown>) => {
    try {
      await onSubmit(data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : '提交失敗',
        severity: 'error',
      });
    }
  };

  // === 所有 hooks 必須在 early return 之前宣告 ===

  // Watch all form values for conditional evaluation
  const watchedValues = methods.watch();

  // Compute visible pages (filter by visibilityCondition)
  const visiblePages = useMemo(() => {
    return schema.pages.filter((page) =>
      isPageVisible(page, watchedValues)
    );
  }, [schema.pages, watchedValues]);

  const totalPages = visiblePages.length;
  const currentPage = visiblePages[currentPageIndex] ?? visiblePages[0];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === totalPages - 1;
  const allFields = visiblePages.flatMap((page) => page.fields);
  const inputFields = allFields.filter(f => !['panel', 'paneldynamic', 'html', 'section', 'hidden', 'welcome', 'ending', 'downloadreport'].includes(f.type));
  const showProgressBar = (schema.settings?.showProgressBar ?? true) && !resolvedTheme.hideProgressBar;
  const allFieldsRequired = schema.settings?.allFieldsRequired ?? false;
  const canGoPrevious = !isFirstPage && (currentPage?.allowPrevious ?? true);

  // Ensure currentPageIndex stays in bounds when pages become hidden
  useEffect(() => {
    if (currentPageIndex >= totalPages && totalPages > 0) {
      setCurrentPageIndex(totalPages - 1);
    }
  }, [currentPageIndex, totalPages]);

  // ============================================

  // Success state
  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: bgColor, fontFamily }}>
        <SuccessScreen message={schema.metadata.successMessage} theme={resolvedTheme} />
        {onClose && (
          <Box sx={{ textAlign: 'center' }}>
            <Button variant="contained" onClick={onClose}>關閉</Button>
          </Box>
        )}
      </Box>
    );
  }

  // Card mode
  if (useCardMode) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily }}>
        {showAppBar && (
          <AppBar position="static" color="primary" elevation={1}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>{form.name}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>v{form.version}</Typography>
            </Toolbar>
          </AppBar>
        )}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <Box sx={{ position: 'absolute', inset: 0 }}>
            <CardModePreview
              schema={schema}
              onSubmit={handleCardSubmit}
              resolvedTheme={resolvedTheme}
            />
          </Box>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  // Classic mode

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextPage = async () => {
    // Recursively collect field names, including fields inside panel and paneldynamic
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
        } else if (!NON_INPUT_TYPES.includes(f.type) && isFieldVisible(f, watchedValues)) {
          names.push(prefix ? `${prefix}.${f.name}` : f.name);
        }
      }
      return names;
    };

    const currentFieldNames = collectFieldNames(currentPage?.fields ?? []);
    if (currentFieldNames.length > 0) {
      const valid = await methods.trigger(currentFieldNames);
      if (!valid) return;
    }

    const formValues = methods.watch();
    const findTargetPageIndex = (rules: PageNavigationRule[] | undefined): number | null => {
      if (!rules || rules.length === 0) return null;
      for (const rule of rules) {
        const fieldValue = formValues[rule.fieldName];
        if (evaluateOperator(fieldValue, rule.operator, rule.value)) {
          // Find target in visible pages
          const targetIndex = visiblePages.findIndex(p => p.id === rule.targetPageId);
          if (targetIndex !== -1) return targetIndex;
        }
      }
      return null;
    };

    const targetIndex = findTargetPageIndex(currentPage?.navigationRules);
    if (targetIndex !== null) {
      setCurrentPageIndex(targetIndex);
    } else if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    try {
      await onSubmit(data);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : '提交失敗',
        severity: 'error',
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!onSaveDraft) return;
    const data = methods.getValues();
    try {
      await onSaveDraft(data);
      setSnackbar({ open: true, message: '草稿已儲存', severity: 'success' });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : '儲存失敗',
        severity: 'error',
      });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: bgColor, display: 'flex', flexDirection: 'column', fontFamily }}>
      {/* Top Bar */}
      {showAppBar && (
        <AppBar position="static" color="primary" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>{form.name}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>v{form.version}</Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content */}
      <Container maxWidth="md" sx={{ py: 4, flex: 1 }}>
        <Paper sx={{ p: 4, borderRadius: `${borderRadius}px` }}>
          {/* Logo */}
          {resolvedTheme.logo && (
            <Box sx={{
              mb: 2,
              backgroundColor: resolvedTheme.logoBackgroundColor,
              p: 0.5,
              borderRadius: `${borderRadius}px`,
              display: 'inline-block',
            }}>
              <Box
                component="img"
                src={resolvedTheme.logo}
                alt="Logo"
                sx={{ maxWidth: 200, maxHeight: 60, objectFit: 'contain' }}
              />
            </Box>
          )}

          {/* Header Image (form-level) */}
          {!resolvedTheme.logo && schema.settings?.headerImage && (
            <Box sx={{ mb: 2, display: 'inline-block' }}>
              <Box
                component="img"
                src={schema.settings.headerImage}
                alt="Header"
                sx={{ maxWidth: 200, maxHeight: 60, objectFit: 'contain' }}
              />
            </Box>
          )}

          {/* Form Title */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography
              variant="h4"
              gutterBottom
              fontWeight="bold"
              sx={{
                fontSize: schema.settings?.headerStyle?.fontSize,
                color: resolvedTheme.questionColor,
              }}
            >
              {schema.metadata.title || form.name}
            </Typography>
            {schema.metadata.description && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: schema.settings?.descriptionStyle?.fontSize }}
              >
                {schema.metadata.description}
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* Page Stepper */}
          {totalPages > 1 && (
            <Box sx={{ mb: 4 }}>
              <Stepper activeStep={currentPageIndex} alternativeLabel>
                {visiblePages.map((page, index) => (
                  <Step key={page.id}>
                    <StepLabel>{page.title || `${index + 1}`}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {/* Progress Bar */}
          {showProgressBar && (
            <ProgressTracker fields={inputFields} control={methods.control} watchValues={watchedValues} />
          )}

          {/* Form Fields */}
          <FormProvider {...methods}>
            <div>
              {currentPage && (
                <Box>
                  {totalPages > 1 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h5" gutterBottom sx={{ fontSize: schema.settings?.questionStyle?.fontSize }}>
                        {currentPage.title || `第 ${currentPageIndex + 1} 頁`}
                      </Typography>
                      {currentPage.description && (
                        <Typography variant="body2" color="text.secondary">
                          {currentPage.description}
                        </Typography>
                      )}
                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  )}

                  {currentPage.fields.map((field) => {
                    // Check field.visible + conditional visibility
                    if (!isFieldVisible(field, watchedValues)) return null;
                    return (
                      <Box key={field.id} sx={{ mb: 3 }}>
                        <FieldRenderer field={field} allFieldsRequired={allFieldsRequired} schema={schema} logoUrl={resolvedTheme.logo} />
                      </Box>
                    );
                  })}
                </Box>
              )}

              {/* Navigation Buttons */}
              <Box
                sx={{
                  mt: 4, pt: 3, borderTop: 1, borderColor: 'divider',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PrevIcon />}
                    onClick={handlePrevPage}
                    disabled={!canGoPrevious || submitting}
                    sx={{ visibility: isFirstPage ? 'hidden' : 'visible' }}
                  >
                    上一頁
                  </Button>
                </Box>

                {totalPages > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    {currentPageIndex + 1} / {totalPages}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  {allowDraft && onSaveDraft && (
                    <Button
                      variant="outlined"
                      startIcon={<SaveDraftIcon />}
                      onClick={handleSaveDraft}
                      disabled={submitting}
                    >
                      儲存草稿
                    </Button>
                  )}

                  {isLastPage ? (
                    <Button
                      variant="contained"
                      size="large"
                      disabled={submitting}
                      sx={{ minWidth: 120 }}
                      onClick={() => methods.handleSubmit(handleFormSubmit)()}
                    >
                      {submitting ? <CircularProgress size={24} /> : (schema.metadata.submitButtonText || '提交')}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      endIcon={<NextIcon />}
                      onClick={handleNextPage}
                      disabled={submitting}
                    >
                      下一頁
                    </Button>
                  )}
                </Box>
              </Box>
            </div>
          </FormProvider>
        </Paper>
      </Container>

      {/* Footer */}
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.disabled">
          由 Forma 表單系統提供
        </Typography>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default FormSubmitContent;

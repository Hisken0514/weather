/**
 * PublicFormSubmitPage - 公開表單填寫頁面（不需登入）
 */

import { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Container,
  Alert,
} from '@mui/material';
import { useParams } from 'react-router';
import { FormSubmitContent } from '@/components/form-submit';
import { formsApi } from '@/lib/api/forms';
import { submissionsApi } from '@/lib/api/submissions';
import { cacheForm, getCachedForm } from '@/lib/formCache';
import type { FormDto } from '@/types/api/forms';
import type { FormSchema } from '@/types/form';

export function PublicFormSubmitPage() {
  const { formId } = useParams<{ formId: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormDto | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isOfflineCached, setIsOfflineCached] = useState(false);

  useEffect(() => {
    if (formId) loadForm();
  }, [formId]);

  const loadForm = async () => {
    if (!formId) return;
    console.log('[LoadForm:Public] 開始載入表單', { formId, online: navigator.onLine });
    setLoading(true);
    setError(null);
    try {
      const formData = await formsApi.getPublicForm(formId);
      console.log('[LoadForm:Public] 表單載入成功', {
        formId: formData.id,
        name: formData.name,
        version: formData.version,
      });
      setForm(formData);

      // 快取表單供離線使用
      await cacheForm(formData);
      console.log('[LoadForm:Public] 表單已快取至 IndexedDB');

      try {
        setSchema(JSON.parse(formData.schema));
      } catch {
        setError('表單結構解析失敗');
      }
    } catch (err) {
      const errType = err?.constructor?.name ?? typeof err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[LoadForm:Public] 表單載入失敗', {
        type: errType,
        message: errMsg,
        online: navigator.onLine,
        stack: err instanceof Error ? err.stack : undefined,
      });

      // 離線時嘗試從 IndexedDB 載入快取
      const cached = await getCachedForm(formId);
      console.log('[LoadForm:Public] IndexedDB 快取查詢', { found: !!cached, formId });
      if (cached) {
        setForm(cached);
        setIsOfflineCached(true);
        console.log('[LoadForm:Public] 使用離線快取', { version: cached.version });
        try {
          setSchema(JSON.parse(cached.schema));
        } catch {
          setError('快取表單結構解析失敗');
        }
      } else {
        const isConnectError = !navigator.onLine || (err instanceof TypeError);
        setError(
          isConnectError
            ? '無法連線到伺服器（可能處於離線狀態或不在內網環境），且本機無此表單的快取資料。請先在可連線的環境下開啟此表單一次。'
            : '找不到表單或此表單不開放公開填寫',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!formId) return;
    setSubmitting(true);
    try {
      const result = await submissionsApi.createPublicSubmission(formId, {
        submissionData: JSON.stringify(data),
      }, form?.version);
      setSubmitted(true);
      if (result.offline) {
        setError(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'grey.100' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.100' }}>
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Box>
    );
  }

  if (!schema || !form) return null;

  return (
    <>
      {isOfflineCached && (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          目前使用離線快取的表單（版本 {form.version}），提交後將在恢復連線時自動同步。
        </Alert>
      )}
      <FormSubmitContent
        form={form}
        schema={schema}
        showAppBar={false}
        allowDraft={false}
        onSubmit={handleSubmit}
        submitting={submitting}
        submitted={submitted}
      />
    </>
  );
}

export default PublicFormSubmitPage;

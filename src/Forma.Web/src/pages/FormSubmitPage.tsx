/**
 * FormSubmitPage - 表單填寫頁面（需登入）
 */

import { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Container,
  Alert,
  Button,
} from '@mui/material';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { FormSubmitContent } from '@/components/form-submit';
import { formsApi } from '@/lib/api/forms';
import { submissionsApi } from '@/lib/api/submissions';
import { supervisionApi } from '@/lib/api/supervision';
import { cacheForm, getCachedForm } from '@/lib/formCache';
import type { FormDto } from '@/types/api/forms';
import type { FormSchema } from '@/types/form';

export function FormSubmitPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');
  const submissionId = searchParams.get('submissionId');
  const adminEdit = searchParams.get('adminEdit') === 'true';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormDto | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [defaultValues, setDefaultValues] = useState<Record<string, unknown> | undefined>(undefined);

  useEffect(() => {
    if (formId) loadForm();
  }, [formId]);

  const loadForm = async () => {
    if (!formId) return;
    console.log('[LoadForm] 開始載入表單', { formId, online: navigator.onLine });
    setLoading(true);
    setError(null);

    try {
      const formData = await formsApi.getForm(formId);
      console.log('[LoadForm] 表單載入成功', {
        formId: formData.id,
        name: formData.name,
        version: formData.version,
        isActive: formData.isActive,
        publishedAt: formData.publishedAt,
      });
      setForm(formData);

      // 快取表單供離線使用
      await cacheForm(formData);
      console.log('[LoadForm] 表單已快取至 IndexedDB');

      if (!formData.publishedAt) { setError('此表單尚未發布'); return; }
      if (!formData.isActive) { setError('此表單已停用'); return; }

      try {
        setSchema(JSON.parse(formData.schema));
      } catch {
        setError('表單結構解析失敗');
      }
    } catch (err) {
      const errType = err?.constructor?.name ?? typeof err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[LoadForm] 表單載入失敗', {
        type: errType,
        message: errMsg,
        online: navigator.onLine,
        stack: err instanceof Error ? err.stack : undefined,
      });

      // 離線時嘗試從 IndexedDB 載入快取
      const cached = await getCachedForm(formId);
      console.log('[LoadForm] IndexedDB 快取查詢', { found: !!cached, formId });
      if (cached) {
        setForm(cached);
        setIsOfflineCached(true);
        console.log('[LoadForm] 使用離線快取', { version: cached.version });
        try {
          setSchema(JSON.parse(cached.schema));
        } catch {
          setError('快取表單結構解析失敗');
        }
      } else {
        const msg = err instanceof Error ? err.message : '';
        const isConnectError = err instanceof TypeError || !navigator.onLine;
        setError(
          isConnectError
            ? '無法連線到伺服器（可能處於離線狀態或不在內網環境），且本機無此表單的快取資料。請先在可連線的環境下開啟此表單一次。'
            : msg || '載入表單失敗',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // 若有 submissionId，載入既有 submission 資料作為 defaultValues
  useEffect(() => {
    if (!submissionId) return;
    submissionsApi.getSubmission(submissionId).then(sub => {
      try {
        const parsed = JSON.parse(sub.submissionData);
        // submissionData 可能是 { data: {...}, formId: "..." } 或直接是資料
        setDefaultValues(parsed.data ?? parsed);
      } catch {
        // ignore parse errors
      }
    }).catch(() => {
      // submission not found, continue without defaults
    });
  }, [submissionId]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!formId) return;
    setSubmitting(true);
    try {
      let resultId: string | undefined;
      let isOffline = false;

      if (submissionId) {
        // 已有 submission → 更新
        await submissionsApi.updateSubmission(submissionId, {
          submissionData: JSON.stringify(data),
          status: 'Submitted',
        });
        resultId = submissionId;
      } else {
        // 全新建立
        const result = await submissionsApi.createSubmission({
          formId,
          submissionData: JSON.stringify(data),
          isDraft: false,
        }, form?.version);
        resultId = result.id;
        isOffline = !!result.offline;
      }

      // 若從督導任務進入，將 submissionId 回寫至 SupervisionTask
      if (taskId && resultId && !isOffline) {
        await supervisionApi.linkSubmission(taskId, resultId).catch(() => {
          // linkSubmission 失敗不阻斷填表完成
        });
      }

      setSubmitted(true);
      if (isOffline) {
        setError(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async (data: Record<string, unknown>) => {
    if (!formId) return;
    setSubmitting(true);
    try {
      if (submissionId) {
        await submissionsApi.updateSubmission(submissionId, {
          submissionData: JSON.stringify(data),
          status: 'Draft',
        });
      } else {
        const result = await submissionsApi.createSubmission({
          formId,
          submissionData: JSON.stringify(data),
          isDraft: true,
        }, form?.version);

        // 更新 URL，讓後續儲存草稿或正式送出能找到同一筆記錄
        const next = new URLSearchParams(searchParams);
        next.set('submissionId', result.id);
        setSearchParams(next, { replace: true });

        // 若從督導任務進入，回寫 submissionId 讓任務列表顯示填寫中狀態
        if (taskId && !result.offline) {
          await supervisionApi.linkSubmission(taskId, result.id).catch(() => {});
        }
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
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button variant="contained" onClick={() => navigate(-1)}>返回</Button>
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
      {adminEdit && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          您正以管理員身分修改此表單，原始填表人資料不會改變。請僅修正需要更正的欄位後送出。
        </Alert>
      )}
      <FormSubmitContent
        form={form}
        schema={schema}
        showAppBar
        allowDraft={!adminEdit}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onSaveDraft={adminEdit ? undefined : handleSaveDraft}
        onClose={() => navigate(-1)}
        submitting={submitting}
        submitted={submitted}
      />
    </>
  );
}

export default FormSubmitPage;

// 表單提交 API

import { apiClient } from './client';
import { saveOfflineSubmission } from '@/lib/offlineSubmission';
import { useNetworkStore } from '@/stores/networkStore';
import type {
  SubmissionDto,
  SubmissionListDto,
  CreateSubmissionRequest,
  UpdateSubmissionRequest,
  GetFormSubmissionsParams,
  PagedResult,
} from '@/types/api';

/**
 * 判斷是否應該走離線存檔：
 * - TypeError: 網路不通（Failed to fetch / NetworkError / Request timeout）
 * - HTTP 5xx: 伺服器異常
 * - HTTP 408: 請求逾時
 * 排除其他 4xx（權限、驗證錯誤等），這些是業務邏輯錯誤不該存本地。
 */
function shouldFallbackOffline(err: unknown): boolean {
  if (err instanceof TypeError) {
    return err.message === 'Failed to fetch'
      || err.message.includes('NetworkError')
      || err.message === 'Request timeout';
  }
  if (err instanceof Error) {
    const match = err.message.match(/^\[(\d+)\]/);
    if (match) {
      const status = parseInt(match[1], 10);
      return status >= 500 || status === 408;
    }
  }
  return !navigator.onLine;
}

export const submissionsApi = {
  // 提交表單（formVersion 用於離線快取時記錄版本）
  createSubmission: async (data: CreateSubmissionRequest, formVersion?: string): Promise<{ id: string; offline?: boolean }> => {
    console.log('[Submission] 開始提交', {
      formId: data.formId,
      formVersion,
      isDraft: data.isDraft,
      dataLength: data.submissionData.length,
      online: navigator.onLine,
    });

    try {
      const result = await apiClient.post<{ id: string }>('/submissions', data);
      console.log('[Submission] 提交成功', { id: result.id });
      return result;
    } catch (err) {
      const errType = err instanceof TypeError ? 'TypeError' : err instanceof Error ? 'Error' : typeof err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Submission] 提交失敗', {
        type: errType,
        message: errMsg,
        online: navigator.onLine,
        willFallback: shouldFallbackOffline(err),
      });

      if (shouldFallbackOffline(err)) {
        const localId = await saveOfflineSubmission(data.formId, formVersion ?? 'unknown', data.submissionData, false);
        console.log('[Submission] 已存入離線佇列', { localId, formId: data.formId });
        useNetworkStore.getState().refreshPendingCount();
        return { id: String(localId), offline: true };
      }
      throw err;
    }
  },

  // 取得提交詳情
  getSubmission: (id: string) =>
    apiClient.get<SubmissionDto>(`/submissions/${id}`),

  // 取得表單的所有提交
  getFormSubmissions: (formId: string, params?: GetFormSubmissionsParams) =>
    apiClient.get<PagedResult<SubmissionListDto>>(`/forms/${formId}/submissions`, params as Record<string, string | number | boolean | undefined>),

  // 更新提交
  updateSubmission: (id: string, data: UpdateSubmissionRequest) =>
    apiClient.put<SubmissionDto>(`/submissions/${id}`, data),

  // 記錄報告下載時間
  recordReportDownloaded: (id: string) =>
    apiClient.patch<void>(`/submissions/${id}/report-downloaded`),

  // 刪除提交
  deleteSubmission: (id: string) =>
    apiClient.delete<void>(`/submissions/${id}`),

  // 公開提交表單（不需登入）
  createPublicSubmission: async (formId: string, data: { submissionData: string }, formVersion?: string): Promise<{ id: string; offline?: boolean }> => {
    console.log('[Submission:Public] 開始提交', {
      formId,
      formVersion,
      dataLength: data.submissionData.length,
      online: navigator.onLine,
    });

    try {
      const result = await apiClient.postPublic<{ id: string }>(`/public/forms/${formId}/submissions`, data);
      console.log('[Submission:Public] 提交成功', { id: result.id });
      return result;
    } catch (err) {
      const errType = err instanceof TypeError ? 'TypeError' : err instanceof Error ? 'Error' : typeof err;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Submission:Public] 提交失敗', {
        type: errType,
        message: errMsg,
        online: navigator.onLine,
        willFallback: shouldFallbackOffline(err),
      });

      if (shouldFallbackOffline(err)) {
        const localId = await saveOfflineSubmission(formId, formVersion ?? 'unknown', data.submissionData, true);
        console.log('[Submission:Public] 已存入離線佇列', { localId, formId });
        useNetworkStore.getState().refreshPendingCount();
        return { id: String(localId), offline: true };
      }
      throw err;
    }
  },
};

export default submissionsApi;

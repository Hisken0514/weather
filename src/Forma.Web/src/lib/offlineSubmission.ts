import db, { type OfflineSubmission } from './db';
import { apiClient } from './api/client';

/** 判斷是否為網路層錯誤（伺服器不可達），不應標為 failed */
function isUnreachableError(err: unknown): boolean {
  if (err instanceof TypeError) {
    return err.message === 'Failed to fetch'
      || err.message.includes('NetworkError')
      || err.message === 'Request timeout';
  }
  return false;
}

export async function saveOfflineSubmission(
  formId: string,
  formVersion: string,
  submissionData: string,
  isPublic: boolean,
): Promise<number> {
  const localId = await db.offlineSubmissions.add({
    formId,
    formVersion,
    submissionData,
    isPublic,
    status: 'pending',
    createdAt: Date.now(),
  });
  return localId as number;
}

export async function getPendingSubmissions(): Promise<OfflineSubmission[]> {
  return db.offlineSubmissions.where('status').equals('pending').toArray();
}

export async function getPendingCount(): Promise<number> {
  return db.offlineSubmissions.where('status').anyOf('pending', 'failed', 'version_conflict').count();
}

export async function getConflictSubmissions(): Promise<OfflineSubmission[]> {
  return db.offlineSubmissions.where('status').equals('version_conflict').toArray();
}

/**
 * 先戳一下伺服器，確認真的連得到再開始同步。
 * 避免 online 事件觸發但內網 DNS 解析不到的情況。
 */
export async function checkServerReachable(): Promise<boolean> {
  try {
    // 用 HEAD 打一個輕量端點，只確認能連上，不在乎回應內容
    await fetch('/api/health', { method: 'HEAD', cache: 'no-store' });
    console.log('[Sync] 伺服器連線檢查：可達');
    return true;
  } catch {
    console.warn('[Sync] 伺服器連線檢查：不可達');
    return false;
  }
}

/**
 * 同步離線提交。
 * - 連線錯誤（TypeError）→ 保持 pending，下次自動重試
 * - 業務錯誤（4xx）→ 標為 failed
 * - 版本衝突 → 標為 version_conflict
 */
export async function syncOfflineSubmissions(force = false): Promise<number> {
  const pending = await getPendingSubmissions();
  if (pending.length === 0) return 0;

  console.log('[Sync] 開始同步', { count: pending.length, force });
  let synced = 0;

  // 批次取得各表單最新版本（去重）
  const formIds = [...new Set(pending.map((s) => s.formId))];
  const serverVersions: Record<string, string> = {};

  if (!force) {
    for (const fid of formIds) {
      try {
        const form = await apiClient.get<{ version: string }>(`/forms/${fid}`);
        serverVersions[fid] = form.version;
      } catch (err) {
        if (isUnreachableError(err)) {
          // 伺服器不可達，直接中止整個同步，保持 pending
          console.warn('[Sync] 版本檢查時伺服器不可達，中止同步');
          return 0;
        }
        // 其他錯誤（如 404），繼續讓提交嘗試，由伺服器決定
      }
    }
  }

  for (const sub of pending) {
    try {
      // 版本衝突檢測
      if (!force && serverVersions[sub.formId] && serverVersions[sub.formId] !== sub.formVersion) {
        console.warn('[Sync] 版本衝突', {
          localId: sub.localId,
          formId: sub.formId,
          localVersion: sub.formVersion,
          serverVersion: serverVersions[sub.formId],
        });
        await db.offlineSubmissions.update(sub.localId!, {
          status: 'version_conflict',
          error: `表單版本已從 ${sub.formVersion} 更新為 ${serverVersions[sub.formId]}`,
        });
        continue;
      }

      await db.offlineSubmissions.update(sub.localId!, { status: 'syncing' });

      if (sub.isPublic) {
        await apiClient.postPublic(`/public/forms/${sub.formId}/submissions`, {
          submissionData: sub.submissionData,
        });
      } else {
        await apiClient.post('/submissions', {
          formId: sub.formId,
          submissionData: sub.submissionData,
        });
      }

      console.log('[Sync] 同步成功', { localId: sub.localId, formId: sub.formId });
      await db.offlineSubmissions.update(sub.localId!, { status: 'synced' });
      synced++;
    } catch (err) {
      if (isUnreachableError(err)) {
        // 網路不通 → 退回 pending，下次重試
        console.warn('[Sync] 提交時伺服器不可達，退回 pending', { localId: sub.localId });
        await db.offlineSubmissions.update(sub.localId!, { status: 'pending' });
        // 後續的也不用嘗試了
        break;
      }
      // 業務錯誤 → 標為 failed
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[Sync] 提交失敗（業務錯誤）', { localId: sub.localId, error: errMsg });
      await db.offlineSubmissions.update(sub.localId!, {
        status: 'failed',
        error: errMsg,
      });
    }
  }

  console.log('[Sync] 同步結束', { synced, total: pending.length });
  return synced;
}

/** 強制送出版本衝突的提交 */
export async function forceSubmitConflicts(): Promise<number> {
  const conflicts = await getConflictSubmissions();
  for (const sub of conflicts) {
    await db.offlineSubmissions.update(sub.localId!, { status: 'pending' });
  }
  return syncOfflineSubmissions(true);
}

/** 丟棄版本衝突的提交 */
export async function discardConflicts(): Promise<void> {
  await db.offlineSubmissions.where('status').equals('version_conflict').delete();
}

export async function clearSyncedSubmissions(): Promise<void> {
  await db.offlineSubmissions.where('status').equals('synced').delete();
}

import { create } from 'zustand';
import {
  syncOfflineSubmissions,
  getPendingCount,
  getConflictSubmissions,
  clearSyncedSubmissions,
  checkServerReachable,
} from '@/lib/offlineSubmission';
import type { OfflineSubmission } from '@/lib/db';

/** 重試間隔（秒）：5s → 10s → 30s → 60s → 60s... */
const RETRY_DELAYS = [5, 10, 30, 60];

interface NetworkState {
  isOnline: boolean;
  isServerReachable: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  conflicts: OfflineSubmission[];
  lastSyncedAt: number | null;
  refreshPendingCount: () => Promise<void>;
  refreshConflicts: () => Promise<void>;
  sync: () => Promise<void>;
}

let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryAttempt = 0;

export const useNetworkStore = create<NetworkState>((set, get) => ({
  isOnline: navigator.onLine,
  isServerReachable: false,
  isSyncing: false,
  pendingCount: 0,
  conflictCount: 0,
  conflicts: [],
  lastSyncedAt: null,

  refreshPendingCount: async () => {
    const count = await getPendingCount();
    set({ pendingCount: count });
  },

  refreshConflicts: async () => {
    const conflicts = await getConflictSubmissions();
    set({ conflicts, conflictCount: conflicts.length });
  },

  sync: async () => {
    if (get().isSyncing || !get().isOnline) return;

    // 先確認伺服器真的可達
    const reachable = await checkServerReachable();
    set({ isServerReachable: reachable });
    if (!reachable) {
      console.warn('[NetworkStore] 伺服器不可達，排定重試', { attempt: retryAttempt });
      scheduleRetry();
      return;
    }

    // 伺服器可達，重設重試計數
    retryAttempt = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }

    set({ isSyncing: true });
    try {
      const synced = await syncOfflineSubmissions();
      await clearSyncedSubmissions();
      const count = await getPendingCount();
      const conflicts = await getConflictSubmissions();
      set({
        pendingCount: count,
        conflictCount: conflicts.length,
        conflicts,
        lastSyncedAt: synced > 0 ? Date.now() : get().lastSyncedAt,
      });
    } finally {
      set({ isSyncing: false });
    }
  },
}));

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  const delay = RETRY_DELAYS[Math.min(retryAttempt, RETRY_DELAYS.length - 1)] * 1000;
  retryAttempt++;
  console.log(`[NetworkStore] ${delay / 1000}s 後重試同步（第 ${retryAttempt} 次）`);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (useNetworkStore.getState().isOnline) {
      useNetworkStore.getState().sync();
    }
  }, delay);
}

// 初始化網路事件監聽
function initNetworkListeners() {
  window.addEventListener('online', () => {
    console.log('[NetworkStore] online 事件觸發');
    retryAttempt = 0;
    useNetworkStore.setState({ isOnline: true });
    useNetworkStore.getState().sync();
  });
  window.addEventListener('offline', () => {
    console.log('[NetworkStore] offline 事件觸發');
    useNetworkStore.setState({ isOnline: false, isServerReachable: false });
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  });
  // 啟動時檢查待同步數量
  useNetworkStore.getState().refreshPendingCount();
}

initNetworkListeners();

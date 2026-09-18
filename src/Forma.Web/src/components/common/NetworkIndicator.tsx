import { useEffect, useState } from 'react';
import { Alert, Button, Slide, Snackbar } from '@mui/material';
import { WifiOff, Sync, CloudDone, Warning } from '@mui/icons-material';
import { useNetworkStore } from '@/stores/networkStore';
import { forceSubmitConflicts, discardConflicts } from '@/lib/offlineSubmission';

export function NetworkIndicator() {
  const { isOnline, isSyncing, pendingCount, conflictCount, lastSyncedAt } = useNetworkStore();
  const [showSynced, setShowSynced] = useState(false);

  // 同步完成後短暫顯示綠色提示
  useEffect(() => {
    if (lastSyncedAt) {
      setShowSynced(true);
      const timer = setTimeout(() => setShowSynced(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncedAt]);

  const handleForceSubmit = async () => {
    await forceSubmitConflicts();
    useNetworkStore.getState().refreshPendingCount();
    useNetworkStore.getState().refreshConflicts();
  };

  const handleDiscard = async () => {
    await discardConflicts();
    useNetworkStore.getState().refreshPendingCount();
    useNetworkStore.getState().refreshConflicts();
  };

  return (
    <>
      {/* 離線提示 */}
      <Snackbar
        open={!isOnline}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert severity="error" icon={<WifiOff />} variant="filled" sx={{ width: '100%' }}>
          目前處於離線模式{pendingCount > 0 ? `（${pendingCount} 筆待同步）` : ''}
        </Alert>
      </Snackbar>

      {/* 同步中提示 */}
      <Snackbar
        open={isOnline && isSyncing}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert severity="warning" icon={<Sync />} variant="filled" sx={{ width: '100%' }}>
          正在同步離線資料...
        </Alert>
      </Snackbar>

      {/* 版本衝突提示 */}
      <Snackbar
        open={isOnline && !isSyncing && conflictCount > 0}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert
          severity="warning"
          icon={<Warning />}
          variant="filled"
          sx={{ width: '100%' }}
          action={
            <>
              <Button color="inherit" size="small" onClick={handleForceSubmit}>
                仍然送出
              </Button>
              <Button color="inherit" size="small" onClick={handleDiscard}>
                捨棄
              </Button>
            </>
          }
        >
          {conflictCount} 筆離線提交的表單版本已更新
        </Alert>
      </Snackbar>

      {/* 同步完成提示 */}
      <Snackbar
        open={isOnline && showSynced && !isSyncing && conflictCount === 0}
        autoHideDuration={3000}
        onClose={() => setShowSynced(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
      >
        <Alert severity="success" icon={<CloudDone />} variant="filled" sx={{ width: '100%' }}>
          離線資料已同步完成
        </Alert>
      </Snackbar>
    </>
  );
}

/**
 * FactoryReplyPublicPage - 工廠改善回覆公開連結頁面（不需登入）
 */

import { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Container, Alert, Typography, Stack } from '@mui/material';
import { useParams } from 'react-router';
import { FactoryReplyTaskForm } from '@/components/supervision-reply';
import { supervisionReplyApi } from '@/lib/api/supervisionReply';
import type { FactoryReplyPortalDto, UpsertFactoryReplyRequest } from '@/types/api/supervisionReply';

export function FactoryReplyPublicPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portal, setPortal] = useState<FactoryReplyPortalDto | null>(null);

  const loadPortal = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await supervisionReplyApi.getFactoryPortal(token);
      setPortal(data);
    } catch {
      setError('找不到此連結，請確認網址正確');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  const handleSaveTask = async (taskId: string, data: UpsertFactoryReplyRequest) => {
    if (!token) return;
    await supervisionReplyApi.upsertFactoryReply(token, taskId, data);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.100' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !portal) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="error">{error ?? '找不到此連結'}</Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Container maxWidth="md">
        <Stack spacing={0.5} sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700}>
            {portal.factoryName} — 督導改善回覆
          </Typography>
          {portal.factoryRegistrationNo && (
            <Typography variant="body2" color="text.secondary">
              登記編號：{portal.factoryRegistrationNo}
            </Typography>
          )}
        </Stack>

        {portal.tasks.length === 0 ? (
          <Alert severity="info">目前沒有需要回覆的督導項目</Alert>
        ) : (
          portal.tasks.map((task) => (
            <FactoryReplyTaskForm
              key={task.taskId}
              task={task}
              onSave={(data) => handleSaveTask(task.taskId, data)}
            />
          ))
        )}
      </Container>
    </Box>
  );
}

export default FactoryReplyPublicPage;

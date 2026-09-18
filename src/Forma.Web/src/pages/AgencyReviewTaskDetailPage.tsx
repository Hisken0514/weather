/**
 * AgencyReviewTaskDetailPage — 機關複查作業，單一任務填寫頁（從 AgencyReviewPage 列表點開）
 */
import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Stack } from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router';
import { MainLayout } from '@/components/layout';
import { AgencyReviewTaskForm } from '@/components/supervision-reply';
import { supervisionReplyApi } from '@/lib/api/supervisionReply';
import type { AgencyReviewTaskDto, UpsertAgencyReviewRequest } from '@/types/api/supervisionReply';

export function AgencyReviewTaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<AgencyReviewTaskDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTask = useCallback(() => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    supervisionReplyApi.getMyAgencyReviewForTask(taskId)
      .then(res => { setTask(res); })
      .catch(() => setError('找不到此任務，或您沒有權限查看'))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => { loadTask(); }, [loadTask]);

  const handleSave = async (data: UpsertAgencyReviewRequest) => {
    if (!taskId) return;
    await supervisionReplyApi.upsertMyAgencyReview(taskId, data);
  };

  return (
    <MainLayout title="機關複查作業">
      <Button startIcon={<BackIcon />} onClick={() => navigate('/agency-review')} sx={{ mb: 2 }}>
        返回列表
      </Button>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && task && (
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight="bold">
            {task.factoryName}
            {task.factoryRegistrationNo && (
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                （登記編號：{task.factoryRegistrationNo}）
              </Typography>
            )}
          </Typography>
          <AgencyReviewTaskForm task={task} showAgencyName hideReviewerInfo onSave={handleSave} />
        </Stack>
      )}
    </MainLayout>
  );
}

export default AgencyReviewTaskDetailPage;

/**
 * AgencyReviewFactoryTasksPage — 機關複查作業，單一工廠的任務明細
 * 從 AgencyReviewPage（依工廠分組的清單）點進來，顯示這家工廠每一筆任務各自的
 * 工廠回覆/機關複查狀態、填寫人、填寫時間。
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Typography, Chip, Alert, Button,
  Table, TableHead, TableRow, TableCell, TableBody, Skeleton, TablePagination,
} from '@mui/material';
import { ArrowBack as BackIcon, OpenInNew as OpenIcon } from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { MainLayout } from '@/components/layout';
import { supervisionReplyApi } from '@/lib/api/supervisionReply';
import type { PagedAgencyReviewTasksResponse } from '@/types/api/supervisionReply';

export function AgencyReviewFactoryTasksPage() {
  const { factoryId } = useParams<{ factoryId: string }>();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaignId') ?? '';
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [data, setData] = useState<PagedAgencyReviewTasksResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(() => {
    if (!campaignId || !factoryId) return;
    setLoading(true);
    supervisionReplyApi.getMyAgencyReviewTasks(campaignId, {
      page: page + 1,
      pageSize: rowsPerPage,
      factoryId,
    })
      .then(res => { setData(res); })
      .finally(() => setLoading(false));
  }, [campaignId, factoryId, page, rowsPerPage]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const tasks = data?.items ?? [];
  const totalRows = data?.total ?? 0;
  const factoryName = tasks[0]?.factoryName ?? '';
  const factoryRegistrationNo = tasks[0]?.factoryRegistrationNo ?? null;

  return (
    <MainLayout title="機關複查作業">
      <Button startIcon={<BackIcon />} onClick={() => navigate('/agency-review')} sx={{ mb: 2 }}>
        返回工廠清單
      </Button>

      <Typography variant="h5" fontWeight="bold" mb={0.5}>
        {factoryName || '工廠任務明細'}
        {factoryRegistrationNo && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            （登記編號：{factoryRegistrationNo}）
          </Typography>
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        這家工廠在此年度計畫下的每一筆督導任務
      </Typography>

      {!campaignId ? (
        <Alert severity="error">網址缺少年度計畫參數，請從「機關複查作業」清單點進來</Alert>
      ) : !loading && tasks.length === 0 ? (
        <Alert severity="info">找不到這家工廠的任務，或您沒有權限查看</Alert>
      ) : (
        <>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>機關</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>表單類型</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>督導完成日期</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>工廠回覆</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>工廠填寫時間</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>機關複查</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>複查填寫人</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>複查填寫時間</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9}><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : (
                tasks.map((task) => (
                  <TableRow key={task.taskId} hover>
                    <TableCell>{task.agencyName}</TableCell>
                    <TableCell>{task.formTypeName}</TableCell>
                    <TableCell>{task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={task.factoryReplySubmittedAt ? '已回覆' : '未回覆'}
                        color={task.factoryReplySubmittedAt ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {task.factoryReplySubmittedAt
                        ? new Date(task.factoryReplySubmittedAt).toLocaleString('zh-TW', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.needsReReview ? '需重新複查' : task.submittedAt ? '已複查' : '未複查'}
                        color={task.needsReReview ? 'warning' : task.submittedAt ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{task.reviewerName ?? '—'}</TableCell>
                    <TableCell>
                      {task.submittedAt
                        ? new Date(task.submittedAt).toLocaleString('zh-TW', {
                            year: 'numeric', month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<OpenIcon fontSize="small" />}
                        onClick={() => navigate(`/agency-review/tasks/${task.taskId}`)}
                      >
                        開啟
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <TablePagination
            component="div"
            count={totalRows}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[25, 50, 100, 200]}
            labelRowsPerPage="每頁筆數"
            labelDisplayedRows={({ from, to, count }) => `第 ${from}–${to} 筆，共 ${count} 筆`}
          />
        </>
      )}
    </MainLayout>
  );
}

export default AgencyReviewFactoryTasksPage;

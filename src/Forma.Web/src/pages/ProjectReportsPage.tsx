/**
 * ProjectReportsPage - 計畫報表統計頁面
 * 顯示計畫和表單的統計數據
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Description as FormIcon,
  People as PeopleIcon,
  CheckCircle,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router';
import { MainLayout } from '@/components/layout';
import { formsApi } from '@/lib/api/forms';
import { reportsApi } from '@/lib/api/reports';
import { projectsApi } from '@/lib/api/projects';
import type { FormListDto } from '@/types/api/forms';
import type { ReportDto, FieldSummary } from '@/types/api/reports';
import type { ProjectDto } from '@/types/api/projects';

// Stat card component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color = 'primary.main', subtitle }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ color }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.8 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Simple bar chart component
interface BarChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
  height?: number;
}

function SimpleBarChart({ data, maxValue, height = 200 }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <Box sx={{ height, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
      {data.map((item, index) => (
        <Box
          key={index}
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            {item.value}
          </Typography>
          <Box
            sx={{
              width: '100%',
              maxWidth: 40,
              height: `${(item.value / max) * (height - 40)}px`,
              minHeight: 4,
              bgcolor: 'primary.main',
              borderRadius: '4px 4px 0 0',
              transition: 'height 0.3s ease',
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, fontSize: '0.65rem', textAlign: 'center' }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// Field distribution component
function FieldDistribution({ field }: { field: FieldSummary }) {
  if (!field.valueDistribution || Object.keys(field.valueDistribution).length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        無分佈資料
      </Typography>
    );
  }

  const total = Object.values(field.valueDistribution).reduce((a, b) => a + b, 0);
  const sortedEntries = Object.entries(field.valueDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Show top 10

  return (
    <Box>
      {sortedEntries.map(([value, count]) => {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        return (
          <Box key={value} sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" noWrap sx={{ maxWidth: '60%' }}>
                {value || '(空白)'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {count} ({percentage.toFixed(1)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

export function ProjectReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [forms, setForms] = useState<FormListDto[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [report, setReport] = useState<ReportDto | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Load project and forms
  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  // Load report when form is selected
  useEffect(() => {
    if (selectedFormId) {
      loadFormReport();
    } else {
      setReport(null);
    }
  }, [selectedFormId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const [projectData, formsData] = await Promise.all([
        projectsApi.getProject(projectId),
        formsApi.getProjectForms(projectId),
      ]);

      setProject(projectData);
      setForms(formsData.items || []);

      // Auto-select first published form
      const publishedForms = (formsData.items || []).filter(f => f.isPublished);
      if (publishedForms.length > 0) {
        setSelectedFormId(publishedForms[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadFormReport = async () => {
    if (!selectedFormId) return;

    setReportLoading(true);

    try {
      const reportData = await reportsApi.getFormReport(selectedFormId);
      setReport(reportData);
    } catch (err) {
      console.error('Failed to load report:', err);
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  };

  // Calculate project totals
  const projectStats = {
    totalForms: forms.length,
    publishedForms: forms.filter(f => f.isPublished).length,
    totalSubmissions: forms.reduce((sum, f) => sum + f.submissionCount, 0),
  };

  // Prepare daily stats for chart
  const getDailyChartData = () => {
    if (!report?.dailyStats || report.dailyStats.length === 0) {
      return [];
    }

    // Get last 14 days
    const last14Days = report.dailyStats.slice(-14);
    return last14Days.map(stat => ({
      label: new Date(stat.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
      value: stat.count,
    }));
  };

  if (loading) {
    return (
      <MainLayout title="報表統計">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="報表統計">
        <Alert severity="error">{error}</Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`${project?.name || '計畫'} - 報表統計`}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        報表統計
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {project?.name} 的統計數據和分析
      </Typography>

      {/* Project Overview */}
      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        計畫概覽
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="表單總數"
            value={projectStats.totalForms}
            icon={<FormIcon sx={{ fontSize: 40 }} />}
            color="primary.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="已發布"
            value={projectStats.publishedForms}
            icon={<CheckCircle sx={{ fontSize: 40 }} />}
            color="success.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="總提交數"
            value={projectStats.totalSubmissions}
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
            color="info.main"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="成員數"
            value={project?.memberCount || 0}
            icon={<PeopleIcon sx={{ fontSize: 40 }} />}
            color="secondary.main"
          />
        </Grid>
      </Grid>

      {/* Forms Table */}
      <Typography variant="h6" gutterBottom>
        表單統計
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>表單名稱</TableCell>
              <TableCell>版本</TableCell>
              <TableCell>狀態</TableCell>
              <TableCell align="right">提交數</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">尚無表單</Typography>
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => (
                <TableRow
                  key={form.id}
                  hover
                  selected={form.id === selectedFormId}
                  onClick={() => form.isPublished && setSelectedFormId(form.id)}
                  sx={{ cursor: form.isPublished ? 'pointer' : 'default' }}
                >
                  <TableCell>
                    <Typography fontWeight={form.id === selectedFormId ? 'bold' : 'normal'}>
                      {form.name}
                    </Typography>
                  </TableCell>
                  <TableCell>{form.version}</TableCell>
                  <TableCell>
                    <Chip
                      label={form.isPublished ? '已發布' : '草稿'}
                      size="small"
                      color={form.isPublished ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">{form.submissionCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>選擇表單查看詳細報表</InputLabel>
          <Select
            value={selectedFormId}
            label="選擇表單查看詳細報表"
            onChange={(e) => setSelectedFormId(e.target.value)}
          >
            <MenuItem value="">
              <em>請選擇表單</em>
            </MenuItem>
            {forms.filter(f => f.isPublished).map((form) => (
              <MenuItem key={form.id} value={form.id}>
                {form.name} ({form.submissionCount} 筆提交)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Form Report */}
      {selectedFormId && (
        <>
          <Divider sx={{ my: 3 }} />

          {reportLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : report ? (
            <>
              <Typography variant="h6" gutterBottom>
                {report.formName} - 詳細統計
              </Typography>

              {/* Form Stats */}
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    title="總提交"
                    value={report.totalSubmissions}
                    icon={<TrendingIcon sx={{ fontSize: 32 }} />}
                    color="primary.main"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    title="已提交"
                    value={report.submittedCount}
                    icon={<CheckCircle sx={{ fontSize: 32 }} />}
                    color="success.main"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    title="草稿"
                    value={report.draftCount}
                    icon={<PendingIcon sx={{ fontSize: 32 }} />}
                    color="warning.main"
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <StatCard
                    title="已拒絕"
                    value={report.rejectedCount}
                    icon={<RejectedIcon sx={{ fontSize: 32 }} />}
                    color="error.main"
                  />
                </Grid>
              </Grid>

              {/* Time info */}
              {(report.firstSubmissionAt || report.lastSubmissionAt) && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Grid container spacing={2}>
                    {report.firstSubmissionAt && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          首次提交時間
                        </Typography>
                        <Typography>
                          {new Date(report.firstSubmissionAt).toLocaleString('zh-TW')}
                        </Typography>
                      </Grid>
                    )}
                    {report.lastSubmissionAt && (
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          最後提交時間
                        </Typography>
                        <Typography>
                          {new Date(report.lastSubmissionAt).toLocaleString('zh-TW')}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Daily Chart */}
              {report.dailyStats && report.dailyStats.length > 0 && (
                <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    每日提交趨勢（近 14 天）
                  </Typography>
                  <SimpleBarChart data={getDailyChartData()} height={180} />
                </Paper>
              )}

              {/* Field Summaries */}
              {report.fieldSummaries && report.fieldSummaries.length > 0 && (
                <>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    欄位統計
                  </Typography>
                  <Grid container spacing={3}>
                    {report.fieldSummaries
                      .filter(f => f.valueDistribution && Object.keys(f.valueDistribution).length > 0)
                      .map((field, index) => (
                        <Grid size={{ xs: 12, md: 6 }} key={index}>
                          <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                              {field.fieldName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                              {field.responseCount} 筆回應 · {field.fieldType}
                            </Typography>
                            <FieldDistribution field={field} />
                          </Paper>
                        </Grid>
                      ))}
                  </Grid>
                </>
              )}

              {report.totalSubmissions === 0 && (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    此表單尚無提交資料
                  </Typography>
                </Paper>
              )}
            </>
          ) : (
            <Alert severity="info">
              無法載入報表資料
            </Alert>
          )}
        </>
      )}

      {forms.filter(f => f.isPublished).length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            此計畫尚無已發布的表單，發布表單後即可查看統計資料
          </Typography>
        </Paper>
      )}
    </MainLayout>
  );
}

export default ProjectReportsPage;

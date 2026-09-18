/**
 * DashboardPage - 儀表板頁面
 * 顯示使用者的統計資料、待辦事項、最近活動等
 */

import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  Skeleton,
  Alert,
  Button,
  Divider,
} from '@mui/material';
import {
  Folder as ProjectIcon,
  Description as FormIcon,
  Inbox as SubmissionIcon,
  RateReview as ReviewIcon,
  ArrowForward as ArrowIcon,
  Add as AddIcon,
  Assignment as TaskIcon,
  History as ActivityIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { MainLayout } from '@/components/layout';
import { useAuthStore } from '@/stores/authStore';
import { dashboardApi } from '@/lib/api/dashboard';
import type {
  DashboardSummaryDto,
  PendingTaskDto,
  RecentActivityDto,
} from '@/types/api/dashboard';

// 統計卡片組件
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
  trend?: number;
  onClick?: () => void;
}

function StatCard({ title, value, icon, color, subtitle, trend, onClick }: StatCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        } : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value.toLocaleString()}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                {trend >= 0 ? (
                  <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main', mr: 0.5 }} />
                )}
                <Typography
                  variant="caption"
                  color={trend >= 0 ? 'success.main' : 'error.main'}
                >
                  {trend >= 0 ? '+' : ''}{trend}% 較上月
                </Typography>
              </Box>
            )}
          </Box>
          <Avatar
            sx={{
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              width: 48,
              height: 48,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// 載入骨架屏
function DashboardSkeleton() {
  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[1, 2, 3, 4].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
            <Skeleton variant="rounded" height={140} />
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Skeleton variant="rounded" height={400} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={400} />
        </Grid>
      </Grid>
    </Box>
  );
}

// 格式化時間
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '剛剛';
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString('zh-TW');
}

// 取得任務優先級顏色
function getPriorityColor(priority: string): 'error' | 'warning' | 'info' | 'default' {
  switch (priority.toLowerCase()) {
    case 'high':
    case '高':
      return 'error';
    case 'medium':
    case '中':
      return 'warning';
    case 'low':
    case '低':
      return 'info';
    default:
      return 'default';
  }
}

// 取得活動類型圖示
function getActivityIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'submission':
    case 'submit':
      return <SubmissionIcon fontSize="small" />;
    case 'review':
    case 'approve':
    case 'reject':
      return <ReviewIcon fontSize="small" />;
    case 'form':
    case 'form_created':
    case 'form_published':
      return <FormIcon fontSize="small" />;
    case 'project':
      return <ProjectIcon fontSize="small" />;
    default:
      return <ActivityIcon fontSize="small" />;
  }
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTaskDto[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivityDto[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 並行載入所有資料
      const [summaryData, tasksData, activitiesData] = await Promise.all([
        dashboardApi.getSummary(),
        dashboardApi.getPendingTasks(10),
        dashboardApi.getRecentActivities(10),
      ]);

      setSummary(summaryData);
      setPendingTasks(tasksData);
      setRecentActivities(activitiesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入失敗';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="儀表板">
        <DashboardSkeleton />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="儀表板">
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={loadDashboardData}>
              重試
            </Button>
          }
        >
          {error}
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="儀表板">
      {/* Welcome Message */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          歡迎回來，{user?.username}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          這是您的個人儀表板，快速檢視所有計畫的狀態。
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="參與計畫"
            value={summary?.totalProjects ?? 0}
            subtitle={`${summary?.activeProjects ?? 0} 個進行中`}
            icon={<ProjectIcon />}
            color="primary"
            onClick={() => navigate('/projects')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="表單總數"
            value={summary?.totalForms ?? 0}
            subtitle={`${summary?.publishedForms ?? 0} 個已發布`}
            icon={<FormIcon />}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="提交總數"
            value={summary?.totalSubmissions ?? 0}
            icon={<SubmissionIcon />}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="待審核"
            value={summary?.pendingReviewCount ?? 0}
            icon={<ReviewIcon />}
            color="warning"
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Projects */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardHeader
              title="最近計畫"
              action={
                <Button
                  endIcon={<ArrowIcon />}
                  onClick={() => navigate('/projects')}
                >
                  查看全部
                </Button>
              }
            />
            <Divider />
            {summary?.recentProjects && summary.recentProjects.length > 0 ? (
              <List disablePadding>
                {summary.recentProjects.map((project, index) => (
                  <ListItem
                    key={project.id}
                    divider={index < summary.recentProjects.length - 1}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                        <ProjectIcon />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={project.name}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {project.organizationName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.formCount} 個表單
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip
                          label={project.role}
                          size="small"
                          variant="outlined"
                          sx={{ mb: 0.5 }}
                        />
                        {project.pendingSubmissions > 0 && (
                          <Typography variant="caption" color="warning.main" display="block">
                            {project.pendingSubmissions} 待審核
                          </Typography>
                        )}
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary" gutterBottom>
                  尚無計畫
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/projects/new')}
                  sx={{ mt: 1 }}
                >
                  建立計畫
                </Button>
              </Box>
            )}
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Pending Tasks */}
          <Card sx={{ mb: 3 }}>
            <CardHeader
              title="待辦事項"
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<TaskIcon color="warning" />}
            />
            <Divider />
            {pendingTasks.length > 0 ? (
              <List dense disablePadding>
                {pendingTasks.slice(0, 5).map((task, index) => (
                  <ListItem
                    key={index}
                    divider={index < Math.min(pendingTasks.length, 5) - 1}
                    sx={{ py: 1.5 }}
                  >
                    <ListItemText
                      primary={task.title}
                      secondary={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {task.projectName}
                          </Typography>
                          <Chip
                            label={task.priority}
                            size="small"
                            color={getPriorityColor(task.priority)}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  沒有待辦事項
                </Typography>
              </Box>
            )}
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader
              title="最近活動"
              titleTypographyProps={{ variant: 'h6' }}
              avatar={<ActivityIcon color="info" />}
            />
            <Divider />
            {recentActivities.length > 0 ? (
              <List dense disablePadding>
                {recentActivities.slice(0, 5).map((activity, index) => (
                  <ListItem
                    key={index}
                    divider={index < Math.min(recentActivities.length, 5) - 1}
                    sx={{ py: 1.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'grey.200' }}>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.description}
                      secondary={formatTimeAgo(activity.occurredAt)}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  沒有最近活動
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </MainLayout>
  );
}

export default DashboardPage;

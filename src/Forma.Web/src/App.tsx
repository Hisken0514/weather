import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { FormPreviewPage } from './pages/FormPreviewPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { FormEditorPage } from './pages/FormEditorPage';
import { FormSubmitPage } from './pages/FormSubmitPage';
import { FormSubmissionsPage } from './pages/FormSubmissionsPage';
import { ProjectReportsPage } from './pages/ProjectReportsPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SystemSettingsPage } from './pages/SystemSettingsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SupervisionAdminPage } from './pages/SupervisionAdminPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { SupervisionStatsPage } from './pages/SupervisionStatsPage';
import { AgencyReviewPage } from './pages/AgencyReviewPage';
import { AgencyReviewFactoryTasksPage } from './pages/AgencyReviewFactoryTasksPage';
import { AgencyReviewTaskDetailPage } from './pages/AgencyReviewTaskDetailPage';
import { FactoryReplyPublicPage } from './pages/FactoryReplyPublicPage';
import { AgencyReviewPublicPage } from './pages/AgencyReviewPublicPage';
import { HazmatMapPage } from './pages/HazmatMapPage';
import { RiskScoringPage } from './pages/RiskScoringPage';
import { FactoryRiskRankingPage } from './pages/FactoryRiskRankingPage';
import { FactoryRiskDataPage } from './pages/FactoryRiskDataPage';
import { ProtectedRoute } from './components/auth';
import { AppInitializer } from './components/AppInitializer';
import { NetworkIndicator } from './components/common/NetworkIndicator';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#4062BB' },
    secondary: { main: '#28B5AD' },
  },
  typography: {
    fontFamily: [
      '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
      '"Helvetica Neue"', 'Arial', 'sans-serif',
    ].join(','),
  },
});

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NetworkIndicator />
      <BrowserRouter basename={routerBasename}>
        <AppInitializer>
          <Routes>
            {/* 根路由 → 督導清單 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/my-tasks" replace />
                </ProtectedRoute>
              }
            />

            {/* ── 督導 ─────────────────────────────── */}

            {/* 我的督導任務（機關使用者） */}
            <Route
              path="/my-tasks"
              element={
                <ProtectedRoute>
                  <MyTasksPage />
                </ProtectedRoute>
              }
            />

            {/* 督導管理（Admin） */}
            <Route
              path="/supervision"
              element={
                <ProtectedRoute requireAdmin>
                  <SupervisionAdminPage />
                </ProtectedRoute>
              }
            />

            {/* 督導成效統計（Admin） */}
            <Route
              path="/supervision-stats"
              element={
                <ProtectedRoute requireAdmin>
                  <SupervisionStatsPage />
                </ProtectedRoute>
              }
            />

            {/* 機關複查作業（登入版，與公開連結資料相同） */}
            <Route
              path="/agency-review"
              element={
                <ProtectedRoute>
                  <AgencyReviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency-review/factory/:factoryId"
              element={
                <ProtectedRoute>
                  <AgencyReviewFactoryTasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agency-review/tasks/:taskId"
              element={
                <ProtectedRoute>
                  <AgencyReviewTaskDetailPage />
                </ProtectedRoute>
              }
            />

            {/* 公開：工廠改善回覆（不需登入） */}
            <Route path="/public/factory-reply/:token" element={<FactoryReplyPublicPage />} />

            {/* 公開：機關複查登打（不需登入） */}
            <Route path="/public/agency-review/:token" element={<AgencyReviewPublicPage />} />

            {/* ── 表單 ─────────────────────────────── */}

            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId"
              element={
                <ProtectedRoute>
                  <ProjectDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/forms/new"
              element={
                <ProtectedRoute>
                  <FormEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/forms/:formId/edit"
              element={
                <ProtectedRoute>
                  <FormEditorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/forms/:formId/preview"
              element={
                <ProtectedRoute>
                  <FormPreviewPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects/:projectId/reports"
              element={
                <ProtectedRoute>
                  <ProjectReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:formId/submit"
              element={
                <ProtectedRoute>
                  <FormSubmitPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forms/:formId/submissions"
              element={
                <ProtectedRoute>
                  <FormSubmissionsPage />
                </ProtectedRoute>
              }
            />

            {/* 危險品風險分級地圖（Admin） */}
            <Route
              path="/hazmat-map"
              element={
                <ProtectedRoute requireAdmin>
                  <HazmatMapPage />
                </ProtectedRoute>
              }
            />

            {/* 危險品風險評分標準管理（Admin） */}
            <Route
              path="/risk-scoring"
              element={
                <ProtectedRoute requireAdmin>
                  <RiskScoringPage />
                </ProtectedRoute>
              }
            />

            {/* 全台工廠風險排名（Admin） */}
            <Route
              path="/factory-risk-ranking"
              element={
                <ProtectedRoute requireAdmin>
                  <FactoryRiskRankingPage />
                </ProtectedRoute>
              }
            />

            {/* 工廠原始資料維護（Admin） */}
            <Route
              path="/factory-risk-data"
              element={
                <ProtectedRoute requireAdmin>
                  <FactoryRiskDataPage />
                </ProtectedRoute>
              }
            />

            {/* ── 設定 ─────────────────────────────── */}

            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-settings"
              element={
                <ProtectedRoute requireAdmin>
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AppInitializer>
      </BrowserRouter>
    </ThemeProvider>
  );
}

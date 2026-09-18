/**
 * ProtectedRoute - 路由保護組件
 * 未登入使用者導向登入頁；requireAdmin 時非 admin 導向首頁
 */

import { useEffect } from 'react';
import { Navigate } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const KPI_LOGIN_URL = `${import.meta.env.VITE_KPI_URL || '/iskpi'}/login`;

export function ProtectedRoute({ children, requireAdmin }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const isAdmin = user ? (BigInt(user.permissions ?? 0) & 7n) === 7n : false;

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      window.location.href = KPI_LOGIN_URL;
    }
  }, [isInitializing, isAuthenticated]);

  // SSO cookie 驗證中，先顯示 loading
  if (isInitializing) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) return null;
  if (requireAdmin && !isAdmin) return <Navigate to="/my-tasks" replace />;

  return <>{children}</>;
}

export default ProtectedRoute;

/**
 * AppInitializer - 應用程式初始化組件
 * 負責檢查系統狀態並決定路由
 */

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Box, CircularProgress, Typography } from '@mui/material';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';

interface SystemStatus {
  isInitialized: boolean;
  version: string;
  isLoading: boolean;
  error: string | null;
}

const SystemStatusContext = createContext<SystemStatus>({
  isInitialized: true,
  version: '',
  isLoading: true,
  error: null,
});

export const useSystemStatus = () => useContext(SystemStatusContext);

interface AppInitializerProps {
  children: ReactNode;
}

export function AppInitializer({ children }: AppInitializerProps) {
  const location = useLocation();
  const initializeAuth = useAuthStore(s => s.initializeAuth);
  const [status, setStatus] = useState<SystemStatus>({
    isInitialized: true,
    version: '',
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // 系統狀態檢查 + SSO cookie 驗證同步進行，都完成才結束 loading
    const init = async () => {
      await Promise.all([checkSystemStatus(), initializeAuth()]);
    };
    init();
  }, []);

  useEffect(() => {
    // SSO 整合後由 KPI 負責身份驗證，不需要 setup 流程
    if (!status.isLoading && !status.error) {
      if (location.pathname === '/setup') {
        window.location.href = `${import.meta.env.VITE_KPI_URL || '/iskpi'}/login`;
      }
    }
  }, [status.isLoading, location.pathname]);

  const checkSystemStatus = async () => {
    try {
      const result = await authApi.getSystemStatus();
      setStatus({
        isInitialized: result.isInitialized,
        version: result.version,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      // API 錯誤時假設系統已初始化（避免阻擋用戶）
      console.error('Failed to check system status:', err);
      setStatus({
        isInitialized: true,
        version: '',
        isLoading: false,
        error: null,
      });
    }
  };

  // 顯示載入畫面
  if (status.isLoading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">載入中...</Typography>
      </Box>
    );
  }

  return (
    <SystemStatusContext.Provider value={status}>
      {children}
    </SystemStatusContext.Provider>
  );
}

export default AppInitializer;

/**
 * Auth Store - 認證狀態管理
 * 使用 Zustand 管理登入狀態和使用者資訊
 * Token 由後端 HTTP-only Cookie 管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api/auth';
import type { UserDto, LoginRequest, RegisterRequest, AuthResponseDto } from '@/types/api';

interface AuthState {
  // 狀態
  user: UserDto | null;
  isAuthenticated: boolean;
  isInitializing: boolean; // SSO cookie 初始化驗證中
  isLoading: boolean;
  error: string | null;

  // 動作
  login: (data: LoginRequest) => Promise<void>;
  loginWithFido2Response: (response: AuthResponseDto) => void;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  initializeAuth: () => Promise<void>; // 從 KPI cookie 初始化 SSO 身份
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始狀態
      user: null,
      isAuthenticated: false,
      isInitializing: true, // 每次頁面載入都需重新驗證
      isLoading: false,
      error: null,

      // 登入
      login: async (data: LoginRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(data);

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : '登入失敗';
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      // FIDO2 登入完成後設定狀態
      loginWithFido2Response: (response: AuthResponseDto) => {
        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      },

      // 註冊
      register: async (data: RegisterRequest) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : '註冊失敗';
          set({
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // 忽略登出 API 錯誤
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      // 刷新 Token
      refreshAccessToken: async () => {
        try {
          const response = await authApi.refreshToken();
          set({
            user: response.user,
          });
          return true;
        } catch {
          set({
            user: null,
            isAuthenticated: false,
          });
          return false;
        }
      },

      // 從 KPI SSO cookie 初始化身份（頁面初次載入時呼叫）
      // 使用 raw fetch 繞過 apiClient 的 401 自動 redirect 行為
      initializeAuth: async () => {
        const { isAuthenticated } = get();
        if (isAuthenticated) {
          // localStorage 已有登入狀態，不需再打 API
          set({ isInitializing: false });
          return;
        }
        try {
          const base = import.meta.env.VITE_API_BASE_URL || '/api';
          const res = await fetch(`${base}/auth/profile`, {
            credentials: 'include',
          });
          if (res.ok) {
            const profile = await res.json();
            set({
              user: {
                id: profile.id,
                username: profile.username,
                email: profile.email,
                roleName: profile.roleName,
                permissions: profile.permissions ?? 0,
                department: profile.department,
                jobTitle: profile.jobTitle,
                isActive: profile.isActive,
              },
              isAuthenticated: true,
              isInitializing: false,
            });
          } else {
            // 401/403/404 → 未認證，讓 ProtectedRoute redirect 到 KPI 登入
            set({ isInitializing: false });
          }
        } catch {
          set({ isInitializing: false });
        }
      },

      // 清除錯誤
      clearError: () => set({ error: null }),

      // 設定載入狀態
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;

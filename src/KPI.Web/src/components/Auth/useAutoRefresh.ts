'use client'

import { useEffect, useRef, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

import {useauthStore} from "@/Stores/authStore";
import getAuthtoken, {clearAuthCookies, getrefreshToken} from "@/services/serverAuthService";
import api from "@/services/apiService";
/**
 * 自動刷新 Token 的 Hook
 *
 * 此 Hook 會根據 JWT 的過期時間，於過期前 5 分鐘自動觸發刷新請求，並更新 access/refresh token。
 * 若 token 即將過期或已過期，則立即觸發刷新邏輯。
 * 此 Hook 依賴全域登入狀態 `isLoggedIn` 來判斷是否執行刷新邏輯。
 *
 * @returns {Object} 返回包含手動觸發 refresh 的方法 `{ refreshToken }`
 */
export function useAutoRefresh() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { isLoggedIn } = useauthStore();

  /**
   * 清除目前已註冊的 Token 刷新定時器。
   */
  const clearRefreshTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * 保持最新的 refreshToken 方法參考，避免 useEffect 閉包問題。
   */
  const refreshTokenRef = useRef<() => Promise<boolean>>(async () => false);

  /**
   * 根據目前取得的 access token 設定下一次刷新定時器。
   * 若 access token 快要過期或已過期，則立即觸發刷新。
   */
  const setupRefreshTimer = useCallback(async () => {
    clearRefreshTimer();
    if (!isLoggedIn) return;

    try {
      const token = await getAuthtoken();
      if (!token) {
        console.error("無法獲取 Token，無法設置刷新定時器");
        return;
      }

      const decoded = jwtDecode(token.value);
      if (!decoded.exp) {
        console.error("Token 缺少過期時間，無法設置刷新定時器");
        return;
      }

      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const refreshTime = expirationTime - 5 * 60 * 1000;
      const timeToRefresh = refreshTime - currentTime;

      if (timeToRefresh <= 0) {
        console.log("Token 已接近過期或已過期，立即刷新");
        await refreshTokenRef.current();
        return;
      }

      console.log(`Token 將在 ${Math.round(timeToRefresh / 1000 / 60)} 分鐘後刷新`);
      timerRef.current = setTimeout(() => {
        refreshTokenRef.current();
      }, timeToRefresh);
    } catch (error) {
      console.error('設置刷新定時器失敗:', error);
    }
  }, [clearRefreshTimer, isLoggedIn]);

  /**
   * 手動觸發刷新 AccessToken。
   * @returns {Promise<boolean>} 是否刷新成功
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      console.log('開始刷新 Token...', new Date().toLocaleString());

      const refreshTokenValue = (await getrefreshToken())?.value;
      if (!refreshTokenValue) {
        console.error("無法獲取 refresh_token，無法刷新 Token");
        return false;
      }

      const response = await api.post('/Auth/refresh-token');

      if (response.data.accessToken) {
        console.log('Token 刷新成功!', new Date().toLocaleString());
        await setupRefreshTimer();
        return true;
      }

      console.error('Token 刷新失敗: 沒有收到新的 AccessToken');
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await clearAuthCookies();
      return false;
    }
  }, [setupRefreshTimer]);

  /**
   * 將 refreshToken 函式指派給 ref，確保永遠是最新版本。
   */
  useEffect(() => {
    refreshTokenRef.current = refreshToken;
  }, [refreshToken]);

  /**
   * 初始化掛載時自動設置定時器，並於卸載時清除。
   */
  useEffect(() => {
    setupRefreshTimer();
    return () => {
      clearRefreshTimer();
    };
  }, [setupRefreshTimer, clearRefreshTimer]);

  return { refreshToken };
}

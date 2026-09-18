// SilentRefresh.ts
import axios from "axios";
import api from "@/services/apiService";

let refreshTimer: NodeJS.Timeout | null = null;
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
/**
 * 啟動 Silent Refresh 計時器
 * @param accessToken JWT Token
 */
export function startSilentRefresh(accessToken: string) {
    stopSilentRefresh(); // 保險：啟動前先停掉舊的 Timer

    const decoded = decodeJwt(accessToken);
    if (!decoded || !decoded.exp) {
        console.error("AccessToken 格式錯誤，無法啟動 Silent Refresh");
        return;
    }

    const expiryTime = decoded.exp * 1000; // exp是秒，乘1000變成毫秒
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    // 5分鐘前自動刷新（300,000毫秒）
    const refreshTime = timeUntilExpiry - 5 * 60 * 1000;

    if (refreshTime <= 0) {
        console.warn("AccessToken 快過期或已過期，直接刷新");
        triggerRefresh();
        return;
    }

    refreshTimer = setTimeout(() => {
        triggerRefresh();
    }, refreshTime);

    console.log(`Silent Refresh 計時器已啟動，將在 ${(refreshTime / 1000).toFixed(0)}秒後刷新`);
}

/**
 * 停止 Silent Refresh 計時器
 */
export function stopSilentRefresh() {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
    }
}

/**
 * 呼叫 RefreshToken API
 */
async function triggerRefresh() {
    try {
        const response = await api.post("/Auth/refresh-token", {}, { withCredentials: true });
        const newAccessToken = response.data.accessToken;
        const newRefreshToken = response.data.refreshToken;
        console.log("Refresh 成功，新的 accessToken:", newAccessToken);

        // 重新啟動 Silent Refresh
        startSilentRefresh(newAccessToken);

    } catch (error) {
        console.error("RefreshToken 失敗，可能需要重新登入", error);
        stopSilentRefresh();
        // 可以跳轉回登入頁
        window.location.href =  `${NPbasePath}/login`;
    }
}

/**
 * 解碼JWT（只拿 payload，不驗證）
 */
function decodeJwt(token: string): { exp: number } | null {
    try {
        const payload = token.split('.')[1];
        const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error("解碼JWT失敗", error);
        return null;
    }
}
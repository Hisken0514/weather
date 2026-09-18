import axios from "axios";
import getAuthtoken, {clearAuthCookies, getAccessToken} from "@/services/serverAuthService";
import { jwtDecode } from "jwt-decode";
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const api = axios.create({
    baseURL: `${NPbasePath}/api`,
    withCredentials: true, // ✅ 關鍵：讓 refreshToken (HttpOnly cookie) 自動附帶
    headers: {
        "Content-Type": "application/json"
    }
});

// Request 攔截器（可以加 access token）
api.interceptors.request.use(async (config) => {
  const token = await getAuthtoken(); // 從 Cookie 取得 Token

  if (token) {
    config.headers.Authorization = `Bearer ${token.value}`;
  } else {
    console.warn("⚠️ 無 Token，請求將不攜帶 Authorization");
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response 攔截器：自動 refresh


// MCP OAuth 2.1 Authorization Server 的自家頁面呼叫用（consent 頁 /oauth/authorize/pending、
// /oauth/authorize/decision，管理頁 /oauth/clients）——RFC 規範這些端點要在根目錄，不能掛
// /api 前綴，所以用獨立的 axios instance（baseURL 不加 /api），驗證 header 邏輯跟上面共用。
export const rootApi = axios.create({
    baseURL: NPbasePath,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json"
    }
});

rootApi.interceptors.request.use(async (config) => {
  const token = await getAuthtoken();
  if (token) {
    config.headers.Authorization = `Bearer ${token.value}`;
  }
  return config;
}, (error) => Promise.reject(error));

export default api;

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


export default api;

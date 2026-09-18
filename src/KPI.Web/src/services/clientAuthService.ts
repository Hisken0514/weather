import axios from "axios";
import getAuthtoken, {
  clearAuthCookies,
  isAuthenticated as serverIsAuthenticated,
} from './serverAuthService';
import api from "@/services/apiService"

// interface JWTPayload {
//   role?: string | string[];
//   sub: string;
//   exp: number;
//   'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': string;
//   'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'?: string | string[];
//   "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier": string;
//   "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress": string;
//   iat: number;
//   nbf: number;
//   jti: string;
//   unique_name?: string;
// }

// API 客戶端

api.defaults.headers.post["Content-Type"] = "application/json";

// 請求攔截器
api.interceptors.request.use(async (config) => {
  // 從 server-side cookies 獲取 token
  const isServerSide = typeof window === 'undefined';
  if (isServerSide) {
    // 伺服器端直接透過 server 方法獲取
    const authenticated = await serverIsAuthenticated();
    if (authenticated) {
      // 可以在這裡添加從 server cookies 讀取 token 的邏輯
    }
  }
  return config;
});

// api.interceptors.response.use(
//     (response) => response,
//     async (error) => {
//       if (error.response?.status === 401) {
//         try {
//           const refreshResult = await tryRefreshToken();
//           if (refreshResult.success) {
//             console.debug('🔄 Refresh Token 成功，重送請求');
//             return api.request(error.config); // 重新送出原本的 request
//           } else {
//             console.warn('🔒 無法使用 Refresh Token，自動登出');
//             await logout();
//           }
//         } catch (refreshError) {
//           console.error('🔒 Refresh Token 流程錯誤:', refreshError);
//           await logout();
//         }
//       }
//       return Promise.reject(error);
//     }
// );
//
// // ✨ 自動 Refresh Token
// async function tryRefreshToken(): Promise<{ success: boolean }> {
//   try {
//     const response = await api.post('/Auth/RefreshToken');
//     if (response.status === 200 && response.data.accessToken) {
//       await storeAuthTokens(response.data.accessToken);
//       return { success: true };
//     }
//   } catch (error) {
//     console.error("Refresh Token 錯誤:", error);
//   }
//   return { success: false };
// }
//


export async function isAuthenticated(): Promise<boolean> {
  // 客戶端檢查
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Use validateToken instead of directly calling serverIsAuthenticated
    const tokenValidation = await validateToken();
    return tokenValidation.isValid;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
}


export async function validateToken(): Promise<{isValid:boolean}> {
  try {
    const token = await getAuthtoken();
    // 如果沒有 token，直接返回未驗證
    if (!token) {
      return {
        isValid: false,
      };
    }


    return {
      isValid: true,

    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return {
        isValid: false,
      };
    }
    return {
      isValid: false,
    };
  }
}



export async function logout() {
  await clearAuthCookies();
}

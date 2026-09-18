// API 客戶端基礎設定


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/** 請求逾時預設 30 秒 */
const DEFAULT_TIMEOUT_MS = 30_000;


interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
  timeoutMs?: number;
}

interface ApiError {
  message: string;
  code?: string;
  details?: unknown[];
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  // 刷新 Token (透過 cookie)
  private async refreshAccessToken(): Promise<boolean> {
    // 1. 先試 Forma 自己的 refresh（直接登入 Forma 的使用者）
    try {
      const formaRefreshUrl = this.buildUrl('/auth/refresh');
      console.log('[Refresh] 嘗試 Forma refresh:', formaRefreshUrl);
      const response = await fetch(formaRefreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      console.log('[Refresh] Forma refresh 結果:', response.status, response.ok);
      if (response.ok) return true;
    } catch (err) {
      console.log('[Refresh] Forma refresh 失敗（例外）:', err);
    }

    // 2. 試 KPI 的 refresh-token（SSO 使用者，透過 nginx 直接代理至 KPI 後端）
    const basePath = import.meta.env.VITE_BASE_PATH || '/iskpi/forma/';
    const kpiRefreshUrl = `${basePath}kpi-auth/refresh-token`;
    console.log('[Refresh] 嘗試 KPI refresh:', kpiRefreshUrl);

    try {
      const response = await fetch(kpiRefreshUrl, {
        method: 'POST',
        credentials: 'include',
      });
      console.log('[Refresh] KPI refresh 結果:', response.status, response.ok);
      return response.ok;
    } catch (err) {
      console.log('[Refresh] KPI refresh 失敗（例外）:', err);
      return false;
    }
  }

  // 處理 Token 刷新（避免多個請求同時刷新）
  private async handleTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshAccessToken().finally(() => {
      this.isRefreshing = false;
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
    const { params, skipAuth, timeoutMs, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };



    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const errMsg = err instanceof Error ? err.message : String(err);
      const errName = err?.constructor?.name ?? typeof err;
      console.error(`[API] ${fetchOptions.method ?? 'GET'} ${endpoint} 網路層錯誤`, { type: errName, message: errMsg });
      // AbortController.abort() 會拋出 DOMException(AbortError) 或 TypeError
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new TypeError('Request timeout');
      }
      throw err;
    }
    clearTimeout(timeout);
    console.log(`[API] ${fetchOptions.method ?? 'GET'} ${endpoint} → ${response.status}`);

    // 處理 401 Unauthorized - 嘗試刷新 Token
    if (response.status === 401 && !isRetry && !skipAuth) {
      const refreshed = await this.handleTokenRefresh();
      if (refreshed) {
        // 重試原請求
        return this.request<T>(endpoint, options, true);
      } else {
        // 刷新失敗，導向 KPI 登入頁
        window.location.href = `${import.meta.env.VITE_KPI_URL || '/iskpi'}/login`;
        throw new Error('登入已過期，請重新登入');
      }
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({ message: 'Unknown error' }));
      const serverMsg = error.message || 'Unknown error';
      throw new Error(`[${response.status}] ${serverMsg}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async getPublic<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params, skipAuth: true });
  }

  async postPublic<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      skipAuth: true,
    });
  }

  async putPublic<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      skipAuth: true,
    });
  }

  async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    const { params, ...rest } = {} as RequestOptions;
    void params; void rest;
    const url = this.buildUrl(endpoint);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(`[${response.status}] ${error.message ?? 'Unknown error'}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

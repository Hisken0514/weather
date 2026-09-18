'use client'

// 這個文件作為兼容層，為了保持原有代碼的調用方式不變
import * as clientAuthService from "@/services/clientAuthService";

// 為了向下兼容，將 clientAuthService 導出為 authService
export const authService = clientAuthService;

// 同時也導出 clientAuthService 以便在需要時明確使用
export { clientAuthService };

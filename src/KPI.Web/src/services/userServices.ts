import axios, { AxiosError } from "axios";
import api from "@/services/apiService"
import type { LoginResult } from "@/types/UserType";

// 定義 API 回應的介面
interface LoginResponse {
    success: boolean;
    message: string;
    warningMessage?: string; // 👈 加這個
    refreshToken?: string;
    token?: string;
    nickname?: string;
    email?: string;
}

export const userService = {
    // Login: async (usermail: string, password: string): Promise<LoginResponse> => {
    //     try {
    //         const response = await api.post<LoginResponse>("/User/login", {
    //             usermail,
    //             password,
    //         });
    //
    //         // 確保 API 回應的狀態碼是 200，且 success 為 true
    //         if (response.status === 200&& response.data.success) {
    //             return response.data;
    //
    //         } else {
    //             return {
    //                 success: false,
    //                 message: "登入失敗，請確認帳號或密碼",
    //             };
    //         }
    //     } catch (error) {
    //         console.error("API 請求失敗:", error);
    //
    //         let errorMessage = "發生未知錯誤";
    //         if (axios.isAxiosError(error)) {
    //             errorMessage = error.response?.data?.message || "伺服器未回應";
    //         } else {
    //             errorMessage = (error as Error).message;
    //         }
    //
    //         return {
    //             success: false,
    //             message: errorMessage,
    //         };
    //     }
    // },
    async Login(usermail: string, password: string): Promise<LoginResult> {
        try {
            const res = await api.post("/User/login", { usermail, password });
            return res.data as LoginResult;
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data) {
                return err.response.data as LoginResult; // 後端已回完整 DTO
            }
            throw err; // 非預期錯誤讓外層處理
        }
    },
};

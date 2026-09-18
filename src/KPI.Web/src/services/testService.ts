import axios from "axios";

// 定義泛型回應格式
export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
}

export const testService = {
    async testapi(): Promise<ApiResponse<string>> {
        try {
            const response = await axios.get("http://localhost:8080/login");

            if (response.status === 200 && response.data) {
                return {
                    success: response.data.success,
                    message: response.data.message,
                    data: response.data.data,
                };
            }

            return {
                success: false,
                message: "取得資料失敗",
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || "發生錯誤",
            };
        }
    },
};

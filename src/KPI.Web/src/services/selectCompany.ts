// services/enterpriseService.ts
import { getAccessToken } from "@/services/serverAuthService";
import api from "@/services/apiService"

export const oldenterpriseService = {
    fetchData: async () => {
        try {
            const token = await getAccessToken(); // 取得 Cookie
            if (token) {
                const response = await api.get("/Enterprise/GetEnterprise", {
                    headers: {
                        Authorization: `Bearer ${token.value}`, // 使用 Bearer Token
                    },
                });
                return response.data;
            }


        } catch (error) {
            console.error("API 請求失敗:", error);
            return null;
        }
    },
};


export const enterpriseService = {
    fetchData: async () => {
        const response = await api.get("/Organization/GetCompanyTree");
        const rawTreeArray = response.data;

        // 檢查資料是否為陣列
        if (!Array.isArray(rawTreeArray)) {
            console.error("⚠️ 預期回傳陣列，但收到：", rawTreeArray);
            return [];
        }

        // 將每一個樹狀節點轉換為你要的格式
        function transform(node: any): any {
            return {
                id: node.data?.id?.toString() ?? "",
                name: node.data?.name ?? "",
                children: (node.children || []).map(transform).filter(Boolean)
            };
        }

        // 回傳轉換後的陣列
        return rawTreeArray.map(transform).filter(Boolean);
    }
};

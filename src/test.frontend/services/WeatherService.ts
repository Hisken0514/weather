import api from "@/utils/api"; // 引入剛才建立的 axios 實例
import {WeatherItem} from "@/types/WheatherTypes";




export const weatherService = {
    // 取得所有天氣資料
    getWeather: async (): Promise<WeatherItem[]> => {
        const response = await api.get<WeatherItem[]>("/WeatherForecast");
        return response.data; // Axios 會自動解析 JSON，資料在 .data 中
    },

    // 新增天氣資料
    createWeather: async (data: WeatherItem) => {
        const response = await api.post("/WeatherForecast", data);
        return response.data;
    },

    // 刪除天氣資料
    deleteWeather: async (date: string) => {
        const response = await api.delete(`/WeatherForecast/${date}`);
        return response.data;
    },

    updateWeather: async (data: WeatherItem): Promise<WeatherItem> => {
        const response = await api.put<WeatherItem>(`/WeatherForecast/${data}`, data);
        return response.data;
    },
};
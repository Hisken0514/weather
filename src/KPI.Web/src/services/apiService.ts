import axios from "axios";
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const api = axios.create({
    baseURL: `${NPbasePath}/api`,
    timeout: 100000,
    withCredentials: true,
});

// // 你可以這裡加上攔截器
// api.interceptors.request.use(
//     (config) => {
//         // 假設有token，可以自動加上
//         const token = localStorage.getItem("token");
//         if (token) {
//             config.headers.Authorization = `Bearer ${token}`;
//         }
//         return config;
//     },
//     (error) => Promise.reject(error)
// );
//
// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         // 這裡可以統一處理錯誤，例如跳到登入頁
//         if (error.response?.status === 401) {
//             console.log("未授權，重新導向登入頁");
//             // window.location.href = "/login";
//         }
//         return Promise.reject(error);
//     }
// );

export default api;
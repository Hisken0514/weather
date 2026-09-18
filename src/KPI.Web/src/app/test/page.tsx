"use client";

import React, { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "@/utils/api"
import {getAccessToken} from "@/services/serverAuthService";

interface JWTPayload {
    exp: number;
    iat: number;
    sub: string;
    [key: string]: any;
}


export default function TokenTestPage() {
    const [decodedToken, setDecodedToken] = useState<JWTPayload | null>(null);
    const [refreshResult, setRefreshResult] = useState<string>("尚未測試");
    const [rawToken, setRawToken] = useState<string | null>(null);

    useEffect(() => {
        const cookieToken = getAccessTokenFromBrowser();
        setRawToken(cookieToken);

        if (cookieToken) {
            try {
                const decoded = jwtDecode<JWTPayload>(cookieToken);
                setDecodedToken(decoded);
            } catch (err) {
                console.error("Token 解碼失敗", err);
            }
        }
    }, []);

    const handleTestAPI = async () => {
        try {
            const token = await getAccessToken();
            const res = await api.get("/Menu/GetMenus", {
                headers: {
                    Authorization: `Bearer ${token?.value}`,
                },
            });
            console.log("API 成功:", res.data);
            setRefreshResult("✅ API 請求成功，Access Token 有效或已自動刷新");
        } catch (err) {
            console.error("API 請求錯誤", err);
            setRefreshResult("❌ 請求失敗，Refresh Token 應該也失效了");
        }
    };

    return (
        <div className="p-8 space-y-4">
            <h2 className="text-2xl font-bold">🔍 JWT Token 測試工具</h2>

            <div className="bg-gray-100 p-4 rounded shadow">
                <p className="font-semibold">📜 Raw Token (from Cookie):</p>
                <pre className="whitespace-pre-wrap break-all text-sm text-blue-600">{rawToken || "未找到 token"}</pre>
            </div>

            <div className="bg-gray-100 p-4 rounded shadow">
                <p className="font-semibold">🧠 Token Payload (decoded):</p>
                <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(decodedToken, null, 2)}</pre>
            </div>

            <div className="space-y-2">
                <button
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                    onClick={handleTestAPI}
                >
                    🔁 測試打 API（會自動刷新 AccessToken）
                </button>
                <p>結果：{refreshResult}</p>
            </div>
        </div>
    );
}

function getAccessTokenFromBrowser(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

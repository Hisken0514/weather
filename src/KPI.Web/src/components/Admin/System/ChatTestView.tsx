'use client'

import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import { RefreshCw, RotateCcw, Save } from "lucide-react";
import AiChatConversation, { DEFAULT_PRESET_QUESTIONS } from "@/components/AIChat/AiChatConversation";

// 只在「還沒跟後端要到目前生效值」的瞬間當初始畫面用，一 mount 就會被
// GET /Gemini/system-instruction 的實際結果覆蓋過去，不是真正的預設值來源。
const FALLBACK_SYSTEM_INSTRUCTION =
    "你是一個專業的績效指標平台小幫手。若使用者的問題涉及公司、KPI 指標或督導案件的實際資料，" +
    "請使用提供的工具查詢後再依查詢結果回答；若問題與資料查詢無關，可直接回答。回覆請專業且友善。";

export default function ChatTestView() {
    const [healthChecking, setHealthChecking] = useState(false);
    const [healthResult, setHealthResult] = useState<any | null>(null);
    const [healthError, setHealthError] = useState<string | null>(null);

    const [systemInstruction, setSystemInstruction] = useState(FALLBACK_SYSTEM_INSTRUCTION);
    const [savedInstruction, setSavedInstruction] = useState(FALLBACK_SYSTEM_INSTRUCTION);
    const [promptLoading, setPromptLoading] = useState(true);
    const [promptSaving, setPromptSaving] = useState(false);
    const [promptError, setPromptError] = useState<string | null>(null);
    const [promptMeta, setPromptMeta] = useState<{ updatedAt?: string; updatedByUserName?: string } | null>(null);

    useEffect(() => {
        api.get("/Gemini/system-instruction")
            .then(res => {
                setSystemInstruction(res.data.systemInstruction);
                setSavedInstruction(res.data.systemInstruction);
                setPromptMeta({ updatedAt: res.data.updatedAt, updatedByUserName: res.data.updatedByUserName });
            })
            .catch(() => {
                // 拿不到就沿用內建的 fallback 文字，不擋畫面。
            })
            .finally(() => setPromptLoading(false));
    }, []);

    const handleSavePrompt = async () => {
        setPromptSaving(true);
        setPromptError(null);
        try {
            const res = await api.put("/Gemini/system-instruction", { systemInstruction });
            setSavedInstruction(res.data.systemInstruction);
            setPromptMeta({ updatedAt: res.data.updatedAt, updatedByUserName: res.data.updatedByUserName });
        } catch (err: any) {
            setPromptError(err?.response?.data?.error || err?.message || "儲存失敗");
        } finally {
            setPromptSaving(false);
        }
    };

    const handleCheckHealth = async () => {
        setHealthChecking(true);
        setHealthResult(null);
        setHealthError(null);
        try {
            const res = await api.get("/Gemini/mcp-health");
            setHealthResult(res.data);
        } catch (err: any) {
            const data = err?.response?.data;
            setHealthError(data ? JSON.stringify(data, null, 2) : (err?.message || "檢查失敗"));
        } finally {
            setHealthChecking(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 max-w-3xl space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-1">AI 聊天測試</h3>
                <p className="text-gray-500 text-sm">
                    直接呼叫 <code className="bg-gray-100 px-1 rounded">/Gemini</code> 後端 API，
                    跟正式聊天機器人使用同一支端點，僅限系統管理員使用。
                </p>
            </div>

            {/* MCP 連線健康檢查 */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">MCP 連線狀態</span>
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={handleCheckHealth}
                        disabled={healthChecking}
                    >
                        <RefreshCw className={`h-4 w-4 ${healthChecking ? "animate-spin" : ""}`} />
                        {healthChecking ? "檢查中..." : "檢查 MCP 連線"}
                    </button>
                </div>
                {healthResult && (
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={`badge ${healthResult.reachable ? "badge-success" : "badge-error"}`}>
                                {healthResult.reachable ? "連線正常" : "連線失敗"}
                            </span>
                            {typeof healthResult.serverToolCount === "number" && (
                                <span className="badge badge-ghost">工具數：{healthResult.serverToolCount}</span>
                            )}
                            {Array.isArray(healthResult.allowedToolsNotFoundOnServer) && (
                                <span className={`badge ${healthResult.allowedToolsNotFoundOnServer.length > 0 ? "badge-warning" : "badge-ghost"}`}>
                                    白名單未對上：{healthResult.allowedToolsNotFoundOnServer.length}
                                </span>
                            )}
                            {healthResult.dbConnectionResult && (
                                <span className="badge badge-success">資料庫連線 OK</span>
                            )}
                            {healthResult.dbConnectionError && (
                                <span className="badge badge-error">資料庫連線失敗</span>
                            )}
                        </div>
                        <details>
                            <summary className="text-xs text-gray-500 cursor-pointer select-none">顯示完整結果（含工具清單）</summary>
                            <pre className="mt-1 text-xs bg-white border rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {JSON.stringify(healthResult, null, 2)}
                            </pre>
                        </details>
                    </div>
                )}
                {healthError && (
                    <pre className="text-xs bg-red-50 text-red-700 border border-red-200 rounded p-3 overflow-x-auto whitespace-pre-wrap">{healthError}</pre>
                )}
            </div>

            {/* 自訂 system prompt */}
            <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                        System Prompt {promptLoading && "（載入中...）"}
                    </span>
                    <div className="flex gap-2">
                        <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => setSystemInstruction(savedInstruction)}
                            disabled={systemInstruction === savedInstruction || promptLoading}
                            title="還原成目前正式生效的版本，不儲存"
                        >
                            <RotateCcw className="h-3 w-3" /> 還原
                        </button>
                        <button
                            className="btn btn-xs btn-primary"
                            onClick={handleSavePrompt}
                            disabled={systemInstruction === savedInstruction || promptSaving || promptLoading || !systemInstruction.trim()}
                        >
                            <Save className={`h-3 w-3 ${promptSaving ? "animate-pulse" : ""}`} />
                            {promptSaving ? "儲存中..." : "儲存為正式預設值"}
                        </button>
                    </div>
                </div>
                <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    rows={3}
                    value={systemInstruction}
                    onChange={e => setSystemInstruction(e.target.value)}
                    disabled={promptLoading}
                />
                <p className="text-xs text-gray-400 mt-1">
                    在這裡改動只影響這個測試頁當下的對話；按「儲存為正式預設值」才會真的
                    改到後端，之後所有沒有另外指定 prompt 的請求（包含一般使用者的
                    「AI 查詢助理」）都會套用這個版本。
                </p>
                {promptMeta?.updatedAt && (
                    <p className="text-xs text-gray-400">
                        上次更新：{new Date(promptMeta.updatedAt).toLocaleString("zh-TW")}
                        {promptMeta.updatedByUserName && `（${promptMeta.updatedByUserName}）`}
                    </p>
                )}
                {promptError && (
                    <p className="text-xs text-red-600 mt-1">{promptError}</p>
                )}
            </div>

            {/* 對話區 */}
            <div className="border rounded-lg h-96 overflow-hidden">
                <AiChatConversation
                    emptyHint="輸入訊息開始測試，或直接點下面的範例問題"
                    systemInstruction={systemInstruction}
                    presetQuestions={DEFAULT_PRESET_QUESTIONS}
                    forceShowToolCallDetails
                />
            </div>
        </div>
    );
}

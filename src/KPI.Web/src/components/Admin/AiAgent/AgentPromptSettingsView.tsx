'use client'

import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import { RotateCcw, Save } from "lucide-react";

/**
 * ToolCallVisibilityToggle
 * — 「工具呼叫透明化」開關的共用邏輯，Gemini（一般使用者懸浮視窗）跟 AI Agent（文件 RAG）
 *   兩套聊天系統各自有自己的設定表/API（刻意不共用，跟這個檔案其他地方的慣例一致），
 *   但畫面行為完全一樣，抽成一個元件、用 endpoint prop 分辨要打哪一組 API。
 */
function ToolCallVisibilityToggle({ endpoint, title, description }: { endpoint: string; title: string; description: string }) {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get(`${endpoint}/tool-call-visibility`)
            .then(res => setEnabled(res.data.showToolCallDetailsToUsers))
            .catch(err => setError(err?.response?.data?.error || err?.message || "載入失敗"))
            .finally(() => setLoading(false));
    }, [endpoint]);

    const handleToggle = async () => {
        const next = !enabled;
        setEnabled(next);
        setSaving(true);
        setError(null);
        try {
            await api.put(`${endpoint}/tool-call-visibility`, { showToolCallDetailsToUsers: next });
        } catch (err: any) {
            setEnabled(!next); // 存檔失敗就退回原本的畫面狀態，不要留下跟後端不一致的假象
            setError(err?.response?.data?.error || err?.message || "儲存失敗");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-3">
            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-1">{title}</h3>
                <p className="text-gray-500 text-sm">{description}</p>
            </div>
            <label className="flex items-center gap-3 cursor-pointer w-fit">
                <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={enabled}
                    onChange={handleToggle}
                    disabled={loading || saving}
                />
                <span className="text-sm text-gray-700">
                    {loading ? "載入中..." : enabled ? "已開啟：一般使用者看得到完整工具呼叫明細" : "已關閉：一般使用者只看得到工具名稱"}
                </span>
            </label>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}

export default function AgentPromptSettingsView() {
    const [systemInstruction, setSystemInstruction] = useState("");
    const [savedInstruction, setSavedInstruction] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get("/agent/prompt-settings")
            .then(res => {
                setSystemInstruction(res.data.systemInstruction);
                setSavedInstruction(res.data.systemInstruction);
            })
            .catch(err => setError(err?.response?.data?.error || err?.message || "載入失敗"))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.put("/agent/prompt-settings", { systemInstruction });
            setSavedInstruction(systemInstruction);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "儲存失敗");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-3">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">System Prompt</h3>
                    <p className="text-gray-500 text-sm">AI Agent（文件 RAG）專用的 system prompt，跟「AI 聊天測試」的 Gemini prompt 分開兩份。</p>
                </div>
                <textarea
                    className="textarea textarea-bordered w-full text-sm"
                    rows={8}
                    value={systemInstruction}
                    onChange={e => setSystemInstruction(e.target.value)}
                    disabled={loading}
                />
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => setSystemInstruction(savedInstruction)}
                        disabled={systemInstruction === savedInstruction || loading}
                    >
                        <RotateCcw className="h-3 w-3" /> 還原
                    </button>
                    <button
                        className="btn btn-xs btn-primary"
                        onClick={handleSave}
                        disabled={systemInstruction === savedInstruction || saving || loading || !systemInstruction.trim()}
                    >
                        <Save className={`h-3 w-3 ${saving ? "animate-pulse" : ""}`} />
                        {saving ? "儲存中..." : "儲存"}
                    </button>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
            </div>

            <ToolCallVisibilityToggle
                endpoint="/Gemini"
                title="工具呼叫透明化（AI 查詢助理／懸浮視窗）"
                description="關閉時，一般使用者最常接觸的懸浮視窗（走 /api/Gemini/stream）只會看到「已查詢：工具名稱」，不會看到第幾次呼叫、原始參數跟查詢結果這些偏技術性的細節；管理員在「AI 聊天測試」頁一律還是看得到完整明細。"
            />

            <ToolCallVisibilityToggle
                endpoint="/agent"
                title="工具呼叫透明化（AI Agent／文件 RAG）"
                description="控制的是右下角懸浮視窗（走 /api/agent/chat/stream，含對話紀錄/匯出對話）跟下方「AI Agent 測試」頁的工具呼叫明細顯示——測試頁一律顯示完整明細供管理員驗證，不受這個開關影響，這裡只影響一般使用者看到的懸浮視窗。"
            />
        </div>
    );
}

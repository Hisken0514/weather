'use client'

import React, { useEffect, useState } from "react";
import api from "@/utils/api";
import { Save, RefreshCw, Database, CheckCircle2, AlertTriangle, Clock, RotateCcw } from "lucide-react";

interface LiteLlmSettings {
    baseUrl: string;
    model: string;
    tier1Model: string;
    embeddingModel: string;
    maxOutputTokens: number;
    maxToolCalls: number;
    streamRequestBudgetSeconds: number;
    hasApiKey: boolean;
    updatedAt?: string;
    updatedByUserName?: string;
}

const EMPTY: LiteLlmSettings = {
    baseUrl: "",
    model: "claude-sonnet-4-6",
    tier1Model: "",
    embeddingModel: "text-embedding-3-large",
    maxOutputTokens: 4096,
    maxToolCalls: 12,
    streamRequestBudgetSeconds: 15,
    hasApiKey: false,
};

interface DocumentIndexStatus {
    total: number;
    indexed: number;
    pending: number;
    processing: number;
    failed: number;
    failureBreakdown?: { category: string; count: number }[];
    lastIndexedAt?: string;
}

interface AgentDocumentListItem {
    id: number;
    fileName: string;
    fileType: string;
    status: string;
    failureReason?: string | null;
    failureCategory?: string | null;
    organizationId?: number | null;
    organizationName?: string | null;
    uploadedAt: string;
    indexedAt?: string | null;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
    Pending: { label: "待同步", className: "bg-orange-50 text-orange-600" },
    Processing: { label: "處理中", className: "bg-blue-50 text-blue-600" },
    Indexed: { label: "已索引", className: "bg-green-50 text-green-600" },
    Failed: { label: "失敗", className: "bg-red-50 text-red-600" },
};

/** 對應後端 AgentDocumentFailureCategory enum 的中文標籤，管理員不用猜英文名詞是什麼意思。 */
const FAILURE_CATEGORY_LABEL: Record<string, string> = {
    FileMissing: "檔案遺失",
    UnsupportedFormat: "格式不支援",
    CorruptFile: "檔案損毀",
    EmbeddingError: "向量化/寫入錯誤",
    Other: "其他錯誤",
};

type IndexHealth = "empty" | "error" | "syncing" | "ok";

/** 依 total/indexed/pending/processing/failed 這幾個數字，判斷「現在算不算正常運作」。 */
function getIndexHealth(status: DocumentIndexStatus): IndexHealth {
    if (status.total === 0) return "empty";
    if (status.failed > 0) return "error";
    if (status.pending > 0 || status.processing > 0) return "syncing";
    return "ok";
}

const HEALTH_META: Record<IndexHealth, { label: string; className: string; barColor: string }> = {
    empty: { label: "尚無資料", className: "bg-gray-100 text-gray-500", barColor: "bg-gray-300" },
    error: { label: "有索引失敗，運作異常", className: "bg-red-50 text-red-600", barColor: "bg-red-500" },
    syncing: { label: "同步中／待處理", className: "bg-blue-50 text-blue-600", barColor: "bg-blue-500" },
    ok: { label: "運作正常", className: "bg-green-50 text-green-600", barColor: "bg-green-500" },
};

export default function AgentLiteLlmSettingsView() {
    const [settings, setSettings] = useState<LiteLlmSettings>(EMPTY);
    const [apiKeyInput, setApiKeyInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [models, setModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [indexStatus, setIndexStatus] = useState<DocumentIndexStatus | null>(null);
    const [loadingIndexStatus, setLoadingIndexStatus] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [documents, setDocuments] = useState<AgentDocumentListItem[] | null>(null);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [documentFilter, setDocumentFilter] = useState("");
    // 正在重新索引中的文件 id 集合——重新索引只是把狀態撥回 Pending，真正重新處理要等
    // 使用者接著按「同步向量」，這裡只用來讓按鈕在請求進行中顯示 loading、避免重複點擊。
    const [reindexingIds, setReindexingIds] = useState<Set<number>>(new Set());
    const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
    const [batchReindexing, setBatchReindexing] = useState(false);

    const load = () => {
        setLoading(true);
        api.get("/agent/settings/litellm")
            .then(res => setSettings(res.data))
            .catch(err => setError(err?.response?.data?.error || err?.message || "載入失敗"))
            .finally(() => setLoading(false));
    };

    const loadIndexStatus = () => {
        setLoadingIndexStatus(true);
        api.get<DocumentIndexStatus>("/agent/documents/status")
            .then(res => setIndexStatus(res.data))
            .catch(err => setError(err?.response?.data?.error || err?.message || "載入向量索引狀態失敗"))
            .finally(() => setLoadingIndexStatus(false));
    };

    const loadDocuments = () => {
        setLoadingDocuments(true);
        api.get<AgentDocumentListItem[]>("/agent/documents")
            .then(res => setDocuments(res.data))
            .catch(err => setError(err?.response?.data?.error || err?.message || "載入文件清單失敗"))
            .finally(() => setLoadingDocuments(false));
    };

    useEffect(load, []);
    useEffect(loadIndexStatus, []);
    useEffect(loadDocuments, []);

    const handleSync = async () => {
        setSyncing(true);
        setError(null);
        try {
            await api.post("/agent/documents/sync");
            loadIndexStatus();
            loadDocuments();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "同步失敗");
        } finally {
            setSyncing(false);
        }
    };

    // 把單一文件的既有向量資料清掉、狀態撥回「待同步」——不用重新上傳原始檔案，讓切 chunk/
    // 偵測邏輯改版之後，已經索引過的舊文件也能重新吃到最新邏輯（例如合併報告的廠別偵測）。
    // 撥回待同步之後還是要使用者自己按上面的「同步向量」才會真的重新處理，這裡不自動觸發——
    // 避免使用者點了重新索引卻不知道還要等下一次同步，兩個動作分開比較不會誤會。
    const handleReindex = async (id: number) => {
        setReindexingIds(prev => new Set(prev).add(id));
        setError(null);
        try {
            await api.post(`/agent/documents/${id}/reindex`);
            loadIndexStatus();
            loadDocuments();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "重新索引失敗");
        } finally {
            setReindexingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    // 批次版：勾選多筆文件一次重新索引，邏輯跟單筆一樣，只是省得一筆一筆點。
    const handleReindexSelected = async () => {
        if (selectedDocIds.size === 0) return;
        setBatchReindexing(true);
        setError(null);
        try {
            await api.post("/agent/documents/reindex-batch", { documentIds: Array.from(selectedDocIds) });
            setSelectedDocIds(new Set());
            loadIndexStatus();
            loadDocuments();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "批次重新索引失敗");
        } finally {
            setBatchReindexing(false);
        }
    };

    const toggleDocSelected = (id: number, checked: boolean) => {
        setSelectedDocIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(id); else next.delete(id);
            return next;
        });
    };

    const loadModels = async () => {
        setLoadingModels(true);
        setError(null);
        try {
            const res = await api.get<string[]>("/agent/models");
            setModels(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "讀取 model 清單失敗");
        } finally {
            setLoadingModels(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await api.put("/agent/settings/litellm", {
                baseUrl: settings.baseUrl,
                model: settings.model,
                tier1Model: settings.tier1Model || undefined,
                embeddingModel: settings.embeddingModel,
                maxOutputTokens: settings.maxOutputTokens,
                maxToolCalls: settings.maxToolCalls,
                streamRequestBudgetSeconds: settings.streamRequestBudgetSeconds,
                apiKey: apiKeyInput || undefined,
            });
            setApiKeyInput("");
            load();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "儲存失敗");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-gray-500 text-sm">載入中...</div>;
    }

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 max-w-2xl space-y-4">
            <div>
                <h3 className="text-xl font-semibold text-gray-800 mb-1">LiteLLM 連線設定</h3>
                <p className="text-gray-500 text-sm">
                    AI Agent（文件 RAG）專用連線設定，跟「AI 聊天測試」用的 Gemini 設定是分開兩份。
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <label className="form-control">
                    <span className="label-text text-sm mb-1">Base URL</span>
                    <input
                        className="input input-bordered"
                        value={settings.baseUrl}
                        onChange={e => setSettings({ ...settings, baseUrl: e.target.value })}
                        placeholder="https://llm.isafe.org.tw/"
                    />
                </label>

                <label className="form-control">
                    <span className="label-text text-sm mb-1">
                        API Key {settings.hasApiKey && <span className="badge badge-success badge-sm ml-1">已設定</span>}
                    </span>
                    <input
                        type="password"
                        className="input input-bordered"
                        value={apiKeyInput}
                        onChange={e => setApiKeyInput(e.target.value)}
                        placeholder={settings.hasApiKey ? "留空代表不變更既有 Key" : "請輸入 API Key"}
                    />
                </label>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={loadModels}
                        disabled={loadingModels || !settings.baseUrl}
                        title={!settings.baseUrl ? "請先填寫並儲存 Base URL / API Key" : undefined}
                    >
                        <RefreshCw className={`h-4 w-4 ${loadingModels ? "animate-spin" : ""}`} />
                        {loadingModels ? "讀取中..." : "從 LiteLLM 讀取可用 model 清單"}
                    </button>
                    {models.length > 0 && (
                        <span className="text-xs text-gray-400">共 {models.length} 個 model</span>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className="form-control">
                        <span className="label-text text-sm mb-1">Tier 1 模型（選填，便宜/快，不帶工具）</span>
                        {models.length > 0 ? (
                            <select
                                className="select select-bordered"
                                value={settings.tier1Model}
                                onChange={e => setSettings({ ...settings, tier1Model: e.target.value })}
                            >
                                <option value="">不分流，全部走對話模型</option>
                                {settings.tier1Model && !models.includes(settings.tier1Model) && (
                                    <option value={settings.tier1Model}>{settings.tier1Model}</option>
                                )}
                                {models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input
                                className="input input-bordered"
                                value={settings.tier1Model}
                                onChange={e => setSettings({ ...settings, tier1Model: e.target.value })}
                                placeholder="留空代表不分流，例如 gemma4:26b"
                            />
                        )}
                    </label>
                    <label className="form-control">
                        <span className="label-text text-sm mb-1">對話模型（Tier 2，帶完整工具集）</span>
                        {models.length > 0 ? (
                            <select
                                className="select select-bordered"
                                value={settings.model}
                                onChange={e => setSettings({ ...settings, model: e.target.value })}
                            >
                                {!models.includes(settings.model) && (
                                    <option value={settings.model}>{settings.model}</option>
                                )}
                                {models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input
                                className="input input-bordered"
                                value={settings.model}
                                onChange={e => setSettings({ ...settings, model: e.target.value })}
                            />
                        )}
                    </label>

                </div>
                <p className="text-xs text-gray-400 -mt-2">
                    Tier 1 只用來回答不需要查文件的閒聊/FAQ，一律不給工具權限（小模型對「該不該呼叫工具、
                    把結果整理成文字」不穩定，實測會出現假造工具呼叫格式的問題）；判斷需要查文件的問題
                    一律走 Tier 2。留空 Tier 1 代表不分流，所有訊息都用對話模型處理（既有行為）。
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <label className="form-control">
                        <span className="label-text text-sm mb-1">Embedding 模型</span>
                        {models.length > 0 ? (
                            <select
                                className="select select-bordered"
                                value={settings.embeddingModel}
                                onChange={e => setSettings({ ...settings, embeddingModel: e.target.value })}
                            >
                                {!models.includes(settings.embeddingModel) && (
                                    <option value={settings.embeddingModel}>{settings.embeddingModel}</option>
                                )}
                                {models.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        ) : (
                            <input
                                className="input input-bordered"
                                value={settings.embeddingModel}
                                onChange={e => setSettings({ ...settings, embeddingModel: e.target.value })}
                            />
                        )}
                    </label>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <label className="form-control">
                        <span className="label-text text-sm mb-1">MaxOutputTokens</span>
                        <input
                            type="number"
                            className="input input-bordered"
                            value={settings.maxOutputTokens}
                            onChange={e => setSettings({ ...settings, maxOutputTokens: Number(e.target.value) })}
                        />
                    </label>
                    <label className="form-control">
                        <span className="label-text text-sm mb-1">MaxToolCalls</span>
                        <input
                            type="number"
                            className="input input-bordered"
                            value={settings.maxToolCalls}
                            onChange={e => setSettings({ ...settings, maxToolCalls: Number(e.target.value) })}
                        />
                    </label>
                    <label className="form-control">
                        <span className="label-text text-sm mb-1">單次請求預算（秒）</span>
                        <input
                            type="number"
                            className="input input-bordered"
                            value={settings.streamRequestBudgetSeconds}
                            onChange={e => setSettings({ ...settings, streamRequestBudgetSeconds: Number(e.target.value) })}
                        />
                    </label>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                    <Save className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
                    {saving ? "儲存中..." : "儲存"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
                    <RefreshCw className="h-4 w-4" /> 重新載入
                </button>
                {settings.updatedAt && (
                    <span className="text-xs text-gray-400">
                        上次更新：{new Date(settings.updatedAt).toLocaleString("zh-TW")}
                        {settings.updatedByUserName && `（${settings.updatedByUserName}）`}
                    </span>
                )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="rounded-box border border-base-300 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Database className="h-4 w-4" /> 向量索引狀態
                    </div>
                    {indexStatus && (() => {
                        const health = getIndexHealth(indexStatus);
                        const meta = HEALTH_META[health];
                        const Icon = health === "ok" ? CheckCircle2 : health === "error" ? AlertTriangle : Clock;
                        return (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.className}`}>
                                <Icon className="h-3.5 w-3.5" /> {meta.label}
                            </span>
                        );
                    })()}
                </div>
                {loadingIndexStatus && !indexStatus ? (
                    <span className="loading loading-spinner loading-sm" />
                ) : indexStatus ? (
                    <>
                        {indexStatus.total > 0 && (
                            <div className="space-y-1">
                                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${HEALTH_META[getIndexHealth(indexStatus)].barColor}`}
                                        style={{ width: `${Math.round((indexStatus.indexed / indexStatus.total) * 100)}%` }}
                                    />
                                </div>
                                <div className="text-xs text-gray-400 text-right">
                                    {indexStatus.indexed} / {indexStatus.total}（{Math.round((indexStatus.indexed / indexStatus.total) * 100)}%）
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            <span>工廠歷史檔案總數：<span className="font-mono">{indexStatus.total}</span></span>
                            <span>已建立索引：<span className="font-mono text-green-600">{indexStatus.indexed}</span></span>
                            <span>待同步：<span className={`font-mono ${indexStatus.pending > 0 ? "text-orange-600" : ""}`}>{indexStatus.pending}</span></span>
                            {indexStatus.processing > 0 && (
                                <span>處理中：<span className="font-mono text-blue-600">{indexStatus.processing}</span></span>
                            )}
                            {indexStatus.failed > 0 && (
                                <span>失敗：<span className="font-mono text-red-600">{indexStatus.failed}</span></span>
                            )}
                        </div>
                        {indexStatus.failed > 0 && indexStatus.failureBreakdown && indexStatus.failureBreakdown.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {indexStatus.failureBreakdown.map(({ category, count }) => (
                                    <span
                                        key={category}
                                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600"
                                    >
                                        {FAILURE_CATEGORY_LABEL[category] ?? category}：{count}
                                    </span>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-400">
                            最近一次索引：{indexStatus.lastIndexedAt ? new Date(indexStatus.lastIndexedAt).toLocaleString("zh-TW") : "從未執行"}
                        </p>
                    </>
                ) : null}
                <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleSync}
                    disabled={syncing}
                >
                    <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "同步中...（依筆數可能需要一段時間）" : "重新同步向量"}
                </button>
                <p className="text-xs text-gray-400">
                    一次性 backfill，只處理還沒建立索引、或先前失敗的資料，不會重算已經是最新的部分。
                </p>
            </div>

            <div className="rounded-box border border-base-300 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Database className="h-4 w-4" /> 文件清單
                        {documents && <span className="text-xs text-gray-400 font-normal">（共 {documents.length} 筆）</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedDocIds.size > 0 && (
                            <button
                                type="button"
                                className="btn btn-outline btn-sm"
                                onClick={handleReindexSelected}
                                disabled={batchReindexing}
                                title="清掉這些文件的舊向量資料、狀態撥回待同步（要接著按上面的「同步向量」才會真的重跑）"
                            >
                                <RotateCcw className={`h-3 w-3 ${batchReindexing ? "animate-spin" : ""}`} />
                                重新索引已選 {selectedDocIds.size} 筆
                            </button>
                        )}
                        <input
                            className="input input-bordered input-sm"
                            placeholder="搜尋檔名或公司名稱"
                            value={documentFilter}
                            onChange={e => setDocumentFilter(e.target.value)}
                        />
                        <button type="button" className="btn btn-ghost btn-sm" onClick={loadDocuments} disabled={loadingDocuments}>
                            <RefreshCw className={`h-4 w-4 ${loadingDocuments ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>

                {loadingDocuments && !documents ? (
                    <span className="loading loading-spinner loading-sm" />
                ) : documents && documents.length > 0 ? (
                    (() => {
                        const keyword = documentFilter.trim().toLowerCase();
                        const filtered = keyword
                            ? documents.filter(d =>
                                d.fileName.toLowerCase().includes(keyword) ||
                                (d.organizationName ?? "").toLowerCase().includes(keyword)
                            )
                            : documents;
                        return filtered.length > 0 ? (
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <table className="table table-xs table-pin-rows">
                                    <thead>
                                        <tr>
                                            <th className="w-6">
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-xs"
                                                    checked={filtered.length > 0 && filtered.every(d => selectedDocIds.has(d.id))}
                                                    onChange={e => {
                                                        const ids = filtered.map(d => d.id);
                                                        setSelectedDocIds(prev => {
                                                            const next = new Set(prev);
                                                            ids.forEach(id => e.target.checked ? next.add(id) : next.delete(id));
                                                            return next;
                                                        });
                                                    }}
                                                />
                                            </th>
                                            <th>ID</th>
                                            <th>檔名</th>
                                            <th>公司/廠</th>
                                            <th>狀態</th>
                                            <th>上傳時間</th>
                                            <th>索引時間</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(d => {
                                            const statusMeta = STATUS_LABEL[d.status] ?? { label: d.status, className: "bg-gray-100 text-gray-500" };
                                            const isReindexing = reindexingIds.has(d.id);
                                            return (
                                                <tr key={d.id}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox checkbox-xs"
                                                            checked={selectedDocIds.has(d.id)}
                                                            onChange={e => toggleDocSelected(d.id, e.target.checked)}
                                                        />
                                                    </td>
                                                    <td className="font-mono">{d.id}</td>
                                                    <td className="max-w-xs truncate" title={d.fileName}>{d.fileName}</td>
                                                    <td>{d.organizationName ?? (d.organizationId == null ? "（公版文件）" : `#${d.organizationId}`)}</td>
                                                    <td>
                                                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${statusMeta.className}`}>
                                                            {statusMeta.label}
                                                        </span>
                                                        {d.status === "Failed" && d.failureCategory && (
                                                            <div className="text-xs text-red-500 mt-0.5" title={d.failureReason ?? undefined}>
                                                                {FAILURE_CATEGORY_LABEL[d.failureCategory] ?? d.failureCategory}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-xs text-gray-400">{new Date(d.uploadedAt).toLocaleString("zh-TW")}</td>
                                                    <td className="text-xs text-gray-400">{d.indexedAt ? new Date(d.indexedAt).toLocaleString("zh-TW") : "—"}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-xs"
                                                            title="清掉舊的向量資料、狀態撥回待同步，讓這份文件用最新的切分邏輯重新處理（要接著按上面的「同步向量」才會真的重跑）"
                                                            onClick={() => handleReindex(d.id)}
                                                            disabled={isReindexing || d.status === "Processing"}
                                                        >
                                                            <RotateCcw className={`h-3 w-3 ${isReindexing ? "animate-spin" : ""}`} />
                                                            重新索引
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">沒有符合「{documentFilter}」的文件</p>
                        );
                    })()
                ) : (
                    <p className="text-sm text-gray-400">目前沒有任何文件</p>
                )}
            </div>
        </div>
    );
}

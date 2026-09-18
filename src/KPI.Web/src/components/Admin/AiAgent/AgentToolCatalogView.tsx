'use client'

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import api from "@/utils/api";
import { Save, RefreshCw, Plus, Trash2, RotateCw, ChevronDown, X, Pencil, LogIn, LogOut, CheckCircle2 } from "lucide-react";

interface AgentTool {
    id: number;
    toolKey: string;
    description: string;
    source: string;
    riskTier: string;
    isEnabled: boolean;
    mcpEndpointId: number | null;
    mcpEndpointName: string | null;
    roleIds: number[];
}

interface Role {
    id: number;
    name: string;
}

/** "None" / "ApiKey" / "OAuth"，見後端 McpAuthType。 */
type McpAuthType = "None" | "ApiKey" | "OAuth";

interface McpEndpoint {
    id: number;
    name: string;
    url: string;
    authType: McpAuthType;
    isEnabled: boolean;
    hasApiKey: boolean;
    /** AuthType=OAuth 時，是否已經完成過一次授權連接（有存到 access token）。 */
    oauthConnected: boolean;
    oauthConnectedAt: string | null;
    /** 目前 access token 的到期時間——只是給 admin 參考，過期前 SDK 會自動用 refresh token 換新的，不需要手動處理。 */
    oauthAccessTokenExpiresAt: string | null;
    toolCount: number;
}

const AUTH_TYPE_LABEL: Record<McpAuthType, string> = {
    None: "無驗證",
    ApiKey: "API Key",
    OAuth: "OAuth",
};

/**
 * 批次套用的草稿——每個欄位都可以是「不異動」，跟單筆編輯不一樣。enabled 空字串代表不異動，
 * changeRoles=false 代表角色也不異動。套用時某個工具的某個欄位是「不異動」，就直接用那個工具
 * 自己原本的值送回去——PUT /agent/tools/{id} 是整筆覆蓋，沒有真正的 partial patch，這裡在
 * 前端組出「看起來沒變」的值來模擬。KPI 後端的 UpdateToolRequest 沒有開放改 RiskTier（跟
 * ISHAAudit 那份不一樣，那邊有），所以這裡不做風險等級批次套用，只做啟用/角色。
 */
interface BatchDraft {
    enabled: string;
    changeRoles: boolean;
    roleIds: number[];
}

const EMPTY_BATCH_DRAFT: BatchDraft = { enabled: '', changeRoles: false, roleIds: [] };

/** 表頭「全選這個表格裡的工具」checkbox——半選狀態(indeterminate)是 DOM 屬性，不是 HTML attribute，要用 ref 手動設。 */
const SelectAllCheckbox: React.FC<{ ids: number[]; selectedIds: Set<number>; onToggleAll: (ids: number[], checked: boolean) => void }> = ({ ids, selectedIds, onToggleAll }) => {
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.has(id));
    const someSelected = ids.some(id => selectedIds.has(id));
    const setRef = useCallback((el: HTMLInputElement | null) => {
        if (el) el.indeterminate = someSelected && !allSelected;
    }, [someSelected, allSelected]);
    return (
        <input
            ref={setRef}
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={allSelected}
            disabled={ids.length === 0}
            onChange={e => onToggleAll(ids, e.target.checked)}
        />
    );
};

/**
 * MCP endpoint 配置面板：登記外部 MCP server（名稱／endpoint／API Key／是否啟用），
 * 「同步工具目錄」呼叫該 endpoint 標準的 tools/list JSON-RPC 方法，把回傳的工具寫進
 * 下方共用的 AgentTool 目錄（Source=McpEndpoint）——外部工具跟 in-process 工具共用
 * 同一張角色×工具表，不用另外做一套權限機制。
 */
function McpEndpointPanel({ onSynced }: { onSynced: () => void }) {
    const [endpoints, setEndpoints] = useState<McpEndpoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [syncMsg, setSyncMsg] = useState<string | null>(null);
    // syncMsg 原本設了就一直留著，不會自動消失——之前踩過的坑：admin 按過一次「連接」看到
    // 「授權還有效」的訊息後，這個分頁沒整頁重新整理，過一陣子這個 endpoint 被別的操作（例如
    // 「斷開連結」）改成沒連接了，畫面上卻還留著那句舊的「已經有效」文字，跟下面清單顯示的
    // 「尚未連接」互相矛盾，看起來像是「明明連上了卻顯示沒連」的 bug，其實只是訊息沒有隨時間
    // 退場。這裡跟頁面上層 flash() 一樣加自動消失，避免過時的訊息一直冒充成目前的即時狀態。
    const syncMsgTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showSyncMsg = (text: string) => {
        setSyncMsg(text);
        if (syncMsgTimeoutRef.current) clearTimeout(syncMsgTimeoutRef.current);
        syncMsgTimeoutRef.current = setTimeout(() => setSyncMsg(null), 6000);
    };
    useEffect(() => () => {
        if (syncMsgTimeoutRef.current) clearTimeout(syncMsgTimeoutRef.current);
    }, []);

    const [showAddForm, setShowAddForm] = useState(false);
    // editingId 非 null 代表目前這個表單是在編輯既有 endpoint（重用同一個表單，不用另外做一份
    // 編輯畫面）；null 代表新增模式。
    const [editingId, setEditingId] = useState<number | null>(null);
    const [newName, setNewName] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [newAuthType, setNewAuthType] = useState<McpAuthType>("None");
    const [newApiKey, setNewApiKey] = useState("");
    const [adding, setAdding] = useState(false);
    const [connectingId, setConnectingId] = useState<number | null>(null);
    const [disconnectingId, setDisconnectingId] = useState<number | null>(null);

    const load = () => {
        setLoading(true);
        api.get<McpEndpoint[]>("/agent/mcp-endpoints")
            .then(res => setEndpoints(res.data))
            .catch(err => setError(err?.response?.data?.error || err?.message || "載入失敗"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const resetForm = () => {
        setEditingId(null);
        setNewName("");
        setNewUrl("");
        setNewAuthType("None");
        setNewApiKey("");
        setShowAddForm(false);
    };

    const handleStartEdit = (ep: McpEndpoint) => {
        setEditingId(ep.id);
        setNewName(ep.name);
        setNewUrl(ep.url);
        setNewAuthType(ep.authType);
        setNewApiKey("");
        setShowAddForm(true);
    };

    const handleSubmit = async () => {
        if (!newName.trim() || !newUrl.trim()) {
            setError("名稱／Endpoint 網址不能是空白");
            return;
        }
        setAdding(true);
        setError(null);
        const payload = {
            name: newName.trim(),
            url: newUrl.trim(),
            authType: newAuthType,
            apiKey: newAuthType === "ApiKey" && newApiKey ? newApiKey : null,
            isEnabled: editingId ? endpoints.find(e => e.id === editingId)?.isEnabled ?? true : true,
        };
        try {
            if (editingId) {
                await api.put(`/agent/mcp-endpoints/${editingId}`, payload);
            } else {
                await api.post("/agent/mcp-endpoints", payload);
            }
            resetForm();
            load();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || (editingId ? "更新失敗" : "新增失敗"));
        } finally {
            setAdding(false);
        }
    };

    const handleToggleEnabled = async (ep: McpEndpoint) => {
        setEndpoints(prev => prev.map(e => e.id === ep.id ? { ...e, isEnabled: !e.isEnabled } : e));
        try {
            await api.put(`/agent/mcp-endpoints/${ep.id}`, { name: ep.name, url: ep.url, authType: ep.authType, isEnabled: !ep.isEnabled });
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "更新失敗");
            load();
        }
    };

    // OAuth 連接：後端會回一個授權網址，開新分頁讓使用者去外部授權伺服器完成同意/登入——
    // 這裡不用等使用者按完，開完分頁就結束（後端在使用者完成授權、外部伺服器導回 callback
    // 路由時才會真的把 token 存進 DB）。以前這裡完全沒有任何重新整理的動作，使用者授權完
    // 切回這個分頁，畫面還是連接前抓到的舊資料，一直顯示「尚未連接」——即使 token 其實
    // 已經存進 DB、工具也已經能正常呼叫了，一定要整頁重新整理（F5）才會顯示正確狀態。
    // 用 window focus 事件偵測使用者從授權分頁切回來，自動重新 load 一次；另外也在表格
    // 上方加一顆手動「重新整理」按鈕，涵蓋 focus 事件沒觸發到的情況（例如同一個分頁跳轉、
    // 瀏覽器攔了 popup 之類的）。
    const handleConnect = async (ep: McpEndpoint) => {
        setConnectingId(ep.id);
        setError(null);
        setSyncMsg(null);
        try {
            const res = await api.post<{ authorizationUrl: string | null; alreadyConnected: boolean; noAuthorizationNeeded?: boolean; message?: string }>(`/agent/mcp-endpoints/${ep.id}/oauth/connect`);
            if (res.data.alreadyConnected) {
                // DB 裡還有沒過期的 token，不用再開分頁走一次授權。
                showSyncMsg(`「${ep.name}」目前的授權還有效，不需要重新連接。`);
                load();
                return;
            }
            if (res.data.noAuthorizationNeeded || !res.data.authorizationUrl) {
                // 連線建立成功，但這次過程沒有真的觸發 OAuth（例如 initialize 本身不驗證）——
                // 不等於已經授權，DB 裡也還沒有 token，狀態欄位會照實顯示「尚未連接」。
                setError(res.data.message || `「${ep.name}」連線成功，但這次沒有觸發 OAuth 授權。`);
                load();
                return;
            }
            window.open(res.data.authorizationUrl, "_blank", "noopener,noreferrer");
            const handleFocus = () => {
                load();
                window.removeEventListener("focus", handleFocus);
            };
            window.addEventListener("focus", handleFocus);
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "開始 OAuth 連接失敗");
        } finally {
            setConnectingId(null);
        }
    };

    const handleDisconnect = async (ep: McpEndpoint) => {
        if (!confirm(`確定要斷開「${ep.name}」的 OAuth 連接嗎？斷開後這個 endpoint 底下同步進來的工具會馬上不能用，要重新按「連接」走一次授權才能恢復。`)) {
            return;
        }
        setDisconnectingId(ep.id);
        setError(null);
        try {
            await api.post(`/agent/mcp-endpoints/${ep.id}/oauth/disconnect`);
            load();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "斷開連接失敗");
        } finally {
            setDisconnectingId(null);
        }
    };

    const handleDelete = async (ep: McpEndpoint) => {
        if (!confirm(`確定要刪除「${ep.name}」嗎？這會一併移除同步進來的 ${ep.toolCount} 個工具。`)) {
            return;
        }
        try {
            await api.delete(`/agent/mcp-endpoints/${ep.id}`);
            load();
            onSynced();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "刪除失敗");
        }
    };

    const handleSync = async (ep: McpEndpoint) => {
        setSyncingId(ep.id);
        setSyncMsg(null);
        setError(null);
        try {
            const res = await api.post(`/agent/mcp-endpoints/${ep.id}/sync-tools`);
            showSyncMsg(`「${ep.name}」同步完成：新增 ${res.data.added}、更新 ${res.data.updated}、移除 ${res.data.removed}（共 ${res.data.total} 個工具）`);
            load();
            onSynced();
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "同步失敗");
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">MCP Endpoint 設定</h3>
                    <p className="text-gray-500 text-sm">
                        登記外部 MCP server，按「同步」呼叫 tools/list 把工具寫進下方目錄；新同步進來的工具預設關閉，需管理員審核後手動啟用/指派角色。
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={load} title="重新載入 endpoint 清單（例如剛完成 OAuth 授權切回來，狀態沒有自動更新時）">
                        <RefreshCw className="h-4 w-4" /> 重新整理
                    </button>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { if (showAddForm) { resetForm(); } else { setShowAddForm(true); } }}
                    >
                        <Plus className="h-4 w-4" /> 新增 Endpoint
                    </button>
                </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {syncMsg && <p className="text-xs text-green-600">{syncMsg}</p>}

            {showAddForm && (
                <div className="flex flex-wrap items-end gap-2 bg-gray-50 border rounded-lg p-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">名稱</label>
                        <input className="input input-sm input-bordered w-40" value={newName} onChange={e => setNewName(e.target.value)} placeholder="例如：內部知識庫 MCP" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Endpoint 網址</label>
                        <input className="input input-sm input-bordered w-72" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://your-mcp-server.com" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">驗證方式</label>
                        <select
                            className="select select-sm select-bordered"
                            value={newAuthType}
                            onChange={e => setNewAuthType(e.target.value as McpAuthType)}
                        >
                            <option value="None">無驗證</option>
                            <option value="ApiKey">API Key</option>
                            <option value="OAuth">OAuth</option>
                        </select>
                    </div>
                    {newAuthType === "ApiKey" && (
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">API Key{editingId ? "（留空代表不變更既有的）" : "（選填）"}</label>
                            <input className="input input-sm input-bordered w-48" type="password" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} placeholder="Bearer token" />
                        </div>
                    )}
                    {newAuthType === "OAuth" && (
                        <p className="text-xs text-gray-400 max-w-xs">
                            儲存後回到清單，對這一列按「連接」走完瀏覽器授權流程即可，不用在這裡填任何金鑰。
                        </p>
                    )}
                    <button className="btn btn-sm btn-primary" onClick={handleSubmit} disabled={adding}>
                        {adding ? "儲存中..." : editingId ? "確認更新" : "確認新增"}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={resetForm} disabled={adding}>
                        取消
                    </button>
                </div>
            )}

            {loading ? (
                <div className="text-gray-500 text-sm">載入中...</div>
            ) : endpoints.length === 0 ? (
                <div className="text-gray-400 text-sm">還沒有登記任何 MCP endpoint</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>名稱</th>
                                <th>Endpoint</th>
                                <th>驗證方式</th>
                                <th>已同步工具數</th>
                                <th>啟用</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {endpoints.map(ep => (
                                <tr key={ep.id}>
                                    <td className="font-medium text-sm">{ep.name}</td>
                                    <td className="font-mono text-xs text-gray-600 max-w-xs truncate">{ep.url}</td>
                                    <td>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="badge badge-sm badge-ghost w-fit">{AUTH_TYPE_LABEL[ep.authType]}</span>
                                            {ep.authType === "ApiKey" && (
                                                <span className={`text-[11px] ${ep.hasApiKey ? "text-green-600" : "text-gray-400"}`}>
                                                    {ep.hasApiKey ? "已設定金鑰" : "未設定金鑰"}
                                                </span>
                                            )}
                                            {ep.authType === "OAuth" && (
                                                <span className={`inline-flex items-center gap-1 text-[11px] ${ep.oauthConnected ? "text-green-600" : "text-gray-400"}`}>
                                                    {ep.oauthConnected && <CheckCircle2 className="h-3 w-3" />}
                                                    {ep.oauthConnected
                                                        ? `已連接${ep.oauthConnectedAt ? `（${new Date(ep.oauthConnectedAt).toLocaleString("zh-TW")}）` : ""}`
                                                        : "尚未連接"}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-center text-sm">{ep.toolCount}</td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-primary toggle-sm"
                                            checked={ep.isEnabled}
                                            onChange={() => handleToggleEnabled(ep)}
                                        />
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-1">
                                            {ep.authType === "OAuth" && (
                                                <button
                                                    className="btn btn-xs btn-outline btn-secondary"
                                                    onClick={() => handleConnect(ep)}
                                                    disabled={connectingId === ep.id}
                                                    title="開新分頁走 OAuth 授權流程"
                                                >
                                                    <LogIn className={`h-3 w-3 ${connectingId === ep.id ? "animate-pulse" : ""}`} />
                                                    {connectingId === ep.id ? "連接中" : ep.oauthConnected ? "重新連接" : "連接"}
                                                </button>
                                            )}
                                            {ep.authType === "OAuth" && ep.oauthConnected && (
                                                <button
                                                    className="btn btn-xs btn-outline text-red-500"
                                                    onClick={() => handleDisconnect(ep)}
                                                    disabled={disconnectingId === ep.id}
                                                    title="斷開 OAuth 連接（清掉已存的 token，底下工具會馬上不能用）"
                                                >
                                                    <LogOut className="h-3 w-3" />
                                                    {disconnectingId === ep.id ? "斷開中" : "斷開連結"}
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-xs btn-outline btn-primary"
                                                onClick={() => handleSync(ep)}
                                                disabled={syncingId === ep.id}
                                                title="呼叫 tools/list 同步工具目錄"
                                            >
                                                <RotateCw className={`h-3 w-3 ${syncingId === ep.id ? "animate-spin" : ""}`} />
                                                {syncingId === ep.id ? "同步中" : "同步工具目錄"}
                                            </button>
                                            <div className="flex items-center gap-1 ml-auto">
                                                <button className="btn btn-xs btn-ghost" onClick={() => handleStartEdit(ep)} title="編輯">
                                                    <Pencil className="h-3 w-3" />
                                                </button>
                                                <button className="btn btn-xs btn-ghost text-red-500" onClick={() => handleDelete(ep)} title="刪除">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

interface ToolTableProps {
    tools: AgentTool[];
    roles: Role[];
    savingToolId: number | null;
    selectedIds: Set<number>;
    onToggleEnabled: (toolId: number) => void;
    onToggleRole: (toolId: number, roleId: number) => void;
    onSave: (tool: AgentTool) => void;
    onToggleOne: (id: number, checked: boolean) => void;
    onToggleAll: (ids: number[], checked: boolean) => void;
}

/** 純表格渲染，被「系統內建工具」跟每個 MCP endpoint 手風琴區塊共用，邏輯只寫一份。
 * 最左邊多一欄選取用 checkbox（含表頭全選），跟下面的批次套用列一起用。 */
function ToolTable({ tools, roles, savingToolId, selectedIds, onToggleEnabled, onToggleRole, onSave, onToggleOne, onToggleAll }: ToolTableProps) {
    if (tools.length === 0) {
        return <div className="text-gray-400 text-sm py-2">（沒有工具）</div>;
    }
    const ids = tools.map(t => t.id);
    return (
        <div className="overflow-x-auto">
            <table className="table table-sm">
                <thead>
                    <tr>
                        <th className="w-8"><SelectAllCheckbox ids={ids} selectedIds={selectedIds} onToggleAll={onToggleAll} /></th>
                        <th>工具</th>
                        <th>說明</th>
                        <th>風險等級</th>
                        <th>啟用</th>
                        {roles.map(r => <th key={r.id} className="text-center">{r.name}</th>)}
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {tools.map(tool => (
                        <tr key={tool.id} className={selectedIds.has(tool.id) ? "bg-primary/5" : undefined}>
                            <td>
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm"
                                    checked={selectedIds.has(tool.id)}
                                    onChange={e => onToggleOne(tool.id, e.target.checked)}
                                />
                            </td>
                            <td className="font-mono text-xs">{tool.toolKey}</td>
                            <td className="text-xs text-gray-600 max-w-xs">{tool.description}</td>
                            <td>
                                <span className={`badge badge-sm ${tool.riskTier === "Low" ? "badge-success" : tool.riskTier === "Medium" ? "badge-warning" : "badge-error"}`}>
                                    {tool.riskTier}
                                </span>
                            </td>
                            <td>
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary toggle-sm"
                                    checked={tool.isEnabled}
                                    onChange={() => onToggleEnabled(tool.id)}
                                />
                            </td>
                            {roles.map(role => (
                                <td key={role.id} className="text-center">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-sm"
                                        checked={tool.roleIds.includes(role.id)}
                                        onChange={() => onToggleRole(tool.id, role.id)}
                                    />
                                </td>
                            ))}
                            <td>
                                <button
                                    className="btn btn-xs btn-primary"
                                    onClick={() => onSave(tool)}
                                    disabled={savingToolId === tool.id}
                                >
                                    <Save className="h-3 w-3" />
                                    {savingToolId === tool.id ? "儲存中" : "儲存"}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** 一個 MCP endpoint 的工具收合成一個手風琴區塊，跟系統內建工具的表格完全分開，避免誤點。 */
function McpToolAccordion({ endpointName, tools, roles, savingToolId, selectedIds, onToggleEnabled, onToggleRole, onSave, onToggleOne, onToggleAll }:
    ToolTableProps & { endpointName: string }) {
    const [open, setOpen] = useState(false);
    const enabledCount = tools.filter(t => t.isEnabled).length;
    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-left"
                onClick={() => setOpen(v => !v)}
            >
                <span className="text-sm font-medium text-gray-700">
                    {endpointName}
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                        {tools.length} 個工具・{enabledCount} 個已啟用
                    </span>
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="p-3 border-t">
                    <ToolTable
                        tools={tools}
                        roles={roles}
                        savingToolId={savingToolId}
                        selectedIds={selectedIds}
                        onToggleEnabled={onToggleEnabled}
                        onToggleRole={onToggleRole}
                        onSave={onSave}
                        onToggleOne={onToggleOne}
                        onToggleAll={onToggleAll}
                    />
                </div>
            )}
        </div>
    );
}

/**
 * 角色 × 工具矩陣。比照 AgentToolRole 的資料結構：每個工具一列，勾選哪些角色可以用；
 * 管理員（super admin）不受這張表限制，永遠能用所有已啟用工具（見 AgentController 的
 * IsSuperAdmin 邏輯），這裡的勾選只影響一般角色。
 *
 * MCP Endpoint 設定面板同步進來的外部工具（Source=McpEndpoint）跟系統內建的三個 in-process
 * 工具分開兩塊顯示：前者依 endpoint 分組成手風琴、預設收合，避免曾經發生過的事故再犯——
 * 管理員在測試 MCP 同步功能時，因為所有工具混在同一張大表裡，不小心把系統內建工具的「啟用」
 * 開關也點掉，導致所有使用者的文件查詢功能整個掛掉。兩塊表格底層共用同一個 ToolTable。
 *
 * 每張表最左邊多一欄 checkbox（含表頭全選），配合下方浮動的批次套用列，可以一次勾選多個
 * 工具、選好「啟用/停用」跟要開放的角色，按一次套用（對每個選取的工具各發一次 PUT），
 * 不用像之前那樣每個工具都要手動展開單獨存一次——這是每次重新同步 MCP 工具目錄後，
 * 新工具預設關閉、要逐一重新啟用/指派角色很麻煩才加的。
 */
export default function AgentToolCatalogView() {
    const [tools, setTools] = useState<AgentTool[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingToolId, setSavingToolId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [batchDraft, setBatchDraft] = useState<BatchDraft>(EMPTY_BATCH_DRAFT);
    const [batchApplying, setBatchApplying] = useState(false);

    const flash = (text: string, type: 'success' | 'error' = 'success') => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 4000);
    };

    const load = () => {
        setLoading(true);
        Promise.all([api.get("/agent/tools"), api.get("/agent/roles")])
            .then(([toolsRes, rolesRes]) => {
                setTools(toolsRes.data);
                setRoles(rolesRes.data);
            })
            .catch(err => setError(err?.response?.data?.error || err?.message || "載入失敗"))
            .finally(() => setLoading(false));
    };

    useEffect(load, []);

    const toggleRole = (toolId: number, roleId: number) => {
        setTools(prev => prev.map(t => {
            if (t.id !== toolId) return t;
            const has = t.roleIds.includes(roleId);
            return { ...t, roleIds: has ? t.roleIds.filter(r => r !== roleId) : [...t.roleIds, roleId] };
        }));
    };

    const toggleEnabled = (toolId: number) => {
        setTools(prev => prev.map(t => t.id === toolId ? { ...t, isEnabled: !t.isEnabled } : t));
    };

    const handleSave = async (tool: AgentTool) => {
        setSavingToolId(tool.id);
        setError(null);
        try {
            await api.put(`/agent/tools/${tool.id}`, { isEnabled: tool.isEnabled, roleIds: tool.roleIds });
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || "儲存失敗");
        } finally {
            setSavingToolId(null);
        }
    };

    // ── 批次選取／套用 ──────────────────────────────────────────

    const toggleSelectOne = (id: number, checked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (checked) next.add(id); else next.delete(id);
            return next;
        });
    };

    const toggleSelectAll = (ids: number[], checked: boolean) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => checked ? next.add(id) : next.delete(id));
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
        setBatchDraft(EMPTY_BATCH_DRAFT);
    };

    const hasBatchChange = batchDraft.enabled !== '' || batchDraft.changeRoles;

    const handleBatchApply = async () => {
        if (selectedIds.size === 0 || !hasBatchChange) return;
        setBatchApplying(true);
        setError(null);
        try {
            const ids = Array.from(selectedIds);
            const results = await Promise.allSettled(ids.map(id => {
                const tool = tools.find(t => t.id === id);
                return api.put(`/agent/tools/${id}`, {
                    // 「不異動」的欄位用這個工具自己原本的值送回去，PUT 是整筆覆蓋，
                    // 不這樣做會把沒勾選要改的欄位也一起蓋掉。
                    isEnabled: batchDraft.enabled === '' ? (tool?.isEnabled ?? false) : batchDraft.enabled === 'true',
                    roleIds: batchDraft.changeRoles ? batchDraft.roleIds : (tool?.roleIds ?? []),
                });
            }));
            const failedCount = results.filter(r => r.status === 'rejected').length;
            if (failedCount === 0) {
                flash(`已套用到 ${ids.length} 項工具`, 'success');
            } else {
                flash(`套用完成，但有 ${failedCount}/${ids.length} 項失敗，請檢查`, 'error');
            }
            clearSelection();
            load();
        } catch {
            flash('批次套用失敗', 'error');
        } finally {
            setBatchApplying(false);
        }
    };

    const inProcessTools = tools.filter(t => t.source === "InProcess");
    const mcpToolsByEndpoint = new Map<string, AgentTool[]>();
    for (const t of tools.filter(t => t.source === "McpEndpoint")) {
        const key = t.mcpEndpointName ?? `Endpoint#${t.mcpEndpointId ?? "?"}`;
        mcpToolsByEndpoint.set(key, [...(mcpToolsByEndpoint.get(key) ?? []), t]);
    }

    const tableProps = {
        roles, savingToolId, selectedIds,
        onToggleEnabled: toggleEnabled, onToggleRole: toggleRole, onSave: handleSave,
        onToggleOne: toggleSelectOne, onToggleAll: toggleSelectAll,
    };

    return (
        <div className="space-y-6">
            {msg && <div className={`alert text-sm ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>{msg.text}</div>}

            <McpEndpointPanel onSynced={load} />

            {selectedIds.size > 0 && (
                <div className="sticky top-0 z-10 bg-white border border-primary/30 rounded-lg p-4 shadow-md space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">已選取 {selectedIds.size} 項工具，套用以下設定：</span>
                        <button className="btn btn-ghost btn-xs" onClick={clearSelection}>
                            <X className="w-4 h-4 mr-1" />取消選取
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="form-control">
                            <label className="label"><span className="label-text text-xs">啟用</span></label>
                            <select
                                className="select select-bordered select-sm"
                                value={batchDraft.enabled}
                                onChange={e => setBatchDraft({ ...batchDraft, enabled: e.target.value })}
                            >
                                <option value="">不異動</option>
                                <option value="true">啟用</option>
                                <option value="false">停用</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label cursor-pointer gap-2 w-fit">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={batchDraft.changeRoles}
                                onChange={e => setBatchDraft({ ...batchDraft, changeRoles: e.target.checked, roleIds: e.target.checked ? batchDraft.roleIds : [] })}
                            />
                            <span className="label-text text-xs">異動可見角色（不勾就維持每個工具原本的角色設定）</span>
                        </label>
                        {batchDraft.changeRoles && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {roles.map(role => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        className={`btn btn-xs ${batchDraft.roleIds.includes(role.id) ? 'btn-primary' : 'btn-outline'}`}
                                        onClick={() => setBatchDraft({
                                            ...batchDraft,
                                            roleIds: batchDraft.roleIds.includes(role.id) ? batchDraft.roleIds.filter(r => r !== role.id) : [...batchDraft.roleIds, role.id],
                                        })}
                                    >
                                        {role.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <button className="btn btn-primary btn-sm" onClick={handleBatchApply} disabled={batchApplying || !hasBatchChange}>
                            <Save className="w-4 h-4 mr-1" />{batchApplying ? '套用中...' : `套用到 ${selectedIds.size} 項工具`}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">系統內建工具</h3>
                        <p className="text-gray-500 text-sm">
                            管理員不受此表限制，一律能用所有已啟用工具；一般角色要勾選了才能在對話中被 LLM 呼叫。
                        </p>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={load}>
                        <RefreshCw className="h-4 w-4" /> 重新載入
                    </button>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                {loading ? (
                    <div className="text-gray-500 text-sm">載入中...</div>
                ) : (
                    <ToolTable tools={inProcessTools} {...tableProps} />
                )}
            </div>

            {!loading && mcpToolsByEndpoint.size > 0 && (
                <div className="bg-white rounded-xl border shadow-sm p-6 space-y-3">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">MCP 同步工具</h3>
                        <p className="text-gray-500 text-sm">
                            依來源 endpoint 分組、預設收合；點標題展開再啟用/指派角色，跟上面的系統內建工具分開避免誤點。
                        </p>
                    </div>
                    <div className="space-y-2">
                        {Array.from(mcpToolsByEndpoint.entries()).map(([endpointName, endpointTools]) => (
                            <McpToolAccordion
                                key={endpointName}
                                endpointName={endpointName}
                                tools={endpointTools}
                                {...tableProps}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

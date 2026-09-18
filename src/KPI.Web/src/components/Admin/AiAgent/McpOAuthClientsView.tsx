'use client'

import { useState, useEffect, useCallback } from "react";
import { Trash2, Info, RefreshCw } from "lucide-react";
import { rootApi } from "@/utils/api";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface McpOAuthClientAdminDto {
    clientId: string;
    clientName: string;
    redirectUris: string[];
    createdAt: string;
    activeRefreshTokenCount: number;
}

/**
 * KPI 對外開放的 /mcp 端點（OAuth 2.1 Authorization Server）的 client 管理頁——列出透過
 * Dynamic Client Registration 註冊進來的 client，跟各自目前有效的 refresh token 數（概略
 * 反映「有多少個已連接的 session」）。撤銷一個 client 會連同它核發過的 authorization code /
 * refresh token 一併刪除，該 client 之後要重新走一次 /oauth/register + 使用者同意才能再連上。
 *
 * 對應後端 McpOAuthController 的 /oauth/clients（GET/DELETE），照搬自 ISHAAudit 那套已經在
 * 跑的實作（McpOAuthClientsPage.tsx），只是 API client 換成 KPI 這邊的 rootApi。
 */
export default function McpOAuthClientsView() {
    const [loading, setLoading] = useState(true);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
    const [clients, setClients] = useState<McpOAuthClientAdminDto[]>([]);
    const { confirm } = useConfirmDialog();

    const flash = (text: string, type: "success" | "error" = "success") => {
        setMsg({ text, type });
        setTimeout(() => setMsg(null), 4000);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await rootApi.get<McpOAuthClientAdminDto[]>("/oauth/clients");
            setClients(res.data ?? []);
        } catch (err) {
            console.error("載入 MCP OAuth client 清單失敗", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const handleRevoke = async (client: McpOAuthClientAdminDto) => {
        const confirmed = await confirm({
            title: "撤銷這個 MCP client？",
            message: `「${client.clientName}」會立刻失去存取權限，${client.activeRefreshTokenCount} 個現有連線都會失效。這個 client 之後要重新註冊、使用者要重新同意一次才能再連上。`,
        });
        if (!confirmed) return;

        setRevoking(client.clientId);
        try {
            await rootApi.delete(`/oauth/clients/${client.clientId}`);
            flash("已撤銷", "success");
            await load();
        } catch (err: any) {
            flash(err?.response?.data?.error || err?.message || "撤銷失敗", "error");
        } finally {
            setRevoking(null);
        }
    };

    return (
        <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">外部 MCP Client 管理</h3>
                    <p className="text-gray-500 text-sm">
                        KPI 對外開放的 <code className="font-mono text-xs">/mcp</code> 端點，走 OAuth 2.1 授權——外部 MCP
                        client（例如別人的 Claude Desktop / claude.ai connector）第一次連線時會自動註冊成這裡的一筆，
                        使用者本人同意授權後才會產生有效連線。
                    </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={load}>
                    <RefreshCw className="h-4 w-4" /> 重新整理
                </button>
            </div>

            <div className="alert bg-info/10 border-info/20">
                <Info className="w-5 h-5 text-info shrink-0" />
                <p className="text-xs text-base-content/70">
                    這裡只管 client 本身的連線；實際能看到/呼叫哪些工具，取決於「工具目錄」頁每個工具的「外部存取」開關。
                </p>
            </div>

            {msg && <div className={`alert text-sm ${msg.type === "success" ? "alert-success" : "alert-error"}`}>{msg.text}</div>}

            <div className="text-sm text-gray-500">共 {clients.length} 個已註冊的 client</div>

            {loading ? (
                <div className="text-gray-500 text-sm">載入中...</div>
            ) : clients.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-6">還沒有外部 MCP client 連接過。</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>Client 名稱</th>
                                <th>Client ID</th>
                                <th>Redirect URI</th>
                                <th>有效連線數</th>
                                <th>註冊時間</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.clientId}>
                                    <td className="text-sm">{client.clientName}</td>
                                    <td className="font-mono text-xs">{client.clientId}</td>
                                    <td className="text-xs max-w-xs">
                                        {client.redirectUris.map(uri => (
                                            <div key={uri} className="truncate">{uri}</div>
                                        ))}
                                    </td>
                                    <td className="whitespace-nowrap">
                                        {client.activeRefreshTokenCount > 0
                                            ? <span className="badge badge-success badge-sm">{client.activeRefreshTokenCount}</span>
                                            : <span className="badge badge-ghost badge-sm">0</span>}
                                    </td>
                                    <td className="text-xs text-gray-400 whitespace-nowrap">{new Date(client.createdAt).toLocaleString("zh-TW")}</td>
                                    <td className="whitespace-nowrap">
                                        <button
                                            className="btn btn-ghost btn-xs text-red-500"
                                            onClick={() => handleRevoke(client)}
                                            disabled={revoking === client.clientId}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />{revoking === client.clientId ? "撤銷中..." : "撤銷"}
                                        </button>
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

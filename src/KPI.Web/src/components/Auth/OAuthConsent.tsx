'use client'

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { rootApi } from "@/utils/api";

interface PendingMcpAuthorizationDto {
    requestId: string;
    clientId: string;
    clientName: string;
    scope: string | null;
}

/**
 * 外部 MCP client（例如別人的 Claude Desktop / claude.ai connector）走 OAuth 授權時的同意頁——
 * 使用者在這裡按允許/拒絕，後端據此核發（或拒發）authorization code。到這一步之前，後端
 * （McpOAuthController.Authorize）已經驗證過 client_id/redirect_uri 合法、使用者已登入，
 * 這裡只管顯示摘要 + 收使用者的決定，不重新驗證那些前置條件。照搬自 ISHAAudit 那套已經在
 * 跑的實作，只是路由改用 Next.js（useSearchParams）、API client 換成 KPI 的 rootApi。
 */
export default function OAuthConsent() {
    const searchParams = useSearchParams();
    const requestId = searchParams.get("request") ?? "";

    const [loading, setLoading] = useState(true);
    const [deciding, setDeciding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState<PendingMcpAuthorizationDto | null>(null);

    useEffect(() => {
        if (!requestId) {
            setError("缺少授權請求參數，請從 MCP client 重新開始連接流程。");
            setLoading(false);
            return;
        }
        rootApi.get<PendingMcpAuthorizationDto>("/oauth/authorize/pending", { params: { request: requestId } })
            .then(res => setPending(res.data))
            .catch((err: any) =>
                setError(err?.response?.data?.error || "這個授權請求不存在或已過期，請從 MCP client 重新開始連接流程。"))
            .finally(() => setLoading(false));
    }, [requestId]);

    const handleDecision = async (approve: boolean) => {
        setDeciding(true);
        try {
            const res = await rootApi.post<string>("/oauth/authorize/decision", { requestId, approve });
            window.location.href = res.data;
        } catch (err: any) {
            setError(err?.response?.data?.error || "處理失敗，請稍後再試。");
            setDeciding(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-[400px]"><span className="loading loading-spinner loading-lg" /></div>;
    }

    return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
            <div className="card bg-base-100 shadow-xl w-full max-w-md">
                <div className="card-body items-center text-center">
                    {error || !pending ? (
                        <>
                            <AlertTriangle className="w-12 h-12 text-error" />
                            <h2 className="card-title">無法繼續授權</h2>
                            <p className="text-sm text-base-content/70">{error ?? "找不到這個授權請求。"}</p>
                        </>
                    ) : (
                        <>
                            <ShieldCheck className="w-12 h-12 text-primary" />
                            <h2 className="card-title">授權存取請求</h2>
                            <p className="text-sm text-base-content/70">
                                <span className="font-semibold">{pending.clientName}</span> 想要以你的身分存取 KPI 的 AI 工具（透過 MCP）。
                            </p>
                            <p className="text-xs text-base-content/50">
                                只有系統管理員已核准對外開放、且你的角色有權限使用的工具才會被這個連線用到——你可以隨時到
                                「AI Agent → 外部 MCP Client 管理」撤銷這個連線。
                            </p>
                            <div className="card-actions justify-center gap-3 mt-4 w-full">
                                <button className="btn btn-outline flex-1" onClick={() => handleDecision(false)} disabled={deciding}>
                                    拒絕
                                </button>
                                <button className="btn btn-primary flex-1" onClick={() => handleDecision(true)} disabled={deciding}>
                                    {deciding ? "處理中..." : "允許"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

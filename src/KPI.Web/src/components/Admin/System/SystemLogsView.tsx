'use client'

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search, Terminal } from "lucide-react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { parseUtc } from "@/utils/timetool";
import DataChangeLogView from "./DataChangeLogView";

async function authHeaders() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : "" } };
}

interface LoginLog {
    id: number;
    occurredAtUtc: string;
    userId?: string;
    userEmail?: string;
    isSuccess: boolean;
    failReason?: string;
    clientIp?: string;
}

interface PagedResult {
    items: LoginLog[];
    total: number;
    page: number;
    pageSize: number;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];
type TabKey = "os" | "web" | "ap" | "logon";

export default function SystemLogsView() {
    const [activeTab, setActiveTab] = useState<TabKey>("logon");

    const tabs: { key: TabKey; label: string }[] = [
        { key: "os",    label: "作業系統日誌" },
        { key: "web",   label: "網站日誌" },
        { key: "ap",    label: "應用程式日誌" },
        { key: "logon", label: "登入日誌" },
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800">系統日誌管理</h2>
            <p className="text-sm text-gray-500">記錄系統各層日誌，保留期限 6 個月。</p>

            {/* Tab bar */}
            <div className="flex gap-1 border-b border-gray-200">
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-md transition ${
                            activeTab === t.key
                                ? "bg-white border border-b-white border-gray-200 text-indigo-700 -mb-px"
                                : "text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="bg-white rounded-b-lg rounded-tr-lg border border-gray-200 p-4">
                {activeTab === "os"    && <OsLogView />}
                {activeTab === "web"   && <WebLogView />}
                {activeTab === "ap"    && <DataChangeLogView />}
                {activeTab === "logon" && <LoginLogView />}
            </div>
        </div>
    );
}

// ── 作業系統日誌 ─────────────────────────────────────
function OsLogView() {
    return (
        <div className="space-y-4">
            <InfoCard
                title="作業系統日誌（OS Event Log）"
                desc="由主機 Ubuntu 的 systemd-journald 服務管理，記錄核心事件、服務啟停、系統錯誤等。"
            />
            <CmdBlock label="查詢最近 100 筆系統日誌" cmd="sudo journalctl -n 100 --no-pager" />
            <CmdBlock label="查詢特定時間範圍" cmd={`sudo journalctl --since "2026-01-01" --until "2026-06-30" --no-pager`} />
            <CmdBlock label="設定保留期限（需 root）" cmd={`sudo sed -i 's/#MaxRetentionSec=/MaxRetentionSec=6month/' /etc/systemd/journald.conf\nsudo systemctl restart systemd-journald`} />
        </div>
    );
}

// ── 網站日誌 ─────────────────────────────────────────
function WebLogView() {
    return (
        <div className="space-y-4">
            <InfoCard
                title="網站日誌（Web Log）"
                desc="由 Nginx 反向代理記錄所有 HTTP 請求，含來源 IP、請求路徑、狀態碼、回應大小，儲存於 kpi-nginx-logs Docker Volume。"
            />
            <CmdBlock label="即時查看 Nginx 存取日誌" cmd="docker exec isha-nginx tail -f /var/log/nginx/access.log" />
            <CmdBlock label="查詢最近 200 筆記錄" cmd="docker exec isha-nginx tail -n 200 /var/log/nginx/access.log" />
            <CmdBlock label="搜尋特定 IP 的請求" cmd="docker exec isha-nginx grep '1.2.3.4' /var/log/nginx/access.log" />
            <CmdBlock label="查看錯誤日誌" cmd="docker exec isha-nginx tail -n 100 /var/log/nginx/error.log" />
        </div>
    );
}

// ── 登入日誌 ─────────────────────────────────────────
function LoginLogView() {
    const [logs, setLogs] = useState<LoginLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    const fetchLogs = useCallback(async (targetPage = page, targetPageSize = pageSize) => {
        setLoading(true);
        try {
            const { data } = await api.get<PagedResult>("/Admin/login-logs", {
                params: { q: keyword, page: targetPage, pageSize: targetPageSize },
                ...(await authHeaders())
            });
            setLogs(data.items ?? []);
            setTotal(data.total ?? 0);
        } catch {
            alert("載入登入日誌失敗");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, keyword]);

    useEffect(() => { fetchLogs(); }, []);

    const handleSearch = () => { setPage(1); fetchLogs(1, pageSize); };

    return (
        <div className="space-y-4">
            {/* Search bar */}
            <div className="flex gap-2 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜尋帳號或 IP..."
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >搜尋</button>
                <button
                    onClick={() => fetchLogs()}
                    className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                    title="重新整理"
                ><RefreshCw size={16} /></button>
                <select
                    value={pageSize}
                    onChange={e => { const s = Number(e.target.value); setPageSize(s); setPage(1); fetchLogs(1, s); }}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
                >
                    {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} 筆/頁</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                <table className="w-full text-sm text-gray-700">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">時間</th>
                            <th className="px-4 py-3 text-left font-medium">帳號</th>
                            <th className="px-4 py-3 text-left font-medium">結果</th>
                            <th className="px-4 py-3 text-left font-medium">失敗原因</th>
                            <th className="px-4 py-3 text-left font-medium">來源 IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">載入中...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">無紀錄</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">
                                    {parseUtc(log.occurredAtUtc) ? new Date(log.occurredAtUtc).toLocaleString('zh-TW') : "-"}
                                </td>
                                <td className="px-4 py-3">{log.userEmail || "-"}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                        log.isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}>
                                        {log.isSuccess ? "成功" : "失敗"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                                    {log.failReason || "-"}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{log.clientIp || "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{total > 0 ? `第 ${startItem}–${endItem} 筆，共 ${total} 筆` : "無資料"}</span>
                <div className="flex gap-1">
                    <PagBtn label="«" onClick={() => { setPage(1); fetchLogs(1, pageSize); }} disabled={page === 1} />
                    <PagBtn label="‹" onClick={() => { setPage(p => p - 1); fetchLogs(page - 1, pageSize); }} disabled={page === 1} />
                    <span className="px-3 py-1 border rounded bg-white">{page} / {totalPages}</span>
                    <PagBtn label="›" onClick={() => { setPage(p => p + 1); fetchLogs(page + 1, pageSize); }} disabled={page === totalPages} />
                    <PagBtn label="»" onClick={() => { setPage(totalPages); fetchLogs(totalPages, pageSize); }} disabled={page === totalPages} />
                </div>
            </div>
        </div>
    );
}

// ── Shared Components ─────────────────────────────────
function InfoCard({ title, desc }: { title: string; desc: string }) {
    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="font-semibold text-blue-800 mb-1">{title}</p>
            <p className="text-sm text-blue-700">{desc}</p>
        </div>
    );
}

function CmdBlock({ label, cmd }: { label: string; cmd: string }) {
    return (
        <div>
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Terminal size={12} />{label}
            </p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-lg px-4 py-3 overflow-x-auto whitespace-pre-wrap">
                {cmd}
            </pre>
        </div>
    );
}

function PagBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >{label}</button>
    );
}

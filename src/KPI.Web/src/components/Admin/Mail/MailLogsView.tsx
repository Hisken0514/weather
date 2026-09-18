'use client'

import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Search } from "lucide-react";
import api from "@/utils/api";

interface MailLog {
    id: number;
    subject?: string;
    receivers?: string;
    receiverCount: number;
    mailType?: string;
    isSuccess: boolean;
    errorMessage?: string;
    sentAtUtc: string;
    messageId?: string;
    bounceStatus: number;
    bounceStatusText?: string;
    bounceCode?: string;
    bounceReason?: string;
    bounceAtUtc?: string;
}

interface PagedResult {
    items: MailLog[];
    totalCount: number;
    page: number;
    pageSize: number;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function MailLogsView() {
    const [logs, setLogs] = useState<MailLog[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | "success" | "failed">("");
    const [bouncedOnly, setBouncedOnly] = useState(false);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    const fetchLogs = useCallback(async (targetPage = page, targetPageSize = pageSize) => {
        setLoading(true);
        try {
            const { data } = await api.get<PagedResult>("/MailAdmin/logs", {
                params: {
                    search: keyword || undefined,
                    isSuccess: statusFilter === "" ? undefined : statusFilter === "success",
                    bouncedOnly: bouncedOnly || undefined,
                    page: targetPage,
                    pageSize: targetPageSize,
                },
            });
            setLogs(data.items ?? []);
            setTotal(data.totalCount ?? 0);
        } catch {
            alert("載入寄信紀錄失敗");
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, keyword, statusFilter, bouncedOnly]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchLogs(); }, []);

    const handleSearch = () => { setPage(1); fetchLogs(1, pageSize); };

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-xl font-bold text-gray-800">寄信紀錄</h2>
                <p className="text-sm text-gray-500 mt-1">
                    每次寄信（驗證信、密碼重設、催繳提醒等）都會留一筆紀錄。「成功」代表 mail relay
                    收下這封信，不代表已送達收件人信箱；「退信狀態」是背景排程比對到退信通知才會回填的，
                    沒有退信紀錄不代表一定送達，只是還沒偵測到失敗。
                </p>
            </div>

            {/* Search bar */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="搜尋收件人或主旨..."
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
                    className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
                >
                    <option value="">全部狀態</option>
                    <option value="success">成功</option>
                    <option value="failed">失敗</option>
                </select>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 px-2">
                    <input
                        type="checkbox"
                        checked={bouncedOnly}
                        onChange={e => { setBouncedOnly(e.target.checked); setPage(1); }}
                    />
                    只看有退信的
                </label>
                <button
                    onClick={handleSearch}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >搜尋</button>
                <button
                    onClick={() => fetchLogs()}
                    className="p-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                    title="重新整理"
                ><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
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
                            <th className="px-4 py-3 text-left font-medium">寄送時間</th>
                            <th className="px-4 py-3 text-left font-medium">收件人</th>
                            <th className="px-4 py-3 text-left font-medium">主旨</th>
                            <th className="px-4 py-3 text-left font-medium">類型</th>
                            <th className="px-4 py-3 text-left font-medium">結果</th>
                            <th className="px-4 py-3 text-left font-medium">退信狀態</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">載入中...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">無紀錄</td></tr>
                        ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 align-top">
                                <td className="px-4 py-3 whitespace-nowrap font-mono text-xs text-gray-500">
                                    {new Date(log.sentAtUtc).toLocaleString('zh-TW')}
                                </td>
                                <td className="px-4 py-3 max-w-xs truncate" title={log.receivers}>
                                    {log.receivers || "-"}
                                </td>
                                <td className="px-4 py-3 max-w-xs truncate" title={log.subject}>
                                    {log.subject || "-"}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">{log.mailType || "-"}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                        log.isSuccess ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}>
                                        {log.isSuccess ? "成功" : "失敗"}
                                    </span>
                                    {!log.isSuccess && log.errorMessage && (
                                        <div className="text-xs text-red-500 mt-1 max-w-xs truncate" title={log.errorMessage}>
                                            {log.errorMessage}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {log.bounceStatus === 0 ? (
                                        <span className="text-xs text-gray-400">-</span>
                                    ) : (
                                        <>
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                log.bounceStatus === 1
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-700"
                                            }`}>
                                                {log.bounceStatusText}
                                            </span>
                                            {log.bounceReason && (
                                                <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={log.bounceReason}>
                                                    {log.bounceCode ? `[${log.bounceCode}] ` : ""}{log.bounceReason}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </td>
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

function PagBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >{label}</button>
    );
}

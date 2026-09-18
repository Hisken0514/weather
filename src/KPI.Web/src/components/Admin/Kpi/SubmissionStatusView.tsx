"use client";

import React, { useEffect, useState } from "react";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Mail, X, Send, Users } from "lucide-react";
import { quarterHelper } from "@/helpers/quarter";

async function authHeaders() {
    const token = await getAccessToken();
    return { headers: { Authorization: token ? `Bearer ${token.value}` : "" } };
}

type OrgRow = {
    orgId: number;
    orgName: string;
    kpiSubmitted: number;
    kpiFinalized: number;
    suggestUpdated: number;
    improvementUploaded: number;
};

type ReminderCandidate = {
    id: string;
    name: string;
    email: string;
    roles: string[];
    organizationName: string | null;
    group: "company" | "admin";
};

type ModalState = {
    open: boolean;
    orgId: number;
    orgName: string;
    year: number;
    period: string;
    orgUsers: ReminderCandidate[];
    adminUsers: ReminderCandidate[];
    selectedIds: Set<string>;
    loading: boolean;
    sending: boolean;
    result: { sent: number; errors: string[] } | null;
};

const PERIODS = [
    { value: "Q2", label: "年度績效檢討（前一年度整體執行成果）" },
    { value: "Q4", label: "年度改善追蹤（當年度 1–9 月執行情況）" },
    { value: "Y",  label: "Y（全年度）" },
];

const EMPTY_MODAL: ModalState = {
    open: false,
    orgId: 0,
    orgName: "",
    year: 0,
    period: "",
    orgUsers: [],
    adminUsers: [],
    selectedIds: new Set(),
    loading: false,
    sending: false,
    result: null,
};

function CountBadge({ count, label }: { count: number; label?: string }) {
    const hasData = count > 0;
    return (
        <div className="flex items-center justify-center gap-1.5">
            {hasData
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
            }
            <span className={`text-sm font-medium ${hasData ? "text-emerald-700" : "text-gray-400"}`}>
                {count > 0 ? count : "—"}
            </span>
            {label && <span className="text-xs text-gray-400">{label}</span>}
        </div>
    );
}

function CandidateGroup({
    title,
    candidates,
    selectedIds,
    onToggle,
    onSelectAll,
    onDeselectAll,
}: {
    title: string;
    candidates: ReminderCandidate[];
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}) {
    if (candidates.length === 0) return null;
    const allSelected = candidates.every(c => selectedIds.has(c.id));

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
                    <span className="text-xs text-gray-400">（{candidates.length} 人）</span>
                </div>
                <button
                    onClick={allSelected ? onDeselectAll : onSelectAll}
                    className="text-xs text-blue-500 hover:text-blue-700"
                >
                    {allSelected ? "取消全選" : "全選"}
                </button>
            </div>
            <div className="space-y-0.5">
                {candidates.map(c => (
                    <label
                        key={c.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                        <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => onToggle(c.id)}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-800">{c.name}</span>
                                {c.roles.map(r => (
                                    <span key={r} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-500 shrink-0">
                                        {r}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400">
                                {c.email}
                                {c.organizationName ? ` · ${c.organizationName}` : ""}
                            </p>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
}

export default function SubmissionStatusView() {
    const currentYear = new Date().getFullYear() - 1911;
    const [year, setYear]       = useState(currentYear);
    const [period, setPeriod]   = useState("Q2");
    const [rows, setRows]       = useState<OrgRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [modal, setModal]     = useState<ModalState>(EMPTY_MODAL);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, unknown> = { year };
            if (period) params.period = period;
            const { data } = await api.get<OrgRow[]>(
                "/Admin/statistics/submission-status",
                { params, ...(await authHeaders()) }
            );
            setRows(data ?? []);
        } catch {
            setError("載入失敗，請稍後再試");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [year, period]);

    const openModal = async (row: OrgRow) => {
        setModal({ ...EMPTY_MODAL, open: true, orgId: row.orgId, orgName: row.orgName, year, period, loading: true });
        try {
            const { data } = await api.get<{ orgUsers: ReminderCandidate[]; adminUsers: ReminderCandidate[] }>(
                `/Admin/organizations/${row.orgId}/reminder-candidates`,
                await authHeaders()
            );
            setModal(prev => ({
                ...prev,
                loading: false,
                orgUsers: data.orgUsers ?? [],
                adminUsers: data.adminUsers ?? [],
            }));
        } catch {
            setModal(prev => ({ ...prev, loading: false }));
        }
    };

    const toggleCandidate = (id: string) => {
        setModal(prev => {
            const next = new Set(prev.selectedIds);
            if (next.has(id)) next.delete(id); else next.add(id);
            return { ...prev, selectedIds: next };
        });
    };

    const selectGroup = (candidates: ReminderCandidate[], select: boolean) => {
        setModal(prev => {
            const next = new Set(prev.selectedIds);
            candidates.forEach(c => select ? next.add(c.id) : next.delete(c.id));
            return { ...prev, selectedIds: next };
        });
    };

    const sendReminders = async () => {
        if (modal.selectedIds.size === 0) return;
        setModal(prev => ({ ...prev, sending: true, result: null }));
        try {
            const { data } = await api.post<{ sent: number; errors: string[] }>(
                "/Admin/send-reminder-emails",
                {
                    orgId: modal.orgId,
                    orgName: modal.orgName,
                    year: modal.year,
                    period: modal.period,
                    userIds: Array.from(modal.selectedIds),
                },
                await authHeaders()
            );
            setModal(prev => ({ ...prev, sending: false, result: data }));
        } catch {
            setModal(prev => ({
                ...prev,
                sending: false,
                result: { sent: 0, errors: ["發送失敗，請稍後再試"] },
            }));
        }
    };

    const totalOrgs      = rows.length;
    const kpiSubmitted   = rows.filter(r => r.kpiSubmitted > 0).length;
    const kpiFinalized   = rows.filter(r => r.kpiFinalized > 0).length;
    const suggestUpdated = rows.filter(r => r.suggestUpdated > 0).length;
    const improvUploaded = rows.filter(r => r.improvementUploaded > 0).length;

    return (
        <div className="space-y-4">
            {/* Header & filters */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-gray-800">填報統計總覽</h3>
                    <div className="flex gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <label className="text-sm text-gray-600 whitespace-nowrap">民國年</label>
                            <input
                                type="number"
                                value={year}
                                onChange={e => setYear(Number(e.target.value))}
                                className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                                min={100}
                                max={200}
                            />
                            <span className="text-sm text-gray-500">年</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <label className="text-sm text-gray-600 whitespace-nowrap">期別（KPI）</label>
                            <select
                                value={period}
                                onChange={e => setPeriod(e.target.value)}
                                className="border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
                            >
                                {PERIODS.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={load}
                            disabled={loading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-gray-50 text-sm disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            重新整理
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: "KPI 已填報",     count: kpiSubmitted,   total: totalOrgs, color: "text-indigo-600" },
                    { label: "KPI 已核准",     count: kpiFinalized,   total: totalOrgs, color: "text-emerald-600" },
                    { label: "委員建議已更新", count: suggestUpdated, total: totalOrgs, color: "text-amber-600" },
                    { label: "改善報告書已上傳", count: improvUploaded, total: totalOrgs, color: "text-violet-600" },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-xl border shadow-sm p-4">
                        <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                        <p className={`text-2xl font-bold ${c.color}`}>{c.count}
                            <span className="text-sm font-normal text-gray-400"> / {c.total}</span>
                        </p>
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-current rounded-full transition-all"
                                style={{ width: totalOrgs > 0 ? `${(c.count / totalOrgs) * 100}%` : "0%" }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm mb-3">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600 w-8">#</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">公司 / 工廠</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">KPI 已填報</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">KPI 已核准</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">委員建議已更新</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">改善報告書</th>
                                <th className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap">催繳</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="px-3 py-10 text-center text-gray-400">載入中...</td>
                                </tr>
                            )}
                            {!loading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-3 py-10 text-center text-gray-400">
                                        無資料（請確認年份與期別是否正確）
                                    </td>
                                </tr>
                            )}
                            {!loading && rows.map((r, i) => (
                                <tr key={r.orgId} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                                    <td className="px-3 py-2 font-medium text-gray-800">{r.orgName}</td>
                                    <td className="px-3 py-2"><CountBadge count={r.kpiSubmitted} label="筆" /></td>
                                    <td className="px-3 py-2"><CountBadge count={r.kpiFinalized} label="筆" /></td>
                                    <td className="px-3 py-2"><CountBadge count={r.suggestUpdated} label="筆" /></td>
                                    <td className="px-3 py-2"><CountBadge count={r.improvementUploaded} label="份" /></td>
                                    <td className="px-3 py-2 text-center">
                                        <button
                                            onClick={() => openModal(r)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium transition-colors"
                                            title="發送填報催繳提醒信"
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            發信
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                    共 {totalOrgs} 家公司 ｜ 民國 {year} 年 ｜ KPI 期別：{quarterHelper.getQuarterLabel(period)} ｜ 改善報告書以整年度計算
                </div>
            </div>

            {/* Reminder Email Modal */}
            {modal.open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onClick={e => { if (e.target === e.currentTarget) setModal(EMPTY_MODAL); }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
                            <div>
                                <h2 className="text-base font-semibold text-gray-800">發送填報催繳提醒</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {modal.orgName}　｜　民國 {modal.year} 年 {quarterHelper.getQuarterLabel(modal.period)}
                                </p>
                            </div>
                            <button
                                onClick={() => setModal(EMPTY_MODAL)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {modal.loading && (
                                <div className="py-10 text-center text-gray-400 text-sm">載入收件人名單中...</div>
                            )}

                            {!modal.loading && modal.result && (
                                <div className={`rounded-lg p-4 text-sm ${modal.result.errors.length === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                    <p className="font-semibold">已成功發送 {modal.result.sent} 封提醒信</p>
                                    {modal.result.errors.length > 0 && (
                                        <ul className="mt-2 list-disc list-inside text-xs space-y-1">
                                            {modal.result.errors.map((e, i) => <li key={i}>{e}</li>)}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {!modal.loading && !modal.result && (
                                <>
                                    <CandidateGroup
                                        title="廠商人員（含上層公司）"
                                        candidates={modal.orgUsers}
                                        selectedIds={modal.selectedIds}
                                        onToggle={toggleCandidate}
                                        onSelectAll={() => selectGroup(modal.orgUsers, true)}
                                        onDeselectAll={() => selectGroup(modal.orgUsers, false)}
                                    />
                                    <CandidateGroup
                                        title="管理人員（Admin）"
                                        candidates={modal.adminUsers}
                                        selectedIds={modal.selectedIds}
                                        onToggle={toggleCandidate}
                                        onSelectAll={() => selectGroup(modal.adminUsers, true)}
                                        onDeselectAll={() => selectGroup(modal.adminUsers, false)}
                                    />
                                    {modal.orgUsers.length === 0 && modal.adminUsers.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-8">此公司目前無可發信的使用者</p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal footer */}
                        {!modal.loading && (
                            <div className="px-5 py-4 border-t shrink-0 flex items-center justify-between gap-3">
                                {!modal.result ? (
                                    <>
                                        <span className="text-xs text-gray-500">已選 {modal.selectedIds.size} 人</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setModal(EMPTY_MODAL)}
                                                className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                                            >
                                                取消
                                            </button>
                                            <button
                                                onClick={sendReminders}
                                                disabled={modal.selectedIds.size === 0 || modal.sending}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                                            >
                                                {modal.sending
                                                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                                                    : <Send className="w-4 h-4" />
                                                }
                                                {modal.sending ? "發送中..." : "發送"}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setModal(EMPTY_MODAL)}
                                        className="ml-auto px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                                    >
                                        關閉
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

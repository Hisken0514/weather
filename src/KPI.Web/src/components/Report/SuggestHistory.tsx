'use client';
import React, { useState } from 'react';
import api from '@/services/apiService';
import { getAccessToken } from '@/services/serverAuthService';
import { toast } from 'react-hot-toast';
import SelectEnterprise from '@/components/select/selectOnlyEnterprise';

interface ChangedField {
    field: string;
    label: string;
    from: string | null;
    to: string | null;
}

interface SuggestChange {
    suggestReportId: number;
    suggestContent: string;
    suggestType: string;
    changedFields: ChangedField[];
}

interface SubmissionHistory {
    year: number;
    quarter: string;
    submittedAt: string;
    submittedByUserName: string | null;
    changes: SuggestChange[];
}

const IS_ADOPTED_LABEL: Record<string, string> = { '0': '否', '1': '是', '2': '不參採', '3': '詳備註' };

function displayValue(field: string, raw: string | null): string {
    if (raw === null || raw === '') return '（空）';
    if (field === 'IsAdopted' || field === 'Completed' || field === 'ParallelExec') return IS_ADOPTED_LABEL[raw] ?? raw;
    return raw;
}

export default function SuggestHistory() {
    const [orgId, setOrgId]       = useState('');
    const [history, setHistory]   = useState<SubmissionHistory[]>([]);
    const [loading, setLoading]   = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const fetchHistory = async () => {
        if (!orgId) { toast.error('請先選擇廠商'); return; }
        setLoading(true);
        try {
            const token = await getAccessToken();
            const res = await api.get('/Suggest/change-history', {
                params: { organizationId: orgId },
                headers: { Authorization: `Bearer ${token?.value}` },
            });
            if (res.data?.success) {
                setHistory(res.data.data);
                if (!res.data.data.length) toast('此廠商無委員建議修改紀錄', { icon: 'ℹ️' });
            }
        } catch {
            toast.error('查詢失敗');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (key: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
        });

    return (
        <div className="space-y-4">
            {/* 查詢條件 */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">廠商</label>
                    <SelectEnterprise onSelectionChange={s => { setOrgId(s.orgId); setHistory([]); }} />
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={fetchHistory}
                    disabled={loading}
                >
                    {loading ? <span className="loading loading-spinner loading-xs" /> : '查詢'}
                </button>
            </div>

            {/* 結果：以送出批次為主軸 */}
            {history.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500">共 {history.length} 次送出有欄位變動</p>
                    {history.map(sub => {
                        const key = `${sub.year}-${sub.quarter}`;
                        const expanded = expandedIds.has(key);
                        const totalChanged = sub.changes.reduce((n, c) => n + c.changedFields.length, 0);

                        return (
                            <div key={key} className="border rounded-xl overflow-hidden">
                                {/* 批次標題 */}
                                <button
                                    className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                                    onClick={() => toggleExpand(key)}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-gray-800">
                                            {sub.year} 年 {sub.quarter}
                                        </span>
                                        <span className="text-xs text-gray-400">{formatDate(sub.submittedAt)}</span>
                                        {sub.submittedByUserName && (
                                            <span className="text-xs text-gray-500">by {sub.submittedByUserName}</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <span className="badge badge-outline badge-sm">{sub.changes.length} 筆記錄</span>
                                        <span className="badge badge-warning badge-sm">{totalChanged} 個欄位變動</span>
                                        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
                                    </div>
                                </button>

                                {/* 展開：各筆委員建議的欄位差異 */}
                                {expanded && (
                                    <div className="divide-y">
                                        {sub.changes.map(change => (
                                            <div key={change.suggestReportId} className="px-4 py-3 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    {change.suggestType && (
                                                        <span className="badge badge-outline badge-xs shrink-0">{change.suggestType}</span>
                                                    )}
                                                    <span className="text-sm font-medium text-gray-700 truncate" title={change.suggestContent}>
                                                        {change.suggestContent}
                                                    </span>
                                                </div>
                                                <table className="table table-xs w-full">
                                                    <thead className="bg-gray-50 text-gray-500">
                                                        <tr>
                                                            <th className="w-32">欄位</th>
                                                            <th>修改前</th>
                                                            <th>修改後</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {change.changedFields.map(f => (
                                                            <tr key={f.field}>
                                                                <td className="text-gray-500 font-medium">{f.label}</td>
                                                                <td className="text-red-400 text-xs">{displayValue(f.field, f.from)}</td>
                                                                <td className="text-emerald-600 font-semibold text-xs">{displayValue(f.field, f.to)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

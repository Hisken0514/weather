'use client';
import React, { useState } from 'react';
import api from '@/services/apiService';
import { getAccessToken } from '@/services/serverAuthService';
import { toast } from 'react-hot-toast';
import SelectEnterprise from '@/components/select/selectOnlyEnterprise';
import { quarterHelper } from '@/helpers/quarter';

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface SnapshotDto {
    version: number;
    value: number | null;
    isSkipped: boolean;
    remarks: string | null;
    submittedAt: string;
    submittedByUserName: string | null;
}

interface HistoryDto {
    kpiDataId: number;
    field: string;
    indicatorName: string;
    detailItemName: string;
    unit: string;
    versions: SnapshotDto[];
}

const quarterOptions = ['Q2', 'Q4', 'Y'];

export default function KpiReportHistory() {
    const [orgId, setOrgId] = useState('');
    const [orgName, setOrgName] = useState('');
    const [year, setYear] = useState<number>(new Date().getFullYear() - 1911);
    const [quarter, setQuarter] = useState('Q2');
    const [history, setHistory] = useState<HistoryDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1911 - i);

    const fetchHistory = async () => {
        if (!orgId) { toast.error('請先選擇廠商'); return; }
        setLoading(true);
        try {
            const token = await getAccessToken();
            const res = await api.get('/Kpi/submission-history', {
                params: { organizationId: orgId, year, quarter },
                headers: { Authorization: `Bearer ${token?.value}` },
            });
            if (res.data?.success) {
                const data: HistoryDto[] = res.data.data;
                // 只顯示有超過一筆版本的（曾被退回修改過的）
                setHistory(data.filter(d => d.versions.length > 1));
                if (data.filter(d => d.versions.length > 1).length === 0) {
                    toast('此期間無退回修改紀錄', { icon: 'ℹ️' });
                }
            }
        } catch {
            toast.error('查詢失敗');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

    return (
        <div className="space-y-4">
            {/* 查詢條件列 */}
            <div className="flex flex-wrap gap-3 items-end">
                {/* 廠商選擇 */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">廠商</label>
                    <SelectEnterprise
                        onSelectionChange={s => { setOrgId(s.orgId); setOrgName(s.orgName ?? ''); }}
                    />
                </div>
                {/* 年度 */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">年度</label>
                    <select
                        className="select select-bordered select-sm"
                        value={year}
                        onChange={e => setYear(Number(e.target.value))}
                    >
                        {yearOptions.map(y => <option key={y} value={y}>{y} 年</option>)}
                    </select>
                </div>
                {/* 季度 */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-500">季度</label>
                    <select
                        className="select select-bordered select-sm"
                        value={quarter}
                        onChange={e => setQuarter(e.target.value)}
                    >
                        {quarterOptions.map(q => <option key={q} value={q}>{quarterHelper.getQuarterLabel(q)}</option>)}
                    </select>
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={fetchHistory}
                    disabled={loading}
                >
                    {loading ? <span className="loading loading-spinner loading-xs" /> : '查詢'}
                </button>
            </div>

            {/* 結果列表 */}
            {history.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm text-gray-500">共 {history.length} 筆 KPI 項目有退回修改紀錄</p>
                    {history.map(item => {
                        const expanded = expandedIds.has(item.kpiDataId);
                        const latest = item.versions[item.versions.length - 1];
                        const prev   = item.versions[item.versions.length - 2];
                        const latestValueChanged  = prev && latest.value   !== prev.value;
                        const latestRemarkChanged = prev && latest.remarks !== prev.remarks;

                        return (
                            <div key={item.kpiDataId} className="border rounded-xl overflow-hidden">
                                {/* 標題列 */}
                                <button
                                    className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                                    onClick={() => toggleExpand(item.kpiDataId)}
                                >
                                    <div className="flex flex-wrap items-center gap-x-1">
                                        <span className="font-medium text-gray-800">{item.field}</span>
                                        <span className="mx-1 text-gray-400">›</span>
                                        <span className="text-gray-700">{item.indicatorName}</span>
                                        {item.detailItemName && (
                                            <><span className="mx-1 text-gray-400">›</span>
                                            <span className="text-gray-600">{item.detailItemName}</span></>
                                        )}
                                        <span className="ml-1 text-xs text-gray-400">（{item.unit}）</span>
                                        {latestValueChanged  && <span className="badge badge-warning badge-xs ml-2">值變更</span>}
                                        {latestRemarkChanged && <span className="badge badge-info badge-xs ml-1">備註變更</span>}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <span className="badge badge-warning badge-sm">{item.versions.length} 次送出</span>
                                        <span className="text-gray-400">{expanded ? '▲' : '▼'}</span>
                                    </div>
                                </button>

                                {/* 版本表格 */}
                                {expanded && (
                                    <div className="overflow-x-auto">
                                        <table className="table table-sm w-full">
                                            <thead className="bg-gray-100 text-gray-600">
                                                <tr>
                                                    <th className="w-16">版次</th>
                                                    <th>填報值</th>
                                                    <th>備註</th>
                                                    <th>送出時間</th>
                                                    <th>送出者</th>
                                                    <th>變動</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.versions.map((v, idx) => {
                                                    const prev = idx > 0 ? item.versions[idx - 1] : null;
                                                    const valueChanged = prev && v.value !== prev.value;
                                                    const remarkChanged = prev && v.remarks !== prev.remarks;
                                                    return (
                                                        <tr key={v.version} className={idx === item.versions.length - 1 ? 'bg-green-50' : ''}>
                                                            <td className="text-center font-medium">v{v.version}</td>
                                                            <td>
                                                                {v.isSkipped ? (
                                                                    <span className="text-gray-400 text-xs">略過</span>
                                                                ) : (
                                                                    <span className={valueChanged ? 'font-bold text-orange-600' : ''}>
                                                                        {v.value ?? '—'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className={remarkChanged ? 'font-bold text-orange-600 text-xs max-w-xs truncate' : 'text-xs text-gray-500 max-w-xs truncate'}>
                                                                {v.remarks || '—'}
                                                            </td>
                                                            <td className="text-xs text-gray-500 whitespace-nowrap">{formatDate(v.submittedAt)}</td>
                                                            <td className="text-xs text-gray-500">{v.submittedByUserName || '—'}</td>
                                                            <td className="text-xs">
                                                                {idx === 0 ? (
                                                                    <span className="badge badge-ghost badge-xs">初次</span>
                                                                ) : (
                                                                    <span className="flex gap-1 flex-wrap">
                                                                        {valueChanged && <span className="badge badge-warning badge-xs">值變更</span>}
                                                                        {remarkChanged && <span className="badge badge-info badge-xs">備註變更</span>}
                                                                        {!valueChanged && !remarkChanged && <span className="badge badge-ghost badge-xs">同前</span>}
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
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

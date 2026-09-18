'use client';
import React from 'react';
import api from '@/services/apiService';
import { getAccessToken } from '@/services/serverAuthService';
import { toast } from 'react-hot-toast';

interface SuggestRow {
    id: number;
    suggestDateId: number;
    date: string;
    suggestEventTypeName: string;
    userName: string | null;
    suggestionContent: string;
    respDept: string | null;
    organizationId: number | null;
    organizationName: string | null;
}

interface OrgOption {
    id: number;
    name: string;
}

const PAGE_SIZE = 20;

export default function SuggestOrgFixView() {
    const [rows, setRows] = React.useState<SuggestRow[]>([]);
    const [orgs, setOrgs] = React.useState<OrgOption[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [keyword, setKeyword] = React.useState('');
    const [selected, setSelected] = React.useState<Set<number>>(new Set());
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [newOrgId, setNewOrgId] = React.useState<number | ''>('');
    const [saving, setSaving] = React.useState(false);
    const [page, setPage] = React.useState(1);

    const authHeaders = React.useCallback(async () => {
        const t = await getAccessToken();
        return { headers: { Authorization: t ? `Bearer ${t.value}` : '' } };
    }, []);

    const load = React.useCallback(async () => {
        setLoading(true);
        try {
            const [suggestRes, orgRes] = await Promise.all([
                api.get('/Suggest/GetAllSuggest', await authHeaders()),
                api.get('/Organization/GetOrganizations', await authHeaders()),
            ]);
            const data = Array.isArray(suggestRes.data) ? suggestRes.data : suggestRes.data?.data ?? [];
            setRows(data);
            const orgData = Array.isArray(orgRes.data) ? orgRes.data : orgRes.data?.data ?? [];
            setOrgs(orgData.map((o: any) => ({ id: o.id, name: o.name })));
        } catch {
            toast.error('載入資料失敗');
        } finally {
            setLoading(false);
        }
    }, [authHeaders]);

    React.useEffect(() => { load(); }, [load]);

    const filtered = React.useMemo(() => {
        const kw = keyword.trim().toLowerCase();
        if (!kw) return rows;
        return rows.filter(r =>
            r.organizationName?.toLowerCase().includes(kw) ||
            r.suggestEventTypeName?.toLowerCase().includes(kw) ||
            r.suggestionContent?.toLowerCase().includes(kw) ||
            r.userName?.toLowerCase().includes(kw) ||
            r.respDept?.toLowerCase().includes(kw) ||
            r.date?.includes(kw)
        );
    }, [rows, keyword]);

    // 搜尋條件變更時回到第一頁
    React.useEffect(() => { setPage(1); }, [keyword]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = React.useMemo(
        () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
        [filtered, page]
    );

    // allChecked / someChecked 針對全部搜尋結果（跨頁）
    const allChecked = filtered.length > 0 && filtered.every(r => selected.has(r.id));
    const someChecked = filtered.some(r => selected.has(r.id));

    const toggleAll = () => {
        if (allChecked) {
            setSelected(prev => {
                const next = new Set(prev);
                filtered.forEach(r => next.delete(r.id));
                return next;
            });
        } else {
            setSelected(prev => {
                const next = new Set(prev);
                filtered.forEach(r => next.add(r.id));
                return next;
            });
        }
    };

    const toggleOne = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSave = async () => {
        if (newOrgId === '' || selected.size === 0) return;
        setSaving(true);
        try {
            const res = await api.put(
                '/Suggest/fix-organization',
                { reportIds: [...selected], newOrganizationId: newOrgId },
                await authHeaders()
            );
            const orgName = orgs.find(o => o.id === newOrgId)?.name ?? String(newOrgId);
            const updatedIds = new Set(selected);
            setRows(prev => prev.map(r =>
                updatedIds.has(r.id)
                    ? { ...r, organizationId: newOrgId as number, organizationName: orgName }
                    : r
            ));
            setSelected(new Set());
            setDialogOpen(false);
            setNewOrgId('');
            toast.success(res.data?.message ?? '更新成功');
        } catch (err: any) {
            toast.error(err?.response?.status === 403 ? '權限不足' : '更新失敗，請稍後再試');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 text-gray-500">載入中...</div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">修正所屬廠商</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        勾選要修正的建議項目，再點「修改所屬廠商」批次更新。
                    </p>
                </div>
                <button
                    onClick={() => { setDialogOpen(true); setNewOrgId(''); }}
                    disabled={selected.size === 0}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap"
                >
                    ✏️ 修改所屬廠商
                    {selected.size > 0 && (
                        <span className="bg-white text-indigo-600 rounded-full px-2 py-0.5 text-xs font-bold">
                            {selected.size}
                        </span>
                    )}
                </button>
            </div>

            {/* 搜尋 + 計數 */}
            <div className="flex items-center gap-3">
                <input
                    type="text"
                    placeholder="搜尋廠商、委員、建議內容、負責部門..."
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="text-sm text-gray-400 whitespace-nowrap">
                    共 {filtered.length} 筆
                    {selected.size > 0 && (
                        <span className="ml-2 text-indigo-600 font-medium">（已選 {selected.size} 筆）</span>
                    )}
                </span>
            </div>

            {/* 表格 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                                        onChange={toggleAll}
                                        className="rounded border-gray-300"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">日期</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">會議類型</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">委員</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600 max-w-xs">建議內容</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">負責部門</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-600">目前所屬廠商</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">查無資料</td>
                                </tr>
                            ) : paginated.map(row => (
                                <tr
                                    key={row.id}
                                    onClick={() => toggleOne(row.id)}
                                    className={`cursor-pointer transition-colors ${selected.has(row.id) ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                                >
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(row.id)}
                                            onChange={() => toggleOne(row.id)}
                                            className="rounded border-gray-300"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.date}</td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.suggestEventTypeName ?? '—'}</td>
                                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{row.userName ?? '—'}</td>
                                    <td className="px-4 py-3 text-gray-800 max-w-xs">
                                        <span className="line-clamp-2">{row.suggestionContent}</span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.respDept ?? '—'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {row.organizationName
                                            ? <span className="font-medium text-gray-800">{row.organizationName}</span>
                                            : <span className="text-red-500 font-medium">⚠ 未分類</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 分頁控制 */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-1">
                    <span className="text-sm text-gray-500">
                        第 {page} / {totalPages} 頁，每頁 {PAGE_SIZE} 筆
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                            className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                        >
                            «
                        </button>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                        >
                            上一頁
                        </button>

                        {/* 頁碼 */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === '...'
                                    ? <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                                    : <button
                                        key={item}
                                        onClick={() => setPage(item as number)}
                                        className={`px-3 py-1 text-sm rounded border transition-colors ${
                                            page === item
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {item}
                                    </button>
                            )
                        }

                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                        >
                            下一頁
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages}
                            className="px-2 py-1 text-xs rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
                        >
                            »
                        </button>
                    </div>
                </div>
            )}

            {/* 修改廠商 Dialog */}
            {dialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">修改所屬廠商</h3>
                        <p className="text-sm text-gray-500 mb-5">
                            已選取 <span className="font-semibold text-indigo-600">{selected.size}</span> 筆建議，將移至新廠商。
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">更改為</label>
                            <select
                                value={newOrgId}
                                onChange={e => setNewOrgId(Number(e.target.value))}
                                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            >
                                <option value="">— 請選擇廠商 —</option>
                                {orgs.map(o => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setDialogOpen(false); setNewOrgId(''); }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || newOrgId === ''}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                            >
                                {saving ? '儲存中...' : '確認變更'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

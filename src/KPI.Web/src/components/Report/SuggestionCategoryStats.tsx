'use client';
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface SuggestionCategoryStatsRow {
    organizationId: number;
    organizationName: string;
    category: string;
    total: number;
    adopted: number;
    completedYes: number;
    completedNo: number;
}

interface Props {
    data: SuggestionCategoryStatsRow[];
    isLoading?: boolean;
    preselectedOrgId?: string;
}

export default function SuggestionCategoryStats({ data, isLoading, preselectedOrgId }: Props) {
    const [search, setSearch] = useState('');
    const [selectedOrgId, setSelectedOrgId] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const orgs = useMemo(() => {
        const map = new Map<string, string>();
        data.forEach(r => map.set(String(r.organizationId), r.organizationName));
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
    }, [data]);

    useEffect(() => {
        setSelectedOrgId(preselectedOrgId ?? '');
        setSearch('');
        setDropdownOpen(false);
    }, [preselectedOrgId]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node))
                setDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const selectedOrgName = orgs.find(o => o.id === selectedOrgId)?.name ?? '';

    const filteredOrgs = useMemo(() =>
        search.trim() ? orgs.filter(o => o.name.includes(search.trim())) : orgs,
        [orgs, search]
    );

    const selectedRows = useMemo(() =>
        selectedOrgId ? data.filter(r => String(r.organizationId) === selectedOrgId) : [],
        [data, selectedOrgId]
    );

    const totalSum = selectedRows.reduce((s, r) => s + r.total, 0);
    const adoptedSum = selectedRows.reduce((s, r) => s + r.adopted, 0);
    const completedYesSum = selectedRows.reduce((s, r) => s + r.completedYes, 0);
    const completedNoSum = selectedRows.reduce((s, r) => s + r.completedNo, 0);

    if (isLoading) return (
        <div className="flex items-center justify-center py-12 text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500 mr-3"></div>
            載入中...
        </div>
    );

    return (
        <div>
            {/* Combobox */}
            <div ref={containerRef} className="relative mb-6 w-80">
                <div className="relative flex items-center">
                    <input
                        value={selectedOrgId ? selectedOrgName : search}
                        onChange={e => { setSearch(e.target.value); setSelectedOrgId(''); setDropdownOpen(true); }}
                        onFocus={() => { if (!selectedOrgId) setDropdownOpen(true); }}
                        placeholder={orgs.length === 0 ? '無資料' : '搜尋或選擇工廠...'}
                        disabled={orgs.length === 0}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    {(selectedOrgId || search) ? (
                        <button
                            onClick={() => { setSelectedOrgId(''); setSearch(''); setDropdownOpen(false); }}
                            className="absolute right-2 text-gray-400 hover:text-gray-600 text-lg leading-none"
                        >×</button>
                    ) : (
                        <span className="absolute right-2 text-gray-400 pointer-events-none text-xs">▾</span>
                    )}
                </div>

                {dropdownOpen && !selectedOrgId && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {filteredOrgs.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-400">找不到符合的工廠</div>
                        ) : filteredOrgs.map(org => (
                            <div
                                key={org.id}
                                onMouseDown={() => { setSelectedOrgId(org.id); setSearch(''); setDropdownOpen(false); }}
                                className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm text-gray-700"
                            >
                                {org.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Result */}
            {!selectedOrgId ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                    請從上方搜尋或選擇工廠以查看統計資料
                </div>
            ) : selectedRows.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                    該工廠無改善建議類別資料
                </div>
            ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-teal-50 px-4 py-2 font-semibold text-teal-800 text-sm">
                        {selectedOrgName}
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600">
                                <th className="text-left px-4 py-2 font-medium">類別</th>
                                <th className="text-center px-4 py-2 font-medium">改善建議數</th>
                                <th className="text-center px-4 py-2 font-medium">參採數</th>
                                <th className="text-center px-4 py-2 font-medium">已完成</th>
                                <th className="text-center px-4 py-2 font-medium">未完成</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedRows.map(row => (
                                <tr key={row.category} className="border-t border-gray-100 hover:bg-gray-50">
                                    <td className="px-4 py-2 text-gray-700">{row.category}</td>
                                    <td className="text-center px-4 py-2">{row.total}</td>
                                    <td className="text-center px-4 py-2 text-blue-600">{row.adopted}</td>
                                    <td className="text-center px-4 py-2 text-emerald-600">{row.completedYes}</td>
                                    <td className="text-center px-4 py-2 text-red-500">{row.completedNo}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                                <td className="px-4 py-2 text-gray-700">合計</td>
                                <td className="text-center px-4 py-2">{totalSum}</td>
                                <td className="text-center px-4 py-2 text-blue-600">{adoptedSum}</td>
                                <td className="text-center px-4 py-2 text-emerald-600">{completedYesSum}</td>
                                <td className="text-center px-4 py-2 text-red-500">{completedNoSum}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}

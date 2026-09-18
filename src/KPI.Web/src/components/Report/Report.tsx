'use client';
import React, { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import SelectEnterprise, { SelectionPayload } from "@/components/select/selectOnlyEnterprise";
import SuggestionPieChart from "@/components/Report/ReportAggridchart";
import Aggridline from "@/components/aggridline";
import RankingSugAg from "@/components/Report/RankingSugAg";
import RankingKpi from "@/components/Report/RankingKpi";
import SuggestionCategoryStats, { SuggestionCategoryStatsRow } from "@/components/Report/SuggestionCategoryStats";
import KpiReportHistory from "@/components/Report/KpiReportHistory";
import SuggestHistory from "@/components/Report/SuggestHistory";
import { toast } from "react-hot-toast";
import { useauthStore } from "@/Stores/authStore";
import { getAccessToken } from "@/services/serverAuthService";
import { enterpriseService } from "@/services/selectCompany";
import api from "@/services/apiService"
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";


interface CompletionRateCard {
    kpiFieldId: number;
    kpiFieldName: string;
    completionRate: number;
}

export default function Report() {
    const [cards, setCards] = useState<CompletionRateCard[]>([]);
    const [selection, setSelection] = useState<SelectionPayload>({
        orgId: '',
        orgName: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [hasToken, setHasToken] = useState(false);

    const [categoryStats, setCategoryStats] = useState<SuggestionCategoryStatsRow[]>([]);
    const [categoryStatsLoading, setCategoryStatsLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalCard, setModalCard] = useState<CompletionRateCard | null>(null);

    const { userRole, userOrgId, permissions } = useauthStore();
    const canViewRanking = permissions.includes("view-ranking");
    const canExportStats = userRole === 'admin' || userRole === 'superAdmin';

    useEffect(() => {
        getAccessToken().then(token => setHasToken(!!token?.value));
    }, []);

    // ✅ 共用拉資料邏輯
    const fetchRates = async (orgId?: string) => {
        setIsLoading(true);
        try {
            const token = await getAccessToken();
            const response = await api.get("/Report/GetCompletionRates", {
                params: orgId ? { organizationId: orgId } : {},
                headers: { Authorization: `Bearer ${token?.value}` }
            });

            if (response.data?.success) {
                setCards(response.data.data);
            } else {
                toast.error("無法取得完成率資料");
            }
        } catch (error) {
            console.error("錯誤發生:", error);
            toast.error("查詢失敗");
        } finally {
            setIsLoading(false);
        }
    };

    const exportCategoryStatsCSV = () => {
        if (categoryStats.length === 0) return;
        const BOM = '﻿';
        const headers = ['廠商名稱', '類別', '改善建議數', '參採數', '已完成', '未完成'];
        const rows = categoryStats.map(r => [
            `"${r.organizationName.replace(/"/g, '""')}"`,
            `"${r.category.replace(/"/g, '""')}"`,
            r.total,
            r.adopted,
            r.completedYes,
            r.completedNo,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '改善建議統計.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const fetchCategoryStats = async () => {
        setCategoryStatsLoading(true);
        try {
            const token = await getAccessToken();
            const res = await api.get("/Report/suggestion-category-stats", {
                headers: { Authorization: `Bearer ${token?.value}` },
            });
            if (res.data?.success) setCategoryStats(res.data.data);
        } catch (e) {
            console.error(e);
        } finally {
            setCategoryStatsLoading(false);
        }
    };

    useEffect(() => {
        if (hasToken) fetchCategoryStats();
    }, [hasToken]);

    // ✅ 初始化時若為公司角色，鎖定自己的組織並帶入名稱
    useEffect(() => {
        const init = async () => {
            if (userRole === 'company' && userOrgId) {
                const enterprises = await enterpriseService.fetchData();
                let foundName = '';

                for (const e of enterprises) {
                    if (e.id === userOrgId) { foundName = e.name; break; }
                    for (const c of e.children || []) {
                        if (c.id === userOrgId) { foundName = c.name; break; }
                        for (const f of c.children || []) {
                            if (f.id === userOrgId) { foundName = f.name; break; }
                        }
                    }
                }

                setSelection({
                    orgId: userOrgId.toString(),
                    orgName: foundName,
                });
                await fetchRates(userOrgId.toString());
            }
        };

        init();
    }, [userRole, userOrgId]);

    // ✅ 使用者互動更新資料
    useEffect(() => {
        if (selection.orgId) fetchRates(selection.orgId);
        else fetchRates(); // 查全部
    }, [selection.orgId]);

    const getCompletionRateColor = (rate: number) => {
        if (rate >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (rate >= 70) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (rate >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getProgressBarColor = (rate: number) => {
        if (rate >= 90) return 'bg-emerald-500';
        if (rate >= 70) return 'bg-blue-500';
        if (rate >= 50) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const LoginRequiredPlaceholder = () => (
        <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-2">登入後即可查詢</h3>
        </div>
    );

    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "報表" }
    ];

    return (
        <>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-slate-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="mt-6">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                報表
                            </h1>
                            <div
                                className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-4"></div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="space-y-8">

                        {/* Filter Section */}
                        <div
                            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center mb-4">
                                <div className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></div>
                                <h2 className="text-xl font-semibold text-gray-800">篩選條件</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <SelectEnterprise
                                    onSelectionChange={(s) => {
                                        console.log("選到：", s);
                                        setSelection(s);
                                    }}
                                />
                            </div>
                        </div>

                        {/* KPI Cards Section */}
                        <div
                            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <div className="w-2 h-6 bg-blue-500 rounded-full mr-3"></div>
                                    <h2 className="text-xl font-semibold text-gray-800">
                                        各類型改善建議完成率
                                        {/*<span*/}
                                        {/*    className="ml-2 text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">*/}
                                        {/*    {selection.orgName || "所有公司"}*/}
                                        {/*</span>*/}
                                    </h2>
                                </div>
                                {isLoading && (
                                    <div className="flex items-center text-gray-500">
                                        <div
                                            className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500 mr-2"></div>
                                        載入中...
                                    </div>
                                )}
                            </div>

                            {!hasToken ? (
                                <LoginRequiredPlaceholder />
                            ) : cards.length === 0 ? (
                                <div className="text-center py-16">
                                    <div
                                        className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-500 mb-2">目前無資料</h3>
                                    <p className="text-sm text-gray-400">請選擇其他篩選條件或稍後再試</p>
                                </div>
                            ) : (
                                <div
                                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {cards.map((card, index) => (
                                        <div
                                            key={card.kpiFieldId}
                                            onClick={() => { setModalCard(card); setModalOpen(true); }}
                                            className={`relative overflow-hidden rounded-xl border-2 p-6 transition-all duration-300 hover:scale-105 hover:shadow-lg cursor-pointer group ${getCompletionRateColor(card.completionRate)}`}
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-12 h-12 rounded-lg bg-white/50 flex items-center justify-center">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                                                    </svg>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-3xl font-bold">{card.completionRate}%</p>
                                                </div>
                                            </div>
                                            <h3 className="font-semibold text-base mb-3 leading-tight">
                                                {card.kpiFieldName} 改善完成率
                                            </h3>
                                            <div className="w-full bg-white/30 rounded-full h-2 mb-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all duration-1000 ${getProgressBarColor(card.completionRate)}`}
                                                    style={{width: `${card.completionRate}%`}}
                                                ></div>
                                            </div>
                                            <p className="text-xs opacity-0 group-hover:opacity-60 transition-opacity duration-200 text-center">
                                                點擊查看各廠統計
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Suggestion Category Stats Section */}
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="w-2 h-6 bg-teal-500 rounded-full mr-3"></div>
                                    <h2 className="text-xl font-semibold text-gray-800">改善建議統計（各廠各類別）</h2>
                                </div>
                                {canExportStats && (
                                    <button
                                        onClick={exportCategoryStatsCSV}
                                        disabled={categoryStats.length === 0}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                        </svg>
                                        匯出 CSV
                                    </button>
                                )}
                            </div>
                            {hasToken ? (
                                <SuggestionCategoryStats
                                    data={categoryStats}
                                    isLoading={categoryStatsLoading}
                                    preselectedOrgId={selection.orgId}
                                />
                            ) : (
                                <LoginRequiredPlaceholder />
                            )}
                        </div>

                        {/* Charts Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div
                                className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                                <div className="flex items-center mb-4">
                                    <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>
                                    <h2 className="text-xl font-semibold text-gray-800">改善建議分佈圖</h2>
                                </div>
                                {hasToken ? (
                                    <div className="h-[450px]">
                                        <SuggestionPieChart
                                            organizationId={selection.orgId}
                                            organizationName={selection.orgName || "所有公司"}
                                        />
                                    </div>
                                ) : (
                                    <LoginRequiredPlaceholder />
                                )}
                            </div>
                            <div
                                className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                                <div className="flex items-center mb-4">
                                    <div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
                                    <h2 className="text-xl font-semibold text-gray-800">KPI趨勢分析</h2>
                                </div>
                                {hasToken ? (
                                    <div className="h-[450px]">
                                        <Aggridline
                                            organizationId={selection.orgId}
                                            organizationName={selection.orgName || "所有公司"}
                                        />
                                    </div>
                                ) : (
                                    <LoginRequiredPlaceholder />
                                )}
                            </div>
                        </div>

                        {/* Ranking Section */}
                        {canViewRanking && (
                            <div className="space-y-6">
                                <div
                                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className="w-2 h-6 bg-yellow-500 rounded-full mr-3"></div>
                                        <h2 className="text-xl font-semibold text-gray-800">建議排名</h2>
                                    </div>
                                    <RankingSugAg/>
                                </div>
                                <div
                                    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className="w-2 h-6 bg-red-500 rounded-full mr-3"></div>
                                        <h2 className="text-xl font-semibold text-gray-800">KPI 排名</h2>
                                    </div>
                                    <RankingKpi/>
                                </div>
                            </div>
                        )}
                        {/* 填報修改歷程（admin/superAdmin only） */}
                        {canExportStats && (
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>
                                        <h2 className="text-xl font-semibold text-gray-800">KPI 填報修改歷程</h2>
                                        <span className="ml-3 text-xs text-gray-400">僅顯示曾退回修改的 KPI 項目</span>
                                    </div>
                                    <KpiReportHistory />
                                </div>
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-300">
                                    <div className="flex items-center mb-4">
                                        <div className="w-2 h-6 bg-teal-500 rounded-full mr-3"></div>
                                        <h2 className="text-xl font-semibold text-gray-800">委員建議修改歷程</h2>
                                        <span className="ml-3 text-xs text-gray-400">顯示廠商填報委員建議後的修改紀錄</span>
                                    </div>
                                    <SuggestHistory />
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
            {/* Category Detail Modal */}
            {modalOpen && modalCard && (() => {
                const rows = categoryStats.filter(r => r.category === modalCard.kpiFieldName);
                const tTotal = rows.reduce((s, r) => s + r.total, 0);
                const tAdopted = rows.reduce((s, r) => s + r.adopted, 0);
                const tYes = rows.reduce((s, r) => s + r.completedYes, 0);
                const tNo = rows.reduce((s, r) => s + r.completedNo, 0);
                return (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                        onClick={() => setModalOpen(false)}
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800">{modalCard.kpiFieldName}</h3>
                                    <p className="text-sm text-gray-500 mt-0.5">各廠改善建議統計</p>
                                </div>
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >×</button>
                            </div>
                            <div className="overflow-auto flex-1 p-6">
                                {rows.length === 0 ? (
                                    <div className="text-center text-gray-400 py-10">此類別無資料</div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600">
                                                <th className="text-left px-4 py-2 font-medium">廠商名稱</th>
                                                <th className="text-center px-4 py-2 font-medium">改善建議數</th>
                                                <th className="text-center px-4 py-2 font-medium">參採數</th>
                                                <th className="text-center px-4 py-2 font-medium">已完成</th>
                                                <th className="text-center px-4 py-2 font-medium">未完成</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(r => (
                                                <tr key={r.organizationId} className="border-t border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 py-2 text-gray-700">{r.organizationName}</td>
                                                    <td className="text-center px-4 py-2">{r.total}</td>
                                                    <td className="text-center px-4 py-2 text-blue-600">{r.adopted}</td>
                                                    <td className="text-center px-4 py-2 text-emerald-600">{r.completedYes}</td>
                                                    <td className="text-center px-4 py-2 text-red-500">{r.completedNo}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                                                <td className="px-4 py-2 text-gray-700">合計</td>
                                                <td className="text-center px-4 py-2">{tTotal}</td>
                                                <td className="text-center px-4 py-2 text-blue-600">{tAdopted}</td>
                                                <td className="text-center px-4 py-2 text-emerald-600">{tYes}</td>
                                                <td className="text-center px-4 py-2 text-red-500">{tNo}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
}
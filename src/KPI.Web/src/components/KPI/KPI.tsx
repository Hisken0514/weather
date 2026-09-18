'use client';

import React, {useRef, useState} from 'react';
import GridComponent,{IRow} from "@/components/KpiAggrid";
import Breadcrumbs from "@/components/Breadcrumbs";
import SelectKpiEntriesByDate, { SelectionPayload } from "@/components/select/selectKpiEntriesByDate";
import { useRouter } from "next/navigation";
import { ColDef } from "ag-grid-community";
import { Toaster, toast } from 'react-hot-toast';
import type { AgGridReact as AgGridReactType } from 'ag-grid-react';
import type { RowNode } from 'ag-grid-community';
import api from "@/services/apiService"
import {getAccessToken} from "@/services/serverAuthService";
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const categories = [
    { id: "tab_all", name: "全部類別"},
    { id: "製程安全管理", name: "製程安全管理(PSM)"},
    { id: "環保管理", name: "環保管理(EP)"},
    { id: "消防管理", name: "消防管理(FR)"},
    { id: "能源管理", name: "能源管理(ECO)"}
];

const columnTitleMap: Record<string, string> = {
    company: "工廠名稱",
    productionSite: "工場/製程區",
    category: "指標類型",
    field: "指標領域",
    indicatorNumber: "指標編號",
    indicatorName: "指標名稱",
    detailItemId: "指標細項編號",
    detailItemName: "指標細項名稱",
    unit: "單位",
    isIndicator:"是否是指標(否為計算項目)",
    isApplied: "是否應用",
    baselineYear: "基線年",
    baselineValue: "基線值",
    targetValue: "目標值",
    remarks: "備註",
    reports: "歷史所有執行狀況",
    comparisonOperator: "公式",
    lastBaselineYear: "基線年",
    lastBaselineValue: "基線值",
    lastTargetValue: "目標值",
    lastKpiCycleName: "最新循環",
    lastComparisonOperator: "公式",
    lastRemarks: "備註",
    lastReportYear: "最新年份",
    lastReportPeriod: "最新季度",
    latestReportYear_Period: "最新執行年份季度",
    lastReportValue: "執行現況",
    kpiCycleName: "循環名稱",
    kpiCycleStartYear: "循環開始年份",
    kpiCycleEndYear: "循環結束年份",
};

export default function KPI() {
    const [activeTab, setActiveTab] = useState("tab_all");
    const [activeType, setActiveType] = useState("type_all");
    const [rowData, setRowData] = useState<any[]>([]);
    const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [keyword, setKeyword] = useState("");

    const router = useRouter();
    const [exportMode, setExportMode] = useState<'all' | 'failed'>('all');
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "檢視績效指標" }
    ];

    const [selection, setSelection] = useState<SelectionPayload>({ orgId: "" });

    const gridRef = useRef<AgGridReactType<any>>(null);

    const handleQuery = async () => {
        const token = await getAccessToken();
        if (!token?.value) {
            toast.error("請先登入後再查詢");
            return;
        }

        setIsLoading(true);
        const params = {
            organizationId: selection.orgId || undefined,
            startYear: selection.startYear || undefined,
            endYear: selection.endYear || undefined,
            startQuarter: selection.startQuarter || undefined,
            endQuarter: selection.endQuarter || undefined,
            keyword: keyword || undefined,
        };

        try {
            const response = await api.get("/Kpi/display", {
                headers: {Authorization: `Bearer ${token.value}`},
                params, timeout: 90000,
            });

            if (response.data?.success) {
                const raw = response.data.data;
                setRowData(raw);
                toast.success(`查詢成功，回傳 ${raw.length} 筆資料`);

                if (raw.length > 0) {
                    const keys = Object.keys(raw[0]).filter(k => k !== 'kpiDatas');
                    const columns = keys.map((key) => ({
                        field: key,
                        headerName: columnTitleMap[key] || key,
                        valueFormatter: (p: any) => p.value ?? "-",
                        cellStyle: { textAlign: "left" },
                        hide: ['id', 'detailItemId', 'isIndicator', 'field', 'productionSite', 'indicatorNumber', 'category', 'lastKpiCycleName', 'lastRemarks', 'lastReportYear', 'lastReportPeriod', 'lastComparisonOperator'].includes(key),
                    }));
                    setColumnDefs(columns);
                }
            } else {
                toast.error(response.data?.message || "查詢失敗，請稍後再試");
            }
        } catch (error: any) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage ? `查詢失敗：${apiMessage}` : (error?.message || "API 發生錯誤"));
        } finally {
            setIsLoading(false);
        }
    };

    const exportData = (type: 'excel' | 'csv') => {
        const api = gridRef.current?.api;
        if (!api) return;

        const fileNamePrefix = exportMode === 'failed' ? '未達標資料' : '指標資料';
        const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}`;

        if (exportMode === 'all') {
            if (type === 'excel') {
                api.exportDataAsExcel({ fileName: `${fileName}.xlsx` });
            } else {
                api.exportDataAsCsv({ fileName: `${fileName}.csv`, bom: true } as any);
            }
            return;
        }

        const failedNodes: RowNode<IRow>[] = [];
        api.forEachNodeAfterFilterAndSort((node: any) => {
            const data = node.data;
            if (!data?.isIndicator) return;

            const { lastReportValue: actual, lastTargetValue: target, lastComparisonOperator: operator } = data;
            let meets = true;
            if (typeof actual === 'number' && typeof target === 'number') {
                switch (operator) {
                    case '>=': meets = actual >= target; break;
                    case '<=': meets = actual <= target; break;
                    case '>': meets = actual > target; break;
                    case '<': meets = actual < target; break;
                    case '=':
                    case '==': meets = actual === target; break;
                }
            }
            if (!meets) failedNodes.push(node);
        });

        api.deselectAll();
        failedNodes.forEach((node: any) => node.setSelected(true));

        if (type === 'excel') {
            api.exportDataAsExcel({ fileName: `${fileName}.xlsx`, onlySelected: true });
        } else {
            const csv = api.getDataAsCsv({ onlySelected: true });
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", `${fileName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        api.deselectAll();
    };

    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    className: "bg-neutral-900 text-white", // 👈 不受暗/亮模式影響
                    success: {
                        className: "bg-green-600 text-white",
                    },
                    error: {
                        className: "bg-red-600 text-white",
                    },
                }}
            />
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            {/* Background with gradient */}
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-slate-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="mt-6">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                績效指標儀表板
                            </h1>
                            <div
                                className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-4"></div>
                        </div>

                    </div>
                </div>

                {/* Main content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Action bar */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-gray-600">
                            </div>
                        </div>

                        <button type="button"
                                onClick={async () => {
                                    const token = await getAccessToken();
                                    if (!token?.value) {
                                        toast.error("請先登入後再操作");
                                        return;
                                    }
                                    router.push("/kpi/newKpi");
                                }}
                                className="btn flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transform hover:scale-105">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                            </svg>
                            新增指標
                        </button>
                    </div>
                    {/* Combined Filter and Category section */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {/* Left column - Date filter */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <div className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></div>
                                    篩選條件
                                </h3>
                                <div
                                    className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <details className="group">
                                        <summary
                                            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-gray-50 rounded-lg transition-colors duration-200 custom-select">
                                            <span
                                                className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                                </svg>
                                                選擇日期與公司條件
                                            </span>
                                            <svg
                                                className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform duration-200"
                                                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M19 9l-7 7-7-7"/>
                                            </svg>
                                        </summary>
                                        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                                            <SelectKpiEntriesByDate onSelectionChange={(s) => setSelection(s)}/>
                                        </div>
                                    </details>
                                </div>
                            </div>

                            {/* Right column - Category and Type filters */}
                            <div className="space-y-6 relative">
                                {/* Category selection */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>
                                        類別選擇
                                    </h3>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                        {categories.map((category) => (
                                            <button
                                                key={category.id}
                                                className={`btn flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm ${
                                                    activeTab === category.id
                                                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-105"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                                                }`}
                                                onClick={() => setActiveTab(category.id)}
                                            >
                                                <span className="truncate">{category.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Type selection */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>
                                        指標類型
                                    </h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            {id: "type_all", name: "全部", icon: "📋"},
                                            {id: "basic", name: "基礎型指標", icon: "🔧"},
                                            {id: "custom", name: "客製型指標", icon: "⚙️"}
                                        ].map((type) => (
                                            <button
                                                key={type.id}
                                                className={`btn flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm ${
                                                    activeType === type.id
                                                        ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md transform scale-105"
                                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                                                }`}
                                                onClick={() => setActiveType(type.id)}
                                            >
                                                <span>{type.icon}</span>
                                                <span className="truncate">{type.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Query button positioned at bottom right */}
                                <div className="flex justify-end pt-4">
                                    <button
                                        type="button"
                                        className="btn flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-md transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap"
                                        onClick={handleQuery}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" fill="none"
                                                     viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10"
                                                            stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor"
                                                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                查詢中
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                     viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                                </svg>
                                                查詢
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Data grid */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                                    </svg>
                                    數據總覽
                                </h3>
                                {rowData.length > 0 && (
                                    <div
                                        className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        共 {rowData.length} 筆記錄
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                            <div
                                className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                {/* 搜尋欄位 */}
                                <div className="relative flex-1 max-w-md">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        aria-label="搜尋指標"
                                        placeholder="搜尋指標名稱、編號..."
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-center space-x-3">
                                    {/* 匯出條件 */}
                                    <select
                                        aria-label="匯出選項"
                                        className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-transparent custom-select"
                                        value={exportMode}
                                        onChange={(e) => setExportMode(e.target.value as any)}
                                    >
                                        <option value="all">匯出篩選結果</option>
                                        <option value="failed">匯出篩選結果未達標</option>
                                    </select>

                                    {/* 匯出按鈕 */}
                                    <button
                                        onClick={() => exportData('excel')}
                                        className="btn inline-flex items-center px-4 py-3 border border-green-300 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-offset-2"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        匯出 Excel
                                    </button>

                                    <button
                                        onClick={() => exportData('csv')}
                                        className="btn inline-flex items-center px-4 py-3 border border-blue-300 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-offset-2"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        匯出 CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none"
                                         viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor"
                                                strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <p className="text-gray-600 text-lg">正在載入資料...</p>
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden border border-gray-200">
                                    <GridComponent
                                        ref={gridRef}
                                        rowData={rowData}
                                        columnDefs={columnDefs}
                                        activeCategory={activeTab}
                                        activeType={activeType}
                                        columnTitleMap={columnTitleMap}
                                        isLoading={isLoading}
                                        quickFilterText={keyword}
                                        onExportData={exportData}

                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry } from 'ag-grid-community';
import { AG_GRID_LOCALE_TW } from '@ag-grid-community/locale';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { Toaster, toast } from 'react-hot-toast';
import Breadcrumbs from '@/components/Breadcrumbs';
import {getAccessToken} from "@/services/serverAuthService";
import api from "@/services/apiService"
ModuleRegistry.registerModules([AllEnterpriseModule]);

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";


interface SuggestData {
    id: number;
    organizationName: string;
    date: string;
    suggestEventTypeName: string;
}

interface SuggestReport {
    id: number;
    organizationName: string;
    date: string;
    suggestEventTypeName: string;
    committee?: string;
    suggestion?: string;
    suggestionType?: string;
    respDept?: string;
    improveDetails?: string;
    isAdopted?: string;
    completed?: string;
    doneYear?: number;
    doneMonth?: number;
    parallelExec?: string;
    execPlan?: string;
    remark?: string;
    category?: string;
    manpower?: number;
    budget?: number;
}

export default function SuggestDetailPage() {
    const { id } = useParams();
    const gridRef = useRef<AgGridReact<SuggestReport>>(null);
    const [suggestData, setSuggestData] = useState<SuggestData | null>(null);
    const [reports, setReports] = useState<SuggestReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [exportFilter, setExportFilter] = useState<'all' | 'incomplete'>('all');

    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "委員回覆及改善建議", href: `${NPbasePath}/suggest` },
        { label: "委員回覆及改善建議詳情" },
    ];


    const exportData = (type: 'excel' | 'csv') => {
        const api = gridRef.current?.api;
        if (!api) return;

        const fileName = `建議清單_${new Date().toISOString().slice(0, 10)}`;
        let exportRows = [...reports];

        if (exportFilter === 'incomplete') {
            exportRows = exportRows.filter((r) => r.isAdopted === '是' && r.completed === '否');
        }

        const exportIds = new Set(exportRows.map(r => r.id));

        if (type === 'excel') {
            api.deselectAll();
            api.forEachNode((node) => {
                if (node.data && exportIds.has(node.data.id)) node.setSelected(true);
            });
            api.exportDataAsExcel({ fileName: `${fileName}.xlsx`, onlySelected: true });
            api.deselectAll();
        } else {
            const displayedCols = api.getAllDisplayedColumns();
            const headers = displayedCols.map((col) => col.getColDef().headerName ?? col.getColId());
            const fields = displayedCols.map((col) => col.getColId());
            const csvRows = exportRows.map((r) => fields.map((field) => `"${(r as any)[field] ?? ''}"`).join(','));
            const csvContent = [headers.join(','), ...csvRows].join('\n');
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `${fileName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const columnDefs: ColDef<SuggestReport>[] = [
        { field: 'organizationName', headerName: '廠商', hide: true },
        { field: 'date', headerName: '日期', hide: true },
        { field: 'suggestEventTypeName', headerName: '會議類型', hide: true },
        { field: 'committee', headerName: '委員' },
        { field: 'category', headerName: '類別' },
        { field: 'suggestion', headerName: '建議內容', flex: 2 },
        { field: 'suggestionType', headerName: '建議類別' },
        { field: 'respDept', headerName: '責任部門' },
        { field: 'improveDetails', headerName: '改善對策' , flex: 2},
        { field: 'isAdopted', headerName: '是否參採' },
        { field: 'completed', headerName: '是否完成' },
        { field: 'doneYear', headerName: '完成年' },
        { field: 'doneMonth', headerName: '完成月' },
        { field: 'parallelExec', headerName: '平行展開', hide: true },
        { field: 'execPlan', headerName: '平行展開執行計畫', hide: true },
        { field: 'manpower', headerName: '投入人力', hide: true },
        { field: 'budget', headerName: '投入經費', hide: true },
        { field: 'remark', headerName: '備註', flex: 1 , hide: true},
    ];

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const token = await getAccessToken(); // 你應該已有這個方法
                const res = await api.get(`/Suggest/GetSuggestDetail/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token?.value}`,
                    }
                });

                setSuggestData(res.data);
                setReports((res.data.reports || []).map((r: SuggestReport) => ({
                    ...r,
                    organizationName: res.data.organizationName,
                    date: res.data.date,
                    suggestEventTypeName: res.data.suggestEventTypeName,
                })));
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 403) {
                    toast.error("您沒有權限查看這筆資料");
                } else if (status === 401) {
                    toast.error("尚未登入或登入已過期，請重新登入");
                } else if (status === 404) {
                    toast.error("找不到該筆建議詳情資料");
                } else {
                    console.error("取得詳情失敗", err);
                    toast.error("發生錯誤，請稍後再試");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="mt-4 text-gray-600 text-lg">載入中...</p>
                </div>
            </div>
        );
    }

    if (!suggestData) {
        return (
            <>
                <div className="w-full flex justify-start">
                    <Breadcrumbs items={breadcrumbItems}/>
                </div>
                <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <div className="text-center">
                                <div className="text-6xl mb-4">❌</div>
                                <p className="text-red-600 text-lg">找不到資料</p>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-slate-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="mt-6">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                委員回覆及改善建議詳情
                            </h1>
                            <div
                                className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-4"></div>
                        </div>

                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Main Info Card */}
                    <div
                        className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8 transform hover:scale-[1.01] transition-transform duration-300">
                        <div className="flex items-center mb-6">
                            <div className="p-3 bg-blue-100 rounded-full mr-4">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">主檔資訊</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div
                                className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                                <div className="flex items-center mb-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-blue-700">廠商</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{suggestData.organizationName}</p>
                            </div>

                            <div
                                className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                                <div className="flex items-center mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-green-700">日期</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{suggestData.date}</p>
                            </div>

                            <div
                                className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                                <div className="flex items-center mb-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                                    <span className="text-sm font-medium text-purple-700">會議類型</span>
                                </div>
                                <p className="text-lg font-bold text-gray-900">{suggestData.suggestEventTypeName}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        {/* Section Header */}
                        <div
                            className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="p-3 bg-indigo-100 rounded-full mr-4">
                                        <svg className="w-6 h-6 text-indigo-600" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">對應建議列表</h2>
                                        <p className="text-sm text-gray-600 mt-1">共 {reports.length} 筆建議</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                            <div
                                className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                {/* Search */}
                                <div className="relative flex-1 max-w-md">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none"
                                             stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="搜尋建議內容..."
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-transparent"
                                    />
                                </div>

                                {/* Export Controls */}
                                <div className="flex items-center space-x-3">
                                    <select
                                        aria-label="匯出選項"
                                        className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:border-transparent custom-select"
                                        value={exportFilter}
                                        onChange={(e) => setExportFilter(e.target.value as 'all' | 'incomplete')}
                                    >
                                        <option value="all">匯出全部</option>
                                        <option value="incomplete">匯出未完成</option>
                                    </select>

                                    <button
                                        onClick={() => exportData('excel')}
                                        className="inline-flex items-center px-4 py-3 border border-green-300 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none custom-select"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        匯出 Excel
                                    </button>

                                    <button
                                        onClick={() => exportData('csv')}
                                        className="inline-flex items-center px-4 py-3 border border-blue-300 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none custom-select"
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                        </svg>
                                        匯出 CSV
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {reports.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🔍</div>
                                    <p className="text-gray-500 text-lg">查無符合條件的建議</p>
                                </div>
                            ) : (
                                <div
                                    className="ag-theme-quartz rounded-xl overflow-hidden shadow-sm border border-gray-200"
                                    style={{height: '700px'}}>
                                    <AgGridReact
                                        ref={gridRef}
                                        localeText={AG_GRID_LOCALE_TW}
                                        rowData={reports}
                                        quickFilterText={keyword}
                                        columnDefs={columnDefs}
                                        rowSelection="multiple"
                                        sideBar={{
                                            toolPanels: [
                                                {
                                                    id: 'columns',
                                                    labelDefault: '欄位',
                                                    labelKey: 'columns',
                                                    iconKey: 'columns',
                                                    toolPanel: 'agColumnsToolPanel'
                                                },
                                                {
                                                    id: 'filters',
                                                    labelDefault: '篩選',
                                                    labelKey: 'filters', // ✅ 補上 labelKey
                                                    iconKey: 'filter',
                                                    toolPanel: 'agFiltersToolPanel'
                                                },
                                            ],
                                            defaultToolPanel: '',
                                        }}
                                        defaultColDef={{
                                            sortable: true,
                                            filter: true,
                                            resizable: true,
                                            flex: 1,
                                            wrapText: true,
                                            autoHeight: true,
                                            cellStyle: {whiteSpace: 'normal', lineHeight: '1.5em'},
                                        }}
                                        pagination={true}
                                        paginationPageSize={20}
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

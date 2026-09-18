'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ModuleRegistry } from 'ag-grid-community';
import { AG_GRID_LOCALE_TW } from '@ag-grid-community/locale';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { Toaster, toast } from 'react-hot-toast';
import Breadcrumbs from '@/components/Breadcrumbs';
import { getAccessToken } from '@/services/serverAuthService';
import api from '@/services/apiService';

ModuleRegistry.registerModules([AllEnterpriseModule]);

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface SuggestReport {
    id: number;
    organizationName: string;
    date: string;
    suggestEventTypeName: string;
    userName?: string;
    suggestionContent?: string;
    suggestionTypeName?: string;
    respDept?: string;
    improveDetails?: string;
    isAdopted?: string;
    completed?: string;
    doneYear?: number;
    doneMonth?: number;
    parallelExec?: string;
    execPlan?: string;
    remark?: string;
    kpiFieldName?: string;
    manpower?: number;
    budget?: number;
}

export default function SuggestAll() {
    const params = useParams();                  // 例如 /suggest/all/[id]
    const sp = useSearchParams();                // 例如 /suggest/all?orgId=123
    const routeId = (params as any)?.id as string | undefined;
    const queryOrgId = sp.get('orgId') ?? undefined;

    // 同時相容：優先吃 query，其次 params
    const organizationIdRaw = queryOrgId ?? routeId;

    const gridRef = useRef<AgGridReact<SuggestReport>>(null);
    const [reports, setReports] = useState<SuggestReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [exportFilter, setExportFilter] = useState<'all' | 'incomplete'>('all');

    const breadcrumbItems = [
        { label: '首頁', href: `${NPbasePath}/home` },
        { label: '委員回覆及改善建議', href: `${NPbasePath}/suggest` },
        { label: '委員回覆及改善建議詳情' },
    ];

    const columnDefs: ColDef<SuggestReport>[] = [
        { field: 'organizationName', headerName: '廠商' },
        { field: 'date', headerName: '日期' },
        { field: 'suggestEventTypeName', headerName: '會議類型' },
        { field: 'userName', headerName: '委員' },
        { field: 'kpiFieldName', headerName: '類別' },
        { field: 'suggestionContent', headerName: '建議內容', flex: 2 },
        { field: 'suggestionTypeName', headerName: '建議類別' },
        { field: 'respDept', headerName: '責任部門' },
        { field: 'improveDetails', headerName: '改善對策', flex: 2 },
        { field: 'isAdopted', headerName: '是否參採' },
        { field: 'completed', headerName: '是否完成' },
        { field: 'doneYear', headerName: '完成年' },
        { field: 'doneMonth', headerName: '完成月' },
        { field: 'parallelExec', headerName: '平行展開', hide: true },
        { field: 'execPlan', headerName: '平行展開執行計畫', hide: true },
        { field: 'manpower', headerName: '投入人力', hide: true },
        { field: 'budget', headerName: '投入經費', hide: true },
        { field: 'remark', headerName: '備註', flex: 1, hide: true },
    ];

    useEffect(() => {
        const fetchData = async () => {
            if (!organizationIdRaw) {
                setLoading(false);
                toast.error('缺少組織代碼（orgId）');
                return;
            }

            const toNum = (v: any) =>
                v === '' || v === undefined || v === null ? undefined : Number(v);

            setLoading(true);
            try {
                const token = await getAccessToken();
                const params = { organizationId: toNum(organizationIdRaw) }; // 若後端要字串就改成: String(organizationIdRaw)

                const res = await api.get('/Suggest/GetAllSuggest', {
                    headers: { Authorization: `Bearer ${token?.value}` },
                    params,
                });

                const data: SuggestReport[] = Array.isArray(res.data)
                    ? res.data
                    : res.data?.data ?? [];
                console.log(data)
                setReports(data);
                toast.success(`查詢成功，共 ${data.length} 筆`);
            } catch (err: any) {
                const status = err?.response?.status;
                if (status === 403) {
                    toast.error('您沒有權限查看此廠商的資料');
                } else if (status === 401) {
                    toast.error('尚未登入或登入已過期，請重新登入');
                } else {
                    console.error('取得清單失敗', err);
                    toast.error('發生錯誤，請稍後再試');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [organizationIdRaw]);

    const exportData = (type: 'excel' | 'csv') => {
        const apiGrid = gridRef.current?.api;
        if (!apiGrid) return;

        const fileName = `建議清單_${new Date().toISOString().slice(0, 10)}`;

        // 匯出未完成（可選）
        let exportRows = [...reports];
        if (exportFilter === 'incomplete') {
            exportRows = exportRows.filter(
                (r) => r.isAdopted === '是' && r.completed === '否'
            );
        }
        const exportIds = new Set(exportRows.map((r) => r.id));

        if (type === 'excel') {
            apiGrid.deselectAll();
            apiGrid.forEachNode((n) => {
                if (n.data && exportIds.has(n.data.id)) n.setSelected(true);
            });
            apiGrid.exportDataAsExcel({ fileName: `${fileName}.xlsx`, onlySelected: true });
            apiGrid.deselectAll();
        } else {
            const displayedCols = apiGrid.getAllDisplayedColumns();
            const headers = displayedCols.map(
                (c) => c.getColDef().headerName ?? c.getColId()
            );
            const fields = displayedCols.map((c) => c.getColId());
            const csvRows = exportRows.map((r) =>
                fields.map((f) => `"${(r as any)[f] ?? ''}"`).join(',')
            );
            const csvContent = [headers.join(','), ...csvRows].join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], {
                type: 'text/csv;charset=utf-8;',
            });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `${fileName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const searchKeyword = useMemo(() => keyword.trim(), [keyword]);

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

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="mt-6">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                委員回覆及改善建議詳情（依廠商篩選）
                            </h1>
                            <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-4"></div>
                        </div>
                    </div>
                </div>

                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        {/* 控制列 */}
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                <div className="relative flex-1 max-w-md">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg
                                            className="h-5 w-5 text-gray-400"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                            />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="搜尋建議內容..."
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-transparent"
                                    />
                                </div>

                                <div className="flex items-center space-x-3">
                                    <select
                                        aria-label="匯出選項"
                                        className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                        value={exportFilter}
                                        onChange={(e) =>
                                            setExportFilter(e.target.value as 'all' | 'incomplete')
                                        }
                                    >
                                        <option value="all">匯出全部</option>
                                        <option value="incomplete">匯出未完成</option>
                                    </select>

                                    <button
                                        onClick={() => exportData('excel')}
                                        className="inline-flex items-center px-4 py-3 border border-green-300 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none"
                                    >
                                        匯出 Excel
                                    </button>

                                    <button
                                        onClick={() => exportData('csv')}
                                        className="inline-flex items-center px-4 py-3 border border-blue-300 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none"
                                    >
                                        匯出 CSV
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 表格 */}
                        <div className="p-6">
                            {reports.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">🔍</div>
                                    <p className="text-gray-500 text-lg">查無資料</p>
                                </div>
                            ) : (
                                <div
                                    className="ag-theme-quartz rounded-xl overflow-hidden shadow-sm border border-gray-200"
                                    style={{ height: '700px' }}
                                >
                                    <AgGridReact<SuggestReport>
                                        ref={gridRef}
                                        localeText={AG_GRID_LOCALE_TW}
                                        rowData={reports}
                                        quickFilterText={searchKeyword}
                                        columnDefs={columnDefs}
                                        rowSelection="multiple"
                                        sideBar={{
                                            toolPanels: [
                                                {
                                                    id: 'columns',
                                                    labelDefault: '欄位',
                                                    labelKey: 'columns',
                                                    iconKey: 'columns',
                                                    toolPanel: 'agColumnsToolPanel',
                                                },
                                                {
                                                    id: 'filters',
                                                    labelDefault: '篩選',
                                                    labelKey: 'filters',
                                                    iconKey: 'filter',
                                                    toolPanel: 'agFiltersToolPanel',
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
                                            cellStyle: { whiteSpace: 'normal', lineHeight: '1.5em' },
                                        }}
                                        pagination
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
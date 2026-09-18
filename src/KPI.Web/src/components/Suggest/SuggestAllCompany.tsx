'use client';

import React, {useMemo, useRef, useState, useCallback} from 'react';
import {useSearchParams} from 'next/navigation';
import {AgGridReact} from 'ag-grid-react';
import {ColDef, ModuleRegistry, RowNode} from 'ag-grid-community';
import {AllEnterpriseModule} from 'ag-grid-enterprise';
import {AG_GRID_LOCALE_TW} from '@ag-grid-community/locale';
import {Toaster, toast} from 'react-hot-toast';
import Breadcrumbs from '@/components/Breadcrumbs';
import {getAccessToken} from '@/services/serverAuthService';
import api from '@/services/apiService';
import SelectOnlyEnterprise from "@/components/select/selectOnlyEnterprise";
import {IRow} from "@/components/KpiAggrid";

ModuleRegistry.registerModules([AllEnterpriseModule]);

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface SelectionPayload {
    orgId?: string;
    startYear?: string | number;
    endYear?: string | number;
    startQuarter?: string | number;
    endQuarter?: string | number;
}

interface SuggestReport {
    id: number;
    organizationName?: string;
    date?: string;
    suggestEventTypeName?: string;
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

export default function SuggestAllCompany() {
    const sp = useSearchParams();
    const initialOrgId = useMemo(() => sp.get('orgId') ?? '', [sp]);

    // ===== UI/狀態 =====
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<SuggestReport[]>([]);
    const [keyword, setKeyword] = useState('');
    const [activeTab, setActiveTab] = useState<string>('cat_all');
    const [exportMode, setExportMode] = useState<'all' | 'incomplete'>('all');

    // 「查詢條件」：tempSelection 為草稿（表單當下），currentSelection 為已提交的條件（真正打 API 用）
    const [tempSelection, setTempSelection] = useState<SelectionPayload>({
        orgId: initialOrgId || '',
        startYear: '',
        endYear: '',
        startQuarter: '',
        endQuarter: ''
    });
    const [currentSelection, setCurrentSelection] = useState<SelectionPayload>({
        orgId: initialOrgId || '',
        startYear: '',
        endYear: '',
        startQuarter: '',
        endQuarter: ''
    });

    const gridRef = useRef<AgGridReact<SuggestReport>>(null);
    const abortRef = useRef<AbortController | null>(null);

    const categories = [
        {id: 'cat_all', name: '全部'},
        {id: '製程安全管理', name: '製程安全管理'},
        {id: '環保管理', name: '環保管理'},
        {id: '消防管理', name: '消防管理'},
        {id: '能源管理', name: '能源管理'},
    ];

    const cols: ColDef<SuggestReport>[] = [
        {field: 'organizationName', headerName: '廠商', hide: true},
        {field: 'date', headerName: '日期'},
        {field: 'suggestEventTypeName', headerName: '會議類型'},
        {field: 'userName', headerName: '委員'},
        {field: 'kpiFieldName', headerName: '類別'},
        {field: 'suggestionContent', headerName: '建議內容', flex: 2},
        {field: 'suggestionTypeName', headerName: '建議類別'},
        {field: 'respDept', headerName: '責任部門'},
        {field: 'improveDetails', headerName: '改善對策', flex: 2},
        {field: 'isAdopted', headerName: '是否參採'},
        {field: 'completed', headerName: '是否完成'},
        {field: 'doneYear', headerName: '完成年'},
        {field: 'doneMonth', headerName: '完成月'},
        {field: 'parallelExec', headerName: '平行展開', hide: true},
        {field: 'execPlan', headerName: '平行展開執行計畫', hide: true},
        {field: 'manpower', headerName: '投入人力', hide: true},
        {field: 'budget', headerName: '投入經費', hide: true},
        {field: 'remark', headerName: '備註', flex: 1, hide: true},
    ];

    // 關鍵字僅做前端 quick filter（若要也打到 API，可在 buildParams 內加入）
    const searchKeyword = useMemo(() => keyword.trim(), [keyword]);

    // 類別前端篩選：交給資料源前置過濾（避免與 Grid 的快速過濾互相打架）
    const categoryFilteredRows = useMemo(() => {
        if (activeTab === 'cat_all') return rows;
        return rows.filter(r => (r.kpiFieldName ?? '').includes(activeTab));
    }, [rows, activeTab]);


    const [selection, setSelection] = useState<SelectionPayload>({orgId: ""});
    // 主動查詢（只在按下查詢時觸發）
    const handleQuery = async () => {
        setLoading(true);
        const params = {
            organizationId: selection.orgId || undefined,
            startYear: selection.startYear || undefined,
            endYear: selection.endYear || undefined,
            startQuarter: selection.startQuarter || undefined,
            endQuarter: selection.endQuarter || undefined,
            keyword: keyword || undefined,
        };
        try {
            // 可暫時 log 看實際送出的參數型別是否正確
            console.log('[GET] /Suggest/GetAllSuggest params =', params);

            const token = await getAccessToken();
            const res = await api.get('/Suggest/GetAllSuggest', {
                headers: {Authorization: `Bearer ${token?.value}`},
                params,
            });

            const data: SuggestReport[] = Array.isArray(res.data)
                ? res.data
                : (res.data?.data ?? []);
            setRows(data);
            toast.success(`查詢成功，共 ${data.length} 筆`);

            // （可選）同步右側「當前篩選條件」顯示
            setCurrentSelection({
                orgId: selection.orgId,
                startYear: selection.startYear,
                endYear: selection.endYear,
                startQuarter: selection.startQuarter,
                endQuarter: selection.endQuarter,
            });
        } catch (err: any) {
            console.error(err);
            toast.error('載入資料失敗');
        } finally {
            setLoading(false);
        }
    };

    // 匯出：以「目前 Grid 顯示狀態」為準（包含類別前置過濾 + quickFilter + 欄位顯示）
    const exportData = (type: 'excel' | 'csv') => {
        const api = gridRef.current?.api;
        if (!api) return;

        const prefix = exportMode === 'incomplete' ? '未完成資料' : '建議清單';
        const fileName = `${prefix}_${new Date().toISOString().slice(0, 10)}`;

        // 匯出「全部」（尊重目前欄位顯示與 quick filter / 類別分頁）
        if (exportMode === 'all') {
            if (type === 'excel') {
                api.exportDataAsExcel({ fileName: `${fileName}.xlsx` });
            } else {
                // 建議帶 BOM，Excel 開啟才不會亂碼
                const csv = api.getDataAsCsv({});
                const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', `${fileName}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
            return;
        }

        // 匯出「未完成」（isAdopted === '是' && completed === '否'）
        const incompleteNodes: RowNode<SuggestReport>[] = [];
        api.forEachNodeAfterFilterAndSort((node: any) => {
            const d = node.data as SuggestReport | undefined;
            if (!d) return;
            const adopted = (d.isAdopted ?? '').trim() === '是';
            const notCompleted = (d.completed ?? '').trim() === '否';
            if (adopted && notCompleted) {
                incompleteNodes.push(node);
            }
        });

        // 沒資料就提示
        if (incompleteNodes.length === 0) {
            toast('目前視圖沒有「未完成」資料');
            return;
        }

        // 用「只匯出已選取列」的方式輸出
        api.deselectAll();
        incompleteNodes.forEach((n) => n.setSelected(true));

        if (type === 'excel') {
            api.exportDataAsExcel({ fileName: `${fileName}.xlsx`, onlySelected: true });
        } else {
            const csv = api.getDataAsCsv({ onlySelected: true });
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `${fileName}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        api.deselectAll();
    };

    return (
        <>
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={[
                    {label: '首頁', href: `${NPbasePath}/home`},
                    {label: '委員回覆及改善建議', href: `${NPbasePath}/suggest`},
                    {label: '委員回覆及改善建議詳情總表'},
                ]}/>
            </div>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="mt-6">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">委員回覆及改善建議詳情總表</h1>
                            <div
                                className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-4"></div>
                        </div>
                    </div>
                </div>

                {/* 查詢條件 */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                {/* Left: 日期 / 公司條件（草稿） */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <div className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></div>
                                        篩選條件
                                    </h3>
                                    <div
                                        className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                                        <details className="group" open>
                                            <summary
                                                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-gray-50 rounded-lg transition-colors duration-200 custom-select">
                                                <span
                                                    className="text-sm font-medium text-gray-800 flex items-center gap-2">
                                                  <svg className="w-4 h-4 text-gray-500" fill="none"
                                                       stroke="currentColor" viewBox="0 0 24 24">
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
                                                <SelectOnlyEnterprise onSelectionChange={(s) => setSelection(s)}/>
                                            </div>
                                        </details>
                                    </div>
                                </div>

                                {/* Right: 類別 + 摘要 + 操作 */}
                                <div className="space-y-6 relative">
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
                                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md transform scale-105'
                                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                                                    }`}
                                                    onClick={() => setActiveTab(category.id)}
                                                >
                                                    <span className="truncate">{category.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(currentSelection.orgId || currentSelection.startYear || currentSelection.endYear) && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <h4 className="text-sm font-medium text-blue-800 mb-2">當前篩選條件：</h4>
                                            <div className="text-xs text-blue-600 space-y-1">
                                                {currentSelection.orgId && <div>公司：{currentSelection.orgId}</div>}
                                                {(currentSelection.startYear || currentSelection.endYear) && (
                                                    <div>年度：{currentSelection.startYear || '不限'} - {currentSelection.endYear || '不限'}</div>
                                                )}
                                                {(currentSelection.startQuarter || currentSelection.endQuarter) && (
                                                    <div>季度：{currentSelection.startQuarter || '不限'} - {currentSelection.endQuarter || '不限'}</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-4">
                                        <button
                                            type="button"
                                            className="btn flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 py-2.5 rounded-lg font-medium shadow-md transform disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none whitespace-nowrap"
                                            onClick={handleQuery}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" fill="none"
                                                         viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10"
                                                                stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor"
                                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                                    </svg>
                                                    查詢中
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor"
                                                         viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              strokeWidth={2}
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
                </div>

                {/* 列表 + 匯出 */}
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                        {/* 控制列 */}
                        <div className="px-8 py-6 bg-gray-50 border-b border-gray-200">
                            <div
                                className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                <div className="relative flex-1 max-w-md">
                                    <div
                                        className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24"
                                             stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
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
                                        value={exportMode}
                                        onChange={(e) => setExportMode(e.target.value as 'all' | 'incomplete')}
                                    >
                                        <option value="all">匯出全部</option>
                                        <option value="incomplete">匯出未完成</option>
                                    </select>

                                    <button
                                        onClick={() => exportData('excel')}
                                        className="inline-flex items-center px-4 py-3 border border-green-300 rounded-xl text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none"
                                        disabled={loading}
                                    >
                                        匯出 Excel
                                    </button>

                                    <button
                                        onClick={() => exportData('csv')}
                                        className="inline-flex items-center px-4 py-3 border border-blue-300 rounded-xl text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none"
                                        disabled={loading}
                                    >
                                        匯出 CSV
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 表格 */}
                        <div className="p-6">
                            <div className="ag-theme-quartz rounded-xl overflow-hidden shadow-sm border border-gray-200"
                                 style={{height: 700}}>
                                <AgGridReact<SuggestReport>
                                    ref={gridRef}
                                    localeText={AG_GRID_LOCALE_TW}
                                    rowData={categoryFilteredRows}
                                    quickFilterText={searchKeyword}
                                    columnDefs={cols}
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
                                                labelKey: 'filters',
                                                iconKey: 'filter',
                                                toolPanel: 'agFiltersToolPanel'
                                            }
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
                                    pagination
                                    paginationPageSize={20}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

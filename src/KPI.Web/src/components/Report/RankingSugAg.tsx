'use client';

import { ICellRendererParams } from 'ag-grid-community';
import {
    ClientSideRowModelModule,
    ValidationModule,
    PaginationModule,
    ModuleRegistry,
    CellStyleModule
} from 'ag-grid-community';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import { ColDef } from 'ag-grid-community';
import { getAccessToken } from '@/services/serverAuthService';
import { useauthStore } from '@/Stores/authStore'; // ✅ 加入這行
import api from "@/services/apiService"

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ValidationModule,
    PaginationModule,
    CellStyleModule,
]);

type CompanyCompletionRankingDto = {
    organizationId: number;
    organizationName: string;
    completedYes: number;
    completedNo: number;
    total: number;
    completionRate: number;
};

type SuggestUncompletedDto = {
    id: number;
    date: string;
    suggestionContent: string;
    kpiField: string;
    eventType: string;
    respDept: string;
    remark: string;
    isAdopted: string;
};

export default function RankingSugAg() {
    const { permissions } = useauthStore(); // ✅ 使用 authStore
    const hasPermission = permissions.includes('view-ranking'); // ✅ 判斷權限

    const [isMobile, setIsMobile] = useState(false);
    const [rowData, setRowData] = useState<CompanyCompletionRankingDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrg, setSelectedOrg] = useState<CompanyCompletionRankingDto | null>(null);
    const [uncompletedList, setUncompletedList] = useState<SuggestUncompletedDto[]>([]);
    const [modalOpen, setModalOpen] = useState(false);

    const fetchUncompleted = async (org: CompanyCompletionRankingDto) => {
        try {
            const token = await getAccessToken();
            const res = await api.get('/Report/uncompleted-suggestions', {
                headers: { Authorization: token ? `Bearer ${token.value}` : '' },
                params: { organizationId: org.organizationId },
            });
            setSelectedOrg(org);
            setUncompletedList(res.data);
            setModalOpen(true);
        } catch (err) {
            console.error('查詢失敗', err);
        }
    };

    const columnDefs: ColDef<CompanyCompletionRankingDto>[] = useMemo(() => [
        {
            headerName: '排名',
            valueGetter: (params) => `${params.node?.rowIndex != null ? params.node.rowIndex + 1 : ''}`,
            width: 70,
        },
        { headerName: '公司名稱', field: 'organizationName' },
        {
            headerName: '完成率 (%)',
            field: 'completionRate',
            valueFormatter: (params) => `${Math.round(params.value * 100)}%`,
        },
        {
            headerName: '完成 / 總數',
            valueGetter: (params) => `${params.data?.completedYes} / ${params.data?.total}`,
            hide: isMobile,
        },
        {
            headerName: '視覺化',
            field: 'completionRate',
            flex: 1,
            cellRenderer: (p: ICellRendererParams<CompanyCompletionRankingDto, number>) => {
                const pct = Math.round((p.value ?? 0) * 100);
                return (
                    <div className="w-full h-3 bg-gray-200 rounded">
                        <div
                            className="h-full bg-green-500 rounded"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                );
            },
            hide: isMobile,
        },
        {
            headerName: '內容',
            cellRenderer: (p: ICellRendererParams<CompanyCompletionRankingDto>) => (
                <div className="flex justify-end pr-2">
                    <button
                        className="text-blue-600 hover:underline whitespace-nowrap"
                        onClick={() => fetchUncompleted(p.data!)}
                    >
                        查看
                    </button>
                </div>
            ),
            width: 80,
            cellStyle: { whiteSpace: 'nowrap', overflow: 'visible', textOverflow: 'clip' },
        },
    ], [isMobile]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (hasPermission) {
            setLoading(true);
            getAccessToken().then(token => {
                api.get('/Report/completion-ranking', {
                    headers: {
                        Authorization: token ? `Bearer ${token.value}` : '',
                    },
                })
                    .then(res => setRowData(res.data))
                    .catch(err => console.error(err))
                    .finally(() => setLoading(false));
            });
        }
    }, [hasPermission]);

    const onGridReady = useCallback((params: any) => {
        if (loading) params.api.showLoadingOverlay();
    }, [loading]);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">改善建議完成率排行</h2>

            {!hasPermission ? (
                <div className="text-red-600">🚫 您沒有查看排行榜的權限</div>
            ) : loading ? (
                <div className="flex flex-col gap-4">
                    <div className="skeleton h-[500px] rounded-md"/>
                </div>
            ) : (
                <div className="ag-theme-quartz h-[500px] rounded-lg shadow border border-gray-200">
                    <AgGridReact
                        rowData={rowData}
                        columnDefs={columnDefs}
                        pagination
                        paginationPageSize={10}
                        suppressMovableColumns
                        onGridReady={onGridReady}
                        overlayLoadingTemplate={`<div class="ag-overlay-loading-center">載入中…</div>`}
                        overlayNoRowsTemplate={`<span class="text-gray-500">沒有資料</span>`}
                    />
                </div>
            )}

            {modalOpen && selectedOrg && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-20 z-50">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl border border-gray-300 p-0">

                        {/* Sticky 標題區塊 */}
                        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-2 border-b flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">
                                📝 {selectedOrg.organizationName} 未完成建議清單（共 {uncompletedList.length} 筆）
                            </h3>
                            <button
                                className="text-gray-500 hover:text-red-500 transition btn"
                                onClick={() => setModalOpen(false)}
                            >
                                ✕ 關閉
                            </button>
                        </div>

                        {/* 表格滾動區 */}
                        <div className="px-6 pb-6 overflow-y-auto max-h-[70vh]">
                            <table className="table table-sm w-full text-sm">
                                <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th>📅 日期</th>
                                    <th>📌 建議內容</th>
                                    <th>📂 類別</th>
                                    <th>🏛️ 會議</th>
                                    <th>👥 部門</th>
                                </tr>
                                </thead>
                                <tbody>
                                {uncompletedList.map(item => (
                                    <tr key={item.id} className="border-b">
                                        <td>{item.date}</td>
                                        <td className="whitespace-normal break-words">{item.suggestionContent}</td>
                                        <td>{item.kpiField}</td>
                                        <td>{item.eventType}</td>
                                        <td>{item.respDept}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
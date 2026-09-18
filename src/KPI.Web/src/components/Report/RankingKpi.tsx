'use client';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import {
    ClientSideRowModelModule,
    PaginationModule,
    ModuleRegistry
} from 'ag-grid-community';
import { useauthStore } from '@/Stores/authStore';
import {getAccessToken} from "@/services/serverAuthService";
import api from "@/services/apiService"
import { quarterHelper } from "@/helpers/quarter";

ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    PaginationModule
]);

interface CompanyKpiRateDto {
    organizationId: number;
    organizationName: string;
    metCount: number;
    totalCount: number;
    rate: number;
    field: string;
    year: number;
    quarter: string;
}

interface UnmetKpiDto {
    id: number;
    year: number;
    period: string;
    kpiName: string;
    kpiDetialName: string;
    actual: number;
    target: number;
    unit: string;
    field: string;
}

interface KpiFieldOptionDto {
    id: number;
    field: string;
}

interface JWTPayload {
    permissions?: string[];
    sub: string;
    exp: number;
    [key: string]: any;
}

const RankingKpiAg: React.FC = () => {
    const [rowData, setRowData] = useState<CompanyKpiRateDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrg, setSelectedOrg] = useState<CompanyKpiRateDto | null>(null);
    const [unmetList, setUnmetList] = useState<UnmetKpiDto[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const { permissions } = useauthStore();
    const hasPermission = permissions.includes('view-ranking');

    const [fieldFilter, setFieldFilter] = useState('');
    const [yearFilter, setYearFilter] = useState('');
    const [quarterFilter, setQuarterFilter] = useState('');

    const [fieldOptions, setFieldOptions] = useState<KpiFieldOptionDto[]>([]);


    const fetchFields = async () => {
        try {
            const res = await api.get('/Suggest/GetAllCategories');
            setFieldOptions(res.data);
        } catch (err) {
            console.error('載入類別失敗', err);
        }
    };

    const fetchRanking = async () => {
        if (!hasPermission) return;
        setLoading(true);
        try {
            const token = await getAccessToken();
            const res = await api.get('/Report/kpi-ranking', {
                headers: {
                    Authorization: token ? `Bearer ${token.value}` : '',
                },
                params: {
                    fieldName: fieldFilter || undefined,
                    startYear: yearFilter || undefined,
                    endYear: yearFilter || undefined,
                    startQuarter: quarterFilter || undefined,
                    endQuarter: quarterFilter || undefined,
                }
            });
            setRowData(res.data);
        } catch (err) {
            console.error('載入排行榜失敗', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUnmet = useCallback(async (org: CompanyKpiRateDto) => {
        try {
            const token = await getAccessToken();
            const res = await api.get('/Report/unmet-kpi', {
                headers: {
                    Authorization: token ? `Bearer ${token.value}` : '',
                },
                params: {
                    organizationId: org.organizationId,
                    fieldName: fieldFilter || undefined,
                    startYear: yearFilter || undefined,
                    endYear: yearFilter || undefined,
                    startQuarter: quarterFilter || undefined,
                    endQuarter: quarterFilter || undefined,
                }
            });
            setSelectedOrg(org);
            setUnmetList(res.data);
            setModalOpen(true);
        } catch (err) {
            console.error('查詢未達標失敗', err);
        }
    }, [fieldFilter, yearFilter, quarterFilter]);

    useEffect(() => {
        fetchFields();
    }, []);

    useEffect(() => {
        if (hasPermission && fieldOptions.length > 0) {
            fetchRanking();
        }
    }, [fieldFilter, yearFilter, quarterFilter, hasPermission, fieldOptions]);

    useEffect(() => {
        if (modalOpen && selectedOrg) {
            fetchUnmet(selectedOrg);
        }
    }, [fieldFilter, yearFilter, quarterFilter, modalOpen, selectedOrg, fetchUnmet]);

    const years = useMemo(() => Array.from(new Set(rowData.map(r => r.year).filter(Boolean))).sort(), [rowData]);
    const quarters = ['Q2', 'Q4'];

    const filteredData = useMemo(() => {
        return rowData.filter(row =>
            (!fieldFilter || row.field === fieldFilter) &&
            (!yearFilter || row.year.toString() === yearFilter) &&
            (!quarterFilter || row.quarter === quarterFilter)
        );
    }, [rowData, fieldFilter, yearFilter, quarterFilter]);

    const columnDefs: ColDef<CompanyKpiRateDto>[] = useMemo(() => [
        {
            headerName: '排名',
            valueGetter: (params) => `${params.node?.rowIndex != null ? params.node.rowIndex + 1 : ''}`,
            width: 70,
        },
        { headerName: '公司名稱', field: 'organizationName' },
        {
            headerName: '達成率 (%)',
            field: 'rate',
            valueFormatter: (p) => `${Math.round(p.value * 100)}%`,
        },
        {
            headerName: '達標 / 總數',
            valueGetter: (p) => `${p.data?.metCount} / ${p.data?.totalCount}`,
        },
        {
            headerName: '視覺化',
            field: 'rate',
            flex: 1,
            cellRenderer: (p: ICellRendererParams<CompanyKpiRateDto, number>) => {
                const pct = Math.round((p.value ?? 0) * 100);
                return (
                    <div className="w-full h-3 bg-gray-200 rounded">
                        <div
                            className="h-full bg-blue-600 rounded"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                );
            }
        },
        {
            headerName: '查看未達標',
            cellRenderer: (p: ICellRendererParams<CompanyKpiRateDto>) => (
                <button className="text-blue-600 hover:underline" onClick={() => fetchUnmet(p.data!)}>查看</button>
            ),
            width: 120
        }
    ], []);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">KPI 達成率排行榜</h2>

            {!hasPermission ? (
                <div className="text-red-600">🚫 您沒有查看排行榜的權限</div>
            ) : (
                <>
                    <div className="flex flex-wrap gap-4 mb-4 text-gray-800">
                        <select className="select select-sm border border-blue-500 bg-white text-gray-900" value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}>
                            <option value="">全部類別</option>
                            {fieldOptions.map(f => (
                                <option key={f.id} value={f.field}>{f.field}</option>
                            ))}
                        </select>
                        <select className="select select-sm border border-blue-500 bg-white text-gray-900" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
                            <option value="">全部年度</option>
                            {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                        </select>
                        <select className="select select-sm border border-blue-500 bg-white text-gray-900" value={quarterFilter} onChange={e => setQuarterFilter(e.target.value)}>
                            <option value="">全部季度</option>
                            {quarters.map(q => <option key={q} value={q}>{quarterHelper.getQuarterLabel(q)}</option>)}
                        </select>
                    </div>

                    {loading ? (
                        <div className="flex flex-col gap-4">
                            <div className="skeleton h-[500px] rounded-md" />
                        </div>
                    ) : (
                        <div className="ag-theme-quartz h-[500px] mb-6 border">
                            <AgGridReact
                                rowData={filteredData}
                                columnDefs={columnDefs}
                                pagination
                                paginationPageSize={10}
                                suppressMovableColumns
                                overlayLoadingTemplate={`<div class='ag-overlay-loading-center'>載入中…</div>`}
                                overlayNoRowsTemplate={`<span class='text-gray-500'>無資料</span>`}
                            />
                        </div>
                    )}
                </>
            )}

            {modalOpen && selectedOrg && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-start pt-20 z-50">
                    <div className="bg-white w-full max-w-4xl rounded-xl shadow-xl border border-gray-300 p-0">

                        {/* Sticky 標題區塊 */}
                        <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-2 border-b flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-800">
                                ⚠️ {selectedOrg.organizationName} 未達標清單（共 {unmetList.length} 筆）
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
                                    <th>📆 年度</th>
                                    <th>📊 季度</th>
                                    <th>📂 類別</th>
                                    <th>🏁 績效指標</th>
                                    <th>📌 細項</th>
                                    <th>📉 實際值</th>
                                    <th>🎯 目標值</th>
                                    <th>📐 單位</th>
                                </tr>
                                </thead>
                                <tbody>
                                {unmetList.map(item => (
                                    <tr key={item.id} className="border-b text-gray-800">
                                        <td>{item.year}</td>
                                        <td>{quarterHelper.getQuarterLabel(item.period)}</td>
                                        <td>{item.field}</td>
                                        <td>{item.kpiName}</td>
                                        <td>{item.kpiDetialName}</td>
                                        <td>{item.actual}</td>
                                        <td>{item.target}</td>
                                        <td>{item.unit}</td>
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
};

export default RankingKpiAg;
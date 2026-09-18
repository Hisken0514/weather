'use client';
import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import SelectEnterprise, { SelectionPayload } from "@/components/select/selectOnlyEnterprise";
import { AgGridReact } from "ag-grid-react";
import {AG_GRID_LOCALE_TW } from "@/utils/gridConfig";
import {toast, Toaster} from "react-hot-toast";
import api from "@/services/apiService"
import {getAccessToken} from "@/services/serverAuthService";
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import {ChevronDownIcon} from "@heroicons/react/16/solid";
import { quarterHelper } from "@/helpers/quarter";
import { useReportPeriodLock } from "@/hooks/useReportPeriodLock";
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type StatusGate =
    | { type: 'pending';   orgId: string; orgName: string; year: number; quarter: string }
    | { type: 'finalized'; orgId: string; orgName: string; year: number; quarter: string }
    | null;

export default function BulkImportPage() {
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "填報資料", href: `${NPbasePath}/reportEntry` },
        { label: "批次上傳績效指標報告" }
    ];

    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isValid, setIsValid] = useState(false);
    const [orgId, setOrgId] = useState<string>("");
    const [orgName, setOrgName] = useState<string>("");
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear() - 1911);
    const [selectedQuarter, setSelectedQuarter] = useState<string>("Q2");
    const periodLock = useReportPeriodLock();
    const { confirm } = useConfirmDialog();
    const [statusGate, setStatusGate] = useState<StatusGate>(null);
    const [hasReturnedItems, setHasReturnedItems] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [checking, setChecking] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1911 - i);
    const quarters = [
        { label: "年度績效檢討（前一年度整體執行成果）", value: "Q2" },
        { label: "年度改善追蹤（當年度 1–9 月執行情況）", value: "Q4" },
        // { label: "整年度 (Y)", value: "Y" },
    ];
    // Admin 鎖定填報期別時，強制套用鎖定的年度/季度，蓋掉使用者自己選的值，
    // 下面的下拉選單也會跟著變唯讀（disabled），不給改選。
    useEffect(() => {
        if (periodLock.loading || !periodLock.isLocked) return;
        setSelectedYear(periodLock.currentYear);
        setSelectedQuarter(periodLock.currentQuarter);
    }, [periodLock.loading, periodLock.isLocked, periodLock.currentYear, periodLock.currentQuarter]);

    const handleSelectChange = (type: "year" | "quarter", value: string) => {
        if (type === "year") setSelectedYear(parseInt(value));
        else setSelectedQuarter(value);
        setStatusGate(null);
        setHasReturnedItems(false);
        setConfirmed(false);
        setFile(null);
        setPreviewData([]);
        setIsValid(false);
    };

    const handleSelectionChange = (payload: SelectionPayload) => {
        setOrgId(payload.orgId);
        setOrgName(payload.orgName ?? "");
        setStatusGate(null);
        setHasReturnedItems(false);
        setConfirmed(false);
        setFile(null);
        setPreviewData([]);
        setIsValid(false);
    };

    const checkStatus = async () => {
        if (!orgId) {
            toast.error("請先選擇公司或工廠！");
            return;
        }
        setChecking(true);
        try {
            const response = await api.get("/Kpi/kpidata-for-report", {
                params: { organizationId: parseInt(orgId), year: selectedYear, quarter: selectedQuarter },
            });
            const res = response.data;
            if (!res.success) {
                toast.error(res.message || "查詢失敗");
                return;
            }
            const kpiDataList = res.data as any[];
            if (!Array.isArray(kpiDataList) || kpiDataList.length === 0) {
                toast.error("該公司尚無 KPI 資料可填報");
                return;
            }

            const statuses: number[] = kpiDataList.map((k) => k.status as number);
            const allFinalized = statuses.length > 0 && statuses.every(s => s === 4);
            const anyReturned  = statuses.some(s => s === 3);
            const anyPending   = statuses.some(s => s === 1 || s === 2);

            if (allFinalized) {
                setStatusGate({ type: 'finalized', orgId, orgName, year: selectedYear, quarter: selectedQuarter });
                return;
            }
            if (anyPending && !anyReturned) {
                setStatusGate({ type: 'pending', orgId, orgName, year: selectedYear, quarter: selectedQuarter });
                return;
            }
            if (anyReturned) {
                setHasReturnedItems(true);
                setStatusGate(null);
                setConfirmed(true);
                toast(`有 KPI 項目已被退回修正，請上傳修正後的檔案。`, { icon: "⚠️", duration: 5000 });
            } else {
                setHasReturnedItems(false);
                setStatusGate(null);
                setConfirmed(true);
                toast.success("確認完成，請繼續上傳填報。");
            }
        } catch (error: any) {
            toast.error(`查詢失敗：${error.message}`);
        } finally {
            setChecking(false);
        }
    };

    const downloadPdf = async () => {
        if (!statusGate || statusGate.type !== 'finalized') return;
        setDownloading(true);
        try {
            const token = await getAccessToken();
            const response = await api.get("/Kpi/report-pdf", {
                params: { organizationId: parseInt(statusGate.orgId), year: statusGate.year, quarter: statusGate.quarter },
                responseType: "blob",
                headers: { Authorization: token ? `Bearer ${token.value}` : "" },
            });
            const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `${statusGate.orgName}_${statusGate.year}年${statusGate.quarter}_KPI報告.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("PDF 下載失敗，請稍後再試");
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadTemplate = async (orgId: string) => {
        const res = await api.get(`/Kpi/download-template`, {
            params: {
                organizationId: orgId,
                year: selectedYear,
                quarter: selectedQuarter
            },
            responseType: 'blob'
        });

        const blob = new Blob([res.data], { type: res.headers['content-type'] as string | undefined });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '績效指標填報表.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        const formData = new FormData();
        formData.append('file', uploadedFile);
        setFile(uploadedFile);
        setIsValid(false);

        try {
            const token = await getAccessToken();
            const res = await api.post('/Kpi/fullpreview-for-report', formData,
                {headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token?.value}`,
                }});
            setPreviewData(res.data);
            setIsValid(true);
        } catch (err: any) {
            console.error("📛 錯誤訊息：", err);
            setPreviewData([]);
            setIsValid(false);

            if (err.response) {
                console.error("📡 伺服器回應錯誤：", err.response);
                console.error("🔢 狀態碼：", err.response.status);
                console.error("📦 回應資料：", err.response.data);

                const statusCode = err.response.status;
                const message = err.response.data?.message || "解析失敗";
                const errorList: string[] = err.response.data?.errors || [];

                if (Array.isArray(errorList) && errorList.length > 0) {
                    console.error("🔍 驗證錯誤列表：", errorList);

                    const errorText = errorList.join('\n');

                    await confirm({
                        title: `❌ 匯入錯誤（${statusCode}）`,
                        message: `${message}\n\n${errorText}`,
                        showCancel: false
                    });

                } else {
                    await confirm({
                        title: `❌ 伺服器錯誤（${statusCode}）`,
                        message: message,
                        showCancel: false
                    });
                }

            } else if (err.request) {
                console.error("📭 沒有回應的請求：", err.request);
                toast.error("❌ 未收到伺服器回應，請檢查網路或伺服器狀態");
            } else {
                console.error("⚙️ 設定錯誤：", err.message);
                toast.error(`❌ 請求建立失敗：${err.message}`);
            }
        }
        e.target.value = "";
    };

    const handleConfirmImport = async () => {
        const isConfirmed = await confirm({
            title: "上傳確認",
            message: "確定要上傳這批資料嗎？此操作無法復原。",
        });
        if (isConfirmed) {
            if (!file || !isValid) return;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('year', selectedYear.toString());
            formData.append('quarter', selectedQuarter);
            formData.append('organizationId', orgId);

            try {
                const token = await getAccessToken();
                const res = await api.post('/Kpi/fullsubmit-for-report', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token?.value}`,
                    },
                });
                const { inserted = 0, updated = 0, skipped = 0 } = res.data ?? {};
                const total = inserted + updated;
                toast.success(`已送出 ${total} 筆資料並審核通過！`);
                setStatusGate({ type: 'finalized', orgId, orgName, year: selectedYear, quarter: selectedQuarter });
                if (skipped > 0) {
                    toast(`${skipped} 筆資料已在審核中或已核准，本次未更動。`, {
                        icon: "⚠️",
                        duration: 5000,
                    });
                }
                setFile(null);
                setPreviewData([]);
                setIsValid(false);
            } catch (err: any) {
                console.error("📛 匯入發生錯誤：", err);

                if (err.response) {
                    console.error("📡 伺服器回應錯誤：", err.response);
                    console.error("🔢 狀態碼：", err.response.status);
                    console.error("📦 回應資料：", err.response.data);
                    toast.error(`❌ 匯入失敗（${err.response.status}）：${err.response.data?.message || '請檢查格式或資料內容'}`);
                } else if (err.request) {
                    console.error("📭 沒有回應的請求：", err.request);
                    toast.error("❌ 沒有收到伺服器回應，請檢查網路或 API 設定");
                } else {
                    console.error("⚙️ 錯誤訊息：", err.message);
                    toast.error(`❌ 匯入失敗：${err.message}`);
                }
            }
            console.log("使用者已確認上傳");
        } else {
            console.log("使用者取消上傳");
        }

    };
    const columnDefs = [
        { headerName: "指標名稱", field: "indicatorName", flex: 1 },
        { headerName: "細項名稱", field: "detailItemName", flex: 1 },
        { headerName: "填報值", field: "reportValue", flex: 1 },
        { headerName: "備註", field: "remarks", flex: 1 },
    ];

    const defaultColDef = {
        resizable: true,
        sortable: true,
        filter: true,
    };
    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            {/* ── 狀態閘門畫面 ── */}
            {statusGate ? (
                <div className="max-w-2xl mx-auto p-6 mt-8">
                    {statusGate.type === 'pending' && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 text-center space-y-4">
                            <div className="text-5xl">⏳</div>
                            <h2 className="text-xl font-bold text-yellow-800">資料審核中（待審核）</h2>
                            <p className="text-yellow-700">
                                <strong>{statusGate.orgName}</strong>　{statusGate.year} 年 {quarterHelper.getQuarterLabel(statusGate.quarter)} 的 KPI 報告已送出，<br/>
                                目前等待審核，請耐心等候。
                            </p>
                            <button className="btn btn-outline btn-sm" onClick={() => setStatusGate(null)}>
                                重新選擇
                            </button>
                        </div>
                    )}
                    {statusGate.type === 'finalized' && (
                        <div className="bg-green-50 border border-green-300 rounded-2xl p-8 text-center space-y-4">
                            <div className="text-5xl">✅</div>
                            <h2 className="text-xl font-bold text-green-800">審核通過</h2>
                            <p className="text-green-700">
                                <strong>{statusGate.orgName}</strong>　{statusGate.year} 年 {quarterHelper.getQuarterLabel(statusGate.quarter)} 的 KPI 報告已全部審核通過。
                            </p>
                            <div className="flex justify-center gap-3 flex-wrap">
                                <button
                                    className="btn btn-primary"
                                    disabled={downloading}
                                    onClick={downloadPdf}
                                >
                                    {downloading ? (
                                        <span className="loading loading-spinner loading-xs"/>
                                    ) : "📄 下載 PDF 報告"}
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => setStatusGate(null)}>
                                    重新選擇
                                </button>
                                <button
                                    className="btn btn-outline btn-sm btn-warning"
                                    onClick={async () => {
                                        const ok = await confirm({ message: '確定要退回重新填寫嗎？退回後可重新修改並送出。' });
                                        if (!ok) return;
                                        try {
                                            const t = await getAccessToken();
                                            const res = await api.post('/Kpi/self-return', {
                                                organizationId: parseInt(statusGate.orgId),
                                                year: statusGate.year,
                                                quarter: statusGate.quarter,
                                            }, {
                                                headers: { Authorization: t ? `Bearer ${t.value}` : '' },
                                            });
                                            if (res.data?.success) {
                                                setStatusGate(null);
                                            } else {
                                                alert(res.data?.message ?? '退回失敗');
                                            }
                                        } catch {
                                            alert('退回失敗，請稍後再試');
                                        }
                                    }}
                                >
                                    退回重新填寫
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-5xl mx-auto p-6 space-y-8">
                    <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">批次上傳績效指標報告</h1>

                    {hasReturnedItems && (
                        <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 text-red-700 text-sm font-medium">
                            ⚠️ 有 KPI 項目已被退回修正，請上傳修正後的檔案。
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <SelectEnterprise onSelectionChange={handleSelectionChange} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    民國年度
                                </label>
                                <div className="mt-2 grid grid-cols-1">
                                    <select
                                        id="selectedYear"
                                        name="selectedYear"
                                        aria-label="選擇年度(民國)"
                                        disabled={periodLock.isLocked}
                                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select disabled:bg-gray-100 disabled:text-gray-500"
                                        value={selectedYear}
                                        onChange={(e) => handleSelectChange("year", e.target.value)}
                                    >
                                        {yearOptions.map((year) => (
                                            <option key={year} value={year}>
                                                民國 {year} 年
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon
                                        aria-hidden="true"
                                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                    />
                                </div>

                            </div>

                            <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                季度
                            </label>
                                <div className="mt-2 grid grid-cols-1">
                                    <select
                                        id="selectedQuarter"
                                        name="selectedQuarter"
                                        aria-label="季度"
                                        disabled={periodLock.isLocked}
                                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select disabled:bg-gray-100 disabled:text-gray-500"
                                        value={selectedQuarter}
                                        onChange={(e) => handleSelectChange("quarter", e.target.value)}
                                    >
                                        {quarters.map((q) => (
                                            <option key={q.value} value={q.value}>
                                                {q.label}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon
                                        aria-hidden="true"
                                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 確認選擇按鈕 */}
                    <div className="flex justify-end">
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={checkStatus}
                            disabled={checking || !orgId}
                        >
                            {checking ? (
                                <span className="loading loading-spinner loading-xs"/>
                            ) : "確認選擇"}
                        </button>
                    </div>

                    {confirmed && (<>
                        <div className="card border bg-white shadow-md p-4">
                            <h2 className="text-lg font-semibold mb-2 text-gray-900">📥 下載目前資料</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                請下載您目前的資料，於 Excel 中進行更新或補充後再上傳。
                            </p>
                            <button className="btn btn-outline btn-sm" onClick={() => handleDownloadTemplate(orgId)}>
                                <Download className="w-4 h-4 mr-2" />
                                下載資料
                            </button>
                        </div>

                        <div className="card border bg-white shadow-md p-4">
                            <h2 className="text-lg font-semibold mb-2 text-gray-900">📄 填寫注意事項</h2>
                            <ul className="text-sm list-disc list-inside text-gray-700 space-y-1">
                                <li>請勿更動模板中的欄位名稱與順序</li>
                                <li>請填寫填報值(僅填寫數值)，若無資料請輸入備註</li>
                                <li>請確認填寫數據，避免匯入失敗</li>
                            </ul>
                        </div>

                        <div className="card border bg-white shadow-md p-4">
                            <h2 className="text-lg font-semibold mb-2 text-gray-900">📤 上傳檔案</h2>
                            <input
                                id="file"
                                name="file"
                                aria-label="上傳檔案"
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileChange}
                                className="file-input file-input-bordered w-full max-w-md text-black border-black bg-white hover:bg-white hover:text-black hover:border-black"
                            />
                            {file && (
                                <p className="mt-2 text-sm text-gray-600">
                                    已選擇檔案：{file.name}
                                </p>
                            )}
                        </div>
                    </>)}

                    {file && (
                        <div className="card border bg-white shadow-md p-4">
                            <h2 className="text-lg font-semibold mb-2 text-gray-900">✅ 預覽與匯入確認</h2>
                            <p className="text-sm text-gray-600 mb-2">
                                以下為您上傳的資料預覽，請再次確認內容是否正確。
                            </p>
                            <div
                                className="ag-theme-quartz"
                                style={{height: 400, width: "100%"}}
                            >
                                <AgGridReact
                                    localeText={AG_GRID_LOCALE_TW}
                                    defaultColDef={defaultColDef}
                                    rowData={previewData}
                                    columnDefs={columnDefs}
                                    pagination={true}
                                    paginationPageSize={10}
                                    suppressAggFuncInHeader={true}
                                    suppressFieldDotNotation={true}
                                />
                            </div>
                            <button
                                className="btn btn-primary btn-sm mt-2"
                                disabled={!isValid}
                                onClick={handleConfirmImport}
                            >
                                確認匯入
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

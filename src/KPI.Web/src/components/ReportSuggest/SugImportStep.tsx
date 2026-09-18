'use client';
import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import SelectEnterprise, { SelectionPayload } from "@/components/select/selectOnlyEnterprise";
import { AgGridReact } from "ag-grid-react";
import { AG_GRID_LOCALE_TW } from "@/utils/gridConfig";
import { toast, Toaster } from "react-hot-toast";
import api from "@/services/apiService";
import { getAccessToken } from "@/services/serverAuthService";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { quarterHelper } from "@/helpers/quarter";
import { useReportPeriodLock } from "@/hooks/useReportPeriodLock";
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

// const quarterOptions = ['Q2', 'Q4', 'Y'];
const quarterOptions = ['Q2', 'Q4'];

export default function SugImportPage() {
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "填報資料", href: `${NPbasePath}/reportEntry` },
        { label: "批次上傳委員建議報告" }
    ];

    const { confirm } = useConfirmDialog();

    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [isValid, setIsValid] = useState(false);
    const [orgId, setOrgId] = useState<string>("");
    const [orgName, setOrgName] = useState<string>("");
    const [year, setYear] = useState<number>(new Date().getFullYear() - 1911);
    const [quarter, setQuarter] = useState<string>("Q2");
    const periodLock = useReportPeriodLock();
    const [confirmed, setConfirmed] = useState(false);
    const [checking, setChecking] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1911 - i);

    // Admin 鎖定填報期別時，強制套用鎖定的年度/季度，不給使用者自己選
    useEffect(() => {
        if (periodLock.loading || !periodLock.isLocked) return;
        setYear(periodLock.currentYear);
        setQuarter(periodLock.currentQuarter);
    }, [periodLock.loading, periodLock.isLocked, periodLock.currentYear, periodLock.currentQuarter]);

    const handleSelectionChange = (payload: SelectionPayload) => {
        setOrgId(payload.orgId);
        setOrgName(payload.orgName ?? "");
        setConfirmed(false);
        setUploaded(false);
        setFile(null);
        setPreviewData([]);
        setIsValid(false);
    };

    const checkOrg = async () => {
        if (!orgId) { toast.error("請先選擇公司或工廠！"); return; }
        setChecking(true);
        try {
            const token = await getAccessToken();
            const res = await api.get("/Suggest/submission-status", {
                params: { organizationId: orgId, year, quarter },
                headers: { Authorization: `Bearer ${token?.value}` },
            });
            if (res.data?.submitted) {
                // 已送出 → 直接顯示成功畫面
                setUploaded(true);
            }
            setConfirmed(true);
            if (!res.data?.submitted) toast.success("確認完成，請繼續操作。");
        } catch {
            // API 失敗時仍允許進入（避免阻斷流程）
            setConfirmed(true);
            toast.success("確認完成，請繼續操作。");
        } finally {
            setChecking(false);
        }
    };

    const handleSelfReturn = async () => {
        const ok = await confirm({ message: '確定要退回重新填寫嗎？退回後可重新修改並送出。' });
        if (!ok) return;
        try {
            const token = await getAccessToken();
            await api.post("/Suggest/self-return",
                { organizationId: parseInt(orgId), year, quarter },
                { headers: { Authorization: `Bearer ${token?.value}` } }
            );
            setUploaded(false);
            toast.success("已退回，可重新填寫");
        } catch {
            toast.error("退回失敗，請稍後再試");
        }
    };

    const downloadPdf = async () => {
        setDownloading(true);
        try {
            const token = await getAccessToken();
            const response = await api.get("/Suggest/report-pdf", {
                params: { organizationId: parseInt(orgId) },
                responseType: "blob",
                headers: { Authorization: token ? `Bearer ${token.value}` : "" },
            });
            const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `${orgName}_委員建議報告.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("PDF 下載失敗，請稍後再試");
        } finally {
            setDownloading(false);
        }
    };

    const handleDownloadTemplate = async (orgId: string) => {
        const res = await api.get(`/Suggest/download-template`, {
            params: { organizationId: orgId },
            responseType: 'blob'
        });
        const blob = new Blob([res.data], { type: res.headers['content-type'] as string | undefined });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '委員建議填報表.xlsx';
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
        setUploaded(false);

        try {
            const res = await api.post('/Suggest/fullpreview-for-report', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setPreviewData(res.data);
            setIsValid(true);
        } catch (err: any) {
            console.error(err);
            setIsValid(false);
            const msg = err.response?.data?.message ?? err.message ?? "解析失敗，請確認格式是否正確";
            toast.error(`❌ ${msg}`);
        }
        e.target.value = "";
    };

    const handleConfirmImport = async () => {
        if (!file || !isValid) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('organizationId', orgId);

        try {
            const token = await getAccessToken();
            await api.post('/Suggest/fullsubmit-for-report', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            // 記錄送出狀態
            await api.post('/Suggest/record-submission',
                { organizationId: parseInt(orgId), year, quarter },
                { headers: { Authorization: `Bearer ${token?.value}` } }
            );
            toast.success("匯入成功");
            setFile(null);
            setPreviewData([]);
            setIsValid(false);
            setUploaded(true);
        } catch (err) {
            console.error(err);
            toast.error("❌ 匯入失敗");
        }
    };

    const columnDefs = [
        { headerName: "廠商", field: "orgName", flex: 1 },
        { headerName: "日期", field: "date", flex: 1 },
        { headerName: "會議/活動", field: "eventType", flex: 1 },
        { headerName: "類別", field: "suggestType", flex: 1 },
        { headerName: "委員", field: "userName", flex: 1 },
        { headerName: "建議內容", field: "content", flex: 2 },
        { headerName: "負責單位", field: "respDept", flex: 1 },
        { headerName: "是否參採", field: "isAdopted", flex: 1 },
        { headerName: "改善對策/辦理情形", field: "improveDetails", flex: 2 },
        { headerName: "預估人力投入", field: "manpower", flex: 1 },
        { headerName: "預估經費投入", field: "budget", flex: 1 },
        {
            headerName: "是否完成改善/辦理",
            field: "completed",
            flex: 1,
            sort: 'asc' as const,
            comparator: (a: string | null, b: string | null) => {
                const rank = (v: string | null | undefined) => v === '否' ? 0 : (!v || v === '') ? 1 : 2;
                return rank(a) - rank(b);
            },
        },
        { headerName: "預估完成年份", field: "doneYear", flex: 1 },
        { headerName: "預估完成月份", field: "doneMonth", flex: 1 },
        { headerName: "平行展開", field: "parallelExec", flex: 1 },
        { headerName: "展開計畫", field: "execPlan", flex: 2 },
        { headerName: "備註", field: "remark", flex: 2 },
    ];

    const defaultColDef = { resizable: true, sortable: true, filter: true };

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems} />
            </div>
            <div className="max-w-5xl mx-auto p-6 space-y-8">
                <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">批次上傳委員建議報告</h1>

                {/* 機構 + 年度/季度選擇 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <SelectEnterprise onSelectionChange={handleSelectionChange} />
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">年度</label>
                        <select
                            className="select select-bordered select-sm disabled:bg-gray-100 disabled:text-gray-500"
                            value={year}
                            disabled={periodLock.isLocked}
                            onChange={e => { setYear(Number(e.target.value)); setConfirmed(false); setUploaded(false); }}
                        >
                            {yearOptions.map(y => <option key={y} value={y}>{y} 年</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">季度</label>
                        <select
                            className="select select-bordered select-sm disabled:bg-gray-100 disabled:text-gray-500"
                            value={quarter}
                            disabled={periodLock.isLocked}
                            onChange={e => { setQuarter(e.target.value); setConfirmed(false); setUploaded(false); }}
                        >
                            {quarterOptions.map(q => <option key={q} value={q}>{quarterHelper.getQuarterLabel(q)}</option>)}
                        </select>
                    </div>
                </div>

                {/* 確認選擇按鈕 */}
                <div className="flex justify-end">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={checkOrg}
                        disabled={checking || !orgId}
                    >
                        {checking ? <span className="loading loading-spinner loading-xs" /> : "確認選擇"}
                    </button>
                </div>

                {confirmed && (<>
                    {/* 已送出：直接顯示成功畫面 */}
                    {uploaded && (
                        <div className="bg-green-50 border border-green-300 rounded-2xl p-8 text-center space-y-4">
                            <div className="text-5xl">✅</div>
                            <h2 className="text-xl font-bold text-green-800">報告已送出</h2>
                            <p className="text-green-700">
                                <strong>{orgName || "已選擇公司"}</strong> {year} 年 {quarterHelper.getQuarterLabel(quarter)} 的委員建議報告已送出。
                            </p>
                            <div className="flex justify-center gap-3 flex-wrap">
                                <button
                                    className="btn btn-primary"
                                    disabled={downloading}
                                    onClick={downloadPdf}
                                >
                                    {downloading ? <span className="loading loading-spinner loading-xs" /> : "📄 下載 PDF 報告"}
                                </button>
                                <button
                                    className="btn btn-outline btn-warning btn-sm"
                                    onClick={handleSelfReturn}
                                >
                                    退回重新填寫
                                </button>
                            </div>
                        </div>
                    )}

                    {!uploaded && (<>
                        <div className="card border bg-white shadow-md p-4">
                            <h2 className="text-lg font-semibold mb-2 text-gray-900">📥 下載目前資料</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                請下載您目前的資料，於 Excel 中進行更新或補充後再上傳。
                            </p>
                            <button
                                className="btn btn-outline btn-sm text-black border-black bg-white hover:bg-white hover:text-black hover:border-black"
                                onClick={() => handleDownloadTemplate(orgId)}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                下載資料
                            </button>
                        </div>

                        <div className="card border bg-white shadow-md p-4">
                            <h2 className="text-lg font-semibold mb-2 text-gray-900">📄 填寫注意事項</h2>
                            <ul className="text-sm list-disc list-inside text-gray-700 space-y-1">
                                <li>請勿更動模板中的欄位名稱與順序</li>
                                <li>請直接對欄位進行修改/填寫</li>
                                <li>僅能修改欄位: 是否參採、改善對策/辦理情形、預估人力投入、預估經費投入、是否完成改善/辦理、預估完成年份、預估完成月份、平行展開、展開計畫、備註</li>
                                <li>請確認填寫內容後送出，避免匯入失敗</li>
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
                            {file && <p className="mt-2 text-sm text-gray-600">已選擇檔案：{file.name}</p>}
                        </div>

                        {file && (
                            <div className="card border bg-white shadow-md p-4">
                                <h2 className="text-lg font-semibold mb-2 text-gray-900">✅ 預覽與匯入確認</h2>
                                <p className="text-sm text-gray-600 mb-2">以下為您上傳的資料預覽，請再次確認內容是否正確。</p>
                                <div className="ag-theme-quartz" style={{ height: 400, width: "100%" }}>
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
                    </>)}
                </>)}
            </div>
        </>
    );
}

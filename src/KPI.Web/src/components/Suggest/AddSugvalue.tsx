"use client"
import React, { useEffect, useRef, useState } from 'react';
import {
    FormDataType,
    MultiStepForm,
    StepAnimation,
    StepCard,
    StepContent,
    StepIndicatorComponent, StepNavigationWrapper
} from '@/components/StepComponse';
import Step2 from '@/components/ReportSuggest/AddSugValueStep2';
import Breadcrumbs from "@/components/Breadcrumbs";
import { toast, Toaster } from "react-hot-toast";
import api from "@/services/apiService"
import { getAccessToken } from "@/services/serverAuthService";
import { quarterHelper } from "@/helpers/quarter";
import { useReportPeriodLock } from "@/hooks/useReportPeriodLock";
import SelectEnterprise, { SelectionPayload } from "@/components/select/selectOnlyEnterprise";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

export interface SelectCompany {
    organizationId: number;
    organizationName: string;
}

export interface suggestReportData {
    reportList?: any[];
}

interface ExtendedFormData extends FormDataType {
    SelectCompany?: SelectCompany;
    suggestReportData?: suggestReportData;
}

const steps = [
    { title: '填寫報告' },
    { title: '完成' },
];

// const quarterOptions = ['Q2', 'Q4', 'Y'];
const quarterOptions = ['Q2', 'Q4'];

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type PageState = 'pre-check' | 'already-submitted' | 'form';

export default function AddKPIvalue() {
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "填報資料", href: `${NPbasePath}/reportEntry` },
        { label: "上傳委員建議報告" }
    ];

    const { confirm } = useConfirmDialog();

    const [pageState, setPageState] = useState<PageState>('pre-check');

    const [preCheckOrgId, setPreCheckOrgId] = useState<number>(0);
    const [preCheckOrgName, setPreCheckOrgName] = useState<string>('');
    const [year, setYear] = useState<number>(new Date().getFullYear() - 1911);
    const [quarter, setQuarter] = useState<string>('Q2');
    const [preChecking, setPreChecking] = useState(false);
    const [preCheckReportData, setPreCheckReportData] = useState<any[]>([]);

    const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1911 - i);
    const periodLock = useReportPeriodLock();

    // Admin 鎖定填報期別時，強制套用鎖定的年度/季度，不給使用者自己選
    useEffect(() => {
        if (periodLock.loading || !periodLock.isLocked) return;
        setYear(periodLock.currentYear);
        setQuarter(periodLock.currentQuarter);
    }, [periodLock.loading, periodLock.isLocked, periodLock.currentYear, periodLock.currentQuarter]);

    type SuccessData = { organizationId: number; organizationName: string; count: number };
    const [successData, setSuccessData] = useState<SuccessData | null>(null);
    const successDataRef = useRef<SuccessData | null>(null);
    const [downloading, setDownloading] = useState(false);

    const handlePreCheck = async () => {
        if (!preCheckOrgId) { toast.error('請先選擇公司或工廠！'); return; }
        setPreChecking(true);
        try {
            const token = await getAccessToken();
            const statusRes = await api.get('/Suggest/submission-status', {
                params: { organizationId: preCheckOrgId, year, quarter },
                headers: { Authorization: `Bearer ${token?.value}` },
            });
            if (statusRes.data?.submitted) {
                setPageState('already-submitted');
                return;
            }
            // 尚未送出：抓取該公司報告資料後再進入填報
            const orgRes = await api.get("/Suggest/selectOrg-for-report", {
                params: { organizationId: preCheckOrgId },
            });
            if (!Array.isArray(orgRes.data) || orgRes.data.length === 0) {
                toast.error("該公司尚無委員建議資料");
                return;
            }
            const orgName: string = orgRes.data[0]?.OrgName ?? orgRes.data[0]?.orgName ?? preCheckOrgName;
            setPreCheckOrgName(orgName);
            setPreCheckReportData(orgRes.data);
            toast.success(`抓到 ${orgRes.data.length} 筆委員建議資料`);
            setPageState('form');
        } catch (err: any) {
            toast.error(`發生錯誤：${err?.message ?? '請稍後再試'}`);
        } finally {
            setPreChecking(false);
        }
    };

    const handleSelfReturn = async (orgId: number) => {
        const ok = await confirm({ message: '確定要退回重新填寫嗎？退回後可重新修改並送出。' });
        if (!ok) return;
        try {
            const token = await getAccessToken();
            await api.post('/Suggest/self-return',
                { organizationId: orgId, year, quarter },
                { headers: { Authorization: `Bearer ${token?.value}` } }
            );
            setPageState('pre-check');
            toast.success('已退回，可重新填寫');
        } catch {
            toast.error('退回失敗，請稍後再試');
        }
    };

    const downloadPdf = async () => {
        const data = successDataRef.current ?? { organizationId: preCheckOrgId, organizationName: preCheckOrgName, count: 0 };
        setDownloading(true);
        try {
            const token = await getAccessToken();
            const response = await api.get("/Suggest/report-pdf", {
                params: { organizationId: data.organizationId },
                responseType: "blob",
                headers: { Authorization: `Bearer ${token?.value}` },
            });
            const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `${data.organizationName}_委員建議報告.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("PDF 下載失敗，請稍後再試");
        } finally {
            setDownloading(false);
        }
    };

    const handleFormComplete = async (_data: FormDataType): Promise<void> => {};

    // ── 前置確認畫面 ──────────────────────────────────────
    if (pageState === 'pre-check') {
        return (
            <>
                <Toaster position="top-right" reverseOrder={false} />
                <div className="w-full flex justify-start">
                    <Breadcrumbs items={breadcrumbItems} />
                </div>
                <div className="max-w-4xl mx-auto p-4 space-y-6">
                    <h1 className="text-2xl font-bold text-center text-gray-900">上傳委員建議報告</h1>
                    <div className="card bg-white shadow-md p-6 space-y-5">
                        <div>
                            <label className="text-sm text-gray-500 mb-1 block">廠商</label>
                            <SelectEnterprise
                                onSelectionChange={(s: SelectionPayload) => {
                                    setPreCheckOrgId(Number(s.orgId));
                                    setPreCheckOrgName(s.orgName ?? '');
                                }}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500">年度</label>
                                <select
                                    className="select select-bordered select-sm disabled:bg-gray-100 disabled:text-gray-500"
                                    value={year}
                                    disabled={periodLock.isLocked}
                                    onChange={e => setYear(Number(e.target.value))}
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
                                    onChange={e => setQuarter(e.target.value)}
                                >
                                    {quarterOptions.map(q => <option key={q} value={q}>{quarterHelper.getQuarterLabel(q)}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handlePreCheck}
                                disabled={preChecking || !preCheckOrgId}
                            >
                                {preChecking ? <span className="loading loading-spinner loading-xs" /> : '確認並繼續'}
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── 已送出畫面 ────────────────────────────────────────
    if (pageState === 'already-submitted') {
        return (
            <>
                <Toaster position="top-right" reverseOrder={false} />
                <div className="w-full flex justify-start">
                    <Breadcrumbs items={breadcrumbItems} />
                </div>
                <div className="max-w-4xl mx-auto p-4">
                    <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">上傳委員建議報告</h1>
                    <div className="bg-green-50 border border-green-300 rounded-2xl p-10 text-center space-y-5">
                        <div className="text-6xl">✅</div>
                        <h2 className="text-xl font-bold text-green-800">報告已送出</h2>
                        <p className="text-green-700">
                            <strong>{preCheckOrgName}</strong> {year} 年 {quarterHelper.getQuarterLabel(quarter)} 的委員建議報告已完成填報。
                        </p>
                        <div className="flex justify-center gap-3 flex-wrap pt-2">
                            <button
                                className="btn btn-primary"
                                disabled={downloading}
                                onClick={downloadPdf}
                            >
                                {downloading ? <span className="loading loading-spinner loading-xs" /> : "📄 下載 PDF 報告"}
                            </button>
                            <button
                                className="btn btn-outline btn-warning btn-sm"
                                onClick={() => handleSelfReturn(preCheckOrgId)}
                            >
                                退回重新填寫
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── 填報表單（2 步驟） ────────────────────────────────
    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems} />
            </div>
            <div className="max-w-4xl mx-auto p-4">
                <h1 className="text-2xl font-bold text-center mb-8 text-base-content text-gray-900">上傳委員建議報告</h1>
            </div>

            <MultiStepForm
                initialData={{
                    SelectCompany: { organizationId: preCheckOrgId, organizationName: preCheckOrgName },
                    suggestReportData: { reportList: preCheckReportData },
                } as ExtendedFormData}
                onComplete={handleFormComplete}
                totalStepsCount={2}
            >
                <StepIndicatorComponent steps={steps} />

                <StepAnimation>
                    {/* 步驟 1: 填寫資料 */}
                    <StepContent step={0}>
                        <div className="px-0.5">
                            <StepCard title="填寫資料">
                                <Step2 />
                                <StepNavigationWrapper
                                    prevLabel="返回"
                                    nextLabel="確認送出"
                                    onSubmit={async (stepData) => {
                                        const updatedList = (stepData.suggestReportData as { reportList?: any[] })?.reportList || [];
                                        if (!updatedList.length) { toast.error("無更新資料可送出"); return false; }

                                        try {
                                            const res = await api.put("/Suggest/update-report", updatedList);
                                            if (res.data?.success === false) {
                                                toast.error(res.data.message || "更新失敗");
                                                return false;
                                            }

                                            const token = await getAccessToken();
                                            await api.post('/Suggest/record-submission',
                                                { organizationId: preCheckOrgId, year, quarter },
                                                { headers: { Authorization: `Bearer ${token?.value}` } }
                                            );

                                            const sd = {
                                                organizationId: preCheckOrgId,
                                                organizationName: preCheckOrgName,
                                                count: updatedList.length,
                                            };
                                            successDataRef.current = sd;
                                            setSuccessData(sd);
                                            toast.success("已成功更新委員建議執行狀況！");
                                            return true;
                                        } catch (error: any) {
                                            toast.error("儲存失敗：" + error.message);
                                            return false;
                                        }
                                    }}
                                />
                            </StepCard>
                        </div>
                    </StepContent>

                    {/* 步驟 2: 完成 */}
                    <div className="max-w-4xl mx-auto p-4">
                        <StepContent step={1}>
                            <StepCard title="完成">
                                <div className="bg-green-50 flex flex-col items-center text-center space-y-5 py-6">
                                    <div className="text-6xl">✅</div>
                                    <h2 className="text-xl font-bold text-green-800">報告上傳成功</h2>
                                    {successData && (
                                        <p className="text-green-700">
                                            <strong>{successData.organizationName || "已選擇公司"}</strong> 的委員建議報告
                                            （共 {successData.count} 筆）已成功更新。
                                        </p>
                                    )}
                                    <div className="flex justify-center gap-3 pt-2 flex-wrap">
                                        <button
                                            className="btn btn-primary"
                                            disabled={downloading}
                                            onClick={downloadPdf}
                                        >
                                            {downloading ? <span className="loading loading-spinner loading-xs" /> : "📄 下載 PDF 報告"}
                                        </button>
                                        <button
                                            className="btn btn-outline btn-warning btn-sm"
                                            onClick={() => handleSelfReturn(successData?.organizationId ?? preCheckOrgId)}
                                        >
                                            退回重新填寫
                                        </button>
                                    </div>
                                </div>
                            </StepCard>
                        </StepContent>
                    </div>
                </StepAnimation>
            </MultiStepForm>
        </>
    );
}

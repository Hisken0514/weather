"use client"
import React, {useRef, useState} from 'react';
import {
    FormDataType,
    MultiStepForm,
    StepAnimation,
    StepCard,
    StepContent,
    StepIndicatorComponent, StepNavigationWrapper
} from '@/components/StepComponse';
import Step1, {AddKpiStep1Ref} from '@/components/ReportKPI/AddKpiValueStep1';
import Step2 from '@/components/ReportKPI/AddKpiValueStep2';
import type { Kpi } from "@/components/ReportKPI/AddKpiValueStep2";
import Step3 from '@/components/ReportKPI/AddKpiValueStep3';
import api from "@/services/apiService"
import Breadcrumbs from "@/components/Breadcrumbs";
import {toast, Toaster} from "react-hot-toast";
import { getAccessToken } from "@/services/serverAuthService";
import { useConfirmDialog } from '@/hooks/useConfirmDialog';

//步驟一 選擇公司/工廠
export interface SelectCompany {
    organizationId: number;
    organizationName: string;
    year: number;
    quarter: string;
}

// 第二步驟
export interface KpiDataInput {
    kpiList?: any[];
}

// 第三步驟
export interface Checkdata{
    organizationId: number;
    organizationName: string;
    year: number;
    quarter: string;
    reports: KpiReportInput[];
}
export interface KpiReportInput {
    kpiDataId: number;
    value: number | null;
    isSkipped: boolean;
    remark: string;
}

//步驟介面 ex: 步驟一 SelectCompany?: SelectCompany;
interface ExtendedFormData extends FormDataType {
    SelectCompany?: SelectCompany;
    KpiDataInput?: KpiDataInput;
    Checkdata?: Checkdata;
}

// 步驟定義
const steps = [
    { title: '選擇公司/工廠' },
    { title: '填寫報告' },
    { title: '確認送出' },

];

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

type StatusGate =
    | { type: 'pending';   orgId: number; orgName: string; year: number; quarter: string }
    | { type: 'finalized'; orgId: number; orgName: string; year: number; quarter: string }
    | null;

export default function AddKPIvalue() {
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "填報資料" , href: `${NPbasePath}/reportEntry` },
        { label: "上傳績效指標報告"}
    ];

    const { confirm } = useConfirmDialog();
    const [statusGate, setStatusGate] = useState<StatusGate>(null);
    const [hasReturnedItems, setHasReturnedItems] = useState(false);

    const downloadPdf = async (gate: { orgId: number; orgName: string; year: number; quarter: string }) => {
        try {
            const t = await getAccessToken();
            const response = await api.get("/Kpi/report-pdf", {
                params: { organizationId: gate.orgId, year: gate.year, quarter: gate.quarter },
                responseType: "blob",
                headers: { Authorization: t ? `Bearer ${t.value}` : "" },
            });
            const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            a.download = `${gate.orgName}_${gate.year}年${gate.quarter}_KPI報告.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("PDF 下載失敗，請稍後再試");
        }
    };

    // 處理表單完成
    const handleFormComplete = async (data: FormDataType): Promise<void> => {
        console.log('表單提交成功', data);
        const selectCompany = data.SelectCompany as SelectCompany;
        const checkdata = data.Checkdata as Checkdata;

        const payload = checkdata.reports.map((report) => ({
            year: selectCompany.year,
            quarter: selectCompany.quarter,
            kpiDataId: report.kpiDataId,
            value: report.isSkipped ? null : report.value,
            isSkipped: report.isSkipped,
            remark: report.remark,
        }));

        console.log("送出資料：", payload);
        try {
            const response = await api.post("/Kpi/submit-kpi-report", payload);
            const res = response.data;

            if (res.success) {
                toast.success("報告已送出並審核通過！");
                setStatusGate({
                    type: 'finalized',
                    orgId: selectCompany.organizationId,
                    orgName: selectCompany.organizationName,
                    year: selectCompany.year,
                    quarter: selectCompany.quarter,
                });
            } else {
                // 後端訊息本來就會帶年度/季度（例如「在 113 年 Q2 已提交過」），
                // 直接顯示給使用者知道是跟哪個期別重複，不要用一句籠統的「資料重複」蓋掉。
                toast.error(`送出失敗：${res.message}`);
            }
        } catch (error: any) {
            console.error("提交錯誤", error);
            toast.error("提交失敗，請稍後再試");
        }
    };

    const handleSaveDraft = async (checkdata: Checkdata) => {
        // 先檢查：有沒有 skip = true 但 remark 為空的
        const missingRemark = checkdata.reports.find(report =>
            report.isSkipped && (!report.remark || report.remark.trim() === "")
        );

        if (missingRemark) {
            toast.error(`有勾選不適用請填寫不適用原因（備註）。`);
            return;
        }

        // 過濾有效資料並補上 year、quarter
        const filteredReports = checkdata.reports
            .filter(report => report.isSkipped || report.value !== null)
            .map(report => ({
                ...report,
                year: checkdata.year,
                quarter: checkdata.quarter,
            }));

        if (filteredReports.length === 0) {
            toast.error("沒有有效的報告內容可儲存，請填寫後再暫存。");
            return;
        }

        console.log("送出草稿：", filteredReports);

        try {
            const response = await api.post("/Kpi/save-kpi-report", filteredReports);
            const res = response.data;

            if (res.success) {
                toast.success("暫存成功！");
            } else {
                toast.error(`暫存失敗：${res.message}`);
            }
        } catch (error) {
            console.error("暫存錯誤", error);
            toast.error("暫存失敗，請稍後再試");
        }
    };

    const step1Ref = useRef<AddKpiStep1Ref>(null);

    return (
        <>
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>

            {/* ── 狀態閘門畫面 ── */}
            {statusGate ? (
                <div className="max-w-2xl mx-auto p-4 mt-8">
                    {statusGate.type === 'pending' && (
                        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 text-center space-y-4">
                            <div className="text-5xl">⏳</div>
                            <h2 className="text-xl font-bold text-yellow-800">資料審核中（待審核）</h2>
                            <p className="text-yellow-700">
                                <strong>{statusGate.orgName}</strong>　{statusGate.year} 年 {statusGate.quarter} 的 KPI 報告已送出，<br/>
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
                                <strong>{statusGate.orgName}</strong>　{statusGate.year} 年 {statusGate.quarter} 的 KPI 報告已全部審核通過。
                            </p>
                            <div className="flex justify-center gap-3 flex-wrap">
                                <button className="btn btn-primary" onClick={() => downloadPdf(statusGate)}>
                                    📄 下載 PDF 報告
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
                                                organizationId: statusGate.orgId,
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
            <div className="max-w-4xl mx-auto p-4">
                {hasReturnedItems && (
                    <div className="bg-red-50 border border-red-300 rounded-xl px-4 py-3 mb-4 text-red-700 text-sm font-medium">
                        ⚠️ 以下 KPI 項目已被退回修正，請重新填寫後送出。
                    </div>
                )}
                <h1 className="text-2xl font-bold text-center mb-8 text-gray-900">上傳績效指標報告</h1>

                <MultiStepForm
                    initialData={{} as ExtendedFormData}
                    onComplete={handleFormComplete}
                    totalStepsCount={3}
                >
                    {/* 步驟指示器 */}
                    <StepIndicatorComponent steps={steps} />

                    {/* 步驟內容 */}
                    <StepAnimation>
                        {/* 步驟 1: 選擇公司/工廠 */}
                        <StepContent step={0}>
                            <StepCard title="選擇公司/工廠">
                                <Step1 ref={step1Ref} />
                                <StepNavigationWrapper
                                    prevLabel="返回"
                                    nextLabel="確認並繼續"
                                    onSubmit={async (stepData, updateStepData) => {
                                        // 先跑 Step1 的表單驗證與聚焦
                                        if (!step1Ref.current?.validateAndFocus()) {
                                            // 可視需要加上 toast 提示
                                            // toast.error("請先完成必填欄位");
                                            return false;
                                        }
                                        const orgId = (stepData.SelectCompany as SelectCompany)?.organizationId;
                                        const year = (stepData.SelectCompany as SelectCompany)?.year;
                                        const quarter = (stepData.SelectCompany as SelectCompany)?.quarter;

                                        if (!orgId) {
                                            toast.error("請先選擇公司或工廠！");
                                            return false;
                                        }

                                        if (!year || !quarter) {
                                            toast.error("請選擇完整的年度與季度！");
                                            return false;
                                        }

                                        try {
                                            const response = await api.get("/Kpi/kpidata-for-report", {
                                                params: {
                                                    organizationId: orgId,
                                                    year: year,
                                                    quarter: quarter
                                                },
                                            });
                                            const res = response.data;
                                            if (!res.success) {
                                                toast.error(res.message || "查詢失敗");
                                                return false;
                                            }
                                            const kpiDataList = res.data as any[];
                                            if (!Array.isArray(kpiDataList) || kpiDataList.length === 0) {
                                                toast.error("該公司尚無 KPI 資料可填報");
                                                return false;
                                            }

                                            // ── 狀態閘門判斷 ──
                                            const selectCompany = stepData.SelectCompany as SelectCompany;
                                            const statuses: number[] = kpiDataList.map((k) => k.status as number);
                                            const allFinalized = statuses.length > 0 && statuses.every(s => s === 4);
                                            const anyReturned  = statuses.some(s => s === 3);
                                            const anyPending   = statuses.some(s => s === 1 || s === 2);

                                            // ① 全部已核准 → 顯示下載頁面
                                            if (allFinalized) {
                                                setStatusGate({ type: 'finalized', orgId: orgId, orgName: selectCompany?.organizationName ?? "", year, quarter });
                                                return false;
                                            }
                                            // ② 有退回項目 → 帶入退回的 KPI，顯示 banner
                                            if (anyReturned) {
                                                const returnedList = kpiDataList.filter(k => k.status === 3);
                                                setHasReturnedItems(true);
                                                updateStepData({ kpiDataInput: { kpiList: returnedList } });
                                                return true;
                                            }
                                            // ③ 待審核（無退回）→ 顯示等待畫面
                                            if (anyPending) {
                                                setStatusGate({ type: 'pending', orgId: orgId, orgName: selectCompany?.organizationName ?? "", year, quarter });
                                                return false;
                                            }
                                            // ④ 正常（草稿 / 未填）→ 帶入全部 KPI
                                            setHasReturnedItems(false);
                                            updateStepData({ kpiDataInput: { kpiList: kpiDataList } });
                                            return true; // ✅ 可以進入下一步
                                        } catch (error: any) {
                                            console.error("API Error:", error);
                                            toast.error(`API 發生錯誤：${error.message}`);
                                            return false;
                                        }
                                    }}
                                />
                            </StepCard>
                        </StepContent>

                        {/* 步驟 2: 填寫資料 */}
                        <StepContent step={1}>
                            <StepCard title="填寫資料">
                                <Step2 onSaveDraft={handleSaveDraft} />
                                <StepNavigationWrapper
                                    prevLabel="返回"
                                    nextLabel="確認並繼續"
                                    onSubmit={(stepData, updateStepData) => {
                                        const reportMap = stepData.kpiReportInput as Record<string, string>;
                                        const kpiList = (stepData.kpiDataInput as { kpiList?: Kpi[] })?.kpiList || [];

                                        // 找出沒有填寫且沒勾選跳過的
                                        const missing = kpiList.find((kpi) => {
                                            const isSkipped = reportMap[`skip_${kpi.kpiDataId}`];
                                            const value = reportMap[kpi.kpiDataId];
                                            const skipNote = reportMap[`skip_note_${kpi.kpiDataId}`];

                                            if (!isSkipped && (value === undefined || value === "")) {
                                                return true;
                                            }

                                            if (isSkipped && (!skipNote || skipNote.trim() === "")) {
                                                return true;
                                            }

                                            return false;
                                        });

                                        if (missing) {
                                            toast.error(`請填寫所有 KPI 執行情況（缺少：「${missing.indicatorName} - ${missing.detailItemName}」）`);

                                            if ((stepData as any)._focusMissingInput) {
                                                const isSkipped = reportMap[`skip_${missing.kpiDataId}`];
                                                const value = reportMap[missing.kpiDataId];
                                                const skipNote = reportMap[`skip_note_${missing.kpiDataId}`];
                                                const isNote = isSkipped && (!skipNote || skipNote.trim() === "");

                                                (stepData as any)._focusMissingInput(missing.kpiDataId, isNote);
                                            }

                                            return false;
                                        }

                                        // ✅ 將每筆報告都送出，標記 isSkipped 與 value（若是跳過則為 null）
                                        const reports = kpiList.map((kpi) => {
                                            const isSkipped = Boolean(reportMap[`skip_${kpi.kpiDataId}`]);
                                            const value = isSkipped ? null : Number(reportMap[kpi.kpiDataId]);
                                            const remark = reportMap[`skip_note_${kpi.kpiDataId}`] || null;

                                            return {
                                                kpiDataId: kpi.kpiDataId,
                                                value,
                                                isSkipped,
                                                remark,
                                            };
                                        });

                                        const company = stepData.SelectCompany as SelectCompany;

                                        updateStepData({
                                            Checkdata: {
                                                organizationId: company.organizationId,
                                                year: company.year,
                                                quarter: company.quarter,
                                                reports,
                                            },
                                        });

                                        return true;
                                    }}
                                />
                            </StepCard>
                        </StepContent>
                        <StepContent step={2}>
                            <StepCard title="確認資料">
                                <Step3/>
                                <StepNavigationWrapper
                                    prevLabel="返回"
                                    nextLabel="確認並送出"
                                    onSubmit={async () => {
                                        const ok = await confirm({ message: '確定提交資料嗎？' });
                                        return ok;
                                    }}
                                />
                            </StepCard>
                        </StepContent>
                    </StepAnimation>
                </MultiStepForm>
            </div>
            )}
        </>
    );
}

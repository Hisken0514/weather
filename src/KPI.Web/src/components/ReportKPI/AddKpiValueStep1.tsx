import React, {
    useEffect,
    useRef,
    useState,
    forwardRef,
    useImperativeHandle,
} from "react";
import { useStepContext } from "../StepComponse";
import SelectEnterprise from "@/components/select/selectEnterprise";
import { SelectCompany } from "@/components/KPI/AddKPIvalue";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { useReportPeriodLock } from "@/hooks/useReportPeriodLock";

export type AddKpiStep1Ref = {
    /** 觸發原生驗證，並自動聚焦第一個錯誤欄位；通過回傳 true，否則 false */
    validateAndFocus: () => boolean;
    /** 手動聚焦特定欄位 */
    focusField: (name: "organizationId" | "year" | "quarter") => void;
};

const quarters = [
    { label: "年度績效檢討（前一年度整體執行成果）", value: "Q2" },
    { label: "年度改善追蹤（當年度 1–9 月執行情況）", value: "Q4" },
    // { label: "整年度 (Y)", value: "Y" },
];

const AddKpiValueStep1 = forwardRef<AddKpiStep1Ref>(function AddKpiValueStep1(
    _,
    ref
) {
    const { stepData, updateStepData } = useStepContext();
    const currentYear = new Date().getFullYear() - 1911; // 民國年
    const periodLock = useReportPeriodLock();

    const [yearOptions, setYearOptions] = useState<string[]>([]);
    const selectedYear = (stepData.SelectCompany as SelectCompany)?.year ?? "";
    const selectedQuarter =
        (stepData.SelectCompany as SelectCompany)?.quarter ?? "";
    const selectedOrgId =
        (stepData.SelectCompany as SelectCompany)?.organizationId ?? null;

    const formRef = useRef<HTMLFormElement>(null);
    const enterpriseSectionRef = useRef<HTMLDivElement>(null);
    const yearSelectRef = useRef<HTMLSelectElement>(null);
    const quarterSelectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
        setYearOptions(years);
    }, [currentYear]);

    // Admin 在「填報期別鎖定設定」鎖定年度/季度時，強制套用鎖定的值，不給使用者自己選
    // （跟 Improvement.tsx / KpiImportStep.tsx 用同一套 useReportPeriodLock）。
    useEffect(() => {
        if (periodLock.loading || !periodLock.isLocked) return;
        const current = (stepData.SelectCompany as SelectCompany) || {};
        updateStepData({
            SelectCompany: {
                ...current,
                year: periodLock.currentYear,
                quarter: periodLock.currentQuarter,
            },
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodLock.loading, periodLock.isLocked, periodLock.currentYear, periodLock.currentQuarter]);

    const handleSelectChange = (
        name: keyof SelectCompany,
        value: string | number
    ) => {
        const current = (stepData.SelectCompany as SelectCompany) || {};
        updateStepData({
            SelectCompany: {
                ...current,
                [name]:
                    name === "organizationId" || name === "year"
                        ? Number(value)
                        : (value as any),
            },
        });
    };

    /** 嘗試聚焦 SelectEnterprise 內的第一個 select（或 container） */
    const focusOrgSelect = () => {
        // 嘗試找常見的 id/name；不行就抓區塊內第一個 select
        const candidate =
            document.querySelector<HTMLSelectElement>("#enterprise") ||
            document.querySelector<HTMLSelectElement>('select[name="enterprise"]') ||
            enterpriseSectionRef.current?.querySelector<HTMLSelectElement>("select");

        (candidate as any)?.focus?.();
        candidate?.scrollIntoView?.({ behavior: "smooth", block: "center" });

        // 若完全抓不到，就滾到整個區塊
        if (!candidate && enterpriseSectionRef.current) {
            enterpriseSectionRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    };

    useImperativeHandle(ref, () => ({
        validateAndFocus: () => {
            const form = formRef.current;

            // 1) 原生 required 驗證（含 year / quarter）
            if (form && !form.checkValidity()) {
                form.reportValidity();
                const firstInvalid = form.querySelector<HTMLElement>(":invalid");
                firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
                (firstInvalid as any)?.focus?.();
                return false;
            }

            // 2) 組織必選（SelectEnterprise 是自訂元件，需額外檢查）
            if (!selectedOrgId) {
                // 這裡你可在外層搭配 toast 顯示訊息
                focusOrgSelect();
                return false;
            }

            return true;
        },

        focusField: (name) => {
            if (name === "organizationId") {
                focusOrgSelect();
                return;
            }
            if (name === "year") {
                yearSelectRef.current?.focus();
                yearSelectRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
                return;
            }
            if (name === "quarter") {
                quarterSelectRef.current?.focus();
                quarterSelectRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                });
            }
        },
    }));

    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            {/* 用 form 包裹，才能啟動原生 required 驗證 */}
            <form ref={formRef} className="card-body p-6">
                <div className="mb-4">
                    {/* 組織選擇區（保存一個容器 ref 以便聚焦/捲動） */}
                    <div ref={enterpriseSectionRef}>
                        <SelectEnterprise
                            showYearRange={false}
                            onSelectionChange={(payload) => {
                                handleSelectChange("organizationId", payload.orgId);
                            }}
                        />
                    </div>

                    {/* 年度 */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            請選擇民國年度
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                            <select
                                ref={yearSelectRef}
                                id="year"
                                name="year"
                                aria-label="選擇民國年度"
                                required
                                disabled={periodLock.isLocked}
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select disabled:bg-gray-100 disabled:text-gray-500"
                                value={selectedYear}
                                onChange={(e) => handleSelectChange("year", e.target.value)}
                            >
                                <option value="">請選擇年度</option>
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {year} 年
                                    </option>
                                ))}
                            </select>
                            <ChevronDownIcon
                                aria-hidden="true"
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                            />
                        </div>
                    </div>

                    {/* 季度 */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            請選擇季度
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                            <select
                                ref={quarterSelectRef}
                                id="quarter"
                                name="quarter"
                                aria-label="選擇季度"
                                required
                                disabled={periodLock.isLocked}
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select disabled:bg-gray-100 disabled:text-gray-500"
                                value={selectedQuarter}
                                onChange={(e) => handleSelectChange("quarter", e.target.value)}
                            >
                                <option value="">請選擇季度</option>
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
            </form>
        </div>
    );
});

export default AddKpiValueStep1;
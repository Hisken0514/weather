import React, {
    forwardRef,
    useImperativeHandle,
    useRef,
} from "react";
import { useStepContext } from "../StepComponse";
import SelectEnterprise from "@/components/select/selectEnterprise";
import { SelectCompany } from "@/components/Suggest/AddSugvalue";

export type AddSugStep1Ref = {
    /** 觸發驗證並自動聚焦第一個錯誤欄位；通過回傳 true，否則 false */
    validateAndFocus: () => boolean;
    /** 手動聚焦特定欄位 */
    focusField: (name: "organizationId") => void;
};

const AddSugValueStep1 = forwardRef<AddSugStep1Ref>(function AddSugValueStep1(_, ref) {
    const { stepData, updateStepData } = useStepContext();

    const formRef = useRef<HTMLFormElement>(null);
    const enterpriseSectionRef = useRef<HTMLDivElement>(null);

    const selectedOrgId =
        (stepData.SelectCompany as SelectCompany)?.organizationId ?? null;

    const handleSelectChange = (name: keyof SelectCompany, value: string | number) => {
        const current = (stepData.SelectCompany as SelectCompany) || {};
        updateStepData({
            SelectCompany: {
                ...current,
                [name]: name === "organizationId" ? Number(value) : (value as any),
            },
        });
    };

    /** 嘗試聚焦 SelectEnterprise 內最先出現的 select（抓不到就捲到容器） */
    const focusOrgSelect = () => {
        const el =
            document.querySelector<HTMLSelectElement>("#enterprise") ||
            document.querySelector<HTMLSelectElement>('select[name="enterprise"]') ||
            enterpriseSectionRef.current?.querySelector<HTMLSelectElement>("select");

        if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        } else if (enterpriseSectionRef.current) {
            enterpriseSectionRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }
    };

    useImperativeHandle(ref, () => ({
        validateAndFocus: () => {
            const form = formRef.current;

            // 如果未來這頁有原生 required 欄位，這裡會自動驗證並聚焦第一個 :invalid
            if (form && !form.checkValidity()) {
                form.reportValidity();
                const firstInvalid = form.querySelector<HTMLElement>(":invalid");
                firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
                (firstInvalid as any)?.focus?.();
                return false;
            }

            // 檢查：必須選擇 organizationId（SelectEnterprise 屬自訂元件，需手動驗證）
            if (!selectedOrgId) {
                focusOrgSelect();
                return false;
            }

            return true;
        },

        focusField: (name) => {
            if (name === "organizationId") {
                focusOrgSelect();
            }
        },
    }));

    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            {/* 用 form 包裹，確保日後原生 required 能啟動 */}
            <form ref={formRef} className="card-body p-6">
                <div className="mb-4">
                    {/* 組織選擇區（保留容器 ref 以便聚焦/捲動） */}
                    <div ref={enterpriseSectionRef}>
                        <SelectEnterprise
                            showYearRange={false}
                            onSelectionChange={(payload) => {
                                handleSelectChange("organizationId", payload.orgId);
                            }}
                        />
                    </div>
                </div>
            </form>
        </div>
    );
});

export default AddSugValueStep1;
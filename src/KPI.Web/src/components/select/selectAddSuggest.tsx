import React, { useImperativeHandle, forwardRef, useState, useEffect, useRef } from "react";
import { IMaskInput } from "react-imask";
import dynamic from "next/dynamic";
import { Company, Enterprise, Factory } from "@/types/EnterPriseType";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { enterpriseService } from "@/services/selectCompany";
import { toast, Toaster } from "react-hot-toast";
import api from "@/services/apiService";

const CreatableSelect = dynamic(() => import("react-select/creatable"), { ssr: false });

interface CommitteeUser {
    id: string;
    nickName: string;
}

interface Option {
    value: string;
    label: string;
}

export interface AddSuggestFormData {
    organizationId: string;
    date: string;
    eventType: string;
    category: string;
    enCategory: string | null;
    committee: string;
    suggestion: string;
    suggestionType: string;
    department: string;
    isAdopted: string;
    adoptedOther: string | null;
    improveDetail: string;
    manpower: number | null;
    budget: number | null;
    isCompleted: string;
    completedOther: string | null;
    doneYear: string;
    doneMonth: string;
    isParallel: string;
    parallelOther: string | null;
    execPlan: string | null;
    remark: string | null;
}

export default forwardRef(function SelectAddAll(_, ref) {
    const formRef = useRef<HTMLFormElement>(null);

    const [formData, setFormData] = useState<Partial<AddSuggestFormData>>({});
    const [data, setData] = useState<Enterprise[]>([]);
    const [selectedEnterprise, setSelectedEnterprise] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("");
    const [selectedFactory, setSelectedFactory] = useState("");
    const [companies, setCompanies] = useState<Company[]>([]);
    const [factories, setFactories] = useState<Factory[]>([]);
    const [selectedOrgId, setSelectedOrgId] = useState("");

    const [showVendorSection, setShowVendorSection] = useState(false);

    const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
    const [isCategoryLoading, setIsCategoryLoading] = useState(false);
    const [pendingNewCategory, setPendingNewCategory] = useState<string | null>(null);
    const [pendingEnCategory, setPendingEnCategory] = useState<string>("");
    const [isNewCategoryConfirmed, setIsNewCategoryConfirmed] = useState(false);

    const [committeeOptions, setCommitteeOptions] = useState<Option[]>([]);
    const [isCommitteeLoading, setIsCommitteeLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const result = await enterpriseService.fetchData();
            setData(result);
        };
        fetchData();
    }, []);

    useEffect(() => {
        const fetchCategories = async () => {
            setIsCategoryLoading(true);
            try {
                const res = await api.get("/Suggest/GetAllCategories");
                const options = res.data.map((item: { id: number; field: string }) => ({
                    value: item.id.toString(),
                    label: item.field,
                }));
                setCategoryOptions(options);
            } catch (err) {
                console.error("類別載入失敗", err);
            } finally {
                setIsCategoryLoading(false);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const fetchCommittees = async () => {
            const res = await api.get<CommitteeUser[]>("/Suggest/GetCommitteeUsers");
            const mapped = res.data.map((user) => ({ value: user.id, label: user.nickName }));
            setCommitteeOptions(mapped);
        };
        fetchCommittees();
    }, []);

    const handleChange = (field: keyof AddSuggestFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreateCommittee = (inputValue: string) => {
        setIsCommitteeLoading(true);
        setTimeout(() => {
            const newOption = { label: inputValue, value: inputValue };
            setCommitteeOptions((prev) => [...prev, newOption]);
            handleChange("committee", inputValue);
            setIsCommitteeLoading(false);
        }, 500);
    };

    const handleEnterpriseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const enterpriseId = e.target.value;
        setSelectedEnterprise(enterpriseId);
        const enterprise = data.find((ent) => ent.id === enterpriseId);
        setCompanies(enterprise?.children || []);
        setSelectedCompany("");
        setSelectedFactory("");
        setFactories([]);
        setSelectedOrgId(enterpriseId || "");
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const companyId = e.target.value;
        setSelectedCompany(companyId);
        const company = companies.find((comp) => comp.id === companyId);
        setFactories(company?.children || []);
        setSelectedOrgId(companyId || "");
    };

    const handleFactoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const factoryId = e.target.value;
        setSelectedFactory(factoryId);
        setSelectedOrgId(factoryId || selectedCompany || selectedEnterprise || "");
    };

    // react-select 找 input 用的 query（盡量對齊你的 classNamePrefix）
    const focusReactSelectInput = (selector = ".myselect-123 input") => {
        const el = document.querySelector<HTMLInputElement>(selector);
        if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    useImperativeHandle(ref, () => ({
        getFormData: (): AddSuggestFormData | null => {
            const form = formRef.current;

            // 1) 原生 required 驗證（自動聚焦第一個 :invalid）
            if (form && !form.checkValidity()) {
                form.reportValidity();
                const firstInvalid = form.querySelector<HTMLElement>(":invalid");
                firstInvalid?.scrollIntoView({ behavior: "smooth", block: "center" });
                (firstInvalid as any)?.focus?.();
                return null;
            }

            // 2) 組織層級必選（selectedOrgId 不是原生表單欄位）
            if (!selectedOrgId) {
                toast.error("請先完成階層選擇");
                const toFocus =
                    form?.querySelector<HTMLSelectElement>("#factory") ||
                    form?.querySelector<HTMLSelectElement>("#company") ||
                    form?.querySelector<HTMLSelectElement>("#enterprise");
                toFocus?.focus();
                toFocus?.scrollIntoView({ behavior: "smooth", block: "center" });
                return null;
            }

            // 3) CreatableSelect 必填：category、committee
            if (!formData.category) {
                toast.error("請選擇或新增『類別』");
                focusReactSelectInput(".myselect-123 input");
                return null;
            }
            if (!formData.committee) {
                toast.error("請選擇或新增『委員』");
                focusReactSelectInput(".myselect input"); // 這個 classNamePrefix 你上面沒設，可視情況調整
                return null;
            }

            return {
                ...(formData as AddSuggestFormData),
                organizationId: selectedOrgId,
            };
        },
    }));

    const customStyles = {
        control: (provided: any, state: any) => ({
            ...provided,
            outline: state.isFocused ? "4px dashed #ff1493" : "none",
            outlineOffset: state.isFocused ? "2px" : "0",
            fontSize: "0.875rem",
            boxShadow: "none",
            transition: "none",
            "&:hover": { borderColor: "#ccc" },
        }),
        input: (provided: any) => ({ ...provided, outline: "none" }),
    };

    return (
        <>
            <Toaster position="top-right" reverseOrder={false} />

            {/* 用 form 包起來，便於原生驗證 */}
            <form ref={formRef}>
                {/* 區塊 1：基本資料 */}
                <fieldset className="mb-6 border rounded-md p-4">
                    <legend className="text-base font-semibold text-gray-700">📌 基本資料</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">階層1（企業/公司）(必填的)</label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                    id="enterprise"
                                    name="enterprise"
                                    aria-label="請選擇階層 1"
                                    value={selectedEnterprise}
                                    onChange={handleEnterpriseChange}
                                    required
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                >
                                    <option value="">請選擇階層1</option>
                                    {data.map((enterprise) => (
                                        <option key={enterprise.id} value={enterprise.id}>
                                            {enterprise.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon
                                    aria-hidden="true"
                                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">階層2（公司/工廠）(必填的)</label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                    id="company"
                                    name="company"
                                    aria-label="請選擇階層 2"
                                    value={selectedCompany}
                                    onChange={handleCompanyChange}
                                    required
                                    disabled={!companies.length}
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                >
                                    <option value="">請選擇階層2</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.id}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon
                                    aria-hidden="true"
                                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">階層3（工廠）(必填的)</label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                    id="factory"
                                    name="factory"
                                    aria-label="請選擇階層 3"
                                    value={selectedFactory}
                                    onChange={handleFactoryChange}
                                    required
                                    disabled={!factories.length}
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                >
                                    <option value="">請選擇階層3</option>
                                    {factories.map((factory) => (
                                        <option key={factory.id} value={factory.id}>
                                            {factory.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDownIcon
                                    aria-hidden="true"
                                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">年月日 (必填的)</label>
                            <div className="mt-2 grid grid-cols-1">
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    aria-label="日期"
                                    value={formData.date ?? ""}
                                    onChange={(e) => handleChange("date", e.target.value)}
                                    required
                                    className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2
                                                text-black appearance-none bg-white
                                                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">會議/活動 (必填的)</label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                    id="eventType"
                                    name="eventType"
                                    aria-label="會議/活動"
                                    value={formData.eventType ?? ""}
                                    onChange={(e) => handleChange("eventType", e.target.value)}
                                    required
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                >
                                    <option value="">請選擇</option>
                                    <option value="書面審查會議">書面審查會議</option>
                                    <option value="實地進廠查驗">實地進廠查驗</option>
                                    <option value="領先指標輔導">領先指標輔導</option>
                                    <option value="工安管理訪查會議">工安管理訪查會議</option>
                                    <option
                                        value="事故改善暨平行展開管理追蹤檢討會議">事故改善暨平行展開管理追蹤檢討會議
                                    </option>
                                </select>
                                <ChevronDownIcon
                                    aria-hidden="true"
                                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>

                {/* 區塊 2：委員建議內容 */}
                <fieldset className="mb-6 border rounded-md p-4">
                    <legend className="text-base font-semibold text-gray-700">🧾 委員建議內容</legend>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">類別（可搜尋或新增）(必填的)</label>
                            <CreatableSelect
                                aria-label="類別"
                                styles={customStyles}
                                classNamePrefix="myselect-123"
                                isClearable
                                required
                                isDisabled={isCategoryLoading}
                                isLoading={isCategoryLoading}
                                options={categoryOptions}
                                value={categoryOptions.find((o) => o.label === formData.category) || null}
                                onChange={(option: any) => {
                                    if (option) {
                                        handleChange("category", option.label);
                                        handleChange("enCategory", option.label);
                                    } else {
                                        handleChange("category", "");
                                        handleChange("enCategory", "");
                                    }
                                }}
                                onCreateOption={(inputValue) => {
                                    setPendingNewCategory(inputValue);
                                    setPendingEnCategory("");
                                }}
                                placeholder="請選擇或輸入類別"
                                className="myselect-123 mt-2"
                            />
                        </div>

                        {pendingNewCategory && (
                            <div className="mt-2 border border-yellow-300 bg-yellow-50 rounded-md p-3">
                                <p className="text-sm font-medium text-gray-800 mb-1">
                                    類別「{pendingNewCategory}」的英文名稱：
                                </p>
                                <input
                                    type="text"
                                    value={pendingEnCategory}
                                    onChange={(e) => setPendingEnCategory(e.target.value)}
                                    disabled={isNewCategoryConfirmed}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                                />
                                <div className="mt-2 flex justify-end gap-2">
                                    {!isNewCategoryConfirmed ? (
                                        <button
                                            onClick={() => {
                                                const newOption = { label: pendingNewCategory, value: pendingNewCategory };
                                                setCategoryOptions((prev) => [...prev, newOption]);
                                                handleChange("category", pendingNewCategory);
                                                handleChange("enCategory", pendingEnCategory);
                                                setIsNewCategoryConfirmed(true);
                                            }}
                                            disabled={!pendingEnCategory.trim()}
                                            className="bg-blue-600 text-white text-sm px-4 py-1 rounded"
                                        >
                                            確認新增
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={() => {
                                            setPendingNewCategory(null);
                                            setPendingEnCategory("");
                                            handleChange("category", "");
                                            handleChange("enCategory", "");
                                            setIsNewCategoryConfirmed(false);
                                        }}
                                        className="bg-gray-300 text-sm px-4 py-1 rounded"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">委員（可搜尋或新增）(必填的)</label>
                            <CreatableSelect
                                aria-label="委員"
                                styles={customStyles}
                                classNamePrefix="myselect"
                                isClearable
                                required
                                isDisabled={isCommitteeLoading}
                                isLoading={isCommitteeLoading}
                                options={committeeOptions}
                                value={committeeOptions.find((o) => o.label === formData.committee) || null}
                                onChange={(option: any) => handleChange("committee", option?.label || "")}
                                onCreateOption={handleCreateCommittee}
                                placeholder="請選擇或輸入委員名"
                                className="mt-2"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">建議 (必填的)</label>
                            <textarea
                                id="suggestion"
                                name="suggestion"
                                placeholder="請輸入建議"
                                value={formData.suggestion ?? ""}
                                onChange={(e) => handleChange("suggestion", e.target.value)}
                                required
                                rows={1}
                                className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2 resize-y"
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-900">建議類別 (必填的)</label>
                            <div className="mt-2 grid grid-cols-1">
                                <select
                                    id="suggestionType"
                                    name="suggestionType"
                                    aria-label="建議類別"
                                    value={formData.suggestionType ?? ""}
                                    onChange={(e) => handleChange("suggestionType", e.target.value)}
                                    required
                                    className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                >
                                    <option value="">請選擇建議類別</option>
                                    <option value="改善建議">改善建議</option>
                                    <option value="精進建議">精進建議</option>
                                    <option value="可資借鏡">可資借鏡</option>
                                </select>
                                <ChevronDownIcon
                                    aria-hidden="true"
                                    className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                />
                            </div>
                        </div>
                    </div>
                </fieldset>

                <div className="mb-4">
                    <label className="inline-flex items-center">
                        <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={showVendorSection}
                            onChange={(e) => setShowVendorSection(e.target.checked)}
                        />
                        <span className="ml-2 text-sm text-gray-700">是否填寫廠商填寫區域</span>
                    </label>
                </div>

                {/* 區塊 3：廠商填寫區域（選填） */}
                {showVendorSection && (
                    <fieldset className="mb-6 border rounded-md p-4">
                        <legend className="text-base font-semibold text-gray-700">🏭 廠商填寫區域</legend>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">是否參採</label>
                                <div className="mt-2 grid grid-cols-1">
                                    <select
                                        value={formData.isAdopted ?? ""}
                                        onChange={(e) => handleChange("isAdopted", e.target.value)}
                                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                    >
                                        <option value="">請選擇</option>
                                        <option value="1">是</option>
                                        <option value="0">否</option>
                                        <option value="2">不參採</option>
                                        <option value="3">詳備註</option>
                                    </select>
                                    <ChevronDownIcon
                                        aria-hidden="true"
                                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                    />
                                </div>
                                {formData.isAdopted === "3" && (
                                    <input
                                        type="text"
                                        placeholder="請輸入補充"
                                        value={formData.adoptedOther ?? ""}
                                        onChange={(e) => handleChange("adoptedOther", e.target.value || null)}
                                        className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                    />
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">預計完成年份</label>
                                <IMaskInput
                                    mask="000"
                                    placeholder="例如: 113"
                                    value={formData.doneYear ?? ""}
                                    onAccept={(val) => handleChange("doneYear", val)}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">預計完成月份</label>
                                <IMaskInput
                                    mask="00"
                                    placeholder="例如: 07"
                                    value={formData.doneMonth ?? ""}
                                    onAccept={(val) => handleChange("doneMonth", val)}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">是否完成改善/辦理</label>
                                <div className="mt-2 grid grid-cols-1">
                                    <select
                                        value={formData.isCompleted ?? ""}
                                        onChange={(e) => handleChange("isCompleted", e.target.value)}
                                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                    >
                                        <option value="">請選擇</option>
                                        <option value="1">是</option>
                                        <option value="0">否</option>
                                        <option value="2">不參採</option>
                                        <option value="3">詳備註</option>
                                    </select>
                                    <ChevronDownIcon
                                        aria-hidden="true"
                                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                    />
                                </div>
                                {formData.isCompleted === "3" && (
                                    <input
                                        type="text"
                                        placeholder="請輸入補充"
                                        value={formData.completedOther ?? ""}
                                        onChange={(e) => handleChange("completedOther", e.target.value || null)}
                                        className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                    />
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">負責部門</label>
                                <input
                                    type="text"
                                    placeholder="請輸入負責部門"
                                    value={formData.department ?? ""}
                                    onChange={(e) => handleChange("department", e.target.value)}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">改善對策/辦理情形</label>
                                <textarea
                                    placeholder="請輸入改善對策/辦理情形"
                                    value={formData.improveDetail ?? ""}
                                    onChange={(e) => handleChange("improveDetail", e.target.value)}
                                    rows={1}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2 resize-y"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">投入人力(人/月)</label>
                                <input
                                    type="number"
                                    placeholder="如沒有請留空"
                                    value={formData.manpower ?? ""}
                                    onChange={(e) => handleChange("manpower", parseInt(e.target.value) || null)}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">投入(改善)經費 (元)</label>
                                <input
                                    type="number"
                                    placeholder="如沒有請留空"
                                    step="0.01"
                                    value={formData.budget ?? ""}
                                    onChange={(e) => handleChange("budget", parseFloat(e.target.value) || null)}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>

                            <div className="mt-4" />

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">是否平行展開推動執行</label>
                                <div className="mt-2 grid grid-cols-1">
                                    <select
                                        value={formData.isParallel ?? ""}
                                        onChange={(e) => handleChange("isParallel", e.target.value)}
                                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 custom-select"
                                    >
                                        <option value="">請選擇</option>
                                        <option value="1">是</option>
                                        <option value="0">否</option>
                                        <option value="2">不參採</option>
                                        <option value="3">詳備註</option>
                                    </select>
                                    <ChevronDownIcon
                                        aria-hidden="true"
                                        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                    />
                                </div>
                                {formData.isParallel === "3" && (
                                    <input
                                        type="text"
                                        placeholder="請輸入補充"
                                        value={formData.parallelOther ?? ""}
                                        onChange={(e) => handleChange("parallelOther", e.target.value || null)}
                                        className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                    />
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">平行展開推動執行規劃</label>
                                <textarea
                                    placeholder="請輸入執行規劃"
                                    value={formData.execPlan ?? ""}
                                    onChange={(e) => handleChange("execPlan", e.target.value || null)}
                                    rows={1}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2 resize-y"
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-900">備註</label>
                                <input
                                    type="text"
                                    placeholder="請輸入備註"
                                    value={formData.remark ?? ""}
                                    onChange={(e) => handleChange("remark", e.target.value || null)}
                                    className="w-full mt-2 border border-gray-300 rounded-md px-3 py-2"
                                />
                            </div>
                        </div>
                    </fieldset>
                )}
            </form>
        </>
    );
});

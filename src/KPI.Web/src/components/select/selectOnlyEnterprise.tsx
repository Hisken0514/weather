import {ChevronDownIcon} from "@heroicons/react/16/solid";
import React, {useEffect, useState} from "react";
import {enterpriseService} from "@/services/selectCompany";
import {Company, Enterprise, Factory} from "@/types/EnterPriseType";
import {useauthStore} from "@/Stores/authStore";

export interface SelectionPayload {
    orgId: string;
    orgName?: string; // 新增這個
    keyword?: string;
}

interface SelectEnterpriseProps {
    onSelectionChange?: (selection: SelectionPayload) => void;
    showYearRange?: boolean;
}

export default function SelectEnterprise({ onSelectionChange}: SelectEnterpriseProps) {
    const [data, setData] = useState<Enterprise[]>([]); // 保存企業數據
    const [selectedEnterprise, setSelectedEnterprise] = useState(""); // 選中的企業
    const [selectedCompany, setSelectedCompany] = useState(""); // 選中的公司
    const [selectedFactory, setSelectedFactory] = useState("");
    const [companies, setCompanies] = useState<Company[]>([]); // 當前顯示的公司
    const [factories, setFactories] = useState<Factory[]>([]); // 當前顯示的工廠

    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [userOrgLevel, setUserOrgLevel] = useState<number | null>(null);

    const { userRole, userOrgId } = useauthStore();

    // 請求 API 獲取企業數據
    useEffect(() => {
        const fetchData = async () => {
            const enterprises = await enterpriseService.fetchData();
            setData(enterprises);

            // 如果是 company 角色，自動選取對應組織
            if (userRole === 'company' && userOrgId) {
                const orgId = userOrgId.toString();

                // 尋找 enterprise/company/factory 結構
                outer: for (const enterprise of enterprises) {
                    if (enterprise.id === orgId) {
                        setSelectedEnterprise(orgId);
                        setCompanies(enterprise.children || []);
                        setUserOrgLevel(1);
                        break;
                    }
                    for (const company of enterprise.children || []) {
                        if (company.id === orgId) {
                            setSelectedEnterprise(enterprise.id);
                            setSelectedCompany(orgId);
                            setCompanies(enterprise.children || []);
                            setFactories(company.children || []);
                            setUserOrgLevel(2);
                            break outer;
                        }
                        for (const factory of company.children || []) {
                            if (factory.id === orgId) {
                                setSelectedEnterprise(enterprise.id);
                                setSelectedCompany(company.id);
                                setSelectedFactory(factory.id);
                                setCompanies(enterprise.children || []);
                                setFactories(company.children || []);
                                setUserOrgLevel(3);
                                break outer;
                            }
                        }
                    }
                }
                setSelectedOrgId(orgId);
                emitSelection(orgId);
            }
        };
        fetchData();
    }, [userRole, userOrgId]);

    // 當選擇企業時更新公司列表
    const handleEnterpriseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const enterpriseId = e.target.value;
        setSelectedEnterprise(enterpriseId);
        // 根據選中的企業查找公司
        const enterprise = data.find((ent) => ent.id === enterpriseId);
        setCompanies(enterprise ? enterprise.children : []);
        setFactories([]); // 重置工廠
        setSelectedCompany(""); // 重置選中的公司
        setSelectedFactory("");

        const finalId = enterprise?.id || "";
        setSelectedOrgId(finalId);
        emitSelection(finalId); // ✅ 回傳
    };

    // 當選擇公司時更新工廠列表
    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const companyId = e.target.value;
        setSelectedCompany(companyId);

        // 根據選中的公司查找工廠
        const company = companies.find((comp) => comp.id === companyId);
        setFactories(company ? company.children : []);

        const finalId = company?.id || selectedEnterprise;
        setSelectedOrgId(finalId);
        emitSelection(finalId); // ✅ 回傳
    };

    const handleFactoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const factoryId = e.target.value;
        setSelectedFactory(factoryId);

        const finalId = factoryId || selectedCompany || selectedEnterprise;
        setSelectedOrgId(finalId);
        emitSelection(finalId); // ✅ 回傳
    };

    const emitSelection = (orgId: string) => {
        const allNodes = [...data, ...companies, ...factories];
        const selected = allNodes.find(x => x.id === orgId);
        onSelectionChange?.({
            orgId,
            orgName: selected?.name || "所有公司",
        });
    };
    const isCompany = userRole === 'company';

    return (
        <>
            <div>
                <label htmlFor="enterprise" className="block text-sm/6 font-medium text-gray-900">
                    階層1（企業/公司）
                </label>
                <div className="mt-2 grid grid-cols-1">
                    <select
                        id="enterprise"
                        name="enterprise"
                        aria-label="請選擇階層 1"
                        value={selectedEnterprise}
                        onChange={handleEnterpriseChange}
                        disabled={isCompany}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
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
            <div>
                <label htmlFor="company" className="block text-sm/6 font-medium text-gray-900">
                    階層2（公司/工廠）
                </label>
                <div className="mt-2 grid grid-cols-1">
                    <select
                        id="company"
                        name="company"
                        aria-label="請選擇階層 2"
                        value={selectedCompany}
                        onChange={handleCompanyChange}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                        disabled={!companies.length || (isCompany && (userOrgLevel ?? 0) >= 2)}
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
            <div>
                <label htmlFor="factory" className="block text-sm/6 font-medium text-gray-900">
                    階層3（工廠）
                </label>
                <div className="mt-2 grid grid-cols-1">
                    <select
                        id="factory"
                        name="factory"
                        aria-label="請選擇階層 3"
                        value={selectedFactory}
                        onChange={handleFactoryChange}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                        disabled={!factories.length || (isCompany && (userOrgLevel ?? 0) >= 3)}
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

        </>
    )
}

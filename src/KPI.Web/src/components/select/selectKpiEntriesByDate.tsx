import { ChevronDownIcon } from "@heroicons/react/16/solid";
import React, { useEffect, useState } from "react";
import { enterpriseService } from "@/services/selectCompany";
import { Company, Enterprise, Factory } from "@/types/EnterPriseType";
import { useauthStore } from "@/Stores/authStore";
import { quarterHelper } from "@/helpers/quarter";

export interface SelectionPayload {
    orgId: string;
    startYear?: string;
    endYear?: string;
    startQuarter?: string;
    endQuarter?: string;
    keyword?: string;
}

interface SelectEnterpriseProps {
    onSelectionChange?: (selection: SelectionPayload) => void;
    showYearRange?: boolean;
}

export default function SelectKpiEntriesByDate({ onSelectionChange, showYearRange = true }: SelectEnterpriseProps) {
    const [data, setData] = useState<Enterprise[]>([]);
    const [selectedEnterprise, setSelectedEnterprise] = useState("");
    const [selectedCompany, setSelectedCompany] = useState("");
    const [selectedFactory, setSelectedFactory] = useState("");
    const [companies, setCompanies] = useState<Company[]>([]);
    const [factories, setFactories] = useState<Factory[]>([]);
    const [startYear, setStartYear] = useState("");
    const [endYear, setEndYear] = useState("");
    const [startQuarter, setStartQuarter] = useState("");
    const [endQuarter, setEndQuarter] = useState("");
    const [selectedOrgId, setSelectedOrgId] = useState("");
    const [userOrgLevel, setUserOrgLevel] = useState<number | null>(null);

    const { userRole, userOrgId } = useauthStore();
    const yearOptions = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - 1911 - i);
    useEffect(() => {
        const fetchData = async () => {
            const enterprises = await enterpriseService.fetchData();
            setData(enterprises);
            console.log('[DEBUG] enterprises tree:', JSON.stringify(enterprises, null, 2));

            // 如果是 company 角色，自動選取對應組織
            if (userRole === 'company' && userOrgId) {
                const orgId = userOrgId.toString();
                console.log('[DEBUG] userOrgId:', orgId, 'userRole:', userRole);

                // 尋找 enterprise/company/factory 結構
                outer: for (const enterprise of enterprises) {
                    if (enterprise.id === orgId) {
                        console.log('[DEBUG] matched at enterprise level, children:', enterprise.children);
                        setSelectedEnterprise(orgId);
                        setCompanies(enterprise.children || []);
                        setUserOrgLevel(1);
                        break;
                    }
                    for (const company of enterprise.children || []) {
                        if (company.id === orgId) {
                            console.log('[DEBUG] matched at company level, company.children (factories):', company.children);
                            setSelectedEnterprise(enterprise.id);
                            setSelectedCompany(orgId);
                            setCompanies(enterprise.children || []);
                            setFactories(company.children || []);
                            setUserOrgLevel(2);
                            break outer;
                        }
                        for (const factory of company.children || []) {
                            if (factory.id === orgId) {
                                console.log('[DEBUG] matched at factory level');
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
                emitSelection(orgId, startYear, endYear);
            }
        };
        fetchData();
    }, [userRole, userOrgId]);

    const handleEnterpriseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const enterpriseId = e.target.value;
        setSelectedEnterprise(enterpriseId);
        const enterprise = data.find((ent) => ent.id === enterpriseId);
        setCompanies(enterprise ? enterprise.children : []);
        setFactories([]);
        setSelectedCompany("");
        setSelectedFactory("");
        setSelectedOrgId(enterprise?.id || "");
        emitSelection(enterprise?.id || "", startYear, endYear);
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const companyId = e.target.value;
        setSelectedCompany(companyId);
        const company = companies.find((comp) => comp.id === companyId);
        setFactories(company ? company.children : []);
        setSelectedOrgId(company?.id || selectedEnterprise);
        emitSelection(company?.id || selectedEnterprise, startYear, endYear);
    };

    const handleFactoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const factoryId = e.target.value;
        setSelectedFactory(factoryId);
        const finalId = factoryId || selectedCompany || selectedEnterprise;
        setSelectedOrgId(finalId);
        emitSelection(finalId, startYear, endYear);
    };

    const handleStartYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const year = e.target.value;
        setStartYear(year);
        setStartQuarter("");
        emitSelection(selectedOrgId, year, endYear);
    };

    const handleEndYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const year = e.target.value;
        setEndYear(year);
        setEndQuarter("");
        emitSelection(selectedOrgId, startYear, year);
    };

    const emitSelection = (
        orgId: string,
        start: string,
        end: string,
        sQuarter: string = startQuarter,
        eQuarter: string = endQuarter
    ) => {
        onSelectionChange?.({
            orgId,
            startYear: start,
            endYear: end,
            startQuarter: sQuarter,
            endQuarter: eQuarter,
        });
    };

    const handleStartQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setStartQuarter(val);
        emitSelection(selectedOrgId, startYear, endYear, val, endQuarter);
    };

    const handleEndQuarterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setEndQuarter(val);
        emitSelection(selectedOrgId, startYear, endYear, startQuarter, val);
    };

    const isCompany = userRole === 'company';

    return (
        <>
            {/* 第一層選單：企業 */}
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
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                    >
                        <option value="">請選擇階層1</option>
                        {data.map((enterprise) => (
                            <option key={enterprise.id} value={enterprise.id}>{enterprise.name}</option>
                        ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                </div>
            </div>

            {/* 第二層選單：公司 */}
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
                        disabled={!companies.length || (isCompany && (userOrgLevel ?? 0) >= 2)}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                    >
                        <option value="">請選擇階層2</option>
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>{company.name}</option>
                        ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                </div>
            </div>

            {/* 第三層選單：工廠 */}
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
                        disabled={!factories.length || (isCompany && (userOrgLevel ?? 0) >= 3)}
                        className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                    >
                        <option value="">請選擇階層3</option>
                        {factories.map((factory) => (
                            <option key={factory.id} value={factory.id}>{factory.name}</option>
                        ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4" />
                </div>
            </div>
            {showYearRange && (
                <>
                    <div>
                        <label htmlFor="startyear" className="block text-sm/6 font-medium text-gray-900">
                            開始年份
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                            <select
                                id="startyear"
                                name="startyear"
                                aria-label="選擇開始年份(民國)"
                                value={startYear}
                                onChange={handleStartYearChange}
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                            >
                                <option value="">請選擇年份</option>
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                            <ChevronDownIcon
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"/>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="startquarter" className="block text-sm/6 font-medium text-gray-900">
                            開始季度
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                            <select
                                id="startquarter"
                                value={startQuarter}
                                onChange={handleStartQuarterChange}
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                                disabled={!startYear.length}
                            >
                                <option value="">請選擇季度</option>
                                <option value="Q2">{quarterHelper.getQuarterLabel('Q2')}</option>
                                <option value="Q4">{quarterHelper.getQuarterLabel('Q4')}</option>
                                <option value="Y">全年</option>
                            </select>
                            <ChevronDownIcon
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"/>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="endyear" className="block text-sm/6 font-medium text-gray-900">
                            結束年份
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                            <select
                                id="endyear"
                                name="endyear"
                                aria-label="選擇結束年份(民國)"
                                value={endYear}
                                onChange={handleEndYearChange}
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                            >
                                <option value="">請選擇年份</option>
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                            <ChevronDownIcon
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"/>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="endquarter" className="block text-sm/6 font-medium text-gray-900">
                            結束季度
                        </label>
                        <div className="mt-2 grid grid-cols-1">
                            <select
                                id="endquarter"
                                value={endQuarter}
                                onChange={handleEndQuarterChange}
                                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 outline-gray-300 focus:outline-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                                disabled={!endYear.length}
                            >
                                <option value="">請選擇季度</option>
                                <option value="Q2">{quarterHelper.getQuarterLabel('Q2')}</option>
                                <option value="Q4">{quarterHelper.getQuarterLabel('Q4')}</option>
                                <option value="Y">全年</option>
                            </select>
                            <ChevronDownIcon
                                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"/>
                        </div>
                    </div>
                </>
            )}

        </>
    )
}

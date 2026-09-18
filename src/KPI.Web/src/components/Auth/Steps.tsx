'use client'
import React, {ReactNode, useState, useRef, useEffect} from 'react';
import {ChevronDownIcon} from "@heroicons/react/16/solid";
import Breadcrumbs from "@/components/Breadcrumbs";
import {getAccessToken} from "@/services/serverAuthService";
import api from "@/services/apiService"

// 定義接口
interface StepsContainerProps {
    children: ReactNode;
    vertical?: boolean;
}

interface StepProps {
    children: ReactNode;
    status?: 'default' | 'primary' | 'secondary' | 'accent' | 'neutral' | 'error' | 'completed';
}

interface Step1Props {
    email: string;
    setEmail: (email: string) => void;
}

interface Enterprise {
    Id: string;
    Name: string;
    Children?: Enterprise[];
}
interface Step2Props {
    setEnterpriseTree: React.Dispatch<React.SetStateAction<Enterprise[] | null>>; // 用來設定 enterpriseTree 的函式
    setSelectedEnterprise: React.Dispatch<React.SetStateAction<string | null>>; // 用來設定選擇的企業
    setSelectedCompany: React.Dispatch<React.SetStateAction<string | null>>; // 用來設定選擇的公司
    setSelectedFactory: React.Dispatch<React.SetStateAction<string | null>>; // 用來設定選擇的公司
    companyId: number | null; // 公司ID，可能是 null
    selectedEnterprise: string | null; // 選擇的企業
    selectedCompany: string | null; // 選擇的公司
    selectedFactory: string | null;
    enterpriseTree: Enterprise[] | null; // 企業結構樹
}



// 步驟容器組件
const StepsContainer: React.FC<StepsContainerProps> = ({ children, vertical = false }) => {
    return (
        <ul className={`steps ${vertical ? 'steps-vertical' : 'steps-horizontal'}`}>
            {children}
        </ul>
    );
};

// 單個步驟組件
const Step: React.FC<StepProps> = ({ children, status = 'default' }) => {
    // 步驟狀態: default, primary, secondary, accent, neutral, error, completed
    const statusClass = status !== 'default' ?`step-${status}` : 'default';

    return (
        <li className={`step ${statusClass}`}>{children}</li>
    );
};


// 第一步：確認信箱
const Step1: React.FC<Step1Props> = ({ email, setEmail }) => {

    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            <div className="card-header p-4 border-b font-medium text-lg">請輸入電子信箱</div>
            <div className="card-body p-6">
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">電子郵件</label>
                    <input
                        name="email"
                        type="email"
                        value={email}
                        required
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Email"
                    />
                </div>
                <div className="text-sm text-gray-600 mb-4">
                    我們將向此郵箱發送驗證碼，請確保能夠接收郵件。
                </div>
            </div>
        </div>
    );
};

// 第二步：驗證電子信箱
const Step2: React.FC<Step2Props> = (Step2funtion:Step2Props) => {
    const handleEnterpriseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        Step2funtion.setSelectedEnterprise(e.target.value);
    };

    const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        Step2funtion.setSelectedCompany(e.target.value);
    };

    const handleFactoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        Step2funtion.setSelectedFactory(e.target.value);
    };
    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            <div className="card-header p-4 border-b font-medium text-lg">確認公司與層級</div>
            <div className="card-body p-6">
                <div className="mb-4">
                    <div>
                        {Step2funtion.companyId ? (
                            <>
                                <div className="sm:col-span-2">
                                    <label htmlFor="enterprise" className="block text-sm/6 font-medium text-gray-900">
                                        企業
                                    </label>
                                    <div className="mt-2 grid grid-cols-1">
                                        <select
                                            id="enterprise"
                                            name="enterprise"
                                            value={Step2funtion.selectedEnterprise || ""}
                                            onChange={handleEnterpriseChange}
                                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"
                                        >
                                            <option value="">{Step2funtion.selectedEnterprise || "請選擇企業"}</option>

                                        </select>
                                        <ChevronDownIcon
                                            aria-hidden="true"
                                            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                        />
                                    </div>

                                    <label htmlFor="company" className="block text-sm/6 font-medium text-gray-900">
                                        公司
                                    </label>
                                    <div className="mt-2 grid grid-cols-1">
                                        <select
                                            id="company"
                                            name="company"
                                            value={Step2funtion.selectedCompany || ""}
                                            onChange={handleCompanyChange}
                                            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pl-3 pr-8 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 custom-select"

                                        >
                                            <option value="">{Step2funtion.selectedCompany || "請選擇公司"}</option>

                                        </select>
                                        <ChevronDownIcon
                                            aria-hidden="true"
                                            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="sm:col-span-2">
                                    <label htmlFor="enterprise" className="block text-sm font-medium text-gray-900">
                                        企業
                                    </label>
                                    <select
                                        id="enterprise"
                                        name="enterprise"
                                        className="w-full"
                                        onChange={handleEnterpriseChange}
                                    >
                                        <option value="">請選擇企業</option>
                                        {Step2funtion.enterpriseTree?.map((enterprise) => (
                                            <option key={enterprise.Id} value={enterprise.Name}>
                                                {enterprise.Name}
                                            </option>
                                        ))}
                                    </select>

                                    <label htmlFor="company" className="block text-sm font-medium text-gray-900">
                                        公司
                                    </label>
                                    <select
                                        id="company"
                                        name="company"
                                        className="w-full"
                                        onChange={handleCompanyChange}
                                    >
                                        <option value="">請選擇公司</option>
                                        {Step2funtion.enterpriseTree?.map((company) => (
                                            <option key={company.Id} value={company.Name}>
                                                {company.Name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                        <label htmlFor="factory" className="block text-sm font-medium text-gray-900">
                            工廠
                        </label>
                        <select
                            id="factory"
                            name="factory"
                            className="w-full"
                            value={Step2funtion.selectedFactory || ""}
                            onChange={handleFactoryChange}
                        >
                            <option value="">請選擇工廠</option>
                            {Step2funtion.enterpriseTree?.map((factory) => (
                                <option key={factory.Id} value={factory.Name}>
                                    {factory.Name}
                                </option>
                            ))}
                        </select>
                    </div>
                        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                            <fieldset>
                                <h2 className="text-sm/6 font-semibold text-gray-900">身分權限</h2>
                                <div className="mt-6 flex flex-row items-center gap-x-6">
                                    <div className="flex items-center gap-x-3">
                                        <input
                                            defaultChecked
                                            id="audit-admin"
                                            name="audit"
                                            type="radio"
                                            className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
                                        />
                                        <label htmlFor="audit-admin"
                                               className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">
                                            員工
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-x-3">
                                        <input
                                            id="audit-power"
                                            name="audit"
                                            type="radio"
                                            className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
                                        />
                                        <label htmlFor="audit-power"
                                               className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">
                                            工廠主管
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-x-3">
                                        <input
                                            id="audit-operator"
                                            name="audit"
                                            type="radio"
                                            className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
                                        />
                                        <label htmlFor="audit-operator"
                                               className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">
                                            公司主管
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-x-3">
                                        <input
                                            id="audit-none"
                                            name="audit"
                                            type="radio"
                                            className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
                                        />
                                        <label htmlFor="audit-none"
                                               className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">
                                            政府監管者
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-x-3">
                                        <input
                                            id="audit-none"
                                            name="audit"
                                            type="radio"
                                            className="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden [&:not(:checked)]:before:hidden"
                                        />
                                        <label htmlFor="audit-none"
                                               className="block text-sm/6 font-medium text-gray-900 whitespace-nowrap">
                                            審查委員
                                        </label>
                                    </div>
                                </div>
                            </fieldset>
                        </div>
                    </div>
                </div>
            </div>

            // <div className="card w-full bg-white shadow-md rounded-lg">
            // <div className="card-header p-4 border-b font-medium text-lg">驗證電子信箱</div>
            // <div className="card-body p-6">
            // <div className="mb-4 text-center">
            // <p className="mb-4">我們已發送驗證碼到您的電子郵件信箱</p>
            // <div className="flex justify-center space-x-2">
            // <input
            //                     type="text"
            //                     maxLength={1}
            //                     className="w-12 h-12 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        //                 />
        //                 <input
        //                     type="text"
        //                     maxLength={1}
        //                     className="w-12 h-12 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        //                 />
        //                 <input
        //                     type="text"
        //                     maxLength={1}
        //                     className="w-12 h-12 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        //                 />
        //                 <input
        //                     type="text"
        //                     maxLength={1}
        //                     className="w-12 h-12 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        //                 />
        //                 <input
        //                     type="text"
        //                     maxLength={1}
        //                     className="w-12 h-12 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        //                 />
        //                 <input
        //                     type="text"
        //                     maxLength={1}
        //                     className="w-12 h-12 text-center text-xl border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        //                 />
        //             </div>
        //         </div>
        //         <div className="text-center mt-4">
        //             <button className="text-blue-500">重新發送驗證碼</button>
        //         </div>
        //     </div>
        // </div>

    );
};

// 第三步：填寫基本資料
const Step3 = () => {
    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            <div className="card-header p-4 border-b font-medium text-lg">填寫基本資料</div>
            <div className="card-body p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">姓名</label>
                        <input
                            name="name"
                            type="text"
                            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="您的姓名"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">手機號碼</label>
                        <input
                            name="phone"
                            type="tel"
                            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="您的手機號碼"
                        />
                    </div>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">密碼</label>
                    <input
                        name="password"
                        type="password"
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="設定密碼"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">確認密碼</label>
                    <input
                        name="confirmPassword"
                        type="password"
                        className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="再次輸入密碼"
                    />
                </div>
            </div>
        </div>
    );
};


// 第四步：註冊PASSKEY
const Step4 = () => {
    return (
        <div className="card w-full bg-white shadow-md rounded-lg">
            <div className="card-header p-4 border-b font-medium text-lg">註冊PASSKEY（可選）</div>
            <div className="card-body p-6">
                <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none"
                             viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">設置PASSKEY以增強安全性</h3>
                    <p className="text-gray-600 mb-4">
                        PASSKEY是一種更安全的登入方式，可以使用指紋、臉部識別或裝置PIN碼快速登入，無需記住複雜的密碼。
                    </p>
                </div>
                <div className="flex justify-center space-x-4">
                    <button
                        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                        設置PASSKEY
                    </button>
                    <button
                        className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200">
                        稍後再說
                    </button>
                </div>
            </div>
        </div>
    );
};

// 主組件
export default function Steps() {
    const [currentStep, setCurrentStep] = useState(1); //預設第一步

    const [email, setEmail] = useState("");
    const [_error, setError] = useState("");
    const [_isLoading, setIsLoading] = useState(false);
    const modalRef = useRef<HTMLDialogElement>(null);
    const [companyId, setCompanyId] = useState<number | null>(null);

    const [enterpriseTree, setEnterpriseTree] = useState<any>(null);
    const [selectedEnterprise, setSelectedEnterprise] = useState<string | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
    const [selectedFactory, setSelectedFactory] = useState<string | null>(null);

    useEffect(() => {
        if (companyId) {
            fetchEnterpriseData(companyId);
        } else {
            fetchEnterpriseData(null); // 沒有companyId時載入所有資料
        }
    }, [companyId]);


    // 根據當前步驟決定每個步驟的狀態
    const getStepStatus = (stepNumber: number) => {
        if (stepNumber < currentStep) return 'primary';
        if (stepNumber === currentStep) return 'primary';
        return 'default';
    };

    const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";


    //設定每個步驟事件
    const handleNextStep = () => {
        if (currentStep === 1) {
            // email未填寫提示框
            if (!email.trim()) {
                modalRef.current?.showModal(); // 顯示提示框
                return;
            }
            handleEmailVerification();
        } else if (currentStep === 2) {
            console.log("第二步：填寫層級完成");
            nextStep();
        } else if (currentStep === 3) {
            console.log("第三步：個人資料完成");
            nextStep();
        }
    };

    //驗證email
    const handleEmailVerification = async () => {
        setError("");
        setIsLoading(true);

        try {
            const response = await api.post(`/verify-email?email=${encodeURIComponent(email)}`);

            if (response.status !== 200) {
                throw new Error("Email 驗證失敗");
            }
            // 假設 response.data 中包含 companyId
            const companyId = response.data.companyId.result;

            if (companyId) {
                setCompanyId(companyId);
                fetchEnterpriseData(companyId);
                console.log("Company ID:", companyId);
                // 這裡可以將 companyId 儲存到狀態或傳遞給其他需要的地方
            }else {
                setCompanyId(null); // 如果沒有 companyId，則讓用戶選擇
            }

            // 驗證成功後進入第二步
            nextStep();
        } catch (error) {
            console.error("驗證錯誤:", error);
            setError("Email 驗證失敗，請重試");
        } finally {
            setIsLoading(false);
        }
    };

    //取得公司資料
    const fetchEnterpriseData = async (companyId: number | null) => {

        const token = await getAccessToken();
        try {
            const response = await api.get(`/Enterprise/GetEnterprise`, {
                params: { companyId },
                headers: {
                    Authorization: token ? `Bearer ${token}` : "", // 如果沒有 token，仍發送請求但不附帶 Authorization
                },
            });
            if (response.data?.enterpriseTree) {
                console.log("API Response:", response.data);
                console.log("EnterpriseTree:", response.data.enterpriseTree);
                console.log("Children:", response.data.enterpriseTree?.children);
                setEnterpriseTree(response.data.enterpriseTree);
                if (companyId) {
                    // 如果有 companyId，固定選擇對應的企業和公司
                    setSelectedEnterprise(response.data.enterpriseTree.Name);
                    setSelectedCompany(response.data.enterpriseTree.children[0]?.Name);
                }
            }
        } catch (error) {
            console.error("無法取得企業資料:", error);
        }
    };



    // 前進到下一步
    const nextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(prev => prev + 1);
        }
    };

    // 返回上一步
    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // 渲染當前步驟的內容
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return <Step1 email={email} setEmail={setEmail} />;
            case 2:
                return <Step2
                    setEnterpriseTree={setEnterpriseTree}
                    setSelectedEnterprise={setSelectedEnterprise}
                    setSelectedCompany={setSelectedCompany}
                    setSelectedFactory={setSelectedFactory}
                    companyId={companyId}
                    selectedEnterprise={selectedEnterprise}
                    selectedCompany={selectedCompany}
                    selectedFactory={selectedFactory}
                    enterpriseTree={enterpriseTree}
                />;
            case 3:
                return <Step3 />;
            case 4:
                return <Step4 />;
            default:
                return <Step1 email={email} setEmail={setEmail} />;
        }
    };
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "註冊" }
    ];

    return (
        <>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            <div className="flex min-h-full flex-1 flex-col space-y-6 w-full p-4 max-w-3xl mx-auto">
                <h1 className="mt-10 text-center text-2xl sm:text-3xl leading-8 sm:leading-9 font-bold tracking-tight text-gray-900">
                    註冊
                </h1>

                {/* 步驟指示器 */}
                <StepsContainer vertical={false}>
                    <Step status={getStepStatus(1)}>確認信箱</Step>
                    <Step status={getStepStatus(2)}>填寫層級</Step>
                    <Step status={getStepStatus(3)}>個人資料</Step>
                    <Step status={getStepStatus(4)}>確認註冊</Step>
                </StepsContainer>

                {/* 當前步驟內容 */}
                <div className="mt-8">
                    {renderStepContent()}
                </div>

                {/* 導航按鈕 */}
                <div className="flex justify-between mt-6">
                    <button
                        onClick={prevStep}
                        disabled={currentStep === 1}
                        className={`px-6 py-2 border rounded-md ${currentStep === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        上一步
                    </button>
                    <button
                        onClick={handleNextStep}
                        className={`px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 ${currentStep === 4 ? 'hidden' : ''}`}
                    >
                        下一步
                    </button>

                    {currentStep === 4 && (
                        <button className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                            完成註冊
                        </button>
                    )}

                    {/* 未輸入emil 提示框 */}
                    <dialog ref={modalRef} className="modal">
                        <div className="modal-box">
                            <h3 className="font-bold text-lg">提示</h3>
                            <p className="py-4">請輸入 Email 才能繼續</p>
                            <form method="dialog" className="modal-backdrop">
                                <button className="btn">關閉</button>
                            </form>
                        </div>
                    </dialog>
                </div>
            </div>
        </>
    );
}

// 你也可以導出子組件，以便在其他地方使用
export { StepsContainer, Step };
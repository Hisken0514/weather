'use client';
import React, { useEffect } from 'react';
import { toast, Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { ClipboardDocumentCheckIcon, ShieldExclamationIcon, ArrowRightIcon, LockClosedIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useauthStore } from "@/Stores/authStore";

export default function PlatformSelection() {
    const router = useRouter();
    const { permissions } = useauthStore();

    const canSeeKpi = permissions.includes('kpi');
    const canSeeForma = permissions.includes('forma');

    useEffect(() => {
        const warning = localStorage.getItem("login-warning");
        if (!warning) return;

        localStorage.removeItem("login-warning");

        toast.custom((t) => (
            <div className="bg-white shadow-lg rounded-lg border border-gray-200 px-4 py-3 max-w-sm">
                <div className="flex justify-between items-start">
                    <span className="text-sm text-gray-700">{warning}</span>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="ml-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                    >
                        知道了
                    </button>
                </div>
            </div>
        ), { duration: Infinity });
    }, []);

    const platforms = [
        {
            id: "kpi",
            title: "績效指標資料庫",
            description: "追蹤與分析企業績效指標達成情況，管理委員建議與報表檢視",
            icon: <ClipboardDocumentCheckIcon className="w-16 h-16 text-indigo-600" />,
            href: "/home",
            color: "indigo",
            bgGradient: "from-indigo-50 via-blue-50 to-indigo-100",
            iconBg: "bg-indigo-100",
            available: true,
            features: ["績效指標檢視", "委員建議管理", "資料填報", "報表分析"]
        },
        {
            id: "forma",
            title: "危險品風險分級資料庫",
            description: "工廠安全風險評估與管理系統",
            icon: <DocumentTextIcon className="w-16 h-16 text-teal-600" />,
            href: process.env.NEXT_PUBLIC_FORMA_URL || '/iskpi/forma/',
            external: true,
            color: "teal",
            bgGradient: "from-teal-50 via-emerald-50 to-teal-100",
            iconBg: "bg-teal-100",
            available: true,
            features: ["風險管理",  "進度追蹤", "彙整與分析","督導表單"]
        }
    ];

    const visiblePlatforms = platforms.filter(p =>
        (p.id === 'kpi' && canSeeKpi) || (p.id === 'forma' && canSeeForma)
    );

    const handlePlatformClick = (platform:any) => {
        if (platform.available) {
            if (platform.external || platform.href.startsWith('http')) {
                window.location.href = platform.href;
            } else {
                router.push(platform.href);
            }
        } else {
            toast.error("此平台尚未開放，敬請期待", {
                duration: 3000,
                style: {
                    background: '#FEE2E2',
                    color: '#991B1B',
                    border: '1px solid #FCA5A5'
                }
            });
        }
    };

    return (
        <>
            <Toaster position="top-right" reverseOrder={false}/>

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-7xl mx-auto space-y-12">

                    {/* 標題區塊 */}
                    <div className="text-center space-y-6">
                        <div className="space-y-4">
                            <h1 className="text-center text-3xl sm:text-4xl font-bold text-gray-900 z-10 flex items-center justify-center gap-2">
                                歡迎使用管理系統
                            </h1>
                            <p className="text-lg text-gray-600">
                                請選擇您要進入的平台
                            </p>
                            <div className="w-32 h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 mx-auto rounded-full"></div>
                        </div>
                    </div>

                    {/* 平台選擇卡片：user 角色只顯示危險品風險分級資料庫 */}
                    <div className={`grid grid-cols-1 ${visiblePlatforms.length >= 2 ? 'lg:grid-cols-2 max-w-6xl' : 'max-w-xl'} gap-8 mx-auto`}>
                        {visiblePlatforms.map((platform, index) => (
                            <div
                                key={index}
                                tabIndex={0}
                                onClick={() => handlePlatformClick(platform)}
                                className={`
                                    group relative overflow-hidden bg-gradient-to-br ${platform.bgGradient}
                                    rounded-3xl border-2 ${platform.available ? 'border-gray-200 hover:border-indigo-300' : 'border-gray-300'}
                                    transition-all duration-300
                                    ${platform.available ? 'cursor-pointer hover:shadow-2xl hover:scale-105' : 'cursor-not-allowed opacity-75'}
                                    ${platform.available ? 'active:scale-100' : ''}
                                    focus-visible:outline-[4px] focus-visible:outline-dashed focus-visible:outline-[#ff1493] focus-visible:outline-offset-2
                                `}
                            >
                                {/* 不可用標籤 */}
                                {!platform.available && (
                                    <div className="absolute top-4 right-4 z-10">
                                        <div className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                                            <LockClosedIcon className="w-4 h-4" />
                                            <span>尚未開放</span>
                                        </div>
                                    </div>
                                )}

                                {/* 背景裝飾 */}
                                <div
                                    aria-hidden="true"
                                    className={`absolute -top-20 -right-20 w-40 h-40 ${platform.available ? 'bg-indigo-200' : 'bg-gray-300'} rounded-full opacity-20 ${platform.available ? 'group-hover:opacity-30' : ''} transition-opacity`}
                                />
                                <div
                                    aria-hidden="true"
                                    className={`absolute -bottom-20 -left-20 w-40 h-40 ${platform.available ? 'bg-blue-200' : 'bg-gray-300'} rounded-full opacity-20 ${platform.available ? 'group-hover:opacity-30' : ''} transition-opacity`}
                                />

                                <div className="relative p-10 flex flex-col items-center text-center gap-6 h-full min-h-[480px]">
                                    {/* 圖標 */}
                                    <div
                                        className={`${platform.iconBg} rounded-2xl p-6 ${platform.available ? 'group-hover:scale-110 group-hover:rotate-3' : ''} transition-all duration-300 shadow-lg`}
                                    >
                                        {platform.icon}
                                    </div>

                                    {/* 標題與描述 */}
                                    <div className="space-y-3 flex-1">
                                        <h2 className={`text-2xl font-bold ${platform.available ? 'text-gray-800 group-hover:text-gray-900' : 'text-gray-500'} transition-colors`}>
                                            {platform.title}
                                        </h2>
                                        <p className={`text-base ${platform.available ? 'text-gray-600' : 'text-gray-500'} leading-relaxed px-4`}>
                                            {platform.description}
                                        </p>
                                    </div>

                                    {/* 功能列表 */}
                                    <div className="w-full space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {platform.features.map((feature, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                                        platform.available
                                                            ? `bg-white/70 ${platform.color === 'teal' ? 'text-teal-700' : 'text-indigo-700'}`
                                                            : 'bg-gray-200 text-gray-500'
                                                    }`}
                                                >
                                                    {feature}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 進入按鈕 */}
                                    {platform.available ? (
                                        <div className="mt-auto w-full">
                                            <div className={`flex items-center justify-center gap-2 ${platform.color === 'teal' ? 'bg-teal-600 group-hover:bg-teal-700' : 'bg-indigo-600 group-hover:bg-indigo-700'} text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-lg`}>
                                                <span>進入平台</span>
                                                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-auto w-full">
                                            <div className="flex items-center justify-center gap-2 bg-gray-400 text-white font-bold text-lg py-4 rounded-xl cursor-not-allowed">
                                                <LockClosedIcon className="w-5 h-5" />
                                                <span>尚未開放</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 底部說明 */}
                    <div className="text-center text-sm text-gray-500">
                        <p>如有任何問題，請聯繫系統管理員</p>
                    </div>
                </div>
            </div>
        </>
    );
}
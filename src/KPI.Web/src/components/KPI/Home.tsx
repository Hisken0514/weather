'use client';
import React, { useEffect } from 'react';
import Breadcrumbs from "@/components/Breadcrumbs";
import { toast, Toaster } from "react-hot-toast";
import {usePathname, useRouter} from "next/navigation";
import { ArrowRightIcon, ClipboardDocumentCheckIcon, DocumentChartBarIcon, PencilSquareIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useauthStore } from '@/Stores/authStore';
import { AnimatedTooltip, TooltipStyles } from "@/components/AnimatedTooltip";
import Link from "next/link";
import {OnboardingTour, makeStep, whenRole, whenPermAny, and, or} from '@/hooks/useDriverOnboarding';
// 用動態載入 + ssr: false，確保只在瀏覽器載入
import dynamic from 'next/dynamic';
const OnboardingFloatingLauncher = dynamic(
    () => import('@/components/OnboardingFloatingLauncher'),
    { ssr: false }
);

export default function Home() {
    const pathname = usePathname();
    const { userRole, permissions } = useauthStore();
    const steps = [
        makeStep('#kpi', '績效指標', '查看指標與新增指標管理。'),
        makeStep('#suggest', '委員建議', '查看委員建議清單。'),
        // 只有 admin 或 company 才顯示「審查/設定」導覽
        makeStep('#upload', '填報資料',
            '支援單筆與批次匯入資料。',
            or(whenRole('admin'), whenRole('company'))
        ),
        makeStep('#report', '報表檢視', '各間公司績效指標與建議執行情形表現。',),
    ];

    const isLoggedIn = useauthStore(state => state.isLoggedIn);

    useEffect(() => {
        console.log("✅ 當前登入狀態 isLoggedIn =", isLoggedIn);
    }, [isLoggedIn]);

    const router = useRouter();

    const breadcrumbItems = [
        { label: "首頁" }
    ];

    useEffect(() => {
        const warning = localStorage.getItem("login-warning");
        if (!warning) return;

        // 先清掉，避免 StrictMode 再執行時又讀到
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

    const menuItems = [
        {
            id:"kpi",
            title: "績效指標檢視",
            description: "查看績效指標完成情況與趨勢分析",
            icon: <ClipboardDocumentCheckIcon className="w-8 h-8 text-rose-600" />,
            href: "/kpi",
            color: "rose",
            bgGradient: "from-rose-50 to-orange-100",
            iconBg: "bg-rose-100",
            hoverShadow: "hover:shadow-rose-200/50"
        },
        {
            id:"suggest",
            title: "委員建議檢視",
            description: "檢視委員提供之改善建議與追蹤回覆",
            icon: <EyeIcon className="w-8 h-8 text-emerald-600" />,
            href: "/suggest",
            color: "emerald",
            bgGradient: "from-emerald-50 to-green-50",
            iconBg: "bg-emerald-100",
            hoverShadow: "hover:shadow-emerald-200/50"
        },
        {
            id:"upload",
            title: "填報資料",
            description: "填寫與提交最新季度的績效或建議資料",
            icon: <PencilSquareIcon className="w-8 h-8 text-amber-600" />,
            href: "/reportEntry",
            color: "amber",
            bgGradient: "from-amber-50 to-yellow-50",
            iconBg: "bg-amber-100",
            hoverShadow: "hover:shadow-amber-200/50"
        },
        {
            id:"report",
            title: "報表檢視",
            description: "檢視歷年執行報表與圖表資料分析",
            icon: <DocumentChartBarIcon className="w-8 h-8 text-fuchsia-600" />,
            href: "/report",
            color: "fuchsia",
            bgGradient: "from-fuchsia-50 to-pink-100",
            iconBg: "bg-fuchsia-100",
            hoverShadow: "hover:shadow-fuchsia-200/50"
        }
    ];

    return (
        <>
            <Toaster position="top-right" reverseOrder={false}/>

            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            <div className="flex min-h-full flex-1 flex-col items-center px-6 py-8 lg:px-8">
                <div className="space-y-12 w-full max-w-7xl mx-auto">

                    {/* 標題區塊 */}
                    <div className="text-center space-y-6">
                        <TooltipStyles />
                        <div className="space-y-4">
                            <h1 className="text-center text-3xl sm:text-4xl font-bold text-gray-900 z-10 flex items-center justify-center gap-2">
                                績效指標資料庫平台

                                <AnimatedTooltip content="本平台用於追蹤與分析企業績效指標達成情況">
                                  <span
                                      className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-gray-600 text-white text-sm font-bold cursor-pointer hover:bg-blue-700 transition"
                                      title="說明"
                                  >
                                    ?
                                  </span>
                                </AnimatedTooltip>
                            </h1>

                            <div className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 mx-auto rounded-full"></div>
                        </div>
                    </div>

                    {/* 主要功能選單 */}
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-gray-800 text-center">選擇功能模組</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6" role="list">
                            {menuItems.map((item, index) => (
                                <Link
                                    key={index}
                                    href={item.href}
                                    aria-label={`${item.title}：${item.description}，前往`}
                                    className={`
                                                group relative overflow-hidden bg-gradient-to-br ${item.bgGradient}
                                                rounded-2xl border border-gray-200
                                                transition-all cursor-pointer
                                                motion-safe:hover:scale-105 hover:shadow-xl active:scale-95
                                                focus-visible:ring-${item.color}-500
                                              `}
                                    role="listitem"
                                >
                                    {/* 背景裝飾（純裝飾，隱藏給螢幕閱讀器） */}
                                    <div
                                        aria-hidden="true"
                                        className={`absolute -top-10 -right-10 w-20 h-20 bg-${item.color}-100 rounded-full opacity-20 group-hover:opacity-30 transition-opacity`}
                                    />

                                    <div id={item.id} className="relative p-8 flex flex-col items-start gap-4 h-full">
                                        {/* 圖標（純裝飾就 aria-hidden） */}
                                        <div
                                            aria-hidden="true"
                                            className={`${item.iconBg} rounded-xl p-3 group-hover:scale-110 transition-transform duration-300`}
                                        >
                                            {item.icon}
                                        </div>

                                        <div className="space-y-2 flex-1">
                                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>

                                        {/* 前往按鈕（視覺用，實際整卡都是連結） */}
                                        <div
                                            className={`mt-auto flex items-center gap-2 text-${item.color}-600 font-medium text-sm group-hover:text-${item.color}-700 transition-colors`}
                                        >
                                            <span>前往</span>
                                            <ArrowRightIcon
                                                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                                                aria-hidden="true"/>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                    {/* 輔助功能連結 */}
                    <div className="flex justify-center gap-8 pt-4">
                        <button
                            onClick={() => router.push('/about')}
                            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium group focus:outline-4 focus:outline-dashed focus:outline-[#ff1493] focus:outline-offset-2"
                        >
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none"
                                 stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            關於我們
                        </button>
                        <button
                            onClick={() => router.push('/direction')}
                            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors text-sm font-medium group focus:outline-4 focus:outline-dashed focus:outline-[#ff1493] focus:outline-offset-2"
                        >
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none"
                                 stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            網頁導覽
                        </button>
                    </div>
                </div>
            </div>

            {/*暫時關閉啟用導覽*/}
            {/*<OnboardingFloatingLauncher
                steps={steps}
                options={{
                    ctx: { role: userRole ?? null, permissions: permissions ?? [], pathname },
                    scope: 'home',              // 這頁的識別；快取 key 會包含它
                    version: '1.0.0',
                    autoStartInProd: false,     // ⬅︎ 重要：手動啟動
                    devAutoStart: false,        // ⬅︎ 重要：手動啟動
                    // chainNext: '/kpi/dashboard', // （可選）導覽最後一步出現「下一頁」
                    // forceChain: true,            // （可選）即使下一頁已看過也強制顯示
                }}
                label="啟用導覽"
                position="br"  // br | bl | tr | tl
                pulse           // 帶脈衝動畫吸引注意（可拿掉）
            />*/}
        </>
    );
}
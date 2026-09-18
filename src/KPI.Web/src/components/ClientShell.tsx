"use client";

import React, { useEffect, useRef, useState } from "react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import Drawer from "@/components/Drawer";
import IOSGlassButton from "@/components/IOSGlassButton";
import AiChatDrawer from "@/components/AIChat/AiChatDrawer";
import AiChatFloatingButton from "@/components/AIChat/AiChatFloatingButton";
import { ConfirmDialogProvider } from "@/hooks/useConfirmDialog";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { useauthStore } from "@/Stores/authStore";
import { LicenseManager as GridLicenseManager } from "ag-grid-enterprise";
import { LicenseManager as ChartLicenseManager } from "ag-charts-enterprise";
import "driver.js/dist/driver.css";

// const license = "Using_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-067721}_in_excess_of_the_licence_granted_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_changing_this_key_please_contact_info@ag-grid.com___{Industrial_Safety_And_Health_Association_(ISHA)_Of_The_R.O.C}_is_granted_a_{Single_Application}_Developer_License_for_the_application_{}_only_for_{1}_Front-End_JavaScript_developer___All_Front-End_JavaScript_developers_working_on_{}_need_to_be_licensed___{}_has_been_granted_a_Deployment_License_Add-on_for_{1}_Production_Environment___This_key_works_with_{AG_Charts_and_AG_Grid}_Enterprise_versions_released_before_{27_October_2025}____[v3]_[0102]_MTc2MTUyMzIwMDAwMA==14fa603063a97c2c3a7a73a15786443e"
const license = "MY_AG_GRID_KEY"
GridLicenseManager.setLicenseKey(license);
ChartLicenseManager.setLicenseKey(license);

export default function ClientShell({ children }: { children: React.ReactNode }) {
    const API_URL = process.env.API || "http://kpibackend:8080";
    const NODE_ENV = process.env.NODE_ENV || "development";
    const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const { isLoggedIn, checkAuthStatus, userRole } = useauthStore();
    // AI 查詢助理僅開放 admin / superAdmin 角色使用，跟原本 avatarMenu 裡的判斷基準一致。
    const canUseAiChat = userRole === "admin" || userRole === "superAdmin";

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("theme");
            const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
            const defaultTheme = saved || (prefersDark ? "fantasydark" : "fantasy");
            document.documentElement.setAttribute("data-theme", defaultTheme);
        }
    }, []);

    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const headerRef = useRef<HTMLDivElement | null>(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useEffect(() => {
        const updateHeight = () => {
            if (headerRef.current) setHeaderHeight(headerRef.current.offsetHeight);
        };
        updateHeight();
        const observer = new ResizeObserver(updateHeight);
        if (headerRef.current) observer.observe(headerRef.current);
        return () => {
            if (headerRef.current) observer.unobserve(headerRef.current);
        };
    }, []);

    return (
        <>
            <a
                href="#main-content"
                title="跳到主要內容區"
                className="absolute left-2 top-2 -translate-y-full focus:translate-y-0 bg-white text-blue-700 font-semibold px-4 py-2 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-500 z-[9999]"
            >
                跳到主要內容
            </a>

            <div ref={headerRef} className="fixed top-0 left-0 w-full z-50">
                <Header />
                <AnnouncementBanner />
            </div>

            <div className="flex flex-col min-h-screen" style={{ paddingTop: headerHeight }}>
                {isLoggedIn && NODE_ENV === "development" && (
                    <Drawer
                        position="top-center"
                        autoHide={true}
                        autoHideDelay={3000}
                        detectionDistance={50}
                        maxWidth="800px"
                        maxHeight="800vh"
                        triggerContent={
                            <>
                                <IOSGlassButton/>
                            </>
                        }
                    >
                        <div className="p-6 bg-base-100 rounded-lg shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-base-content flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-.1066z"/>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    </svg>
                                    開發環境變數
                                </h3>
                                <div className="badge badge-secondary badge-sm">
                                    {NODE_ENV}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                                {/* API 相關 */}
                                <div className="card bg-base-200 shadow-sm">
                                    <div className="card-body p-4">
                                        <h4 className="card-title text-sm text-accent flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                                            </svg>
                                            API 設定
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex flex-col">
                                                <span className="text-base-content/60">API_URL:</span>
                                                <code className="bg-base-100 px-2 py-1 rounded text-accent font-mono">
                                                    {API_URL}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 域名相關 */}
                                <div className="card bg-base-200 shadow-sm">
                                    <div className="card-body p-4">
                                        <h4 className="card-title text-sm text-secondary flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9m0 9c-5 0-9-4-9-9s4-9 9-9"/>
                                            </svg>
                                            域名設定
                                        </h4>
                                        <div className="space-y-2 text-xs">

                                            <div className="flex flex-col">
                                                <span className="text-base-content/60">BASE_PATH:</span>
                                                <code className="bg-base-100 px-2 py-1 rounded text-secondary font-mono">
                                                    {NPbasePath || '(空)'}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 運行環境 */}
                                <div className="card bg-base-200 shadow-sm">
                                    <div className="card-body p-4">
                                        <h4 className="card-title text-sm text-warning flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                                            </svg>
                                            運行環境
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex flex-col">
                                                <span className="text-base-content/60">NODE_ENV:</span>
                                                <div className="flex items-center gap-2">
                                                    <code className="bg-base-100 px-2 py-1 rounded text-warning font-mono">
                                                        {NODE_ENV}
                                                    </code>
                                                    <div
                                                        className={`w-2 h-2 rounded-full ${NODE_ENV === 'development' ? 'bg-warning' : NODE_ENV === 'production' ? 'bg-error' : 'bg-info'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 主題狀態 */}
                                <div className="card bg-base-200 shadow-sm">
                                    <div className="card-body p-4">
                                        <h4 className="card-title text-sm text-primary flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4 4 4 0 004-4V5z"/>
                                            </svg>
                                            主題狀態
                                        </h4>
                                        {/*<div className="space-y-2 text-xs">*/}
                                        {/*    <div className="flex flex-col">*/}
                                        {/*        <span className="text-base-content/60">當前主題:</span>*/}
                                        {/*        <div className="flex items-center gap-2">*/}
                                        {/*            <code className="bg-base-100 px-2 py-1 rounded text-primary font-mono">*/}
                                        {/*                {theme ? 'ISHADark' : 'ISHALight'}*/}
                                        {/*            </code>*/}
                                        {/*            <div className={`w-2 h-2 rounded-full ${theme ? 'bg-gray-800' : 'bg-yellow-400'}`}></div>*/}
                                        {/*        </div>*/}
                                        {/*    </div>*/}
                                        {/*</div>*/}
                                    </div>
                                </div>
                            </div>

                            {/* 額外資訊 */}
                            <div className="mt-4 pt-4 border-t border-base-300">
                                <div className="flex items-center justify-between text-xs text-base-content/60">
                                    <span>構建時間: {new Date().toLocaleString('zh-TW')}</span>
                                    <span>頁面: {typeof window !== 'undefined' ? window.location.pathname : '/'}</span>
                                </div>
                            </div>
                        </div>
                    </Drawer>
                )}

                <ConfirmDialogProvider>
                    <main id="main-content" className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                        {children}
                    </main>
                </ConfirmDialogProvider>

                {/* AI 查詢助理：右下角懸浮按鈕觸發，由 AiChatDrawer 從右側滑出，不用再點開頭像選單 */}
                {isLoggedIn && canUseAiChat && (
                    <>
                        <AiChatFloatingButton />
                        <AiChatDrawer />
                    </>
                )}

                <footer id="footer">
                    <Footer />
                </footer>
            </div>
        </>
    );
}

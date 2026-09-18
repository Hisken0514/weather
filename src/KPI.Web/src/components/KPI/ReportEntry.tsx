'use client'
import React, { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import { motion } from "framer-motion"
import { CheckCircle, XCircle, Clock, Upload, FileUp, TrendingUp } from 'lucide-react';
import { useRouter } from "next/navigation";
import { useUploadOptionModalState } from "@/hooks/useUploadOptionModalState";
import {UploadOptionModal} from "@/hooks/UploadOptionModal";
import { getAccessToken } from "@/services/serverAuthService";
import { toast, Toaster } from "react-hot-toast";
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const kpiitems = [
    {
        title: "單筆上傳",
        content: "適用少量資料，可即時填寫指標後送出。",
        href: "/reportEntry/newKpiValue",
        icon: <FileUp className="w-5 h-5 text-indigo-500" />
    },
    {
        title: "批量上傳",
        content: "下載 Excel 範本填寫，匯入大量資料更快速。",
        href: "/reportEntry/KpiImport",
        icon: <Upload className="w-5 h-5 text-emerald-500" />
    }
];

const sugitems = [
    {
        title: "單筆上傳",
        content: "適用少量資料，可即時填寫指標後送出。",
        href: "/reportEntry/newSugValue",
        icon: <FileUp className="w-5 h-5 text-indigo-500" />
    },
    {
        title: "批量上傳",
        content: "下載 Excel 範本填寫，匯入大量資料更快速。",
        href: "/reportEntry/SugImport",
        icon: <Upload className="w-5 h-5 text-emerald-500" />
    }
];

export default function Report(){
    const router = useRouter();
    const [hasToken, setHasToken] = useState(false);
    const kpiModalState = useUploadOptionModalState();
    const sugModalState = useUploadOptionModalState();

    useEffect(() => {
        getAccessToken().then(token => setHasToken(!!token?.value));
    }, []);
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "資料填報" }
    ];

    // Sample data - this would come from your actual data source
    const userData = {
        name: "王小明",
        lastUploadDate: "2024-11-15",
        status: "completed", // options: "completed", "overdue", "pending"
        nextDeadline: "2025-05-15"
    };

    const getStatusDetails = () => {
        switch(userData.status) {
            case "completed":
                return {
                    icon: <CheckCircle className="w-8 h-8 text-emerald-500" />,
                    color: "bg-emerald-50 border-emerald-200",
                    textColor: "text-emerald-800",
                    badgeColor: "bg-emerald-100 text-emerald-800",
                    message: "已按時上傳報告",
                    badge: "已完成"
                };
            case "overdue":
                return {
                    icon: <XCircle className="w-8 h-8 text-red-500" />,
                    color: "bg-red-50 border-red-200",
                    textColor: "text-red-800",
                    badgeColor: "bg-red-100 text-red-800",
                    message: "超過期限未上傳",
                    badge: "已逾期"
                };
            case "pending":
                return {
                    icon: <Clock className="w-8 h-8 text-amber-500" />,
                    color: "bg-amber-50 border-amber-200",
                    textColor: "text-amber-800",
                    badgeColor: "bg-amber-100 text-amber-800",
                    message: "即將到期，等待上傳",
                    badge: "待處理"
                };
            default:
                return {
                    icon: <Clock className="w-8 h-8 text-gray-500" />,
                    color: "bg-gray-50 border-gray-200",
                    textColor: "text-gray-800",
                    badgeColor: "bg-gray-100 text-gray-800",
                    message: "狀態未知",
                    badge: "未知"
                };
        }
    };

    const status = getStatusDetails();

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <>
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-slate-50 border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="mt-6">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                資料填報
                            </h1>
                            <div
                                className="w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mt-4"></div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <motion.div
                        className="space-y-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        {/* Status Overview */}
                        {/*<motion.div*/}
                        {/*    variants={itemVariants}*/}
                        {/*    className="grid grid-cols-1 lg:grid-cols-3 gap-6"*/}
                        {/*>*/}
                        {/*    /!* User Info Card *!/*/}
                        {/*    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">*/}
                        {/*        <div className="flex items-center mb-4">*/}
                        {/*            <div*/}
                        {/*                className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">*/}
                        {/*                <User className="w-6 h-6 text-indigo-600"/>*/}
                        {/*            </div>*/}
                        {/*            <div className="ml-4">*/}
                        {/*                <h3 className="text-lg font-semibold text-gray-900">用戶資訊</h3>*/}
                        {/*                <p className="text-gray-600">{userData.name}</p>*/}
                        {/*            </div>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}

                        {/*    /!* Last Upload Card *!/*/}
                        {/*    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">*/}
                        {/*        <div className="flex items-center mb-4">*/}
                        {/*            <div*/}
                        {/*                className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">*/}
                        {/*                <Calendar className="w-6 h-6 text-blue-600"/>*/}
                        {/*            </div>*/}
                        {/*            <div className="ml-4">*/}
                        {/*                <h3 className="text-lg font-semibold text-gray-900">上次上傳</h3>*/}
                        {/*                <p className="text-gray-600">{userData.lastUploadDate}</p>*/}
                        {/*            </div>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}

                        {/*    /!* Next Deadline Card *!/*/}
                        {/*    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">*/}
                        {/*        <div className="flex items-center mb-4">*/}
                        {/*            <div*/}
                        {/*                className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">*/}
                        {/*                <AlertCircle className="w-6 h-6 text-amber-600"/>*/}
                        {/*            </div>*/}
                        {/*            <div className="ml-4">*/}
                        {/*                <h3 className="text-lg font-semibold text-gray-900">下次截止</h3>*/}
                        {/*                <p className="text-gray-600">{userData.nextDeadline}</p>*/}
                        {/*            </div>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}
                        {/*</motion.div>*/}

                        {/*/!* Status Card *!/*/}
                        {/*<motion.div*/}
                        {/*    variants={itemVariants}*/}
                        {/*    className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6"*/}
                        {/*>*/}
                        {/*    <div className="flex items-center mb-6">*/}
                        {/*        <div className="w-2 h-6 bg-purple-500 rounded-full mr-3"></div>*/}
                        {/*        <h2 className="text-xl font-semibold text-gray-800">半年度追蹤狀態</h2>*/}
                        {/*        <span*/}
                        {/*            className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${status.badgeColor}`}>*/}
                        {/*        {status.badge}*/}
                        {/*    </span>*/}
                        {/*    </div>*/}

                        {/*    <div className={`flex items-center p-6 rounded-xl border-2 ${status.color}`}>*/}
                        {/*        <div className="mr-6">*/}
                        {/*            {status.icon}*/}
                        {/*        </div>*/}
                        {/*        <div className="flex-1">*/}
                        {/*            <p className={`font-semibold text-lg mb-2 ${status.textColor}`}>*/}
                        {/*                {status.message}*/}
                        {/*            </p>*/}
                        {/*            <div*/}
                        {/*                className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">*/}
                        {/*                <div className="flex items-center">*/}
                        {/*                    <Calendar className="w-4 h-4 mr-2"/>*/}
                        {/*                    上次上傳: {userData.lastUploadDate}*/}
                        {/*                </div>*/}
                        {/*                <div className="flex items-center">*/}
                        {/*                    <Clock className="w-4 h-4 mr-2"/>*/}
                        {/*                    截止日期: {userData.nextDeadline}*/}
                        {/*                </div>*/}
                        {/*            </div>*/}
                        {/*        </div>*/}
                        {/*    </div>*/}
                        {/*</motion.div>*/}

                        {/* Action Buttons */}
                        <motion.div
                            variants={itemVariants}
                            className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8"
                        >
                            <div className="flex items-center mb-8">
                                <div className="w-2 h-6 bg-green-500 rounded-full mr-3"></div>
                                <h2 className="text-xl font-semibold text-gray-800">執行操作</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* KPI Upload Button */}
                                <motion.button
                                    whileHover={hasToken ? {scale: 1.02, y: -2} : {}}
                                    whileTap={hasToken ? {scale: 0.98} : {}}
                                    onClick={() => {
                                        if (!hasToken) { toast.error("請先登入再操作"); return; }
                                        kpiModalState.openModal();
                                    }}
                                    className={`group relative overflow-hidden rounded-xl p-6 shadow-lg custom-select ${
                                        hasToken
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-xl'
                                            : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-100 cursor-not-allowed'
                                    }`}
                                >
                                    {hasToken && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    )}
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                            <TrendingUp className="w-6 h-6"/>
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">更新績效指標數據</h3>
                                        <p className={`text-sm ${hasToken ? 'text-indigo-100' : 'text-gray-200'}`}>
                                            {hasToken ? '填報績效指標數據並產生報告' : '請先登入再操作'}
                                        </p>
                                    </div>
                                </motion.button>

                                {/* Suggestion Upload Button */}
                                <motion.button
                                    whileHover={hasToken ? {scale: 1.02, y: -2} : {}}
                                    whileTap={hasToken ? {scale: 0.98} : {}}
                                    onClick={() => {
                                        if (!hasToken) { toast.error("請先登入再操作"); return; }
                                        sugModalState.openModal();
                                    }}
                                    className={`group relative overflow-hidden rounded-xl p-6 shadow-lg custom-select ${
                                        hasToken
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-xl'
                                            : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-100 cursor-not-allowed'
                                    }`}
                                >
                                    {hasToken && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    )}
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                            <Upload className="w-6 h-6"/>
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">更新改善建議執行情況</h3>
                                        <p className={`text-sm ${hasToken ? 'text-emerald-100' : 'text-gray-200'}`}>
                                            {hasToken ? '填報改善建議執行情況並產生報告' : '請先登入再操作'}
                                        </p>
                                    </div>
                                </motion.button>

                                {/* Report Upload Button */}
                                <motion.button
                                    whileHover={hasToken ? {scale: 1.02, y: -2} : {}}
                                    whileTap={hasToken ? {scale: 0.98} : {}}
                                    onClick={() => {
                                        if (!hasToken) { toast.error("請先登入再操作"); return; }
                                        router.push("/reportEntry/Improvement");
                                    }}
                                    className={`group relative overflow-hidden rounded-xl p-6 shadow-lg custom-select ${
                                        hasToken
                                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-xl'
                                            : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-100 cursor-not-allowed'
                                    }`}
                                >
                                    {hasToken && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    )}
                                    <div className="relative z-10">
                                        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
                                            <FileUp className="w-6 h-6"/>
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">上傳自主管理報告</h3>
                                        <p className={`text-sm ${hasToken ? 'text-amber-100' : 'text-gray-200'}`}>
                                            {hasToken ? '下載報告並提交更新的自主循環管理執行報告' : '請先登入再操作'}
                                        </p>
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Modals */}
                        <UploadOptionModal
                            isOpen={kpiModalState.isOpen}
                            activeIndex={kpiModalState.activeIndex}
                            toggle={kpiModalState.toggle}
                            closeModal={kpiModalState.closeModal}
                            title="請選擇上傳方式"
                            description="系統提供以下幾種方式供您使用"
                            items={kpiitems}
                        />

                        <UploadOptionModal
                            isOpen={sugModalState.isOpen}
                            activeIndex={sugModalState.activeIndex}
                            toggle={sugModalState.toggle}
                            closeModal={sugModalState.closeModal}
                            title="請選擇上傳方式"
                            description="系統提供以下幾種方式供您使用"
                            items={sugitems}
                        />
                    </motion.div>
                </div>
            </div>
        </>
    )
}
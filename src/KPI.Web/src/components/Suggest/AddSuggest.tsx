'use client';

import React, {useEffect, useState} from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import SingleAddSuggest from './SingleAddSuggest';
import BatchUploadSuggest from './BatchUploadSuggest';
import { Toaster } from 'react-hot-toast';
import {useRouter} from "next/navigation";
import {useauthStore} from "@/Stores/authStore";
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function AddSuggestPage() {
    const [mode, setMode] = useState<'single' | 'batch' | 'all'>('single');
    const { userRole } = useauthStore();
    const router = useRouter();

    // ⛔ 權限限制：公司角色不能進入此頁
    useEffect(() => {
        if (userRole === 'company') {
            router.replace("/home"); // 或其他你想導向的頁面
        }
    }, [userRole]);
    const breadcrumbItems = [
        { label: "首頁", href: `${NPbasePath}/home` },
        { label: "委員回覆及改善建議" , href: `${NPbasePath}/suggest` },
        { label: "新增委員建議"}
    ];

    return (
        <>
            <Toaster position="top-right" reverseOrder={false}/>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems}/>
            </div>
            <h1 className="mt-10 text-center text-2xl sm:text-3xl leading-8 sm:leading-9 font-bold tracking-tight text-gray-900">
                新增委員建議
            </h1>
            <div className="mt-8 flex border-b border-gray-200 space-x-8 px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32">
                <button
                    onClick={() => setMode('single')}
                    className={`outline-dashed-pink pb-2 text-sm font-medium border-b-2 transition-colors duration-200 ease-in-out
                        ${mode === 'single'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                >
                    單筆匯入
                </button>
                <button
                    onClick={() => setMode('batch')}
                    className={`outline-dashed-pink pb-2 text-sm font-medium border-b-2 transition-colors duration-200 ease-in-out
                        ${mode === 'batch'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                >
                    Excel 批次匯入
                </button>
                {/*<button*/}
                {/*    onClick={() => setMode('all')}*/}
                {/*    className={`outline-dashed-pink pb-2 text-sm font-medium border-b-2 transition-colors duration-200 ease-in-out*/}
                {/*        ${mode === 'all'*/}
                {/*        ? 'border-indigo-600 text-indigo-600'*/}
                {/*        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}*/}
                {/*    `}*/}
                {/*>*/}
                {/*    整批初始化匯入*/}
                {/*</button>*/}
            </div>

            <div className="mt-6 px-4 sm:px-8 md:px-16 lg:px-24 xl:px-32 py-10">
                {mode === 'single' && <SingleAddSuggest/>}
                {mode === 'batch' && <BatchUploadSuggest />}
            </div>
        </>
    );
}
'use client';

import Breadcrumbs from "@/components/Breadcrumbs";
import React from "react";
import Link from "next/link";
import { useMenuStore } from "@/Stores/menuStore";
import { useauthStore } from "@/Stores/authStore";
import { ArrowDownTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const MANUAL_PDF_PATH = `${NPbasePath}/docs/manual.pdf`;

interface MenuItem {
    id: number;
    label: string;
    link: string;
    icon: string | null;
    parentId: number | null;
    sortOrder: number;
    isActive: number;
    menuType: string;
    children?: MenuItem[];
}

export default function Direction() {
    const menu = useMenuStore((state) => state.menu);
    const hasMenu = useMenuStore((state) => state.hasMenu);
    const { isLoggedIn } = useauthStore();

    const breadcrumbItems = [
        { label: '首頁', href: `${NPbasePath}/home` },
        { label: '網站導覽' },
    ];

    const renderMenu = (items: MenuItem[]) => {
        if (!items || items.length === 0) return null;
        return (
            <ul className="list-decimal pl-6 space-y-2 text-gray-800">
                {items.map((item) => (
                    <li key={item.id}>
                        {item.link ? (
                            <Link href={item.link} className="text-gray-700 hover:underline">
                                {item.label}
                            </Link>
                        ) : (
                            <span>{item.label}</span>
                        )}
                        {item.children && item.children.length > 0 && (
                            <ul className="list-[lower-roman] pl-6 space-y-1 text-gray-700 mt-2">
                                {item.children.map((child) => (
                                    <li key={child.id}>
                                        {child.link ? (
                                            <Link href={child.link} className="hover:underline">
                                                {child.label}
                                            </Link>
                                        ) : (
                                            <span>{child.label}</span>
                                        )}
                                        {child.children && child.children.length > 0 && (
                                            <ul className="list-[lower-roman] pl-6 space-y-1 mt-1">
                                                {child.children.map((gchild) => (
                                                    <li key={gchild.id}>
                                                        {gchild.link ? (
                                                            <Link href={gchild.link} className="hover:underline">
                                                                {gchild.label}
                                                            </Link>
                                                        ) : (
                                                            <span>{gchild.label}</span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
                <li>
                    <span>說明</span>
                    <ul className="list-[lower-roman] pl-6 space-y-1 text-gray-700">
                        <li><Link href="/direction">網站導覽</Link></li>
                        <li><Link href="/about">關於我們</Link></li>
                    </ul>
                </li>
                <li>
                    <Link href="/profile">個人資料</Link>
                </li>
            </ul>
        );
    };

    return (
        <>
            <div className="w-full flex justify-start">
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            <div className="flex min-h-full flex-1 flex-col items-center px-6 py-12 lg:px-8">
                <div className="space-y-10 w-full max-w-7xl mx-auto">

                    <h1 className="mt-10 text-center text-2xl sm:text-3xl leading-8 sm:leading-9 font-bold tracking-tight text-gray-900">
                        網站導覽
                    </h1>

                    <div className="space-y-6">

                        {/* 操作手冊下載（橫條） */}
                        <div className="card bg-white shadow-xl p-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <DocumentTextIcon className="w-8 h-8 text-indigo-500 flex-shrink-0" />
                                    <div>
                                        <h2 className="font-semibold text-gray-800">操作手冊</h2>
                                        <p className="text-sm text-gray-500">115年績效指標操作平台操作手冊</p>
                                    </div>
                                </div>
                                <a
                                    href={MANUAL_PDF_PATH}
                                    download="115年績效指標操作平台操作手冊.pdf"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm flex-shrink-0"
                                >
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    下載手冊
                                </a>
                            </div>
                        </div>

                        {/* 無障礙設計原則 */}
                        <div className="card bg-white shadow-xl p-6">
                            <div className="card-body">
                                <h2 className="card-title text-black mb-1">無障礙設計原則</h2>
                                <p className="text-gray-500 mb-6">本網站主要內容分為三大區塊：上方功能區塊、中央內容區塊、下方功能區塊。</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

                                    {/* 快速鍵 */}
                                    <div className="bg-indigo-50 rounded-xl p-5 space-y-3">
                                        <h3 className="font-semibold text-indigo-800">快速鍵（Accesskey）</h3>
                                        <ul className="space-y-2 text-gray-700">
                                            <li className="flex items-center gap-2"><kbd className="kbd kbd-sm">Alt+U</kbd><span>右上方功能區塊</span></li>
                                            <li className="flex items-center gap-2"><kbd className="kbd kbd-sm">Alt+C</kbd><span>中央內容區塊</span></li>
                                            <li className="flex items-center gap-2"><kbd className="kbd kbd-sm">Alt+H</kbd><span>下方功能區塊</span></li>
                                        </ul>
                                        <p className="text-xs text-indigo-600">Firefox 請使用 Shift+Alt+(字母)</p>
                                    </div>

                                    {/* 鍵盤操作 */}
                                    <div className="bg-sky-50 rounded-xl p-5 space-y-3">
                                        <h3 className="font-semibold text-sky-800">鍵盤操作</h3>
                                        <ul className="space-y-2 text-gray-700">
                                            <li className="flex items-center gap-2"><kbd className="kbd kbd-sm">← → ↑↓</kbd><span>移動標籤順序</span></li>
                                            <li className="flex items-center gap-2"><kbd className="kbd kbd-sm">Home/End</kbd><span>跳至首尾項目</span></li>
                                            <li className="flex items-center gap-2"><kbd className="kbd kbd-sm">Tab</kbd><span>跳至內容區瀏覽</span></li>
                                            <li className="flex items-center gap-2"><kbd className="kbd kbd-sm">Tab+Shift</kbd><span>返回上一筆</span></li>
                                        </ul>
                                    </div>

                                    {/* 網站架構 */}
                                    <div className="bg-emerald-50 rounded-xl p-5 space-y-3">
                                        <h3 className="font-semibold text-emerald-800">網站架構</h3>
                                        <ul className="list-decimal pl-5 space-y-1 text-gray-700">
                                            <li><Link href="/" className="hover:underline hover:text-emerald-700">首頁</Link></li>
                                            <li>
                                                <span>說明</span>
                                                <ul className="list-[lower-roman] pl-5 space-y-1 text-gray-600 mt-1">
                                                    <li><Link href="/direction" className="hover:underline hover:text-emerald-700">網站導覽</Link></li>
                                                    <li><Link href="/about" className="hover:underline hover:text-emerald-700">關於我們</Link></li>
                                                </ul>
                                            </li>
                                            <li><Link href="/login" className="hover:underline hover:text-emerald-700">登入</Link></li>
                                            <li><Link href="/register" className="hover:underline hover:text-emerald-700">註冊</Link></li>
                                        </ul>
                                    </div>

                                </div>

                                {/* 登入後功能選單 */}
                                <div className="mt-6 bg-gray-50 rounded-xl p-5">
                                    <h3 className="font-semibold text-gray-700 mb-3">登入後功能選單</h3>
                                    <div className="text-sm">
                                        {isLoggedIn && hasMenu ? (
                                            renderMenu(menu as MenuItem[])
                                        ) : (
                                            <p className="text-gray-400 text-sm">請先登入以查看完整功能選單。</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </>
    );

}

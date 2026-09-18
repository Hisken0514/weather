"use client"
import React, { useEffect, useState } from 'react';
import {
    Dialog,
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    Popover,
    PopoverGroup,
} from '@headlessui/react';
import * as Icon from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon, InformationCircleIcon, MapIcon } from '@heroicons/react/24/outline';
import Ava from './avatar/avatarMenu';
import Image from 'next/image';
import {getAccessToken, getUserInfo} from "@/services/serverAuthService";
import {useauthStore} from "@/Stores/authStore";
import { useMenuStore } from "@/Stores/menuStore";
import {jwtDecode} from "jwt-decode";
import logo from "@/../public/logo.svg"
import AutoRefresh from "@/components/Auth/AutoRefresh";
import api from "@/utils/api";

const illustrate = [
    { name: '關於我們', href: '/about', icon: InformationCircleIcon },
    { name: '網站導覽', href: '/direction', icon: MapIcon },
];

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

const getIcon = (iconName: string | null) => {
    if (iconName && Icon[iconName as keyof typeof Icon]) {
        return React.createElement(Icon[iconName as keyof typeof Icon], {
            className: 'size-6 text-gray-600 group-hover:text-indigo-600',
        });
    }
    return null;
};

// 🎯 新增:自動判斷下拉選單方向的 Popover 組件
const SmartPopover = ({
                          label,
                          items,
                          renderItem
                      }: {
    label: string;
    items: MenuItem[] | typeof illustrate;
    renderItem: (item: any, close: () => void) => React.ReactNode;
}) => {
    const [position, setPosition] = useState<'left' | 'right'>('left');
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    const checkPosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceOnRight = window.innerWidth - rect.right;
            const spaceOnLeft = rect.left;

            // 如果右邊空間不足 400px,則向左對齊
            setPosition(spaceOnRight < 400 && spaceOnLeft > spaceOnRight ? 'right' : 'left');
        }
    };

    return (
        <Popover className="relative">
            {({ open, close }) => (
                <>
                    <Popover.Button
                        ref={buttonRef}
                        onClick={checkPosition}
                        onMouseEnter={checkPosition}
                        className="flex items-center gap-x-1 text-base font-semibold text-gray-900 btn btn-ghost"
                    >
                        {label}
                        <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />
                    </Popover.Button>

                    <Popover.Panel
                        className={`absolute top-full z-10 mt-3 w-screen max-w-md overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-900/5 ${
                            position === 'right' ? '-right-8' : '-left-8'
                        }`}
                    >
                        <div className="p-4">
                            {items.map((item) => renderItem(item, close))}
                        </div>
                    </Popover.Panel>
                </>
            )}
        </Popover>
    );
};

export default function Header() {
    const [avatarMenuState, setAvatarMenuState] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [name, setName] = useState('使用者');
    const { checkIsLoggedIn, isLoggedIn } = useauthStore();
    const menu = useMenuStore((state) => state.menu);
    const hasMenu = useMenuStore((state) => state.hasMenu);

    const basePath = process.env.BASE_PATH || '';
    const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

    useEffect(() => {
        if (isLoggedIn) {
            // Get user info
            getUserInfo().then(cookieInfo => {
                if (cookieInfo) {
                    setName(cookieInfo?.NickName);
                }
                console.log("✅ 用戶名稱:", cookieInfo?.NickName);
            }).catch(err => {
                console.error("❌ 獲取用戶資訊失敗:", err);
            });

            // Define async function for getting menu
            const getMenu = async () => {
                try {
                    const token = await getAccessToken();
                    const res = await api.get('/Menu/GetMenus', {
                        headers: {
                            Authorization: token ? `Bearer ${token.value}` : '',
                        },
                    });
                    useMenuStore.getState().setMenu(res.data);
                } catch (menuError) {
                    console.warn("選單取得失敗,預設為空");
                    useMenuStore.getState().setMenu([]);
                }
            };

            // Parse permissions
            getAccessToken().then(token => {
                if (token?.value) {
                    try {
                        const decoded = jwtDecode<any>(token.value);
                        const rawPerms = decoded.permission ?? [];
                        const permissions = Array.isArray(rawPerms) ? rawPerms : [rawPerms];
                        console.log("🛡️ 使用者權限:", permissions);

                        useauthStore.getState().setPermissions(permissions);
                    } catch (error) {
                        console.error("❌ JWT 解析失敗:", error);
                        useauthStore.getState().setPermissions([]);
                    }
                } else {
                    console.warn("⚠️ 無法取得 access token");
                    useauthStore.getState().setPermissions([]);
                }
            }).catch(err => {
                console.error("❌ 獲取 token 失敗:", err);
            });

            getMenu();
        }
    }, [isLoggedIn]);

    // 🎯 渲染選單項目的函數
    const renderMenuItem = (child: MenuItem, close: () => void) => (
        <div
            key={child.id}
            className="group relative flex items-center gap-x-6 rounded-lg p-4 text-sm/6 hover:bg-gray-50"
        >
            <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                {getIcon(child.icon)}
            </div>
            <div className="flex-auto">
                <Link
                    href={child.link}
                    className="block font-semibold text-gray-900"
                    onClick={() => close()}
                >
                    {child.label}
                    <span className="absolute inset-0" />
                </Link>
            </div>
        </div>
    );

    const renderIllustrateItem = (item: typeof illustrate[0], close: () => void) => (
        <div
            key={item.name}
            className="group relative flex items-center gap-x-6 rounded-lg p-4 text-sm/6 hover:bg-gray-50"
        >
            <div className="flex size-11 flex-none items-center justify-center rounded-lg bg-gray-50 group-hover:bg-white">
                <item.icon aria-hidden="true" className="size-6 text-gray-600 group-hover:text-indigo-600" />
            </div>
            <div className="flex-auto">
                <Link
                    href={item.href}
                    className="block font-semibold text-gray-900"
                    onClick={() => close()}
                >
                    {item.name}
                    <span className="absolute inset-0" />
                </Link>
            </div>
        </div>
    );

    return (
        <header id="top" className="bg-white shadow-md">
            <nav aria-label="Global" className="flex items-center p-6">
                {/* Logo */}
                <div className="flex flex-1">
                    <Link href="/" className="btn btn-ghost">
                        <span className="sr-only">首頁</span>
                        <Image
                            alt="經濟部產業園區管理局績效指標資料庫暨資訊平台Logo"
                            src={logo}
                            className="h-8 w-auto sm:h-11 md:h-9 lg:h-11"
                            width={100}
                            height={40}
                        />
                    </Link>
                </div>

                {/* Desktop Menu */}
                <PopoverGroup className="hidden md:flex md:gap-x-3 lg:gap-x-5">
                    {isLoggedIn && <AutoRefresh />}

                    <a
                        accessKey="u"
                        href="#U"
                        title="右上方功能區塊"
                        className="bg-white text-white flex items-center justify-center focus:text-base-content"
                    >
                        :::
                    </a>

                    {/* 🎯 使用改良的 SmartPopover */}
                    {isLoggedIn && hasMenu ? (
                        menu.map((item) => (
                            <React.Fragment key={item.id}>
                                {item.children && item.children.length > 0 ? (
                                    <SmartPopover
                                        label={item.label}
                                        items={item.children}
                                        renderItem={renderMenuItem}
                                    />
                                ) : (
                                    <Link
                                        href={item.link || "#"}
                                        className="text-base font-semibold text-gray-900 btn btn-ghost"
                                    >
                                        {item.label}
                                    </Link>
                                )}
                            </React.Fragment>
                        ))
                    ) : (
                        <div className="text-gray-400"></div>
                    )}

                    {/* 說明選單也使用 SmartPopover */}
                    <SmartPopover
                        label="說明"
                        items={illustrate}
                        renderItem={renderIllustrateItem}
                    />
                </PopoverGroup>

                {/* Mobile Menu Button */}
                <div className="flex md:hidden ml-auto">
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(true)}
                        className="-m-2.5 inline-flex items-center rounded-md p-2.5 text-gray-700"
                    >
                        <span className="sr-only">打開menu</span>
                        <Bars3Icon aria-hidden="true" className="size-8" />
                    </button>
                </div>

                {/* Avatar Menu */}
                <Ava name={name} state={avatarMenuState} setState={setAvatarMenuState} />
            </nav>

            {/* Mobile Menu */}
            <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
                <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                    <div className="flex items-center justify-between">
                        <Link href="/home" className="-m-1.5 p-1.5 btn btn-ghost">
                            <span className="sr-only">首頁</span>
                            <Image
                                alt="經濟部產業園區管理局績效指標資料庫暨資訊平台Logo"
                                src={logo}
                                className="h-11 w-auto"
                                width={100}
                                height={40}
                            />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="-m-2.5 rounded-md p-2.5 text-gray-700 hover:bg-gray-50"
                        >
                            <span className="sr-only">Close menu</span>
                            <XMarkIcon aria-hidden="true" className="size-6" />
                        </button>
                    </div>
                    <div className="mt-6 flow-root">
                        <div className="-my-6 divide-y divide-gray-500/10">
                            <div className="space-y-2 py-6">
                                {menu.map((item) => (
                                    <React.Fragment key={item.id}>
                                        {item.children && item.children.length > 0 ? (
                                            <Disclosure as="div" className="-mx-3">
                                                <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pl-3 pr-3.5 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                                    {item.label}
                                                    <ChevronDownIcon
                                                        aria-hidden="true"
                                                        className="size-5 flex-none group-data-[open]:rotate-180"
                                                    />
                                                </DisclosureButton>
                                                <DisclosurePanel className="mt-2 space-y-2">
                                                    {item.children.map((child) => (
                                                        <Link
                                                            key={child.id}
                                                            href={child.link}
                                                            className="block rounded-lg py-2 pl-6 pr-3 text-sm/7 font-semibold text-gray-900 hover:bg-gray-50"
                                                            onClick={() => setMobileMenuOpen(false)}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    ))}
                                                </DisclosurePanel>
                                            </Disclosure>
                                        ) : (
                                            <Link
                                                href={item.link}
                                                className="-mx-3 block rounded-lg px-3 py-2 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                {item.label}
                                            </Link>
                                        )}
                                    </React.Fragment>
                                ))}

                                <Disclosure as="div" className="-mx-3">
                                    <DisclosureButton className="group flex w-full items-center justify-between rounded-lg py-2 pl-3 pr-3.5 text-base/7 font-semibold text-gray-900 hover:bg-gray-50">
                                        說明
                                        <ChevronDownIcon
                                            aria-hidden="true"
                                            className="size-5 flex-none group-data-[open]:rotate-180"
                                        />
                                    </DisclosureButton>
                                    <DisclosurePanel className="mt-2 space-y-2">
                                        {illustrate.map((item) => (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className="block rounded-lg py-2 pl-6 pr-3 text-sm/7 font-semibold text-gray-900 hover:bg-gray-50"
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                {item.name}
                                            </Link>
                                        ))}
                                    </DisclosurePanel>
                                </Disclosure>
                            </div>
                            <div className="py-6">
                                <Link
                                    href="/login"
                                    className="-mx-3 block rounded-lg px-3 py-2.5 text-base/7 font-semibold text-gray-900 hover:bg-gray-50"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    登入
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </Dialog>
        </header>
    );
}
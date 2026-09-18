import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {getAccessToken, clearAuthCookies} from "@/services/serverAuthService";
import {useauthStore} from "@/Stores/authStore";
import {useMenuStore} from "@/Stores/menuStore";
import userlogo from "@/../public/user.svg"

interface AvatarMenuProps {
    name: string;
    image?: string;
    state: string | null;
    setState: (state: string | null) => void;
}
const basePath = process.env.BASE_PATH || '';
const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
export default function AvatarMenu(props: AvatarMenuProps) {
    const { name, state, setState } = props;

    const [isLoading] = useState(false);
    const {isLoggedIn, setIsLoggedIn,permissions} = useauthStore(); // 登入狀態
    const hasSettingAudit = permissions.includes('setting-audit');

    const menuRef = useRef<HTMLDivElement>(null);

    const avatarMenuId = "avatar-menu";
    const isAvatarMenuOpen = state === avatarMenuId;

    const [theme, setTheme] = useState<'fantasy' | 'fantasydark'>('fantasy');

    // 初始化主題
    useEffect(() => {
        const saved = localStorage.getItem('theme') as 'fantasy' | 'fantasydark' | null;
        const initialTheme = saved ?? 'fantasy';
        setTheme(initialTheme);
        document.documentElement.setAttribute('data-theme', initialTheme);
    }, []);

    // 檢查 cookies 中是否有 JWT
    useEffect(() => {
        getAccessToken().then((token)=>{
            setIsLoggedIn(!!token); // 如果有 token，設置 isLoggedIn 為 true
        });
    }, []);

    const handleLogout = (e?: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent) => {
        e?.preventDefault();
        clearAuthCookies().then(() => {
            setIsLoggedIn(false);
            setState(null);
            useMenuStore.getState().clearMenu();
            console.log("目前 basePath：", basePath);
            console.log("目前 NPbasePath：", NPbasePath);
            window.location.replace(NPbasePath+"/login");
        });
    };

    const handleLogin = (e?: React.MouseEvent<HTMLSpanElement> | React.KeyboardEvent) => {
        e?.preventDefault();
        setState(null); // 關閉選單
        window.location.replace(NPbasePath+"/login");// 跳轉到登入頁面
    };

    const toggleMenu = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setState(isAvatarMenuOpen ? null : avatarMenuId);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && isAvatarMenuOpen) {
            setState(null);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isAvatarMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setState(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isAvatarMenuOpen, setState]);

    // 根據登入狀態動態生成選項
    const items = isLoggedIn
        ? [
            { label: "個人資料", link: "/profile" },
            ...(hasSettingAudit
                ? [{ label: "設定", link: "/admin" }] // ✅ 只有有權限才加進來
                : []),
            { label: "登出", onClick: handleLogout },
        ]
        : [{ label: "登入", onClick: handleLogin }];

    return (
        <>

            <div ref={menuRef} onKeyDown={handleKeyDown} className="relative">
                <div className="dropdown dropdown-end">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-haspopup="true"
                        aria-expanded={isAvatarMenuOpen}
                        aria-controls="avatar-dropdown-menu"
                        aria-label="Toggle user menu"
                        className="btn btn-ghost btn-circle avatar focus:ring-2 focus:ring-primary focus:outline-none"
                        onClick={toggleMenu}
                    >
                        <div className="w-10 rounded-full">
                            <Image
                                src={userlogo}
                                alt={`${name}頭像`}
                                width={200}
                                height={200}
                                priority={userlogo}
                            />
                        </div>
                    </motion.button>

                    <AnimatePresence>
                        {isAvatarMenuOpen && (
                            <motion.ul
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2, staggerChildren: 0.1 }}
                                id="avatar-dropdown-menu"
                                className="menu menu-sm dropdown-content bg-white text-black bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
                                role="menu"
                                style={{ zIndex: 9999 }}
                            >
                                {isLoading ? (
                                    <motion.li
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="px-4 py-2"
                                        role="none"
                                    >
                                        載入中...
                                    </motion.li>
                                ) : (
                                    <>
                                        {isLoggedIn && ( // 只有登入時顯示名字
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex items-center gap-2 px-3 py-2"
                                                >
                                                    <p className="font-medium text-2xl">
                                                        {name}
                                                    </p>
                                                    <p className="text-sm text-gray-600 ml-2">
                                                        您好
                                                    </p>
                                                </motion.div>
                                                <div className="divider my-1"></div>
                                            </>
                                        )}

                                        {items.map((item, index) => (
                                            <motion.li
                                                key={index}
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="mt-1"
                                                role="none"
                                            >
                                                {item.link ? (
                                                    <Link
                                                        href={item.link}
                                                        className="flex gap-2 p-2 hover:bg-base-200 rounded-md"
                                                        role="menuitem"
                                                        tabIndex={0}
                                                    >
                                                        {item.label}
                                                    </Link>
                                                ) : (
                                                    <button
                                                        onClick={item.onClick}
                                                        className="flex gap-2 p-2 hover:bg-base-200 rounded-md w-full text-left"
                                                        role="menuitem"
                                                        tabIndex={0}
                                                    >
                                                        {item.label}
                                                    </button>
                                                )}
                                            </motion.li>
                                        ))}
                                    </>
                                )}
                            </motion.ul>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}
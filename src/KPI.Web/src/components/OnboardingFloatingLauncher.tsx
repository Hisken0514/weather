"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Play, HelpCircle, RotateCcw, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import type { StepDef, UseDriverOnboardingOptions } from "@/hooks/useDriverOnboarding";
import { useDriverOnboarding } from "@/hooks/useDriverOnboarding";

/**
 * OnboardingFloatingLauncher
 * — 懸浮在頁面上的「啟用導覽」啟動器。
 *
 * 用法（每個頁面都可以塞不同的 steps 與 options）：
 * <OnboardingFloatingLauncher
 *    steps={[ makeStep('#nav-kpi','KPI','...'), ... ]}
 *    options={{
 *      ctx: { role, permissions, pathname },
 *      scope: 'home',                  // 這一頁的識別符
 *      version: '1.0.0',               // 或用 NEXT_PUBLIC_ONBOARDING_VERSION
 *      chainNext: '/kpi/dashboard',    // （可選）完成後導向下一頁並續接
 *      forceChain: true,               // （可選）忽略下一頁已看過的快取，強制顯示一次
 *      autoStartInProd: false,         // 🚫 關閉自動啟動（改為手動）
 *      devAutoStart: false             // 🚫 開發環境也不自動
 *    }}
 *    label="啟用導覽"
 *    position="br"
 *    pulse
 *  />
 */

export type FabPosition = "br" | "bl" | "tr" | "tl";

export default function OnboardingFloatingLauncher({
                                                       steps,
                                                       options,
                                                       label = "啟用導覽",
                                                       position = "br",
                                                       pulse = false,
                                                       hideable = true,
                                                   }: {
    steps: StepDef[];
    options: UseDriverOnboardingOptions;
    label?: string;
    position?: FabPosition;
    pulse?: boolean;
    hideable?: boolean;
}) {
    // 強制關閉自動啟動，全部改由按鈕觸發
    const merged = useMemo<UseDriverOnboardingOptions>(() => ({
        ...options,
        autoStartInProd: false,
        devAutoStart: false,
    }), [options]);

    const { start, resetSeen, hasSeen, key } = useDriverOnboarding(steps, merged);

    const hideKey = useMemo(() => `guide_fab_hidden_${merged.scope || "page"}`, [merged.scope]);
    const [open, setOpen] = useState(false);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        setHidden(localStorage.getItem(hideKey) === "1");
    }, [hideKey]);

    const posCls = useMemo(() => {
        const base = "fixed z-[99990]"; // 高於大多數 UI，但仍低於 Driver.js 的遮罩
        switch (position) {
            case "bl": return `${base} bottom-4 left-4`;
            case "tr": return `${base} top-4 right-4`;
            case "tl": return `${base} top-4 left-4`;
            case "br":
            default:    return `${base} bottom-4 right-4`;
        }
    }, [position]);

    // 隱藏狀態 → 顯示迷你「喚回」小圓點
    if (hidden && hideable) {
        return (
            <div className={posCls}>
                <button
                    type="button"
                    aria-label="顯示導覽啟動器"
                    title="顯示導覽啟動器"
                    onClick={() => {
                        localStorage.removeItem(hideKey);
                        setHidden(false);
                        setOpen(true); // 也直接展開面板（想純恢復可移除此行）
                    }}
                    className="group relative flex items-center justify-center w-9 h-9 rounded-full
                   shadow-lg border border-gray-200/80 dark:border-gray-700/60
                   bg-white/95 dark:bg-gray-900/90 backdrop-blur hover:shadow-xl transition"
                >
                    {/* 小圓點本體 */}
                    <span className="block w-3.5 h-3.5 rounded-full bg-indigo-600" />
                    {/* 外圈脈衝（裝飾，可拿掉） */}
                    <span className="absolute inline-flex h-full w-full rounded-full
                         animate-ping opacity-30 bg-indigo-400/60" />
                </button>
            </div>
        );
    }

    const seen = hasSeen();

    return (
        <div className={posCls}>
            {/* 主按鈕 */}
            <button
                type="button"
                aria-label={label}
                onClick={() => setOpen((v) => !v)}
                className={`group relative flex items-center gap-2 rounded-full px-4 py-2 shadow-xl border border-gray-200/80 dark:border-gray-700/60 bg-white/95 dark:bg-gray-900/90 backdrop-blur hover:shadow-2xl transition ${pulse ? "animate-[pulse_2s_ease-in-out_infinite]" : ""}`}
            >
                <HelpCircle className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
                {open ? (
                    <ChevronDown className="w-4 h-4 opacity-70" />
                ) : (
                    <ChevronUp className="w-4 h-4 opacity-70" />
                )}
                {!seen && (
                    <span className="ml-2 text-[10px] rounded-full bg-indigo-600 text-white px-2 py-0.5">新</span>
                )}
            </button>

            {/* 下拉面板 */}
            {open && (
                <div className="mt-2 w-56 rounded-xl shadow-2xl border border-gray-200/80 dark:border-gray-700/60 bg-white/98 dark:bg-gray-900/95 backdrop-blur overflow-hidden">
                    <ul className="p-1">
                        <li>
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false);
                                    // 強制立即啟動（會自動過濾不存在元素；如有 chainNext 會於最後一步顯示「下一頁」）
                                    start(true);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <Play className="w-4 h-4" />
                                <span className="text-sm">開始導覽</span>
                            </button>
                        </li>

                        <li>
                            <button
                                type="button"
                                onClick={() => {
                                    resetSeen();
                                    setOpen(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="text-sm">重置進度</span>
                            </button>
                        </li>

                        {hideable && (
                            <li>
                                <button
                                    type="button"
                                    onClick={() => {
                                        localStorage.setItem(hideKey, "1");
                                        setHidden(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <EyeOff className="w-4 h-4" />
                                    <span className="text-sm">隱藏浮鈕</span>
                                </button>
                            </li>
                        )}
                    </ul>
                    <div className="px-3 pb-2 pt-1 text-[11px] text-gray-500/80 dark:text-gray-400/80 select-none">
                        {seen ? (
                            <span>已看過 · key: <code className="font-mono">{key}</code></span>
                        ) : (
                            <span>尚未看過 · 點「開始導覽」</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

'use client'

import React, { useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { useAiChatStore } from "@/Stores/aiChatStore";

/**
 * AiChatFloatingButton
 * — 右下角懸浮圓形按鈕，取代原本「要點開個人頭像選單」才找得到的 AI 查詢助理入口。
 *   點擊直接開啟 AiChatDrawer；面板開著的時候把按鈕藏起來，避免跟面板自己的
 *   關閉按鈕疊在一起、看起來像兩個互相矛盾的控制項。
 */
export default function AiChatFloatingButton() {
    const { isOpen, open } = useAiChatStore();
    const [isHovered, setIsHovered] = useState(false);

    if (isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 md:bottom-9 md:right-9 z-[9997]">
            <button
                type="button"
                onClick={open}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                aria-label="開啟 AI 查詢助理"
                title="AI 查詢助理"
                className={`btn btn-circle btn-secondary shadow-2xl ring-4 ring-white transition-all duration-300
                    w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 min-h-0 ${
                    isHovered ? "shadow-xl scale-110" : "hover:shadow-xl hover:scale-105"
                }`}
            >
                <MessageCircleMore
                    className={`h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 transition-transform duration-200 ${
                        isHovered ? "scale-110" : ""
                    }`}
                />
            </button>
        </div>
    );
}

"use client";


import {useThemeStore} from "@/store/ThemeStore";


export function ThemeToggle() {
    const isDarkMode = useThemeStore((state) => state.isDarkMode);
    const toggleDarkMode = useThemeStore((state) => state.toggleDarkMode);

    return (
        <button
            onClick={toggleDarkMode}
            className="btn btn-outline btn-sm"
        >
            {isDarkMode ? "🌙 深色模式" : "☀️ 淺色模式"}
        </button>
    );
}
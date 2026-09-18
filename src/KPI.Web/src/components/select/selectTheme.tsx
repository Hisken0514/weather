'use client';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

export default function SelectTheme() {
    const [theme, setTheme] = useState<'fantasy' | 'fantasydark'>('fantasy');

    useEffect(() => {
        const saved = localStorage.getItem("theme") as 'fantasy' | 'fantasydark' | null;
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const initial = saved || (prefersDark ? "fantasydark" : "fantasy");
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === "fantasy" ? "fantasydark" : "fantasy";
        localStorage.setItem("theme", newTheme);
        setTheme(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-sm"
            aria-label="切換主題"
        >
            {theme === 'fantasy' ? (
                <MoonIcon className="h-5 w-5 text-gray-700" />
            ) : (
                <SunIcon className="h-5 w-5 text-yellow-400" />
            )}
        </button>
    );
}
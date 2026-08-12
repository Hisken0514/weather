"use client"


import {useThemeStore} from "@/store/ThemeStore";
import {useEffect} from "react";
import {ThemeToggle} from "@/composes/ThemeToggle";
import "./globals.css"

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  const isDarkMode = useThemeStore((state) => state.isDarkMode);

  // 頁面掛載時自動套用目前 Store 內的主題名稱
  useEffect(() => {
    const themeName = isDarkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", themeName);
  }, [isDarkMode]);

  return (
      <html lang="zh-TW" data-theme={isDarkMode ? "dark" : "light"} suppressHydrationWarning>
      <body>{children}</body>
      <ThemeToggle/>
      </html>
  );
}
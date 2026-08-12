import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ThemeStore {
    isDarkMode: boolean;
    setDarkMode: (value: boolean) => void;
    toggleDarkMode: () => void;
}

// 輔助函式：同步修改 HTML 標籤的 data-theme 屬性 (讓 DaisyUI 變色)
const updateDomTheme = (isDark: boolean) => {
    if (typeof document !== "undefined") {
        const themeName = isDark ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", themeName);
    }
};

export const useThemeStore = create<ThemeStore>()(
    // 使用 persist 中介軟體包覆 Store
    persist(
        (set) => ({
            isDarkMode: false,

            setDarkMode: (value: boolean) => {
                updateDomTheme(value);
                set({ isDarkMode: value });
            },

            toggleDarkMode: () => {
                set((state) => {
                    const nextValue = !state.isDarkMode;
                    updateDomTheme(nextValue);
                    return { isDarkMode: nextValue };
                });
            },
        }),
        {
            name: "theme-storage", // 存入 LocalStorage 的 Key 名稱
            storage: createJSONStorage(() => localStorage),

            // 當頁面重新整理，從 LocalStorage 完成讀取 (Hydrate) 時，自動套用 DOM 屬性
            onRehydrateStorage: () => (state) => {
                if (state) {
                    updateDomTheme(state.isDarkMode);
                }
            },
        }
    )
);
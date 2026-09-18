import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MenuItem {
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

interface MenuState {
    menu: MenuItem[];
    setMenu: (menu: MenuItem[]) => void;
    clearMenu: () => void;
    hasMenu: boolean; // ✅ 是否有抓過 menu（可用於條件渲染）
    setHasMenu: (has: boolean) => void;
}

export const useMenuStore = create<MenuState>()(
    persist(
        (set) => ({
            menu: [],
            hasMenu: false,
            setMenu: (menu) => set({ menu, hasMenu: true }),
            clearMenu: () => set({ menu: [], hasMenu: false }),
            setHasMenu: (has) => set({ hasMenu: has }),
        }),
        {
            name: 'menu-storage', // 本地存儲 key
        }
    )
);
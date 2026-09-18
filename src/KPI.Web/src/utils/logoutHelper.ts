// utils/logoutHelper.ts
import { clearAuthCookies } from "@/services/serverAuthService";
import { useauthStore } from "@/Stores/authStore";
import { useMenuStore } from "@/Stores/menuStore";

export const handleLogout = () => {
    clearAuthCookies().then(() => {
        useauthStore.getState().setIsLoggedIn(false);
        useMenuStore.getState().clearMenu();

        const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        window.location.replace(`${NPbasePath}/login`);
    });
};
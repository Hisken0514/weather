import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { isAuthenticated } from "@/services/clientAuthService";
import { authService } from "@/services/authService";
import { getAccessToken, clearAuthCookies } from "@/services/serverAuthService";
import api from "@/services/apiService"

// 🔐 JWT 權限與識別結構
interface JWTPayload {
    sub: string;
    exp: number;
    permission?: string[];
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': string;
}

// 👤 角色定義
type Role = 'admin' | 'superAdmin' | 'company' | 'official' | null;


// 🧠 全域狀態結構
interface GlobalState {
    permissions: string[];
    isLoggedIn: boolean;
    userName: string | null;
    userOrgId: number | null;
    userOrgTypeId: number | null;
    userRole: Role;

    setPermissions: (perms: string[]) => void;
    setIsLoggedIn: (status: boolean) => void;
    setUserName: (name: string | null) => void;
    setUserOrgId: (id: number | null) => void;
    setUserOrgTypeId: (typeId: number | null) => void;
    setUserRole: (role: Role) => void;

    checkIsLoggedIn: () => Promise<void>;
    checkAuthStatus: () => Promise<void>;
    logout: () => Promise<void>;
}

export const useauthStore = create<GlobalState>()(
    persist(
        (set) => ({
            isLoggedIn: false,
            userName: null,
            userOrgId: null,
            userOrgTypeId: null,
            userRole: null,
            permissions: [],

            // ⬇️ setter
            setPermissions: (perms) => set({ permissions: perms }),
            setIsLoggedIn: (status) => set({ isLoggedIn: status }),
            setUserName: (name) => set({ userName: name }),
            setUserOrgId: (id) => set({ userOrgId: id }),
            setUserOrgTypeId: (typeId) => set({ userOrgTypeId: typeId }),
            setUserRole: (role) => set({ userRole: role }),

            // ✅ 僅檢查 token 是否有效（用於 CSR）
            checkIsLoggedIn: async () => {
                try {
                    const authStatus = await isAuthenticated();
                    set({ isLoggedIn: authStatus });
                } catch (error) {
                    console.error('🔒 checkIsLoggedIn 失敗:', error);
                    set({ isLoggedIn: false, userName: null });
                }
            },

            // ✅ 完整解析登入資訊（從 token 與 /auth/me 同步角色與組織資訊）
            checkAuthStatus: async () => {
                try {
                    const token = await getAccessToken();

                    if (!token || !token.value) {
                        console.warn("🔒 尚未登入：找不到 token");
                        set({
                            isLoggedIn: false,
                            userName: null,
                            permissions: [],
                            userOrgId: null,
                            userOrgTypeId: null,
                            userRole: null,
                        });
                        return; // ✅ 不拋錯，乾淨結束
                    }

                    const decoded = jwtDecode<JWTPayload>(token.value);
                    const meRes = await api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${token.value}` }
                    });

                    const { organizationId, organizationTypeId, role: backendRole } = meRes.data;
                    const validRoles: Role[] = ['admin', 'superAdmin', 'company', 'official'];
                    const role: Role = validRoles.includes(backendRole as Role) ? (backendRole as Role) : 'company';

                    set({
                        isLoggedIn: true,
                        userName: decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
                        permissions: decoded.permission || [],
                        userOrgId: organizationId,
                        userOrgTypeId: organizationTypeId,
                        userRole: role,
                    });
                } catch (error) {
                    console.error('🔒 checkAuthStatus 失敗:', error);
                    set({
                        isLoggedIn: false,
                        userName: null,
                        permissions: [],
                        userOrgId: null,
                        userOrgTypeId: null,
                        userRole: null,
                    });
                }
            },

            // 🔓 登出，清除所有狀態與 Cookie
            logout: async () => {
                await authService.logout();
                await clearAuthCookies();
                set({
                    isLoggedIn: false,
                    userName: null,
                    permissions: [],
                    userOrgId: null,
                    userOrgTypeId: null,
                    userRole: null,
                });
            },
        }),
        {
            name: 'global-storage', // 💾 本地快取 Key
        }
    )
);

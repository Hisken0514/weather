import { useauthStore } from "@/Stores/authStore";

export function useCan() {
    const permissions = useauthStore((s) => s.permissions ?? []);
    const can = (...need: string[]) => need.every(p => permissions.includes(p));
    return { can, permissions };
}

// 任何地方用：
//const { can } = useCan();
//{can("setting-audit") && <Link href="/admin/audit">日誌紀錄</Link>}
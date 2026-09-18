"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/hooks/useCan";

export function RequirePermission({ need, children }: { need: string | string[], children: React.ReactNode }) {
    const router = useRouter();
    const { can, permissions } = useCan();
    const needs = Array.isArray(need) ? need : [need];

    // 尚未載入 permissions 時可先顯示 loading，避免閃爍
    useEffect(() => {
        if (permissions.length === 0) return; // 等資料載入
        if (!can(...needs)) router.replace("/403");
    }, [permissions.join("|")]);

    if (permissions.length === 0) return <div className="p-6 text-gray-500">載入中…</div>;
    if (!can(...needs)) return null; // 會被 redirect

    return <>{children}</>;
}
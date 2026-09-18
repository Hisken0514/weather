import Dashboard from "@/components/Admin/Dashboard";
import type { Metadata } from "next";
import { RequirePermission } from "@/components/Admin/RequirePermission";

export const metadata: Metadata = { title: "管理資料" };

export default function page(){
    return (
        <RequirePermission need="import">
            <Dashboard />
        </RequirePermission>
    )
}
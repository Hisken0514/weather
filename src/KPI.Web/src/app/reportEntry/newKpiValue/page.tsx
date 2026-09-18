import AddKPIvalue from "@/components/KPI/AddKPIvalue";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "批次上傳績效指標報告" };

export default function page(){


    return (
        <>
            <AddKPIvalue/>
        </>
    )
}
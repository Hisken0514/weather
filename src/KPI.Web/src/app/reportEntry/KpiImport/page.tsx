import KpiImportStep from "@/components/ReportKPI/KpiImportStep";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "上傳績效指標報告" };

export default function page(){


    return (
        <>
            <KpiImportStep/>
        </>
    )
}
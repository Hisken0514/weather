import SugImportStep from "@/components/ReportSuggest/SugImportStep";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "批次上傳委員建議報告" };

export default function page(){


    return (
        <>
            <SugImportStep/>
        </>
    )
}
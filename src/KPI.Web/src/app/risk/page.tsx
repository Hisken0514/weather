import ReportEntry from "@/components/KPI/ReportEntry";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "風險" };

export default function page(){


    return (
        <>
            <ReportEntry/>
        </>
    )
}
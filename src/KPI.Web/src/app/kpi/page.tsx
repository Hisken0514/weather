import KPI from "@/components/KPI/KPI";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "績效指標" };

export default function page(){


    return (
        <>
            <KPI/>
        </>
    )
}
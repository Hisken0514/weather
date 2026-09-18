import Report from "@/components/Report/Report";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "報表" };

export default function page(){


    return (
        <>
            <Report />
        </>
    )
}
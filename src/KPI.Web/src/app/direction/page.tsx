import Direction from "@/components/Help/Direction";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "網站導覽" };

export default function page(){

    return (
        <>
        <Direction/>
        </>
    )
}
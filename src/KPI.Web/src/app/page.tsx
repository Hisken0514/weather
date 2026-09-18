import Platform from "@/components/Platform/Platform";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "平台選擇" };

export default function page(){


    return (
        <>
            <Platform />
        </>
    )
}
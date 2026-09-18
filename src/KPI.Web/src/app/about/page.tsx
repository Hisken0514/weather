import About from "@/components/Help/About";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "關於我們" };

export default function page(){

    return (
        <>
        <About/>
        </>
    )
}
import Register from "@/components/Auth/Register";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "註冊" };

export default function page(){


    return (
        <>
            <Register/>
        </>
    )
}
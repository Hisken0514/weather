import Login from "@/components/Auth/Login";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "登入" };

export default function page(){


    return (
        <>
            <Login/>
        </>
    )
}
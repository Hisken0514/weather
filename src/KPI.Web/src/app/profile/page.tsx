import Profile from "@/components/Auth/Profile";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "個人資料" };

export default function page(){


    return (
        <>
            <Profile/>
        </>
    )
}
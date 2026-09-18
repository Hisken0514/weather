import Suggest from "@/components/Suggest/Suggest";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "委員回覆及改善建議" };

export default function page(){


    return (
        <>
            <Suggest />
        </>
    )
}
import SuggestDetail from "@/components/Suggest/SuggestDetail";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "委員回覆及改善建議詳情" };

export default function page(){


    return (
        <>
            <SuggestDetail />
        </>
    )
}
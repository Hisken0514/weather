import AddSugvalue from "@/components/Suggest/AddSugvalue";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "上傳委員建議報告" };

export default function page(){


    return (
        <>
            <AddSugvalue/>
        </>
    )
}
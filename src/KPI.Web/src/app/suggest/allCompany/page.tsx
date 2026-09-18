import { Suspense } from 'react';
import SuggestAllCompany from "@/components/Suggest/SuggestAllCompany";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "委員回覆及改善建議詳情總表" };

function LoadingFallback() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600 text-lg">載入中...</p>
            </div>
        </div>
    );
}

export default function Page() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SuggestAllCompany />
        </Suspense>
    );
}
import { Suspense } from "react";
import type { Metadata } from "next";
import OAuthConsent from "@/components/Auth/OAuthConsent";

export const metadata: Metadata = { title: "授權存取請求" };

export default function Page() {
    return (
        <Suspense>
            <OAuthConsent />
        </Suspense>
    );
}

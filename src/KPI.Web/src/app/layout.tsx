import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import ClientShell from "@/components/ClientShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const NPbasePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
    title: {
        default: "經濟部產業園區管理局績效指標資料庫暨資訊平台",
        template: "經濟部產業園區管理局績效指標資料庫暨資訊平台 - %s",
    },
    description:
        "本平台由工安協會協助開發，專為政府單位與企業提供績效指標監管的數位化工具。透過數據分析與審查紀錄，協助政府機構掌握企業的績效達成情形，並推動產業安全標準的持續提升。",
    icons: {
        icon: `${NPbasePath}/favicon.ico`,
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-TW">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientShell>{children}</ClientShell>
        </body>
        </html>
    );
}

import React from "react";
import Link from "next/link";
import Image from "next/image";
import AA21 from "@/../public/AA21.svg"

export default function Component() {
    const basePath = process.env.BASE_PATH || '';
    return (
        <>

            <footer className="footer footer-center bg-primary text-primary-content p-10 relative">
                <nav className="grid grid-flow-col gap-4">
                    <a accessKey="H" href="#H" title="下方功能區塊"
                       className="bg-primary text-primary focus:text-white">
                        :::
                    </a>
                    <Link href="/about">關於我們</Link>
                    <span>|</span>
                    <Link href="/direction">網站導覽</Link>
                </nav>

                <aside className="relative">
                    <p className="font-bold">
                        ※本網所提供之電子檔案部分為.PDF格式，如無法閱讀，請自行下載安裝 免費軟體「中文版Adobe PDF Reader」
                        本網站由經濟部產業園區管理局「114年度所轄園區工廠風險評估暨管理躍升計畫」之委辦單位「中華民國工業安全衛生協會」維護管理
                        This site, sponsored by BIP/MOEA, was created and is maintained by the ISHA 本網站最佳瀏覽環境為
                        1024 x 768 視窗模式以上，IE 11.0含以上、Firefox、Chrome、safari 最新版本瀏覽器
                    </p>
                    <p>Copyright © {new Date().getFullYear()} - All right reserved</p>


                </aside>
                {/* 無障礙標誌移到右下角 */}
                <a href="https://accessibility.moda.gov.tw/Applications/Detail?category=20250811104030"
                   title="無障礙網站"
                   className="absolute bottom-0 right-20">
                    <Image src={AA21} width={88} height={33} alt="通過AA無障礙網頁檢測"/>
                </a>
            </footer>
        </>

    );
}

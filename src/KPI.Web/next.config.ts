// //next.config.ts
// import type { NextConfig } from "next";
//
// // 從環境變數取得 API 基本 URL
// const API_URL = process.env.API || "http://127.0.0.1:5013";
// // const isDev = process.env.NODE_ENV === "development";
// // const Mydomain = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";
// const RAG_API = process.env.RAG_API || "http://127.0.0.1:5013";
//
// const isDev = process.env.NODE_ENV === "development";
//
// const scriptSrc = [
//     "'self'",
//     "'unsafe-inline'",
//     "https://static.cloudflareinsights.com",
//     "https://challenges.cloudflare.com",
// ];
//
// if (isDev) {
//     scriptSrc.push("'unsafe-eval'");
// }
//
// const securityHeaders = [
//     {
//         key: "Strict-Transport-Security",
//         value: "max-age=31536000; includeSubDomains; preload"
//     },
//     {
//         key: "X-Content-Type-Options",
//         value: "nosniff"
//     },
//     {
//         key: "X-Frame-Options",
//         value: "SAMEORIGIN"
//     },
//     {
//         key: "Referrer-Policy",
//         value: "strict-origin-when-cross-origin"
//     },
//     {
//         key: "Permissions-Policy",
//         value: "geolocation=(), camera=(), microphone=()"
//     },
//     {
//         key: "Content-Security-Policy",
//         value: `
//         default-src 'self';
//         script-src ${scriptSrc.join(" ")};
//         style-src 'self' 'unsafe-inline';
//         img-src 'self' data: https:;
//         font-src 'self' https: data:;
//         connect-src 'self' ${API_URL} ${RAG_API} https://kpi.isafe.org.tw https://security.bip.gov.tw;
//         frame-src https://challenges.cloudflare.com;
//         worker-src 'self' blob:;
//         frame-ancestors https://security.bip.gov.tw;
//       `.replace(/\s{2,}/g, " ").trim()
//     },
//     {
//         key: 'X-Powered-By',
//         value: '' // 再保險移除
//     }
// ];
// const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
// const assetPrefix = basePath;
// const nextConfig: NextConfig= {
//     basePath,
//     assetPrefix,
//     poweredByHeader: false,
//     experimental: {
//         serverActions: {
//             allowedOrigins: [
//                 'https://security.bip.gov.tw',
//                 'https://kpi.isafe.org.tw'
//             ],
//             bodySizeLimit: '10mb', // 可選，或改 '2mb' '10mb' 等
//         }
//     },
//     async headers() {
//         return [
//             {
//                 source: "/(.*)",
//                 headers: securityHeaders
//             }
//         ];
//     },
//      async rewrites() {
//            return [
//         {
//             source: `${basePath}/proxy/:path*`,  // 加上 basePath
//             destination: `${API_URL}/:path*`,
//             basePath: false,
//             locale: false
//         },
//         {
//             source: `${basePath}/app/:path*`,    // 加上 basePath
//             destination: `${RAG_API}/:path*`,
//             basePath: false,
//             locale: false
//         }
//     ];
//         }
// };
//
// export default nextConfig;

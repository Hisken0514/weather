//next.config.js


// 從環境變數取得 API 基本 URL
const API_URL = process.env.API || "http://127.0.0.1:5013";
const RAG_API = process.env.RAG_API || "http://127.0.0.1:5013";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const assetPrefix = basePath;
const nextConfig= {
    basePath,
    assetPrefix,
    poweredByHeader: false,
    // 關閉 Next.js 內建 gzip 壓縮：壓縮需要緩衝資料才能運作，
    // 會把 /api/Gemini/stream 這種 SSE 串流回應整包悶住，導致瀏覽器端看不到逐字效果
    // （nginx 本身沒有另外開 gzip，所以其他頁面改用未壓縮傳輸，影響有限）
    compress: false,
    experimental: {
        middlewareClientMaxBodySize: '100mb',
        serverActions: {
            allowedOrigins: [
                'https://security.bip.gov.tw',
                'https://kpi.isafe.org.tw'
            ],
            bodySizeLimit: '100mb',
        }
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${API_URL}/:path*`,
                locale: false
            },
            {
                source: "/app/:path*",    // 加上 basePath
                destination: `${RAG_API}/:path*`,
                locale: false
            }
        ];
    }
};

module.exports = nextConfig;
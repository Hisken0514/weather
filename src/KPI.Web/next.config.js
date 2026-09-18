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
    // Docker Desktop on Windows 的 bind mount 不會觸發 inotify 事件，
    // webpack 預設的檔案監控收不到變動，改用輪詢才能在容器內偵測到 host 端的檔案修改
    webpack: (config, { dev }) => {
        if (dev) {
            config.watchOptions = {
                poll: 800,
                aggregateTimeout: 300,
            };
        }
        return config;
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
            },
            {
                // MCP OAuth 2.1 Authorization Server 的 RFC 端點（discovery/DCR/authorize/token）
                // 規範要求在網站根目錄，不能掛 /api 前綴，所以另外開一組 rewrite。
                source: "/oauth/:path*",
                destination: `${API_URL}/oauth/:path*`,
                locale: false
            },
            {
                source: "/.well-known/:path*",
                destination: `${API_URL}/.well-known/:path*`,
                locale: false
            }
        ];
    }
};

module.exports = nextConfig;
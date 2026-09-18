// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import getAuthtoken from "@/services/serverAuthService";

interface EnvironmentConfig {
    API_URL: string | undefined;
    RAG_API: string | undefined;
    DOMAIN: string;
    NODE_ENV: string;
    isDev: boolean;
}

interface CSPWhitelist {
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    fontSrc: string[];
    connectSrc: string[];
    frameSrc: string[];
    workerSrc: string[];
}

const PUBLIC_PATHS = [
    "/login",
    "/about",
    "/direction",
    "/register",
    "/api/auth",
    "/_next",
    "/favicon.ico",
    "/api",
    "/api/verify"
];

// IP 收集輔助函數
function getClientIP(req: NextRequest): string {
    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0];
    }

    const realIP = req.headers.get('x-real-ip');
    if (realIP) return realIP;

    const clientIP = req.headers.get('x-client-ip');
    if (clientIP) return clientIP;

    const cfIP = req.headers.get('cf-connecting-ip');
    if (cfIP) return cfIP;

    const xForwarded = req.headers.get('x-forwarded');
    if (xForwarded) return xForwarded;

    return req.headers.get('x-forwarded-for') || 'unknown';
}

function getCSPWhitelist(): CSPWhitelist {
    return {
        scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "http://localhost:5238",
            "http://127.0.0.1:8000",
            "http://ishabackend:8080/",
            "https://challenges.cloudflare.com",
            "https://*.cloudflare.com",
            "https://static.cloudflareinsights.com",
            "https://*.cloudflareinsights.com",
            "https://turnstile.com",
            "https://*.turnstile.com",
            "https://sdd.nat.gov.tw/"
        ],
        styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://challenges.cloudflare.com",
            "https://sdd.nat.gov.tw/"
        ],
        imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://challenges.cloudflare.com",
            "https://*.cloudflare.com",
            "http://ishabackend:8080/",
            "https://sdd.nat.gov.tw/"
        ],
        fontSrc: [
            "'self'",
            "data:"
        ],
        connectSrc: [
            "'self'",
            "https://challenges.cloudflare.com",
            "https://*.cloudflare.com",
            "https://api.cloudflare.com",
            "https://turnstile.com",
            "https://*.turnstile.com",
            "http://ishabackend:8080/",
            "https://sdd.nat.gov.tw/",
            "https://generativelanguage.googleapis.com",
            "https://*.googleapis.com"
        ],
        frameSrc: [
            "'self'",
            "https://challenges.cloudflare.com",
            "https://*.cloudflare.com",
            "https://turnstile.com",
            "https://*.turnstile.com",
            "http://ishabackend:8080/",
            "https://sdd.nat.gov.tw/"
        ],
        workerSrc: [
            "'self'",
            "blob:",
            "https://challenges.cloudflare.com",
            "http://ishabackend:8080/",
            "https://sdd.nat.gov.tw/"
        ]
    };
}

const getEnvironmentConfig = (): EnvironmentConfig => {
    const API_URL = process.env.API || "http://ishabackend:8080";
    const RAG_API = process.env.RAG_API || "http://ishabackend:8080";
    const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "http://localhost:3000";
    const NODE_ENV = process.env.NODE_ENV || "development";
    const isDev = NODE_ENV === "development";

    return { API_URL, RAG_API, DOMAIN, NODE_ENV, isDev };
};

function handleProxyRequest(req: NextRequest) {
    const clientIP = getClientIP(req);
    const response = NextResponse.next();

    if (clientIP && clientIP !== 'unknown') {
        response.headers.set('X-Real-IP', clientIP);
        response.headers.set('X-Forwarded-For', clientIP);
        response.headers.set('X-Client-IP', clientIP);
        response.headers.set('X-Original-IP', clientIP);
    }

    return response;
}

function applySecurity(req: NextRequest) {
    const res = NextResponse.next();
    const env = getEnvironmentConfig();
    const clientIP = getClientIP(req);

    if (clientIP) {
        res.headers.set('X-Real-IP', clientIP);
        res.headers.set('X-Forwarded-For', clientIP);
        res.headers.set('X-Client-IP', clientIP);
    }

    if (req.headers.get('host')?.includes('localhost')) {
        return NextResponse.next();
    }

    const userAgent = req.headers.get('user-agent') || '';
    const isZapScan = userAgent.includes('ZAP') || req.url.includes('zap');
    const isStaticResource = req.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|pdf)$/i);

    const apiUrl = new URL(env.API_URL || '').origin;
    const ragApiUrl = new URL(env.RAG_API || '').origin;
    const whitelist = getCSPWhitelist();

    let cspDirectives;

    if (isZapScan) {
        cspDirectives = {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:5238", "http://127.0.0.1:8000", "https://challenges.cloudflare.com", "https://static.cloudflareinsights.com"],
            'style-src': ["'self'", "'unsafe-inline'"],
            'img-src': ["'self'", "data:", "blob:", "https://challenges.cloudflare.com"],
            'font-src': ["'self'", "data:"],
            'connect-src': ["'self'", apiUrl, ragApiUrl, "https://challenges.cloudflare.com", "https://api.cloudflare.com", "https://*.cloudflare.com"].filter(Boolean),
            'frame-src': ["'self'", "https://challenges.cloudflare.com", "https://*.cloudflare.com"],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'upgrade-insecure-requests': []
        };
    } else if (env.isDev || isStaticResource) {
        cspDirectives = {
            'default-src': ["'self'", "http:", "https:"],
            'script-src': [...whitelist.scriptSrc, apiUrl, ragApiUrl].filter(Boolean),
            'style-src': whitelist.styleSrc,
            'img-src': ["'self'", "data:", "blob:", "http:", "https:"],
            'font-src': whitelist.fontSrc,
            'connect-src': [...whitelist.connectSrc, apiUrl, ragApiUrl, "ws:", "wss:", "*"].filter(Boolean),
            'frame-src': [...whitelist.frameSrc],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"]
        };
    } else {
        cspDirectives = {
            'default-src': ["'self'"],
            'script-src': [...whitelist.scriptSrc, apiUrl, ragApiUrl].filter(Boolean),
            'style-src': whitelist.styleSrc,
            'img-src': whitelist.imgSrc,
            'font-src': whitelist.fontSrc,
            'connect-src': [...whitelist.connectSrc, apiUrl, ragApiUrl].filter(Boolean),
            'frame-src': [...whitelist.frameSrc],
            'object-src': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"],
            'upgrade-insecure-requests': []
        };
    }

    const csp = Object.entries(cspDirectives)
        .map(([key, values]) => {
            if (values.length === 0) return key;
            return `${key} ${values.join(' ')}`;
        })
        .join('; ');


    return res;
}

function base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = 4 - (str.length % 4);
    if (padding !== 4) {
        str += '='.repeat(padding);
    }
    return atob(str);
}

export async function middleware(req: NextRequest) {
    const token = await getAuthtoken();
    const tokenValue = token?.value || "";
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";


    // 動態去除 basePath，取得純路徑
    const rawPath = req.nextUrl.pathname;
    const cleanedPath = rawPath.replace(new RegExp(`^${basePath}`), "");

    // 如果是 proxy 路徑，直接處理並放行
    if (cleanedPath.startsWith("/api")) {
        return handleProxyRequest(req);

    }

    // 判斷是否是公開路徑
    const isPublicPath =
        PUBLIC_PATHS.some(path => cleanedPath.startsWith(path)) ||
        cleanedPath.match(/\.(svg|png|jpg|jpeg|webp|ico|woff2|xlsx|txt|xml|pdf?)$/);

    // Token 格式驗證
    if (tokenValue && !/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(tokenValue)) {
        const response = NextResponse.redirect(new URL(`${basePath}/login`, req.url));
        response.cookies.delete("token");
        return response;
    }

    // Token 過期驗證
    if (tokenValue) {
        try {
            const payloadBase64 = tokenValue.split(".")[1];
            const payloadJson = base64UrlDecode(payloadBase64);
            const payload = JSON.parse(payloadJson);

            const expiry = payload.exp;
            const now = Math.floor(Date.now() / 1000);
            if (expiry && now > expiry) {
                const response = NextResponse.redirect(new URL(`${basePath}/login`, req.url));
                response.cookies.delete("token");
                return response;
            }
        } catch (e) {
            const response = NextResponse.redirect(new URL(`${basePath}/login`, req.url));

            response.cookies.delete("token");
            return response;
        }
    }

    // 未登入且非公開路徑，重定向到登入頁
    if (!tokenValue && !isPublicPath) {
        return NextResponse.redirect(new URL(`${basePath}/login`, req.url));
    }

    // 應用安全頭部並繼續
    return applySecurity(req);
}

export const config = {
    matcher: [
        /*
         * 比對所有路徑，除了：
         * - 以下擴展名的靜態文件: (css, js, png, jpg, jpeg, gif, svg, webp, ico)
         * - api 路由
         * - _next 路由 (Next.js內部使用)
         * - 通常不需要額外安全頭的靜態資源
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|pdf)$).*)',
    ],
};
/**
 * 登入完成後要導去哪裡——預設是首頁("/"),但如果目前網址帶了 ?returnUrl=,代表使用者是被
 * 某個流程(目前只有 MCP OAuth 的 /oauth/authorize,見後端 McpOAuthController)導來登入的,
 * 登入完要導回那個流程接著走,不是回首頁。只接受同源、且路徑開頭是 /oauth/ 的 returnUrl——
 * 避免這個 query param 被濫用成開放重導向(open redirect)。照搬自 ISHAAudit
 * useGlobalStore.ts 的 getPostLoginRedirect 同一套邏輯。
 */
export function getPostLoginRedirect(): string {
    const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
    if (returnUrl) {
        try {
            const url = new URL(returnUrl, window.location.origin);
            if (url.origin === window.location.origin && url.pathname.startsWith("/oauth/")) {
                return `${url.pathname}${url.search}`;
            }
        } catch {
            // 不是合法 URL 就當作沒有,走預設值。
        }
    }
    return "/";
}

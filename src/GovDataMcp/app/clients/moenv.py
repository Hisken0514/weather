"""環境部環境資料開放平臺 v2 API 的薄 wrapper。

固定的「依資料代號(DataID)查資料」端點,一定要帶 api_key(免費註冊會員取得,詳見
config.MOENV_API_TERM_URL)。

這個平臺目前沒有公開、穩定的「關鍵字搜尋資料集」API——官方文件跟實際探測
(/dataset 頁面是 SPA、真正的搜尋是前端呼叫內部 API,沒有找到可靠的公開端點)都沒有
可用的搜尋端點,所以這個模組刻意只做「已知 DataID 查資料」,不做「猜」資料代號的
搜尋工具,避免對使用者回傳看似合理但其實不可靠的結果。DataID 要先到
config.MOENV_DATASET_CATALOG_URL 網頁上人工查出。
"""
from __future__ import annotations

from typing import Any

import httpx
from mcp.server.mcpserver.exceptions import ToolError

from .. import config


async def get_dataset_records(
    data_id: str,
    limit: int = 100,
    offset: int = 0,
    year_month: str | None = None,
    sort: str | None = None,
) -> Any:
    if not config.MOENV_API_KEY:
        raise ToolError(
            "尚未設定 MOENV_API_KEY 環境變數——環境部這個 API 一定要帶 api_key 才能查資料"
            f"(未帶會直接回傳 500)。請到 {config.MOENV_API_TERM_URL} 免費註冊會員取得金鑰"
            "(有效期一年,未達每日 5000 次用量都是免費的),再用 MOENV_API_KEY 環境變數"
            "注入給這個服務,重啟後生效。"
        )

    url = f"{config.MOENV_BASE_URL}/{data_id}"
    params = {
        "api_key": config.MOENV_API_KEY,
        "limit": limit,
        "offset": offset,
        "year_month": year_month,
        "sort": sort,
        "format": "json",
    }
    query = {k: v for k, v in params.items() if v is not None}

    async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS) as client:
        try:
            resp = await client.get(url, params=query)
        except httpx.RequestError as exc:
            raise ToolError(f"連線環境部環境資料開放平臺失敗:{exc}") from exc

    if resp.status_code >= 400:
        # 常見錯誤是 DataID 打錯或帶錯 api_key,把上游訊息原封不動帶回去,方便判斷。
        raise ToolError(
            f"環境部環境資料開放平臺回傳錯誤(HTTP {resp.status_code}):{resp.text[:500]}"
            f"——DataID「{data_id}」如果是猜的或記錯的,請先到 {config.MOENV_DATASET_CATALOG_URL} "
            "網頁上確認正確的資料代號。"
        )

    try:
        return resp.json()
    except ValueError as exc:
        raise ToolError(f"環境部環境資料開放平臺回傳非 JSON 內容:{resp.text[:500]}") from exc

"""勞動部開放資料 API(OdService)的薄 wrapper。

CKAN 風格的四層結構:
    group(分類群組) ─┐
    tag(標籤)       ─┼─> dataset(資料集詮釋資料) ─> datastore(實際資料列)

全部端點都不需要認證,細節見官方「API Service 開發指引」:
https://apiservice.mol.gov.tw/OdService/doc/API%20Service%20開發指引.pdf
"""
from __future__ import annotations

from typing import Any

import httpx
from mcp.server.mcpserver.exceptions import ToolError

from .. import config


async def _get(path: str, params: dict[str, Any] | None = None) -> Any:
    url = f"{config.MOL_BASE_URL}{path}"
    query = {k: v for k, v in (params or {}).items() if v is not None}

    async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS) as client:
        try:
            resp = await client.get(url, params=query)
        except httpx.RequestError as exc:
            raise ToolError(f"連線勞動部開放資料平臺失敗:{exc}") from exc

    if resp.status_code >= 400:
        raise ToolError(f"勞動部開放資料平臺回傳錯誤(HTTP {resp.status_code}):{resp.text[:500]}")

    try:
        return resp.json()
    except ValueError as exc:
        raise ToolError(f"勞動部開放資料平臺回傳非 JSON 內容:{resp.text[:500]}") from exc


async def list_categories(limit: int = 100, offset: int = 0) -> Any:
    return await _get("/rest/group", {"limit": limit, "offset": offset})


async def list_category_datasets(category_code: str) -> Any:
    return await _get(f"/rest/group/{category_code}")


async def list_tags(limit: int = 100, offset: int = 0) -> Any:
    return await _get("/rest/tag", {"limit": limit, "offset": offset})


async def list_tag_datasets(tag_name: str, limit: int = 100, offset: int = 0) -> Any:
    return await _get(f"/rest/tag/{tag_name}", {"limit": limit, "offset": offset})


async def list_datasets(modified: str | None = None, limit: int = 100, offset: int = 0) -> Any:
    return await _get("/rest/dataset", {"modified": modified, "limit": limit, "offset": offset})


async def get_dataset_metadata(dataset_id: str) -> Any:
    return await _get(f"/rest/dataset/{dataset_id}")


async def get_dataset_records(resource_id: str, limit: int = 100, offset: int = 0) -> Any:
    return await _get(f"/rest/datastore/{resource_id}", {"limit": limit, "offset": offset})

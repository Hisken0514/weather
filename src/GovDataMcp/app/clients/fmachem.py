"""經濟部產業發展署「工廠危險物品查詢網站」(sdd.nat.gov.tw/fmachem)的薄 wrapper。

這個網站是前端 SPA,實測掛瀏覽器看 network 之後發現分成兩塊完全不同性質的資料:

1. 化學品清單(CAS No./中英文名稱/法規編號):有乾淨的公開 JSON API
   ``GET /fmachem/api/HazardousMaterials/getHazardousMaterials``,免金鑰免參數,
   一次回傳全部約 9,455 筆,不會過期(隨時查都是最新的)。這裡直接即時打這支 API,
   不快取——資料量不大(反正一次就是全部),快取的意義不大。

2. 法規分級管制量(法規編號 → 管制量幾公斤/公升):**沒有對應的 API**——前端是把整張表
   編譯進一支雜湊檔名會變的 JS chunk(如 laws-BCwHLeH_.js)裡,在瀏覽器端用 JS 直接
   算,不是後端算的。這張表對應的是「公共危險物品及可燃性高壓氣體設置標準暨安全管理
   辦法」的分級管制量,是法規本文,不常修改,所以這裡改用一份手動萃取、隨程式碼一起
   發布的靜態快照(見 app/data/fmachem_thresholds.json),不即時爬那支容易随改版壞掉
   的 JS chunk。快照多久沒更新、要不要重新核對,見該檔案裡的 source_note。
"""
from __future__ import annotations

import json
from importlib import resources
from typing import Any

import httpx
from mcp.server.mcpserver.exceptions import ToolError

from .. import config

BASE = "https://sdd.nat.gov.tw/fmachem"
CHEMICALS_ENDPOINT = f"{BASE}/api/HazardousMaterials/getHazardousMaterials"


def _load_thresholds_snapshot() -> dict[str, Any]:
    with resources.files("app.data").joinpath("fmachem_thresholds.json").open("r", encoding="utf-8") as f:
        return json.load(f)


# Process 啟動時載入一次就好——是隨程式碼發布的靜態檔案,不會在執行期間變動。
_THRESHOLDS_SNAPSHOT = _load_thresholds_snapshot()


async def search_chemicals(query: str, by: str = "cas") -> list[dict[str, Any]]:
    if by not in ("cas", "name"):
        raise ToolError('by 參數只能是 "cas"(比對 CAS No.)或 "name"(比對中英文名稱)')

    async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS) as client:
        try:
            resp = await client.get(CHEMICALS_ENDPOINT)
        except httpx.RequestError as exc:
            raise ToolError(f"連線工廠危險物品查詢網站失敗:{exc}") from exc

    if resp.status_code >= 400:
        raise ToolError(f"工廠危險物品查詢網站回傳錯誤(HTTP {resp.status_code}):{resp.text[:500]}")

    try:
        payload = resp.json()
    except ValueError as exc:
        raise ToolError(f"工廠危險物品查詢網站回傳非 JSON 內容:{resp.text[:500]}") from exc

    if payload.get("status") != "success":
        raise ToolError(f"工廠危險物品查詢網站回應非成功狀態:{payload}")

    rows = payload.get("data") or []
    needle = query.strip().lower()
    if not needle:
        raise ToolError("query 不能是空字串")

    if by == "cas":
        matches = [r for r in rows if needle in str(r.get("CAS NO", "")).lower()]
    else:
        matches = [
            r
            for r in rows
            if needle in str(r.get("中文名稱", "")).lower() or needle in str(r.get("英文名稱", "")).lower()
        ]

    return [
        {
            "cas_no": r.get("CAS NO"),
            "name_zh": r.get("中文名稱"),
            "name_en": r.get("英文名稱"),
            "category_no": r.get("法規編號"),
        }
        for r in matches
    ]


def get_threshold(category_no: str) -> dict[str, Any]:
    needle = category_no.strip()
    for entry in _THRESHOLDS_SNAPSHOT["entries"]:
        if needle in entry["codes"]:
            return {
                "category_no": needle,
                "law_category": entry["law_category"],
                "note": entry["note"],
                "detail": entry["detail"],
                "threshold": entry["threshold"],
                "threshold_unit_hint": "數字型別的 threshold 一律是公斤或公升,字串型別的(如第七類氣體)已內含單位說明",
                "snapshot_date": _THRESHOLDS_SNAPSHOT["snapshot_date"],
            }

    known = sorted({c for entry in _THRESHOLDS_SNAPSHOT["entries"] for c in entry["codes"]})
    raise ToolError(
        f"法規編號「{category_no}」不在已知的分級管制量清單裡。已知的編號有:{', '.join(known)}"
        "——請確認是從 fmachem_search_chemical 拿到的正確 category_no,不要自己臆測。"
    )

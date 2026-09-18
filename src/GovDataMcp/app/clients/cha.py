"""化學物質管理署(CHA,環境部)「毒性及關注化學物質快速查詢」的薄 wrapper。

https://www.cha.gov.tw/sp-toch-list-1.html 頁面本身是 ASP.NET WebForms(有
__VIEWSTATE 的 POST 表單),但實測發現分類篩選跟關鍵字搜尋其實都吃乾淨的 GET
query string(?query=...&type=...),不需要處理 ViewState/POST——這裡就是照這個
GET 介面打的。免金鑰、免註冊,回應是 server-rendered HTML,用 BeautifulSoup 解析。
"""
from __future__ import annotations

from typing import Any
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup
from mcp.server.mcpserver.exceptions import ToolError

from .. import config

BASE = "https://www.cha.gov.tw"
SEARCH_PATH = "/sp-toch-list-1.html"

VALID_CATEGORIES = {"all", "1", "2", "3", "4", "attention"}


async def _get_html(path: str, params: dict[str, Any] | None = None) -> str:
    url = urljoin(BASE, path)
    async with httpx.AsyncClient(timeout=config.HTTP_TIMEOUT_SECONDS, follow_redirects=True) as client:
        try:
            resp = await client.get(url, params=params)
        except httpx.RequestError as exc:
            raise ToolError(f"連線化學物質管理署網站失敗:{exc}") from exc

    if resp.status_code >= 400:
        raise ToolError(f"化學物質管理署網站回傳錯誤(HTTP {resp.status_code})")

    return resp.text


def _text(el) -> str | None:
    return el.get_text(strip=True) if el is not None else None


async def search_chemicals(query: str, category: str = "all") -> list[dict[str, Any]]:
    if category not in VALID_CATEGORIES:
        raise ToolError(
            f"category 參數「{category}」不合法,只能是 {sorted(VALID_CATEGORIES)} 其中之一"
            "(all=全部,1~4=第一類~第四類毒化物,attention=關注化學物質)"
        )

    html = await _get_html(SEARCH_PATH, {"query": query, "type": category})
    soup = BeautifulSoup(html, "html.parser")

    results = []
    for block in soup.select("div.poison_list"):
        link = block.find("a")
        if link is None:
            continue
        serial_el = block.select_one(".serial_number em")
        results.append(
            {
                "listed_no": _text(serial_el),
                "cas_no": _text(block.select_one(".cas")),
                "name_zh": _text(block.select_one(".name_ch")),
                "name_en": _text(block.select_one(".name_en")),
                # 交給 get_chemical_detail 用,不用自己拼 URL。
                "detail_path": link.get("href"),
            }
        )
    return results


async def get_chemical_detail(detail_path: str) -> dict[str, Any]:
    html = await _get_html(detail_path)
    soup = BeautifulSoup(html, "html.parser")

    title = soup.select_one("h2.poison_h1")
    name_en = _text(title.find("span")) if title else None
    name_zh = None
    if title is not None:
        name_zh = title.get_text(strip=True)
        if name_en:
            name_zh = name_zh.replace(name_en, "").strip()

    fields: dict[str, Any] = {}
    for row in soup.select("table tr"):
        label_el, value_el = row.find("th"), row.find("td")
        if label_el is None or value_el is None:
            continue

        label = label_el.get_text(" ", strip=True)
        label_en_el = label_el.find("span")
        if label_en_el is not None:
            label = label.replace(label_en_el.get_text(strip=True), "").strip()

        # 有些欄位(如毒性分類、管制濃度)底下夾了一段點開才顯示的說明文字,
        # 拆成獨立的 note,不要混進主要數值裡。
        note = None
        note_el = value_el.find("div", class_="manage_explain")
        if note_el is not None:
            content_el = note_el.find("div", class_="manage_explain_content")
            note = _text(content_el)
            note_el.extract()

        value = value_el.get_text(" ", strip=True)
        fields[label] = {"value": value, "note": note} if note else value

    attachments = {
        a.get_text(strip=True): a.get("href")
        for a in soup.select(".poison_download li a")
        if a.get_text(strip=True) and a.get("href")
    }

    return {"name_zh": name_zh, "name_en": name_en, "fields": fields, "attachments": attachments}

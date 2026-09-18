"""政府開放資料 MCP Server。

把勞動部、環境部兩個免費的政府開放資料 API 包裝成 MCP tools,給 ISHAAudit 的 AI 助理
(AgentService)當工具用。

架構背景:
- 兩個上游 API 對「使用這個 wrapper 的人」來說都不需要另外認證:勞動部本身完全免金鑰;
  環境部要帶 api_key,但金鑰只存在這個 server 自己的環境變數(MOENV_API_KEY)裡,呼叫端
  (ISHAAudit 主系統 / LLM)完全不會碰到金鑰本身。
- 對外用 Streamable HTTP transport,搭配 ISHAAudit 主系統的 AgentMcpEndpoint
  (McpAuthType.None)直接連,不需要在主系統那邊做任何 OAuth/API Key 設定。
- 用官方 MCP Python SDK 2.x(mcp.server.mcpserver.MCPServer——1.x 版叫 FastMCP,
  2.x 改名,詳見 SDK 的 migration guide)。

部署方式見同目錄下的 README.md / Dockerfile。
"""
from __future__ import annotations

import logging
from typing import Annotated, Any

from mcp.server.mcpserver import MCPServer
from pydantic import Field

from . import config
from .clients import cha, fmachem, mol, moenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("govdata-mcp")


def _wrap(data: Any) -> dict[str, Any]:
    """統一包成 {"result": ...} 再回傳。

    上游這兩個平臺的 JSON 有的是陣列(如 /rest/group 直接回傳分類代碼陣列),有的是物件。
    MCP SDK 對「工具回傳型別是 list/Any 而實際值是 list」的情況,預設會把每個元素各拆成
    一個獨立的 content block(而不是一個 JSON 陣列字串),LLM 端會收到一堆破碎的片段。
    一律包一層 dict,型別固定是 object,就不會被拆,呼叫端每次都拿到單一、完整的 JSON。
    """
    return {"result": data}


mcp = MCPServer(
    name="gov-data-mcp",
    title="台灣政府開放資料查詢",
    instructions=(
        "提供勞動部、環境部兩個政府開放資料平臺的查詢工具,工具名稱分別以 mol_ / moenv_ 開頭。\n\n"
        "勞動部(mol_*):資料集結構是「分類/標籤 → 資料集詮釋資料 → 實際資料列」三層,"
        "一般流程是先用 mol_list_tag_datasets 或 mol_list_category_datasets 找到相關資料集的"
        "識別碼,再用 mol_get_dataset_metadata 拿到實際資料的 resourceId,最後用"
        "mol_get_dataset_records 取得資料列。\n\n"
        "環境部(moenv_*):只有一個「依資料代號(DataID)查資料」的工具"
        "(moenv_get_dataset_records)。這個平臺沒有可靠的關鍵字搜尋 API,DataID 要請使用者"
        "先到 https://data.moenv.gov.tw/dataset 網頁上人工查出,不要自己臆測或編造 DataID。\n\n"
        "化學物質管理署(cha_*):查特定化學品是否為列管毒性化學物質/關注化學物質,先用"
        "cha_search_chemicals 用名稱、CAS No.、列管編號等關鍵字搜尋,再用 cha_get_chemical_detail"
        "(帶搜尋結果裡的 detail_path)拿完整資訊(毒性分類、管制濃度、分級運作量、禁止事項等)。\n\n"
        "工廠危險物品查詢網站(fmachem_*):判斷某化學品屬於哪個公共危險物品/可燃性高壓氣體分級、"
        "以及達到多少量要申報。流程是先用 fmachem_search_chemical(CAS No. 或名稱)查出"
        "category_no(法規編號),再用 fmachem_get_threshold(category_no) 查該分級的管制量。"
        "fmachem_get_threshold 的管制量資料是靜態快照(法規本文,不常變動),不是即時查詢。"
    ),
)


# ── 勞動部:政府開放資料整合及作業管理系統(OdService),全部端點免金鑰 ──────────

@mcp.tool()
async def mol_list_categories(
    limit: Annotated[int, Field(description="最多回傳幾筆分類,預設 100", ge=1, le=1000)] = 100,
    offset: Annotated[int, Field(description="從第幾筆開始回傳,用來分頁,預設 0", ge=0)] = 0,
) -> dict[str, Any]:
    """取得勞動部開放資料平臺的分類群組清單(categoryCode),用來瀏覽平臺有哪些資料分類。"""
    return _wrap(await mol.list_categories(limit=limit, offset=offset))


@mcp.tool()
async def mol_list_category_datasets(
    category_code: Annotated[str, Field(description="分類編號,從 mol_list_categories 取得")],
) -> dict[str, Any]:
    """取得某個分類底下所有資料集的識別碼(datasetId)清單。"""
    return _wrap(await mol.list_category_datasets(category_code))


@mcp.tool()
async def mol_list_tags(
    limit: Annotated[int, Field(description="最多回傳幾筆標籤,預設 100", ge=1, le=1000)] = 100,
    offset: Annotated[int, Field(description="從第幾筆開始回傳,預設 0", ge=0)] = 0,
) -> dict[str, Any]:
    """取得勞動部開放資料平臺的標籤(關鍵字)清單,例如「職業災害」——可以拿標籤去
    mol_list_tag_datasets 查相關資料集。"""
    return _wrap(await mol.list_tags(limit=limit, offset=offset))


@mcp.tool()
async def mol_list_tag_datasets(
    tag_name: Annotated[str, Field(description="標籤名稱,例如「職業災害」,可從 mol_list_tags 取得")],
    limit: Annotated[int, Field(description="最多回傳幾筆,預設 100", ge=1, le=1000)] = 100,
    offset: Annotated[int, Field(description="從第幾筆開始回傳,預設 0", ge=0)] = 0,
) -> dict[str, Any]:
    """依標籤(關鍵字)查詢相關資料集的識別碼清單——找特定主題資料最快的方式,
    例如查「職業災害」相關的所有資料集。"""
    return _wrap(await mol.list_tag_datasets(tag_name, limit=limit, offset=offset))


@mcp.tool()
async def mol_list_datasets(
    modified_since: Annotated[
        str | None,
        Field(description="只回傳這個時間之後更新過的資料集,格式 yyyy-MM-dd HH:mm:ss,留空回傳全部"),
    ] = None,
    limit: Annotated[int, Field(description="最多回傳幾筆,預設 100", ge=1, le=1000)] = 100,
    offset: Annotated[int, Field(description="從第幾筆開始回傳,預設 0", ge=0)] = 0,
) -> dict[str, Any]:
    """取得勞動部開放資料平臺全部資料集的識別碼清單。資料量大,建議搭配分類或標籤先縮小範圍
    (見 mol_list_category_datasets / mol_list_tag_datasets),不要每次都整包撈。"""
    return _wrap(await mol.list_datasets(modified=modified_since, limit=limit, offset=offset))


@mcp.tool()
async def mol_get_dataset_metadata(
    dataset_id: Annotated[str, Field(description="資料集識別碼(datasetId)")],
) -> dict[str, Any]:
    """取得某個資料集的詮釋資料(標題、說明、欄位定義、資料資源編號 resourceId 等)——
    要實際撈資料列前,通常要先呼叫這個拿到 resourceId,再交給 mol_get_dataset_records。"""
    return _wrap(await mol.get_dataset_metadata(dataset_id))


@mcp.tool()
async def mol_get_dataset_records(
    resource_id: Annotated[str, Field(description="資料資源編號(resourceId),從 mol_get_dataset_metadata 取得")],
    limit: Annotated[int, Field(description="最多回傳幾筆資料列,預設 100", ge=1, le=5000)] = 100,
    offset: Annotated[int, Field(description="從第幾筆開始回傳,用來分頁,預設 0", ge=0)] = 0,
) -> dict[str, Any]:
    """取得資料集的實際資料內容(資料列)。"""
    return _wrap(await mol.get_dataset_records(resource_id, limit=limit, offset=offset))


# ── 環境部:環境資料開放平臺,需要 api_key(server 端環境變數,呼叫端不會碰到) ──────

@mcp.tool()
async def moenv_get_dataset_records(
    data_id: Annotated[
        str,
        Field(
            description=(
                "資料代號(DataID)。只能用使用者親口提供、或先前工具呼叫結果裡真的出現過的值——"
                "絕對不要自己編造或用「看起來像」的代號去猜(例如猜 TOX_P_01 這種),猜錯只會拿到"
                "查無資料的錯誤。手上沒有真正的 DataID 時,請使用者去"
                "https://data.moenv.gov.tw/dataset 網頁人工查出來再提供。"
            )
        ),
    ],
    limit: Annotated[int, Field(description="最多回傳幾筆,預設 100", ge=1, le=5000)] = 100,
    offset: Annotated[int, Field(description="從第幾筆開始回傳,用來分頁,預設 0", ge=0)] = 0,
    year_month: Annotated[
        str | None,
        Field(description="查歷史資料用,格式 yyyy_mm(例如 2024_01);留空則回傳最新資料"),
    ] = None,
    sort: Annotated[
        str | None,
        Field(description="排序,格式「欄位名 asc」或「欄位名 desc」,例如「ImportDate desc」;留空不排序"),
    ] = None,
) -> dict[str, Any]:
    """依「已知的」資料代號(DataID)取得環境部環境資料開放平臺的實際資料內容(例如空氣品質
    監測站即時數據)。這個平臺沒有公開的關鍵字搜尋 API,絕對不要自己編造或猜測 DataID 去
    呼叫這個工具——猜錯只會拿到「查無資料」的錯誤,對使用者沒有幫助。手上沒有真正的
    DataID 時,請使用者去 https://data.moenv.gov.tw/dataset 網頁人工搜尋確認正確代號,
    自己不要用這個工具亂試。

    問的是特定化學品是否為列管毒性化學物質、CAS No.、管制濃度等資訊,請改用 cha_search_chemicals
    / cha_get_chemical_detail——那才是正確、真的能查到資料的工具,不要用這個工具猜 DataID。"""
    return _wrap(await moenv.get_dataset_records(data_id, limit=limit, offset=offset, year_month=year_month, sort=sort))


# ── 化學物質管理署(CHA,環境部):毒性及關注化學物質快速查詢,免金鑰 ─────────────

@mcp.tool()
async def cha_search_chemicals(
    query: Annotated[str, Field(description="關鍵字,可以是列管編號、中文名稱、英文名稱、CAS No. 或別名/俗稱")],
    category: Annotated[
        str,
        Field(description='分類篩選:"all"(全部,預設)、"1"~"4"(第一類~第四類毒化物)、"attention"(關注化學物質)'),
    ] = "all",
) -> dict[str, Any]:
    """搜尋是否為列管毒性化學物質或關注化學物質。結果裡的 detail_path 要交給
    cha_get_chemical_detail 才能拿到毒性分類、管制濃度、分級運作量等完整資訊——
    這個工具本身只回傳搜尋結果的簡要清單。"""
    return _wrap(await cha.search_chemicals(query, category=category))


@mcp.tool()
async def cha_get_chemical_detail(
    detail_path: Annotated[str, Field(description="從 cha_search_chemicals 搜尋結果裡取得的 detail_path,直接帶進來")],
) -> dict[str, Any]:
    """取得化學物質的完整法規列管資訊:毒性分類、CAS No.、分子式、管制濃度、
    分級運作量(公斤)、許可用途、禁止運作事項、UN No.、LD50/LC50、是否為持久性
    有機污染物,以及安全資料表(SDS)等附件連結。"""
    return _wrap(await cha.get_chemical_detail(detail_path))


# ── 工廠危險物品查詢網站(經濟部產業發展署):化學品清單即時查,分級管制量走靜態快照 ──

@mcp.tool()
async def fmachem_search_chemical(
    query: Annotated[str, Field(description="要查詢的內容")],
    by: Annotated[str, Field(description='比對方式:"cas"(比對 CAS No.,預設)或 "name"(比對中英文名稱)')] = "cas",
) -> dict[str, Any]:
    """在工廠危險物品查詢網站的化學品清單(約 9,455 筆)裡搜尋,拿到 category_no
    (法規編號)後,交給 fmachem_get_threshold 查該分級對應的公共危險物品/可燃性
    高壓氣體管制量。同一個 CAS No. 可能對應到多筆不同商品名稱的紀錄,都會列出來。"""
    return _wrap(await fmachem.search_chemicals(query, by=by))


@mcp.tool()
def fmachem_get_threshold(
    category_no: Annotated[str, Field(description="法規編號,從 fmachem_search_chemical 結果裡的 category_no 取得")],
) -> dict[str, Any]:
    """依法規編號查公共危險物品/可燃性高壓氣體的分級管制量(達到多少公斤或公升要
    申報)。這份資料是隨程式碼發布的靜態快照(法規本文,不常修改),不是即時查詢——
    法規編號一定要是 fmachem_search_chemical 查出來的,不要自己臆測。"""
    return _wrap(fmachem.get_threshold(category_no))


def main() -> None:
    logger.info(
        "啟動 gov-data-mcp:host=%s port=%s MOENV_API_KEY=%s",
        config.MCP_HOST,
        config.MCP_PORT,
        "已設定" if config.MOENV_API_KEY else "未設定(moenv_* 工具會回傳清楚的錯誤訊息,不影響 mol_* 工具)",
    )
    mcp.run(
        transport="streamable-http",
        host=config.MCP_HOST,
        port=config.MCP_PORT,
        stateless_http=True,
    )


if __name__ == "__main__":
    main()

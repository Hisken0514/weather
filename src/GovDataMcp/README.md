# GovDataMcp

把台灣**勞動部**、**環境部**、**化學物質管理署**、**經濟部產業發展署(工廠危險物品查詢)**
四個免費的政府資料來源包裝成 MCP tools,用 Streamable HTTP 對外,給 ISHAAudit 主系統的
AI 助理(AgentService)當工具用。跟主系統的 .NET solution 脫鉤,獨立打包成 Docker
image、內網呼叫。

## 為什麼要包這一層

兩個上游 API 本身都免費(細節見下面),但:
- 環境部那個要帶 `api_key` 才能查資料,這個 wrapper 把金鑰收在自己的環境變數裡,
  ISHAAudit 主系統跟 LLM 都不會碰到金鑰本身,設定上等於「免認證」的 MCP endpoint。
- 兩個平臺回傳的原始 JSON 有陣列也有物件,直接透傳給 MCP 用預設轉換規則,陣列會被拆成
  一堆破碎的 content block(見 `app/server.py` 的 `_wrap` 說明)——這裡統一包成
  `{"result": ...}`,呼叫端每次都拿到單一、完整的 JSON。

## 兩個上游 API 是否免費(2026-09 確認過)

**勞動部 `apiservice.mol.gov.tw`**——完全免費,不需要任何金鑰或註冊。官方
[API Service 開發指引](https://apiservice.mol.gov.tw/OdService/doc/API%20Service%20開發指引.pdf)
所有範例都是純 GET,沒有 api_key 參數,OpenAPI spec 也沒有定義任何 security scheme。

**環境部 `data.moenv.gov.tw`**——免費,但查資料一定要帶 `api_key`(沒帶會直接 500)。
[API 介接服務條款](https://data.moenv.gov.tw/api-term):
- 未註冊:300 次/日
- 免費註冊會員(效期一年的 API 金鑰):5,000 次/日

化學物質管理署(毒性化學物質相關資料)是掛在這個平臺上的資料提供單位之一,不是獨立系統。
到 https://data.moenv.gov.tw/api-term 免費註冊即可拿到金鑰。

## 提供的工具

### 勞動部(`mol_*`,免金鑰)

CKAN 風格,四層結構:`group`(分類)/ `tag`(標籤)→ `dataset`(詮釋資料)→
`datastore`(實際資料列)。

| 工具 | 用途 |
|---|---|
| `mol_list_categories` | 列出分類群組(categoryCode) |
| `mol_list_category_datasets` | 依分類取得資料集識別碼清單 |
| `mol_list_tags` | 列出標籤(關鍵字)清單 |
| `mol_list_tag_datasets` | 依標籤(關鍵字,如「職業災害」)取得資料集識別碼清單 |
| `mol_list_datasets` | 取得全部資料集識別碼清單(可用 `modified_since` 篩最近更新) |
| `mol_get_dataset_metadata` | 取得資料集詮釋資料(含 `resourceId`) |
| `mol_get_dataset_records` | 依 `resourceId` 取得實際資料列 |

典型流程:`mol_list_tag_datasets("職業災害")` → 拿到 `datasetId` → `mol_get_dataset_metadata`
→ 拿到 `resourceId` → `mol_get_dataset_records`。

### 環境部(`moenv_*`,需要 `MOENV_API_KEY`)

| 工具 | 用途 |
|---|---|
| `moenv_get_dataset_records` | 依資料代號(DataID)取得實際資料內容 |

⚠️ 這個平臺**沒有**公開、穩定的關鍵字搜尋 API(官方文件跟實際探測都沒找到——`/dataset`
頁面是前端 SPA,真正的搜尋邏輯沒有可靠的公開端點)。DataID 要先到
https://data.moenv.gov.tw/dataset 網頁上人工搜尋確認,`instructions` 裡也提醒了 LLM
不要自己臆測 DataID。

### 化學物質管理署(`cha_*`,免金鑰)

「毒性及關注化學物質快速查詢」(`www.cha.gov.tw`)。頁面本身是 ASP.NET WebForms,但
實測發現搜尋跟分類篩選其實吃乾淨的 GET query string(`?query=...&type=...`),不用管
頁面上那個 `__VIEWSTATE` 表單——結果是 server-rendered HTML,用 BeautifulSoup 解析。

| 工具 | 用途 |
|---|---|
| `cha_search_chemicals` | 用名稱/CAS No./列管編號等關鍵字搜尋,可用 `category` 篩第一~四類毒化物或關注化學物質 |
| `cha_get_chemical_detail` | 取得完整資訊:毒性分類、管制濃度、分級運作量(公斤)、禁止事項、UN No.、LD50/LC50、POPs、SDS 等附件連結 |

典型流程:`cha_search_chemicals("多氯聯苯")` → 拿到 `detail_path` → `cha_get_chemical_detail`。

### 工廠危險物品查詢網站(`fmachem_*`,免金鑰)

`sdd.nat.gov.tw/fmachem`,經濟部產業發展署委辦、工研院製作。這個網站是前端 SPA,實測
掛瀏覽器看 network 之後拆成兩塊完全不同性質的資料:

| 工具 | 資料來源 | 用途 |
|---|---|---|
| `fmachem_search_chemical` | 即時 API(`/api/HazardousMaterials/getHazardousMaterials`,約 9,455 筆) | 用 CAS No. 或名稱查化學品對應的法規編號(`category_no`) |
| `fmachem_get_threshold` | 靜態快照(`app/data/fmachem_thresholds.json`) | 依法規編號查公共危險物品/可燃性高壓氣體的分級管制量(達到多少公斤/公升要申報) |

`fmachem_search_chemical` 打的是網站真正的公開 JSON API,沒有金鑰、沒有過期問題,即時查。
`fmachem_get_threshold` 不一樣——前端把管制量對照表整包編譯進一支**雜湊檔名會變的 JS
chunk**(如 `laws-BCwHLeH_.js`),在瀏覽器端用 JS 直接算,沒有對應的後端 API。這張表
對應的是「公共危險物品及可燃性高壓氣體設置標準暨安全管理辦法」的分級管制量,是法規本文
不常修改,所以改用一份手動萃取、隨程式碼一起發布的靜態快照,不即時爬那支容易隨改版壞掉
的 JS chunk。快照日期跟來源說明都寫在 `fmachem_thresholds.json` 裡,懷疑過期時可以到
`sdd.nat.gov.tw/fmachem` 網站走一次「多筆查詢」流程人工核對。

典型流程:`fmachem_search_chemical("1336-36-3")` → 拿到 `category_no`(如 `4-5-1`)→
`fmachem_get_threshold("4-5-1")`。

## 本機執行

```bash
pip install -r requirements.txt
python3 -m app.server
```

預設監聽 `0.0.0.0:8000`,MCP endpoint 在 `http://localhost:8000/mcp`。

環境部工具要能用,先設定 `MOENV_API_KEY`:

```bash
export MOENV_API_KEY=你的金鑰
python3 -m app.server
```

## 打包成 Docker image

```bash
docker build -t govdata-mcp .
docker run -p 8000:8000 --env-file .env govdata-mcp
```

`.env` 從 `.env.example` 複製,至少要有(或留空,`moenv_*` 工具會回傳清楚的錯誤訊息,
`mol_*` 系列不受影響):

```
MOENV_API_KEY=你的金鑰
```

## 接上 ISHAAudit 主系統

到系統設定的「MCP 連線設定」頁面新增 endpoint:

- **Endpoint**:`http://<這個容器的內網 host>:8000/mcp`(例如 `http://govdata-mcp:8000/mcp`,
  視內網 DNS/docker network 而定)
- **認證方式**:`None`——這個 wrapper 對外不需要認證,環境部的金鑰是它自己內部處理的

不需要走 OAuth 連接流程,新增完直接「同步工具」就能用。

## 環境變數

| 變數 | 預設值 | 說明 |
|---|---|---|
| `MCP_HOST` | `0.0.0.0` | 監聽位址 |
| `MCP_PORT` | `8000` | 監聽埠 |
| `HTTP_TIMEOUT_SECONDS` | `15` | 呼叫上游 API 的逾時秒數 |
| `MOL_BASE_URL` | `https://apiservice.mol.gov.tw/OdService` | 勞動部 API base URL |
| `MOENV_BASE_URL` | `https://data.moenv.gov.tw/api/v2` | 環境部 API base URL |
| `MOENV_API_KEY` | (空)| 環境部 API 金鑰,見上面「是否免費」章節 |

## 已知限制

- 環境部沒有搜尋 API,只能查已知 DataID——見上面說明。
- `cha_*` 是解析 server-rendered HTML(不是正規 API),對方改版面結構的話解析邏輯要跟著
  調整;目前鎖定的是 `.poison_list`/`table tr th/td` 這些穩定的語意化 class/標籤,不是
  容易跳動的樣式 class,相對耐改版。
- `fmachem_get_threshold` 是靜態快照,不是即時查詢——法規本文不常修改,但如果
  「公共危險物品及可燃性高壓氣體設置標準暨安全管理辦法」真的修法,快照就會過期。發現
  對不上時,重新萃取 `app/data/fmachem_thresholds.json`(手動到官網核對,或重新抓
  `sdd.nat.gov.tw/fmachem` 目前的 `laws-*.js` chunk 解析)。
- 勞動部/環境部這兩個網域的 TLS 憑證鏈,在部分較舊或設定特殊的網路環境下可能遇到憑證驗證
  問題;本機開發過的 Python 版本 + `python:3.12-slim` Docker image 都已經直接對真實端點
  測過(含完整 tag → dataset → records 呼叫鏈),正常。如果在某個內網環境遇到 TLS 相關
  錯誤,通常是該網路本身的憑證/攔截設定問題,不是這個服務的 bug。

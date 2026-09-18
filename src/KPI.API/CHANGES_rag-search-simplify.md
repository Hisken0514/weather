# 修改紀錄 — RAG 檢索簡化 + 標明來源工廠

## 背景
跟 ISHAAudit 的語意搜尋(`semantic-search-suggestions`)比較後，KPI 這邊的 `search_documents`
原本是「向量搜尋 + pg_trgm 關鍵字比對 + RRF 合併排序」的混合檢索，比 ISHAAudit 單純的向量
cosine KNN 多一趟關鍵字 SQL、多一次 C# 端排序合併，每次查詢的額外開銷是造成兩邊速度感受
不同的原因之一。

另外使用者反應：向量索引裡每個 chunk 其實已經有 `organization_id`（工廠），只是查詢結果沒有
把這個資訊秀出來給 LLM 看。

## 修改內容

### 1. `search_documents` 改回純向量搜尋
檔案：[`AgentDocumentTools.cs`](WebAPI1/Services/AgentDocumentTools.cs)

- `SearchDocumentsAsync` 改呼叫 `_vectorStore.SearchChunksAsync`（純 cosine KNN），
  不再呼叫 `HybridSearchChunksAsync`
- 拿掉的 `HybridSearchChunksAsync` 已確認專案內沒有其他呼叫端，一併從
  [`AgentVectorStoreService.cs`](WebAPI1/Services/AgentVectorStoreService.cs) 的介面與實作中移除，
  不留死代碼
- 影響：拿掉 pg_trgm 關鍵字比對這條路徑，中文專有名詞/編號查不準時要靠使用者換關鍵字重查，
  不再由檢索邏輯自動補償——這是拿準確度換取查詢速度

### 2. 搜尋結果標明來源工廠
同一個檔案的 `SearchDocumentsAsync`：

- 原本只查 `AgentDocuments.FileName`，現在一併 join `Organization.Name`
- 每筆結果從 `[documentId=X 來源:檔名 位置]` 改成 `[documentId=X 工廠:XX廠 來源:檔名 位置]`
- 沒有 `OrganizationId`（公版文件）的顯示「公版文件」
- 對齊 ISHAAudit 的 `semantic-search-suggestions` 本來就會回傳 `organizationName` 的做法

### 3. 工具說明文字同步更新
`search_documents` 的 tool description 從「混合檢索（語意搜尋+關鍵字比對）」改成
「語意向量搜尋，每筆結果會標明來源工廠」，讓 LLM 知道現在的行為跟拿到的欄位。

## 沒有做的部分
- 沒有把資料存取層從 raw Npgsql SQL 改寫成 EF Core LINQ（`Pgvector.EntityFrameworkCore`）。
  KPI 主要的 `ISHAuditDbcontext` 是接 SQL Server，向量庫是完全獨立的 Postgres
  （`ConnectionStrings:AgentVectorDatabase`），要改用 EF Core 存取向量表需要新增一個
  獨立的 Npgsql DbContext，是比較大的架構改動，目前沒有實際的效能/正確性問題要靠這個解決，
  先不做。
- 沒有依工廠對搜尋結果排序加權（例如「呼叫者自己工廠的結果優先排前面」），目前純粹照
  cosine 距離排序，只是多顯示工廠名稱讓 LLM 自己判斷要不要引用。

## 是否需要重新索引
不需要。這個修改只動到查詢時的檢索方式跟結果格式化，沒有改變 chunk 切分、embedding 計算、
或寫入 pgvector 的方式，既有向量資料原封不動可以直接查。

## 建置驗證
`dotnet build WebAPI1/WebAPI1.csproj` 通過，0 error（僅既有的 nullable 警告，跟本次修改無關）。

## 4. 補上單元測試
`SearchDocumentsAsync` 本身直接依賴 `DbContext`/`IAgentVectorStoreService`/`IAgentEmbeddingService`，
專案沒有裝 Moq 或 EF InMemory provider，沒辦法照專案既有慣例直接測。做法是把「怎麼把一筆
搜尋結果格式化成給 LLM 看的文字行」抽成一個不碰 DB/HTTP 的 `internal static` 純函式
`AgentDocumentTools.FormatSearchResultLine`（見 [`AgentDocumentTools.cs`](WebAPI1/Services/AgentDocumentTools.cs)），
再照 `AgentDocumentIndicatorChunkingTests.cs` 的既有風格寫測試：

檔案：[`AgentDocumentToolsSearchFormattingTests.cs`](WebAPI1.Tests/Services/AgentDocumentToolsSearchFormattingTests.cs)

鎖住的行為：
- 有工廠名稱時要顯示工廠名
- `organizationName` 是 `null`（公版文件）時要顯示「公版文件」，不能是空字串或 null
- 有 `SourceSheet`（Excel 來源）時優先顯示工作表名稱，不顯示頁碼
- 沒有頁碼也沒有工作表時，位置欄位留空
- chunk 內容剛好等於截斷上限（700 字）不截斷；超過上限要截斷並加註記，且截斷後不能包含完整原文

`dotnet test WebAPI1.Tests/WebAPI1.Tests.csproj` 全部 49 個測試通過（含這次新增的 6 個）。

## 修改歷程備註
這個修改先前被使用者手動 undo 過一次（改回 hybrid search、刪掉測試檔跟這份 changelog），
後來又要求重新套用回來看效果——這份檔案是重新套用後的版本，內容跟第一次做的時候相同。

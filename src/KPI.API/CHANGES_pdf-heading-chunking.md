# 修改紀錄 — PDF chunk 切法改用章節標題，不再用「指標N.」

## 背景
查「南帝林園廠」的搜尋結果混進了「東聯」「台達化」等完全不相關工廠的內容，一路查到
`agent_document_chunks` 的實際資料，發現大量像這樣的垃圾 chunk：

```
指標1.泵浦管理、          (9 個字)
指標8.壓力計管理          (9 個字)
指標2.流量指示傳送器管理、  (14 個字)
```

原本的 `SplitPdfByIndicatorSections` 用「指標N.」當切點，但這個 pattern 除了當真正的段落
標題，也大量出現在報告書的「查驗項目清單」裡（連續列出「指標1.泵浦管理、指標2.流量指示
傳送器管理、...」），每項之間只隔幾個字，被切成一堆近乎空白的破碎 chunk。這種短 chunk 的
embedding 高度通用（設備類別名稱每家工廠的報告都在用），語意上區辨不出是哪家公司，是查詢
結果跨工廠混淆的根本原因——不是 embedding 模型不好，是灌進去的資料本身就有問題。

150 頁左右的報告書，這種垃圾 chunk 的數量會隨頁數等比例放大，也直接拖慢建檔時的 embedding
計算次數，以及查詢時全表暴力掃描要比對的向量筆數（目前沒有 ivfflat/hnsw 索引）。

## 修改內容

檔案：[`AgentDocumentIngestionService.cs`](WebAPI1/Services/AgentDocumentIngestionService.cs)

### 1. 切分依據改成「(一)、(二)、」章節標題
`IndicatorHeaderRegex`（`指標\s*\d+\s*[.．、]`）換成 `HeadingRegex`
（`[（(][一二三四五八九十百]+[）)]、`），方法改名 `SplitPdfByIndicatorSections` →
`SplitPdfByHeadingSections`。

**為什麼選帶括號的「(一)、」，不是不帶括號的「一、」**：報告書裡到處都會出現「一、推動案例
說明：」「二、建議：」這種內文條列標號，跟真正的章節標題共用「中文數字+頓號」的表面特徵——
如果直接拿「一、二、三」當切點，反而會比原本的「指標N.」切得更碎（條列標號出現頻率比
「指標N.」更高）。實際比對過這批報告書的樣本，**真正的章節標題一律帶括號**（`(一)、`
`(二)、`），內文條列標號則一律不帶括號，這個差異是可靠的區分依據。

### 2. 新增「過短段落自動合併」保護機制
即使換成章節標題，目錄頁一樣會有「(一)、標題……頁碼 (二)、標題……頁碼」這種一連串短項目
緊挨著列出的情況。新增邏輯：切出來的段落如果短於 `MinHeadingSectionChars`（50 字），
不會單獨成一個 chunk，會往後併到下一段，累積超過門檻才真正切開；結尾殘留的短片段（後面
已經沒有下一段可以併）併回前一個已切好的段落。

### 3. 呼叫端同步更新
`IngestPdfAsync` 呼叫的方法名稱、註解一併更新。

## 沒有做的部分
- **只處理「(一)、」這一種次級標題**，沒有處理「一、二、三」這種一級章節標題（因為跟內文
  條列標號衝突，見上面說明）。如果報告書的段落結構主要靠一級標題分段、次級標題很少，這次
  的改法幫助有限——目前手上的樣本都有豐富的「(一)、」結構，先以此為準。
- **沒有處理表格內部結構**：這次只解決「chunk 邊界切在哪裡」，沒有解決 PDF 表格本身抽取
  出來是打散文字、不是結構化資料這件事（另一次對話討論過的 MinerU / PDF 表格結構化，是
  獨立的、更大範圍的改動，這次沒有一併做）。

## 這個改動需要重新索引
chunk 切分邏輯變了，資料庫裡現有的 11,006 筆 chunk 都是用舊邏輯切出來的，不會自動更新。
要讓新邏輯生效，需要：
1. Rebuild + 重啟 kpi-api（跟之前幾次一樣）
2. 把 `AgentDocuments.Status` 從 `Indexed`(2) 重置回 `Pending`(0)，或直接清空
   `agent_document_chunks` 表，讓所有 PDF 文件重新跑一次 `SyncPendingAsync`

## 單元測試
[`AgentDocumentIndicatorChunkingTests.cs`](WebAPI1.Tests/Services/AgentDocumentIndicatorChunkingTests.cs)
整份改寫，鎖住的行為：

- 兩個章節標題之間切得乾淨、不混內容
- **不帶括號的「一、」「二、」條列標號不會被誤判成標題**（這是這次改版最重要的行為）
- 目錄頁式的一連串短項目會被正確合併
- 結尾殘留的短片段併回前一段，不會憑空消失
- 章節跨頁時內容留在同一個 chunk、頁碼取章節開始那一頁
- 完全沒有章節標題（或只有不帶括號的條列標號）時退回 `null`，呼叫端改用逐頁字數切法
- 章節內容過長時保底用字數切分，且頁碼一致

`dotnet test WebAPI1.Tests/WebAPI1.Tests.csproj` 全部 65 個測試通過。
`dotnet build WebAPI1/WebAPI1.csproj` 0 error。

## 追加：search_documents 補上 organizationName 過濾參數

背景：換了 chunk 切法後，一般主題查詢明顯變快（通常 1 次命中），但查詢裡帶公司/工廠名稱
時（例如「南帝林園廠」）還是慢——原因是 LLM 只能把公司名稱寫進 `query` 語意文字裡碰運氣，
向量搜尋對專有名詞辨識力弱，容易混進其他工廠的結果，逼 LLM 反覆用不同關鍵字重查，每次重查
都是一趟完整的 LLM 呼叫（實測 3~4 秒），查好幾次時間就疊上去了——不是資料庫查詢慢，是
「重試次數」把時間累加起來。

修法：[`AgentDocumentTools.cs`](WebAPI1/Services/AgentDocumentTools.cs) 的 `search_documents`
新增可選參數 `organizationName`：

- 有填的話，先用 `Organizations.Name.Contains(organizationName)` 精確比對出符合的
  `OrganizationId` 清單，再跟呼叫者原本的 `accessibleOrgIds`（權限範圍）取交集，兩個限制
  同時成立——不會因為填了公司名稱就繞過權限檢查看到不該看的工廠
- 找不到符合名稱的工廠、或交集後範圍是空的（沒權限或沒文件），直接回傳明確訊息，不會誤導
  LLM 以為查詢失敗要重試
- 工具說明文字明確要求：問題裡提到具體公司/工廠名稱時務必填這個參數，不要只寫進 `query`
  文字裡

**注意**：`SearchChunksAsync` 的 SQL 過濾本來就是 `organization_id = ANY(@orgIds) OR
organization_id IS NULL`，所以就算用 `organizationName` 鎖定單一工廠，公版文件（無工廠歸屬）
還是會混在結果裡——這是既有的、刻意的行為（公版文件本來就該對所有工廠可見），不是這次改動
的副作用。

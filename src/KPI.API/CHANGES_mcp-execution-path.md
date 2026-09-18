# 修改紀錄 — 補完 MCP 工具執行路徑

## 背景
KPI 的「MCP Endpoint 設定」頁面（能新增/刪除 endpoint、同步工具目錄、指派角色）原本就存在，
但查過 [AgentController.cs](WebAPI1/Controllers/AgentController.cs) 完整的聊天迴圈後發現：
同步進來的 MCP 工具只是被「登記」進 `AgentTools` 表（`Source=McpEndpoint`），實際聊天時：

1. 送給 LLM 的 `toolDeclarations` 只呼叫 `AgentDocumentTools.BuildToolDeclarations(...)`，
   這個方法內部寫死只認得 `search_documents`/`query_document_table`/`analyze_image` 三個
   名字，MCP 工具的 key 傳進去會被直接忽略——LLM 根本看不到這個工具存在。
2. 就算 LLM 想呼叫，執行端也只有 `_documentTools.ExecuteAsync(...)` 這一條路，沒有任何
   呼叫外部 MCP server `tools/call` 的程式碼。

`AgentMcpEndpoint.cs` 的原始註解也印證了這點：「Phase 1 的三個文件工具是 in-process，
不依賴這張表，先做好管理頁面/資料結構，之後真的要接外部 MCP server 時可以直接用」——
這是刻意先蓋殼、後補執行邏輯的設計，這次要補的就是「之後」那一段。

## 修改內容

### 1. `AgentTool` 實體新增兩個欄位
檔案：[`AgentTool.cs`](WebAPI1/Models/Entities/AgentTool.cs)

- `McpToolName`（`string?`，MaxLength 200）：這個工具在 MCP server 原始的 tool name，
  呼叫 `tools/call` 要用這個，不是 `ToolKey`（`ToolKey` 加了 endpoint 前綴避免撞名，
  MCP server 不認得這個前綴）
- `ParametersSchema`（`string?`）：MCP server 在 `tools/list` 回傳的 `inputSchema` 原始
  JSON，組 LLM function-calling 的 `parameters` 欄位用——同步流程原本完全沒有存這個，
  沒有參數 schema 就沒辦法組出正確的工具宣告給 LLM

新增 migration：[`20260910083815_AddAgentToolMcpFields.cs`](WebAPI1/Migrations/20260910083815_AddAgentToolMcpFields.cs)，
已套用到本機 `kpi-sqlserver` 容器。

### 2. `ToolKey` 命名格式改成 LLM function-name 相容
檔案：[`AgentController.cs`](WebAPI1/Controllers/AgentController.cs) 的 `BuildMcpToolKey`

原本是 `mcp{endpointId}:{toolName}`（冒號分隔）。LLM function-calling 的 function name
通常只接受英數字/底線/連字號（OpenAI 相容 API 上限 64 字元），冒號跟過長的名字直接送出去
可能被 LiteLLM/LLM 那層拒絕或用不可預期的方式處理。改成：

- 不合法字元一律換成底線：`mcp{endpointId}_{sanitizedToolName}`
- 整個 key 截到 64 字元

這個改動也代表：之前如果已經同步過 MCP 工具（雖然從沒被使用過），`ToolKey` 會變，
舊列會在下次「同步工具目錄」時被視為「已下架」清掉，新列視為「新增」重新登記——
這是既有同步邏輯本來就會處理的情況（見 `SyncMcpEndpointTools` 的 stale/added 判斷），
不用額外遷移資料。

### 3. `FetchMcpToolsListAsync` 一併撈 `inputSchema`
之前只取 `name`/`description`，現在多取 `inputSchema`（選填欄位，沒有的話存 `null`，
組宣告時補一個空的 object schema）。

### 4. `SyncMcpEndpointTools` 存下 `McpToolName`/`ParametersSchema`
新增/更新工具目錄時，一併把這兩個欄位寫進 `AgentTool`，比對是否需要更新也把
`ParametersSchema` 是否變動納入判斷（之前只比對 `Description`）。

### 5. 新增 MCP 工具宣告組裝與執行邏輯
同樣在 `AgentController.cs`：

- `BuildMcpFunctionDeclaration`：把一個 MCP 工具組成 LLM function-calling 格式的宣告，
  `ParametersSchema` 缺漏或壞掉時 fallback 成空的 object schema，不讓整個工具宣告組不出來
- `BuildMcpToolDeclarationsAsync` / `AppendMcpToolDeclarationsAsync`：查這個呼叫者允許使用的
  MCP 工具（`Source=McpEndpoint && IsEnabled && ToolKey in allowedToolKeys`），組成宣告陣列，
  接到 `AgentDocumentTools.BuildToolDeclarations(...)` 回傳的陣列後面——LLM 拿到的是同一份
  `tools` 陣列，分不出來哪個是 in-process、哪個是外部 MCP
- `ExtractMcpToolResultText`：解析 `tools/call` 回應的 `content` 陣列，目前只處理 `text`
  類型的 block（MCP 規格允許混多種 type，如 `image`/`resource`），其他類型用簡短標記代替，
  不會整個查詢結果憑空消失
- `ExecuteMcpToolAsync`：實際呼叫外部 MCP server 的 `tools/call`，帶 `Authorization: Bearer`
  （有設定 API Key 時），逾時給 30 秒（比 `tools/list` 的 20 秒長，因為實際查詢通常比列工具重）

`toolDeclarations` 組裝的兩個地方（續傳分支、全新對話分支）都改成先組 in-process 宣告，
再呼叫 `AppendMcpToolDeclarationsAsync` 把 MCP 宣告接上去。

### 6. 執行時依 Source 分流
`AgentDocumentTools` 新增 `KnownToolKeys`（`search_documents`/`query_document_table`/
`analyze_image` 這三個固定名字的集合）。工具呼叫的執行分派邏輯：

```
toolCall.ToolName 在 KnownToolKeys 裡 → 走 _documentTools.ExecuteAsync（原本的 in-process 路徑）
否則 → 查 AgentTools 表找 Source=McpEndpoint 且 ToolKey 相符的列 → ExecuteMcpToolAsync
      找不到就回「（找不到這個工具，可能已被管理員移除）」，不讓整個請求炸掉
```

## 沒有做的部分
- **系統提示文字沒有調整**：`DefaultSystemInstruction`/`NoToolsSystemInstruction` 裡明確
  點名 `search_documents`/`query_document_table`/`analyze_image` 這三個工具，如果某個角色
  只被指派了 MCP 工具、完全沒有這三個 in-process 工具，系統提示的措辭會不準確（`hasAnyTools`
  只看數量，不看種類）。這是既有系統提示設計的既有假設，牽動的是 prompt 品質而不是這次要
  補的「執行路徑」本身，且沒有真的 MCP server 可以實測行為，先不動，留給下一輪處理。
- **沒有實際接一個真的 MCP server 測試**：本機環境沒有現成的 MCP server 可以跑
  `SyncMcpEndpointTools`/`ExecuteMcpToolAsync` 的端對端流程，只用單元測試鎖住不碰網路/DB
  的純邏輯部分（key 消毒、宣告組裝、回應解析）。要驗證整條路真的通，需要找一個真實的
  MCP server（或寫一個假的測試用 MCP server）實際跑一次同步 + 對話。

## 單元測試
新增 [`AgentControllerMcpTests.cs`](WebAPI1.Tests/Controllers/AgentControllerMcpTests.cs)，
鎖住三個純函式的行為：

- `BuildMcpToolKey`：字元消毒、長度截斷、不同 endpoint 同名工具不會撞 key
- `BuildMcpFunctionDeclaration`：正常 schema / schema 缺漏 / schema 壞掉三種情況都要組出
  合法的宣告
- `ExtractMcpToolResultText`：單一/多個 text block、非 text block、RPC 錯誤、空內容、
  完全沒有回應五種情況的解析結果

`dotnet test WebAPI1.Tests/WebAPI1.Tests.csproj` 全部 62 個測試通過（含這次新增的 13 個）。
`dotnet build WebAPI1/WebAPI1.csproj` 0 error。

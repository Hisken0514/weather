using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentDocumentIngestionService.SplitPdfByHeadingSections——把 PDF 內容照「(一)、(二)、」
/// 章節標題切段，取代原本的「指標N.」切法。改用章節標題的原因：實測發現「指標N.」除了當
/// 真正的段落標題，也大量出現在報告書的「查驗項目清單」裡（連續列出「指標1.泵浦管理、指標2.
/// 流量指示傳送器管理、...」），每項之間只隔幾個字，被切成一堆 9~20 字、幾乎沒有語意內容的
/// 破碎 chunk——這種短 chunk 的 embedding 高度通用（設備類別名稱每家工廠都在用），語意上
/// 區辨不出是哪家公司，實測會讓向量搜尋在完全不相關的工廠之間互相混淆（查「南帝」卻混進
/// 「東聯」「台達化」的內容）。改用帶括號的「(一)、」章節標題當切點，並加上「過短段落自動
/// 併到下一段」的保護機制，同時解決目錄頁的同類問題。
/// </summary>
public class AgentDocumentIndicatorChunkingTests
{
    [Fact]
    public void SplitPdfByHeadingSections_TwoHeadingsOnOnePage_SplitsIntoTwoChunks()
    {
        // 每段內容都刻意超過 50 字的合併門檻，這條測試要驗證的是「兩個章節之間切得乾不乾淨」，
        // 不是合併邏輯（合併邏輯是另一條測試的範圍）。
        var pageText =
            "(一)、 改善執行現況及案例 領域 改善計畫名稱 項目說明 對應指標項目 投入金額 " +
            "已/預計完成日期 消防管理 新建危險品倉庫 1. 新增設消防公共危險物品室內貯存場所 " +
            "指標3，危險物品符合申報種類及管制量業者如實申報率 4,200萬 114年12月 " +
            "推動案例說明：檢視屏東明揚大火案件，考量公司未來消防列管公共危險物品存量有所變動。\n" +
            "(二)、 指標執行情形說明 1. 製程安全資訊管理 廠內訂有PE040製程安全資訊管理辦法程序書文件，" +
            "訓練，並取得資格，由該人員擔任評估小組長，依照法規要求組織評估小組執行製程安全評估。";

        var pages = new List<(int PageNumber, string Text)> { (10, pageText) };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.NotNull(result);
        Assert.Equal(2, result!.Count);
        Assert.Contains("改善執行現況及案例", result[0].Chunk);
        Assert.DoesNotContain("指標執行情形說明", result[0].Chunk); // 不能把下一段的內容混進來
        Assert.Contains("指標執行情形說明", result[1].Chunk);
        Assert.DoesNotContain("改善執行現況及案例", result[1].Chunk);
    }

    [Fact]
    public void SplitPdfByHeadingSections_BareChineseNumeralListMarker_IsNotTreatedAsHeading()
    {
        // 「一、推動案例說明：」「二、建議：」這種內文裡的條列標號，是報告書裡到處都會出現的
        // 通用寫法，跟真正的章節標題共用「中文數字+頓號」的表面特徵，但沒有括號——這是這次改版
        // 最重要的行為：不能把這種條列標號誤判成段落標題，不然切分邏輯完全沒有改善，甚至更糟
        // （這種條列標號比「指標N.」出現得更頻繁）。
        var pageText =
            "(一)、 改善執行現況及案例 " + string.Concat(Enumerable.Repeat("內容文字填充。", 20)) +
            "一、推動案例說明：現場如有洩漏或排放含單體之廢水，抽水井內之VOC濃度會上升。 " +
            "二、建議：82區抽水井油側新增VOC偵測管線及線上即時偵測系統。";

        var pages = new List<(int PageNumber, string Text)> { (11, pageText) };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.NotNull(result);
        // 整段內容（含「一、推動案例說明」「二、建議」）都要留在同一個 chunk 裡，
        // 不能因為裡面出現不帶括號的「一、」「二、」就被切開。
        var chunk = Assert.Single(result!);
        Assert.Contains("改善執行現況及案例", chunk.Chunk);
        Assert.Contains("一、推動案例說明", chunk.Chunk);
        Assert.Contains("二、建議", chunk.Chunk);
    }

    [Fact]
    public void SplitPdfByHeadingSections_TableOfContentsStyleShortEntries_AreMergedTogether()
    {
        // 目錄頁的典型樣子：一連串「(一)、標題……頁碼」緊挨著列出，每項之間內容極短——
        // 這種短項目不該各自變成一個近乎空白的獨立 chunk，要往後併到累積超過門檻為止。
        var pageText =
            "(一)、績效指標自主查驗期程 4 " +
            "(二)、自主查驗流程方式 11 " +
            "(三)、年度查驗重點 15 " +
            "(四)、新循環執行重點作為及精進案例，這裡開始是一段有實際內容的敘述，長度要超過五十個字才會觸發合併門檻，用來確認前面幾個短項目都已經被正確地併到這一段裡面，而不是各自獨立。";

        var pages = new List<(int PageNumber, string Text)> { (1, pageText) };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.NotNull(result);
        // 四個短標題全部併成一個 chunk（最後一項內容夠長，達到門檻後才 flush）。
        var chunk = Assert.Single(result!);
        Assert.Contains("績效指標自主查驗期程", chunk.Chunk);
        Assert.Contains("自主查驗流程方式", chunk.Chunk);
        Assert.Contains("年度查驗重點", chunk.Chunk);
        Assert.Contains("新循環執行重點作為及精進案例", chunk.Chunk);
    }

    [Fact]
    public void SplitPdfByHeadingSections_TrailingShortFragment_MergesIntoPreviousChunk()
    {
        // 結尾殘留的短片段（後面已經沒有其他標題可以合併了）要併回前一個已經切好的段落，
        // 不能讓它自己變成一個孤立的短 chunk，也不能憑空消失不見。
        var longSection = "(一)、 改善執行現況及案例 " + string.Concat(Enumerable.Repeat("內容文字填充。", 20));
        var pageText = longSection + "(二)、結語 4";

        var pages = new List<(int PageNumber, string Text)> { (20, pageText) };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.NotNull(result);
        var chunk = Assert.Single(result!);
        Assert.Contains("改善執行現況及案例", chunk.Chunk);
        Assert.Contains("結語", chunk.Chunk);
    }

    [Fact]
    public void SplitPdfByHeadingSections_HeadingSpanningTwoPages_KeepsAsOneChunkOnStartPage()
    {
        var page1 = "(一)、 改善執行現況及案例 " + string.Concat(Enumerable.Repeat("內容文字填充。", 10));
        var page2 = string.Concat(Enumerable.Repeat("後續頁面的內容文字。", 10)) + "截至114年底執行完畢。";

        var pages = new List<(int PageNumber, string Text)> { (247, page1), (248, page2) };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.NotNull(result);
        var chunk = Assert.Single(result!);
        Assert.Contains("改善執行現況及案例", chunk.Chunk);
        Assert.Contains("截至114年底執行完畢", chunk.Chunk); // 跨頁的後半段內容要留在同一個 chunk 裡
        Assert.Equal(247, chunk.PageNumber); // 頁碼取章節開始的那一頁
    }

    [Fact]
    public void SplitPdfByHeadingSections_PreambleBeforeFirstHeading_IsKeptSeparately()
    {
        var longPreamble = string.Concat(Enumerable.Repeat("目錄 第一章 前言 ", 100)); // 沒有章節標題的封面/目錄內容
        var pageText = longPreamble + "\n(一)、製程安全管理 " + string.Concat(Enumerable.Repeat("內容文字填充。", 10));

        var pages = new List<(int PageNumber, string Text)> { (1, pageText) };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.NotNull(result);
        // 前導內容（無章節標題）用舊字數切法切出至少一塊，且不該混進第一個章節的內容。
        Assert.True(result!.Count >= 2);
        Assert.DoesNotContain("製程安全管理", result[0].Chunk);
        Assert.Contains("製程安全管理", result[^1].Chunk);
    }

    [Fact]
    public void SplitPdfByHeadingSections_NoHeadingsAtAll_ReturnsNull()
    {
        // 一般不是這種編號報告格式的 PDF——呼叫端要退回舊的逐頁字數切法，不能硬套用標題切法。
        var pages = new List<(int PageNumber, string Text)>
        {
            (1, "這是一份普通的公司簡介文件，介紹公司歷史與願景，完全沒有帶括號的章節標題。"),
        };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.Null(result);
    }

    [Fact]
    public void SplitPdfByHeadingSections_OnlyBareNumeralsWithoutParens_ReturnsNull()
    {
        // 全篇只有「一、推動案例說明：」這種不帶括號的條列標號，沒有任何真正的章節標題——
        // 不該誤判成有標題結構，要退回逐頁字數切法。
        var pages = new List<(int PageNumber, string Text)>
        {
            (1, "一、推動案例說明：現場如有洩漏。 二、建議：新增偵測系統。 三、後續追蹤：持續監控。"),
        };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.Null(result);
    }

    [Fact]
    public void SplitPdfByHeadingSections_VeryLongHeadingSection_FallsBackToCharSplittingWithinSection()
    {
        // 極少數章節底下內容特別長（例如附大量表格），保底還是要切，但同一個章節切出來的
        // 每一塊都該標同一頁碼，不能因為保底切分就弄丟頁碼資訊。
        var hugeBody = string.Concat(Enumerable.Repeat("執行情形詳細說明內容。", 500)); // 遠超過單一 chunk 上限
        var pageText = "(一)、製程安全管理 " + hugeBody;

        var pages = new List<(int PageNumber, string Text)> { (5, pageText) };

        var result = AgentDocumentIngestionService.SplitPdfByHeadingSections(pages);

        Assert.NotNull(result);
        Assert.True(result!.Count > 1); // 太長被保底切成好幾塊
        Assert.All(result, r => Assert.Equal(5, r.PageNumber));
    }
}

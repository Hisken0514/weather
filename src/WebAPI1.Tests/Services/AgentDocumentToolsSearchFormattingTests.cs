using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentDocumentTools.FormatSearchResultLine——search_documents 把一筆向量搜尋結果組成
/// 給 LLM 看的文字行的格式規則。這是這次把 search_documents 改回純向量搜尋、並加上工廠標記
/// 之後最值得鎖住的部分：格式錯了或工廠欄位漏顯示，LLM 會拿不到「這是哪個工廠的資料」這個
/// 關鍵資訊，卻不會有任何例外或錯誤訊息提示問題發生。
/// </summary>
public class AgentDocumentToolsSearchFormattingTests
{
    private static AgentDocumentChunkHit SampleHit(
        long id = 1,
        int documentId = 19,
        string chunkText = "高風險管線洩漏點數為0點。",
        int? sourcePage = 103,
        string? sourceSheet = null,
        double distance = 0.12) =>
        new(id, documentId, chunkText, sourcePage, sourceSheet, distance);

    [Fact]
    public void FormatSearchResultLine_WithOrganizationName_ShowsFactoryName()
    {
        var hit = SampleHit();

        var line = AgentDocumentTools.FormatSearchResultLine(hit, "績效報告.pdf", "台中廠");

        Assert.StartsWith("[documentId=19 工廠:台中廠 來源:績效報告.pdf 第 103 頁]", line);
        Assert.Contains("高風險管線洩漏點數為0點。", line);
    }

    [Fact]
    public void FormatSearchResultLine_NullOrganizationName_ShowsPublicDocumentLabel()
    {
        // OrganizationId 為 null 代表公版文件（見 AgentDocument 的註解），不能顯示空字串或 null，
        // 要讓 LLM 看得懂這是「所有工廠共用」的文件，不是漏掉工廠資訊。
        var hit = SampleHit();

        var line = AgentDocumentTools.FormatSearchResultLine(hit, "公版SOP.pdf", null);

        Assert.StartsWith("[documentId=19 工廠:公版文件 來源:公版SOP.pdf 第 103 頁]", line);
    }

    [Fact]
    public void FormatSearchResultLine_SourceSheetPresent_PrefersSheetOverPage()
    {
        // Excel 來源的 chunk 同時可能有 SourcePage（通常是 null）跟 SourceSheet，
        // 表格類來源要顯示工作表名稱而不是頁碼。
        var hit = SampleHit(sourcePage: null, sourceSheet: "工作表1");

        var line = AgentDocumentTools.FormatSearchResultLine(hit, "統計.xlsx", "高雄廠");

        Assert.Contains("工廠:高雄廠 來源:統計.xlsx 工作表1", line);
        Assert.DoesNotContain("頁", line);
    }

    [Fact]
    public void FormatSearchResultLine_NoPageNoSheet_LocationIsEmpty()
    {
        var hit = SampleHit(sourcePage: null, sourceSheet: null);

        var line = AgentDocumentTools.FormatSearchResultLine(hit, "簡介.docx", "台南廠");

        // location 是空字串時，格式化仍會留一個空格再接 "]"（既有格式字串的行為，不是這次要修的東西）。
        Assert.StartsWith("[documentId=19 工廠:台南廠 來源:簡介.docx ]", line);
    }

    [Fact]
    public void FormatSearchResultLine_ChunkTextWithinLimit_IsNotTruncated()
    {
        var text = new string('字', 700); // 剛好等於上限，不該被截斷
        var hit = SampleHit(chunkText: text);

        var line = AgentDocumentTools.FormatSearchResultLine(hit, "文件.pdf", "台中廠");

        Assert.Contains(text, line);
        Assert.DoesNotContain("已截斷", line);
    }

    [Fact]
    public void FormatSearchResultLine_ChunkTextExceedsLimit_IsTruncatedWithMarker()
    {
        var text = new string('字', 701); // 超過上限一個字
        var hit = SampleHit(chunkText: text);

        var line = AgentDocumentTools.FormatSearchResultLine(hit, "文件.pdf", "台中廠");

        Assert.Contains("…（內容過長，已截斷）", line);
        Assert.DoesNotContain(text, line); // 完整原文不該出現在輸出裡
        Assert.Contains(new string('字', 700), line); // 但前 700 字要完整保留
    }
}

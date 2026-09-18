using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentDocumentIngestionService.SplitByFontHeadings——依字級/粗體判斷標題的切分邏輯，取代
/// 寫死的標題文字格式（HeadingRegex 只認得「(一)、」這一種寫法）。只測純邏輯部分（吃已經抽好的
/// PdfTextLine 清單），不碰 PdfDocument/PdfPig I/O，這個專案沒有 PDF 產生器套件，也沒必要為了
/// 測試加一個——跟 AgentDocumentIndicatorChunkingTests 測 regex 版本的精神一致，只是輸入資料
/// 型態不同（那邊是純文字+regex，這邊是帶字型資訊的行）。
/// </summary>
public class AgentDocumentFontHeadingTests
{
    private static AgentDocumentIngestionService.PdfTextLine Line(
        int page, string text, double fontSize, bool isBold = false) =>
        new(page, text, fontSize, isBold);

    [Fact]
    public void SplitByFontHeadings_LargerFontLine_IsTreatedAsHeading()
    {
        // 內文字級 12，標題字級 16（比例 1.33，超過 1.15 門檻）——內文行數故意抓多一點，
        // 確保「按字數加權」算出來的基準字級真的是 12，不會被字數少的標題行拉歪。
        var lines = new List<AgentDocumentIngestionService.PdfTextLine>
        {
            Line(1, "第一章標題", 16),
            Line(1, "這是第一章的內文，字級是一般大小，內容要夠長才不會被短標題拉歪基準字級判斷。", 12),
            Line(1, "這是第一章內文的第二行，一樣是一般字級，持續累積字數讓基準字級統計更準確。", 12),
            Line(1, "第二章標題", 16),
            Line(1, "這是第二章的內文，同樣是一般字級，長度也要夠長才能通過合併門檻不被併掉。", 12),
            Line(1, "這是第二章內文的第二行，持續累積字數確保這一段落夠長。", 12),
        };

        var result = AgentDocumentIngestionService.SplitByFontHeadings(lines);

        Assert.NotNull(result);
        Assert.Equal(2, result!.Count);
        Assert.Contains("第一章標題", result[0].Chunk);
        Assert.DoesNotContain("第二章標題", result[0].Chunk);
        Assert.Contains("第二章標題", result[1].Chunk);
    }

    [Fact]
    public void SplitByFontHeadings_BoldSameSizeLine_IsTreatedAsHeading()
    {
        // 粗體但字級只比基準大一點點（超過 1.05 倍的粗體門檻、但沒到 1.15 倍的一般放大門檻）
        // 也該被判定成標題——基準字級是 12，13 剛好落在「只有粗體門檻能判定」的區間
        // （12*1.05=12.6 ≤ 13 < 12*1.15=13.8），確保測到的是粗體判斷這條路徑本身。
        var lines = new List<AgentDocumentIngestionService.PdfTextLine>
        {
            Line(1, "粗體章節標題", 13, isBold: true),
            Line(1, "這是內文第一行，字級 12，長度要夠長才能通過合併門檻，避免被誤判成太短要被併掉。", 12),
            Line(1, "這是內文第二行，持續累積字數，確保這個章節的內容長度超過最小門檻值。", 12),
        };

        var result = AgentDocumentIngestionService.SplitByFontHeadings(lines);

        Assert.NotNull(result);
        var chunk = Assert.Single(result!);
        Assert.Contains("粗體章節標題", chunk.Chunk);
    }

    [Fact]
    public void SplitByFontHeadings_AllSameFontSizeNoBold_ReturnsNull()
    {
        // 整份文件字級/粗體完全一致，代表沒有任何視覺上的標題線索——不該硬套用標題切法，
        // 呼叫端會退回下一種切法（regex 或固定字數）。
        var lines = new List<AgentDocumentIngestionService.PdfTextLine>
        {
            Line(1, "這是一份沒有任何標題樣式的普通文件。", 12),
            Line(1, "每一行字級都一樣，沒有加粗，也沒有明顯放大的行。", 12),
            Line(2, "第二頁的內容一樣是普通字級，維持一致的排版。", 12),
        };

        var result = AgentDocumentIngestionService.SplitByFontHeadings(lines);

        Assert.Null(result);
    }

    [Fact]
    public void SplitByFontHeadings_EmptyLines_ReturnsNull()
    {
        var result = AgentDocumentIngestionService.SplitByFontHeadings(new List<AgentDocumentIngestionService.PdfTextLine>());

        Assert.Null(result);
    }

    [Fact]
    public void SplitByFontHeadings_LongBoldSentence_IsNotMisjudgedAsHeading()
    {
        // 一整句加粗強調用的內文句子（超過標題長度上限 60 字），不該被誤判成標題——
        // 標題通常簡短，這是避免「大字級/粗體」判斷條件被強調用的長句子誤觸發的防呆。
        var longBoldSentence = "這是一句被加粗強調的內文句子，用來提醒讀者特別注意這段內容的重要性，長度刻意超過六十個字元的標題判斷上限，確保不會被誤判成段落標題。";
        Assert.True(longBoldSentence.Length > 60);

        var lines = new List<AgentDocumentIngestionService.PdfTextLine>
        {
            Line(1, "正常章節標題", 16),
            Line(1, longBoldSentence, 12, isBold: true),
            Line(1, "後面接著一般內文，持續累積字數讓這個章節的內容長度超過合併門檻值。", 12),
        };

        var result = AgentDocumentIngestionService.SplitByFontHeadings(lines);

        Assert.NotNull(result);
        // 只有一個章節（「正常章節標題」），長句子跟後面的內文都併在同一個 chunk 裡，
        // 沒有因為長句子被誤判成標題而多切出一段。
        var chunk = Assert.Single(result!);
        Assert.Contains("正常章節標題", chunk.Chunk);
        Assert.Contains(longBoldSentence, chunk.Chunk);
    }

    [Fact]
    public void SplitByFontHeadings_HeadingOnLaterPage_UsesThatPageNumber()
    {
        // 前導內容跟第三頁的章節內容都故意寫夠長（各自超過 50 字合併門檻），確保兩段各自都能
        // 單獨成立一個 chunk，不會因為其中一段太短而被合併規則往前或往後併走——這樣才能單純
        // 驗證「標題頁碼有沒有正確記錄成標題所在的那一頁」，不是在測合併規則本身。
        var lines = new List<AgentDocumentIngestionService.PdfTextLine>
        {
            Line(1, "封面文字，字級偏小，但長度刻意寫得夠長，遠遠超過短段落合併門檻的字數限制，確保這一段自己就能單獨成立一個 chunk，不會被後面的章節併走。", 12),
            Line(3, "第三頁的章節標題", 16),
            Line(3, "第三頁章節底下的內文，長度一樣要刻意寫得夠長，遠遠超過合併門檻的字數限制，確保這一段也能單獨成立一個 chunk，不會被併到前面的封面內容裡。", 12),
        };

        var result = AgentDocumentIngestionService.SplitByFontHeadings(lines);

        Assert.NotNull(result);
        Assert.Equal(2, result!.Count);
        // 標題所在頁碼（3）要正確被記錄下來，不是誤用第一行（page=1）的頁碼。
        Assert.Contains(result!, r => r.Chunk.Contains("第三頁的章節標題") && r.PageNumber == 3);
    }
}

using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentDocumentIngestionService.DetectPlantNameByPage——有些督導報告書其實是好幾個廠處
/// 的報告直接合併成一份 PDF（實測踩過的真實案例：台化一份 165 頁的檔案裡塞了 10 個廠處，
/// 每個廠處段落標題長得一模一樣），向量檢索分不出段落屬於哪個廠，topK 常常混進隔壁廠的
/// 內容、被 LLM 誤植進答案（問 PC 廠查到 PTA 廠的數字）。這裡鎖住兩個最容易出錯的地方：
/// (1) 目錄頁（同一頁擠了好幾種廠名）不能被誤判成「這頁開始就是某個廠」；(2) 一般單一廠的
/// 正常文件不該被誤套用這個標記（沒有兩種以上相異廠名時整個功能要是沒開的狀態）。
/// </summary>
public class AgentDocumentPlantDetectionTests
{
    [Fact]
    public void DetectPlantNameByPage_TocPageWithMultipleNames_IsNotTreatedAsBreakpoint()
    {
        // 第 1 頁是目錄，同一頁列出兩種廠名；真正的段落各自獨占一頁，在後面出現。
        var pages = new List<(int PageNumber, string Text)>
        {
            (1, "目錄 台化公司對苯二甲酸廠(PTA廠)...10頁 台化公司聚碳酸酯樹脂廠(PC廠)...20頁"),
            (10, "台化公司對苯二甲酸廠(PTA廠) 一、新循環執行作法 ..."),
            (20, "台化公司聚碳酸酯樹脂廠(PC廠) 一、新循環執行作法 ..."),
        };

        var result = AgentDocumentIngestionService.DetectPlantNameByPage(pages);

        // 第 1 頁（目錄）不該出現在對照表裡——它不是任何廠的可信起點。
        Assert.False(result.ContainsKey(1));
        Assert.Equal("台化公司對苯二甲酸廠(PTA廠)", result[10]);
        Assert.Equal("台化公司聚碳酸酯樹脂廠(PC廠)", result[20]);
    }

    [Fact]
    public void DetectPlantNameByPage_CarriesForwardUntilNextBreakpoint()
    {
        var pages = new List<(int PageNumber, string Text)>
        {
            (10, "台化公司對苯二甲酸廠(PTA廠) 一、新循環執行作法"),
            (11, "（此頁沒有廠名，內容延續上一頁）"),
            (12, "（此頁沒有廠名，內容延續上一頁）"),
            (20, "台化公司聚碳酸酯樹脂廠(PC廠) 一、新循環執行作法"),
            (21, "（此頁沒有廠名，內容延續上一頁）"),
        };

        var result = AgentDocumentIngestionService.DetectPlantNameByPage(pages);

        Assert.Equal("台化公司對苯二甲酸廠(PTA廠)", result[10]);
        Assert.Equal("台化公司對苯二甲酸廠(PTA廠)", result[11]);
        Assert.Equal("台化公司對苯二甲酸廠(PTA廠)", result[12]);
        Assert.Equal("台化公司聚碳酸酯樹脂廠(PC廠)", result[20]);
        Assert.Equal("台化公司聚碳酸酯樹脂廠(PC廠)", result[21]);
    }

    [Fact]
    public void DetectPlantNameByPage_PagesBeforeFirstBreakpoint_AreNotInResult()
    {
        // 封面/目錄這種第一個廠名出現之前的頁碼，查不到對應的廠別是預期中的行為
        // （不能瞎猜屬於哪個廠，寧可讓呼叫端拿到 null）。
        var pages = new List<(int PageNumber, string Text)>
        {
            (1, "封面：績效指標自主查驗報告"),
            (2, "（前言，沒有提到任何廠名）"),
            (10, "台化公司對苯二甲酸廠(PTA廠) 一、新循環執行作法"),
            (20, "台化公司聚碳酸酯樹脂廠(PC廠) 一、新循環執行作法"),
        };

        var result = AgentDocumentIngestionService.DetectPlantNameByPage(pages);

        Assert.False(result.ContainsKey(1));
        Assert.False(result.ContainsKey(2));
        Assert.Equal("台化公司對苯二甲酸廠(PTA廠)", result[10]);
    }

    [Fact]
    public void DetectPlantNameByPage_OnlyOneDistinctPlantName_ReturnsEmpty()
    {
        // 一般單一廠的正常文件：整份文件只出現一種廠名（不管出現幾次），不是「合併報告」，
        // 不該套用任何標記——回傳空字典，等同這個功能沒開，FormatSearchResultLine 不會
        // 多印出無意義的警示文字。
        var pages = new List<(int PageNumber, string Text)>
        {
            (1, "台塑公司林園廠 績效指標自主新循環管理"),
            (5, "台塑公司林園廠 執行階段性成果"),
            (10, "台塑公司林園廠 智慧化技術導入情形"),
        };

        var result = AgentDocumentIngestionService.DetectPlantNameByPage(pages);

        Assert.Empty(result);
    }

    [Fact]
    public void DetectPlantNameByPage_NoPlantNamePattern_ReturnsEmpty()
    {
        var pages = new List<(int PageNumber, string Text)>
        {
            (1, "這份文件完全沒有「OO公司XX廠」這種格式的內容。"),
        };

        var result = AgentDocumentIngestionService.DetectPlantNameByPage(pages);

        Assert.Empty(result);
    }
}

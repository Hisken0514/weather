using WebAPI1.Controllers;
using Xunit;

namespace WebAPI1.Tests.Controllers;

/// <summary>
/// 測 AgentController.NeedsDocumentTools——這是 Tier1/Tier2 分流的關鍵判斷：命中就一定
/// 用 Tier2（帶完整工具集），沒命中才會考慮用 Tier1（這次 API 請求不帶任何工具定義）。
/// 這組測試存在的直接原因：實測發現一句不含關鍵字的追問（例如「試看看」）在對話中途被
/// 分流到 Tier1 後，gemma4 會用文字假裝呼叫工具（輸出 &lt;tool_call&gt; 格式），根因是系統
/// 提示沒有跟著 Tier1「這次沒有工具」的事實調整。修好之後（見 AgentController 裡
/// Tier1SystemInstruction 的說明），這裡的測試用來鎖住「這句話到底該不該被判定為需要查文件」
/// 的判斷結果，避免以後改關鍵字清單時不小心讓真正需要查文件的問題又漏判掉。
/// </summary>
public class AgentControllerTierRoutingTests
{
    [Theory]
    [InlineData("這份文件裡有提到消防改善的內容嗎？")]
    [InlineData("幫我查一下這份 Excel 裡哪幾項未達標")]
    [InlineData("這張照片上設備銘牌的到期日是幾號？")]
    [InlineData("上個月的報表資料統計一下")]
    [InlineData("找一下相關的 PDF 檔案")]
    public void NeedsDocumentTools_QuestionsAboutDocuments_ReturnsTrue(string text)
    {
        Assert.True(AgentController.NeedsDocumentTools(text));
    }

    [Theory]
    [InlineData("你好")]
    [InlineData("謝謝")]
    [InlineData("今天天氣如何")]
    // 實際觸發過幻覺 bug 的真實案例：對話中途一句不含關鍵字的短追問，之前會被誤判成
    // 「不需要查文件」而分流到 Tier1，但使用者其實是要接續上一輪的文件查詢。
    [InlineData("試看看")]
    [InlineData("再確認一次")]
    public void NeedsDocumentTools_GenericChitChat_ReturnsFalse(string text)
    {
        Assert.False(AgentController.NeedsDocumentTools(text));
    }

    [Fact]
    public void NeedsDocumentTools_EmptyString_ReturnsFalse()
    {
        Assert.False(AgentController.NeedsDocumentTools(""));
    }

    [Fact]
    public void NeedsDocumentTools_KeywordMatch_IsCaseInsensitive()
    {
        // 關鍵字清單裡有英文檔案格式（excel/pdf/word），使用者常常會打大寫，
        // 不分大小寫才不會漏判。
        Assert.True(AgentController.NeedsDocumentTools("幫我看一下這份 PDF"));
        Assert.True(AgentController.NeedsDocumentTools("這份 EXCEL 檔案"));
    }

    // 接上化學品資料庫（GovDataMcp）跟法規查詢工具之後補的關鍵字——這幾句完全不含上面那批
    // 文件關鍵字，沒有這批新關鍵字會被誤判成閒聊，白白多打一次 Tier1 試答才升級。
    [Theory]
    [InlineData("甲苯的 CAS No. 跟管制濃度是多少？")]
    [InlineData("這個化學物質屬不屬於列管毒性化學物質？")]
    [InlineData("公共危險物品的管制量怎麼查？")]
    [InlineData("職場霸凌的罰則是什麼？")]
    [InlineData("有沒有相關的法院判決？")]
    [InlineData("這個行政函釋還有效嗎？")]
    public void NeedsDocumentTools_ChemicalOrLegalQuestions_ReturnsTrue(string text)
    {
        Assert.True(AgentController.NeedsDocumentTools(text));
    }
}

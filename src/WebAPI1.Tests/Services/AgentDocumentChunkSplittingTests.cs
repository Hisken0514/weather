using WebAPI1.Services;
using Xunit;

namespace WebAPI1.Tests.Services;

/// <summary>
/// 測 AgentDocumentIngestionService.SplitIntoChunks 的保底切法——找不到標題結構時才會用到這個
/// 方法，改版後不再是無腦按字數硬切，會先在「理想切點」附近找最近的自然邊界（換行/句子結尾
/// 標點）再切，避免把一句話從中間攔腰切斷。ChunkMaxChars=1000、ChunkOverlapChars=150 是專案
/// 既有的私有常數（AgentDocumentIngestionService.cs），這裡的測試資料長度都是照這兩個值設計的。
/// </summary>
public class AgentDocumentChunkSplittingTests
{
    [Fact]
    public void SplitIntoChunks_TextWithinLimit_ReturnsSingleChunkUnchanged()
    {
        var text = new string('字', 500); // 遠低於 1000 字上限，不該被切

        var result = AgentDocumentIngestionService.SplitIntoChunks(text).ToList();

        var chunk = Assert.Single(result);
        Assert.Equal(text, chunk);
    }

    [Fact]
    public void SplitIntoChunks_EmptyOrWhitespace_ReturnsNoChunks()
    {
        Assert.Empty(AgentDocumentIngestionService.SplitIntoChunks("").ToList());
        Assert.Empty(AgentDocumentIngestionService.SplitIntoChunks("   \n  ").ToList());
    }

    [Fact]
    public void SplitIntoChunks_SentenceBoundaryNearIdealCut_CutsAtSentenceEnd()
    {
        // 在理想切點（第 1000 字）前面不遠處刻意放一個句號，驗證會切在句號後面，
        // 不會把句子腰斬——句號後面接的字，應該完整出現在下一個 chunk 的開頭，
        // 不該被切在句子中間。
        var firstSentence = new string('甲', 950) + "。"; // 951 字，句號在第 951 個字元
        var secondSentence = new string('乙', 200); // 接續內容，第二個 chunk 的內容
        var text = firstSentence + secondSentence;

        var result = AgentDocumentIngestionService.SplitIntoChunks(text).ToList();

        Assert.True(result.Count >= 2);
        // 第一個 chunk 要在句號結尾，不能在句子中間被腰斬（不能同時包含甲跟乙兩種字）。
        Assert.EndsWith("。", result[0]);
        Assert.DoesNotContain('乙', result[0]);
    }

    [Fact]
    public void SplitIntoChunks_NoNaturalBoundaryNearby_FallsBackToHardCutAtIdealLength()
    {
        // 完全沒有換行或句子結尾標點可用（整段都是同一種字），範圍內找不到自然邊界，
        // 退回原本的硬切行為——切點就是理想切點（ChunkMaxChars=1000）。
        var text = new string('字', 2000); // 完全沒有任何自然邊界可用

        var result = AgentDocumentIngestionService.SplitIntoChunks(text).ToList();

        Assert.True(result.Count >= 2);
        Assert.Equal(1000, result[0].Length); // 硬切在理想切點上，行為跟改版前一致
    }

    [Fact]
    public void SplitIntoChunks_AllChunksCombined_CoverOriginalContentWithoutGaps()
    {
        // overlap 機制不該把中間的文字漏掉——用一段有明確編號的內容，確認每個編號
        // 都至少出現在某個 chunk 裡，不會因為切法改動而憑空消失一段內容。
        var sb = new System.Text.StringBuilder();
        for (var i = 0; i < 50; i++)
        {
            sb.Append($"第{i}段內容。");
        }
        var text = sb.ToString();

        var result = AgentDocumentIngestionService.SplitIntoChunks(text).ToList();

        for (var i = 0; i < 50; i++)
        {
            Assert.Contains(result, chunk => chunk.Contains($"第{i}段內容"));
        }
    }
}

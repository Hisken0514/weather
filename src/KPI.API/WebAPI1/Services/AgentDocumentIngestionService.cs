using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NPOI.XSSF.UserModel;
using NPOI.XWPF.UserModel;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using WebAPI1.Context;
using WebAPI1.Entities;

namespace WebAPI1.Services;

public record AgentIngestionSummary(int Processed, int Succeeded, int Failed);

/// <summary>
/// 包一層用來標記失敗發生在哪個階段（開檔解析 vs. 向量化/寫入），
/// 讓外層 catch 能對應到 AgentDocumentFailureCategory，不用再去猜例外型別。
/// </summary>
internal sealed class AgentIngestionStageException : Exception
{
    public AgentDocumentFailureCategory Category { get; }

    public AgentIngestionStageException(AgentDocumentFailureCategory category, Exception inner)
        : base(inner.Message, inner)
    {
        Category = category;
    }
}

/// <summary>
/// 建檔流程：解析 PDF/DOCX/XLSX → chunk 文字 → 呼叫 LiteLLM embeddings → 寫入 pgvector。
/// 表格（Excel 工作表、Word 表格）額外逐列存進 agent_document_table_rows，供
/// query_document_table 做精確計算，不讓 LLM 自己讀 chunk 心算數字——這是先前架構
/// 討論定案的「語意檢索 + 結構化查詢」兩條路徑。v1 手動觸發（POST agent/documents/sync），
/// 不做自動監控 volume。
/// </summary>
public class AgentDocumentIngestionService
{
    private readonly ISHAuditDbcontext _db;
    private readonly IAgentVectorStoreService _vectorStore;
    private readonly IAgentEmbeddingService _embeddingService;
    private readonly string _storageRoot;
    private readonly string _webRoot;
    private readonly ILogger<AgentDocumentIngestionService> _logger;

    private const int ChunkMaxChars = 1000;
    private const int ChunkOverlapChars = 150;

    public AgentDocumentIngestionService(ISHAuditDbcontext db, IAgentVectorStoreService vectorStore,
        IAgentEmbeddingService embeddingService, IConfiguration configuration, IWebHostEnvironment env,
        ILogger<AgentDocumentIngestionService> logger)
    {
        _db = db;
        _vectorStore = vectorStore;
        _embeddingService = embeddingService;
        _storageRoot = configuration["AgentDocuments:StorageRoot"] ?? "agent-documents";
        _webRoot = env.WebRootPath ?? env.ContentRootPath;
        _logger = logger;
    }

    /// <summary>
    /// 把 SuggestFile（工廠透過「改善報告書」頁面上傳的歷史檔案）鏡射成 AgentDocument（Pending），
    /// 讓既有的語意索引流程能吃到這些檔案。只新增還沒鏡射過的，已存在的不動（避免每次都重跑）。
    /// </summary>
    public async Task<int> MirrorSuggestFilesAsync(CancellationToken ct = default)
    {
        var alreadyMirrored = await _db.AgentDocuments
            .Where(d => d.SourceSuggestFileId != null)
            .Select(d => d.SourceSuggestFileId!.Value)
            .ToListAsync(ct);
        var alreadyMirroredSet = new HashSet<int>(alreadyMirrored);

        var candidates = await _db.SuggestFiles
            .Include(sf => sf.file)
            .Where(sf => sf.FileId != null && sf.file != null)
            .ToListAsync(ct);

        var added = 0;
        foreach (var sf in candidates)
        {
            if (alreadyMirroredSet.Contains(sf.Id))
            {
                continue;
            }

            var ext = Path.GetExtension(sf.file.FileName).ToLowerInvariant();
            var fileType = ext switch
            {
                ".pdf" => AgentDocumentFileType.Pdf,
                ".docx" => AgentDocumentFileType.Docx,
                ".xlsx" => AgentDocumentFileType.Xlsx,
                _ => (AgentDocumentFileType?)null
            };
            if (fileType is null)
            {
                continue; // 不支援的格式（目前上傳限定 PDF），略過不鏡射
            }

            _db.AgentDocuments.Add(new AgentDocument
            {
                OrganizationId = sf.OrganizationId,
                FileName = sf.file.FileName,
                StoragePath = sf.file.FilePath,
                FileType = fileType.Value,
                Status = AgentDocumentStatus.Pending,
                UploadedByUserId = sf.file.UploadedById,
                UploadedAt = sf.CreatedAt ?? tool.GetTaiwanNow(),
                SourceSuggestFileId = sf.Id
            });
            added++;
        }

        if (added > 0)
        {
            await _db.SaveChangesAsync(ct);
        }

        return added;
    }

    public async Task<AgentIngestionSummary> SyncPendingAsync(CancellationToken ct = default)
    {
        await _vectorStore.EnsureSchemaAsync(ct);
        await MirrorSuggestFilesAsync(ct);

        var pending = await _db.AgentDocuments
            .Where(d => d.Status == AgentDocumentStatus.Pending || d.Status == AgentDocumentStatus.Failed)
            .ToListAsync(ct);

        int succeeded = 0, failed = 0;

        foreach (var doc in pending)
        {
            doc.Status = AgentDocumentStatus.Processing;
            doc.FailureReason = null;
            await _db.SaveChangesAsync(ct);

            try
            {
                await _vectorStore.DeleteDocumentDataAsync(doc.Id, ct); // 重新索引時先清舊資料
                var fullPath = doc.SourceSuggestFileId is not null
                    ? Path.Combine(_webRoot, doc.StoragePath.TrimStart('/', '\\'))
                    : Path.Combine(_storageRoot, doc.StoragePath);
                if (!System.IO.File.Exists(fullPath))
                {
                    throw new FileNotFoundException(
                        $"原始檔案不存在（StoragePath={doc.StoragePath}, WebRoot={_webRoot}, 嘗試路徑={fullPath}）", fullPath);
                }

                switch (doc.FileType)
                {
                    case AgentDocumentFileType.Pdf:
                        await IngestPdfAsync(doc, fullPath, ct);
                        break;
                    case AgentDocumentFileType.Docx:
                        await IngestDocxAsync(doc, fullPath, ct);
                        break;
                    case AgentDocumentFileType.Xlsx:
                        await IngestXlsxAsync(doc, fullPath, ct);
                        break;
                    case AgentDocumentFileType.Image:
                        // 圖片本身不建立向量索引，靠 analyze_image 查詢時即時判讀；
                        // 這裡只標記已完成，讓文件清單顯示可用狀態。
                        break;
                }

                doc.Status = AgentDocumentStatus.Indexed;
                doc.IndexedAt = tool.GetTaiwanNow();
                succeeded++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "文件 {DocumentId} 建檔失敗", doc.Id);
                var (category, displayEx) = ex switch
                {
                    AgentIngestionStageException stage => (stage.Category, stage.InnerException ?? ex),
                    FileNotFoundException => (AgentDocumentFailureCategory.FileMissing, ex),
                    InvalidOperationException => (AgentDocumentFailureCategory.UnsupportedFormat, ex),
                    _ => (AgentDocumentFailureCategory.Other, ex)
                };
                doc.Status = AgentDocumentStatus.Failed;
                doc.FailureCategory = category;
                doc.FailureReason = displayEx.Message.Length > 500 ? displayEx.Message[..500] : displayEx.Message;
                failed++;
            }

            await _db.SaveChangesAsync(ct);
        }

        return new AgentIngestionSummary(pending.Count, succeeded, failed);
    }

    /// <summary>
    /// embedding + 寫入向量資料庫共用一個包裝：這段失敗跟「檔案解析失敗」是不同性質的問題
    /// （檔案本身沒事，是模型計算或 DB 寫入出錯），標記成 EmbeddingError 讓管理員好分辨。
    /// </summary>
    private async Task EmbedAndInsertChunkAsync(AgentDocument doc, string chunk, int? page, string? sheet,
        CancellationToken ct, string? plantName = null)
    {
        try
        {
            var embedding = _embeddingService.Embed(chunk);
            await _vectorStore.InsertChunkAsync(doc.Id, doc.OrganizationId, chunk, embedding, page, sheet, plantName, ct);
        }
        catch (Exception ex)
        {
            throw new AgentIngestionStageException(AgentDocumentFailureCategory.EmbeddingError, ex);
        }
    }

    // 有些督導報告書其實是「好幾個廠處的報告直接合併成一份 PDF」（實測踩過的案例：台化一份
    // 165 頁的檔案裡塞了芳香烴一/二/三廠、苯乙烯廠、合成酚廠、對苯二甲酸廠(PTA)、PC 廠等
    // 10 個廠處，每個廠處段落標題長得一模一樣）。這種文件向量檢索分不出段落屬於哪個廠，
    // topK 常常混進隔壁廠的數字、被 LLM 誤植進答案。這裡在頁首找「OO公司XX廠」這種樣式，
    // 偵測到就記錄下來，讓每個 chunk 標上「這段實際上屬於哪個廠」，之後 search_documents
    // 格式化結果時把這個標示出來，至少讓 LLM 自己看得出「這段跟你問的廠不是同一間」。
    //
    // 只認「OO公司XX廠」這個格式（可選附加英文/中文代號，例如「(PTA廠)」），這是目前唯一
    // 實測過的真實樣本；換一批文件命名方式不同的話，這個 regex 可能完全抓不到，不影響其他
    // 文件的處理——沒偵測到就是這欄全部是 null，行為等同這個功能沒開。
    private static readonly Regex PlantNameRegex =
        new(@"[一-鿿]{2,10}公司[一-鿿]{0,10}廠(?:[（(][A-Za-z0-9一-鿿]+[）)])?", RegexOptions.Compiled);

    // 目錄頁會把所有廠名擠在同一頁（彼此距離很近），不能當成「這頁開始就是這個廠」的訊號，
    // 不然目錄頁之後、第一個真正段落之前的內容會被誤標成目錄裡最後一個廠。只有「這一頁剛好
    // 只出現一種廠名」才當作可信的段落起點——目錄頁通常同時列出好幾種不同廠名，天然就會被
    // 這個條件排除掉，不用另外偵測「這是不是目錄頁」。
    //
    // 整份文件如果偵測到的相異廠名少於 2 種，代表這不是「多廠合併」的文件（可能整份就是
    // 同一家工廠、或完全沒有這種頁首格式），這時候不套用任何標記，避免對單一廠的正常文件
    // 產生沒有意義的假訊號。
    internal static Dictionary<int, string> DetectPlantNameByPage(List<(int PageNumber, string Text)> pages)
    {
        var pagePlant = new Dictionary<int, string>();
        foreach (var (pageNumber, text) in pages)
        {
            var distinctNames = PlantNameRegex.Matches(text)
                .Select(m => m.Value)
                .Distinct()
                .ToList();
            if (distinctNames.Count == 1)
            {
                pagePlant[pageNumber] = distinctNames[0];
            }
        }

        if (pagePlant.Values.Distinct().Count() < 2)
        {
            return new Dictionary<int, string>();
        }

        // 往後carry-forward：段落起點頁碼往後，一路沿用最近一次偵測到的廠名，直到下一個
        // 起點頁碼出現為止——這樣每一頁（不只是偵測到頁首那一頁本身）都查得到「目前屬於
        // 哪個廠」。第一個起點之前的頁碼（封面/目錄）查不到，屬於預期中的行為。
        var breakpoints = pagePlant.OrderBy(kv => kv.Key).ToList();
        var lookup = new Dictionary<int, string>();
        var minPage = pages.Min(p => p.PageNumber);
        var maxPage = pages.Max(p => p.PageNumber);
        var current = (string?)null;
        var breakpointIndex = 0;
        for (var page = minPage; page <= maxPage; page++)
        {
            while (breakpointIndex < breakpoints.Count && breakpoints[breakpointIndex].Key == page)
            {
                current = breakpoints[breakpointIndex].Value;
                breakpointIndex++;
            }
            if (current is not null)
            {
                lookup[page] = current;
            }
        }
        return lookup;
    }

    private async Task IngestPdfAsync(AgentDocument doc, string fullPath, CancellationToken ct)
    {
        PdfDocument pdf;
        try
        {
            pdf = PdfDocument.Open(fullPath);
        }
        catch (Exception ex)
        {
            throw new AgentIngestionStageException(AgentDocumentFailureCategory.CorruptFile, ex);
        }

        using (pdf)
        {
            var pages = new List<(int PageNumber, string Text)>();
            foreach (var page in pdf.GetPages())
            {
                if (!string.IsNullOrWhiteSpace(page.Text))
                {
                    pages.Add((page.Number, page.Text));
                }
            }

            if (pages.Count == 0)
            {
                // 掃描版 PDF（沒有文字層）v1 先不做 OCR，明確標記失敗原因而不是靜默索引空內容。
                throw new InvalidOperationException("這份 PDF 抽不到文字層，可能是掃描件，目前不支援 OCR");
            }

            var plantByPage = DetectPlantNameByPage(pages);

            // 三層 fallback，越前面越通用、越不依賴特定文件格式：
            // 1. SplitPdfByHeadingSections：「(一)、(二)、」章節標題 regex，這批督導報告書
            //    已知格式，已經有 8 個測試案例仔細驗證過（目錄頁合併、條列標號誤判防呆等），
            //    優先用這個——已驗證的方法優先，不要讓還在調的新方法把已知會動的情況弄壞。
            // 2. SplitPdfByFontHeadings：依字級/粗體判斷標題，不綁死標題文字要長什麼樣子，
            //    只在 regex 完全抓不到任何標題時才出手救援（例如全新格式、沒有括號標題的
            //    文件）——目前已知弱點是目錄頁容易被切碎（每行都當成標題），只當安全網用，
            //    不當首選，才不會讓 regex 版本已經處理得好的文件反而變差。
            // 3. 逐頁固定字數切法：兩種結構切法都找不到線索時的最終手段
            var headingChunks = SplitPdfByHeadingSections(pages) ?? SplitPdfByFontHeadings(pdf);
            if (headingChunks is not null)
            {
                foreach (var (chunk, pageNumber) in headingChunks)
                {
                    await EmbedAndInsertChunkAsync(doc, chunk, pageNumber, null, ct, plantByPage.GetValueOrDefault(pageNumber));
                }
            }
            else
            {
                foreach (var (pageNumber, text) in pages)
                {
                    foreach (var chunk in SplitIntoChunks(text))
                    {
                        await EmbedAndInsertChunkAsync(doc, chunk, pageNumber, null, ct, plantByPage.GetValueOrDefault(pageNumber));
                    }
                }
            }
        }
    }

    // 原本用「指標N.」當切點，但這個 pattern 除了當真正的段落標題，也大量出現在報告書的
    // 「查驗項目清單」「目錄」這類條列式段落裡（例如連續列出「指標1.泵浦管理、指標2.流量
    // 指示傳送器管理、...」），每一項之間只隔幾個字，會被切成一堆 9~20 字、幾乎沒有語意內容
    // 的破碎 chunk——這種短 chunk 的 embedding 高度通用（設備類別名稱每家工廠的報告都在用），
    // 語意上區辨不出是哪家公司，實測會讓向量搜尋在完全不相關的工廠之間互相混淆。
    //
    // 改用「(一)、(二)、」這種帶括號的中文數字次級標題當切點——這是報告書真正的章節標題
    // 格式（對照「一、推動案例說明：」「二、建議：」這種內文裡的條列標號，那些是不帶括號的
    // 純中文數字加頓號，跟真正的標題共用「中文數字+頓號」這個表面特徵，但沒有括號，用括號
    // 這個額外條件把兩者分開，避免把內文條列也誤判成段落標題）。
    private static readonly Regex HeadingRegex = new(@"[（(][一二三四五六七八九十百]+[）)]、", RegexOptions.Compiled);

    // 「(一)、」這類標題偶爾也會用在目錄頁（一連串「標題……頁碼」緊挨著列出，每項之間內容
    // 極短）——標題本身沒有問題，問題是目錄頁的「標題」後面幾乎沒有內容就接下一個「標題」。
    // 切出來的段落如果短於這個字數，代表遇到的不是一段真正的內容，是目錄式的短項目，要往後
    // 併到下一段，不要讓它自己變成一個近乎空白、缺乏語意的獨立 chunk。
    private const int MinHeadingSectionChars = 50;

    /// <summary>
    /// 依「(一)、」這類章節標題切 chunk，取代單純數字元切法——字數硬切容易把同一個章節的內容
    /// 切成兩半、或跟下一段的內容黏在一起，向量因此變得模糊，語意檢索抓不準（這是「找不到我
    /// 想要的東西」的根本原因之一，不是 embedding 模型不好而已）。整份文件裡完全找不到任何
    /// 章節標題（代表不是這種格式的報告書），回傳 null，呼叫端退回舊的逐頁字數切法。
    /// </summary>
    // internal（非 private）只是讓 WebAPI1.Tests 能直接測這個切分邏輯，不是要對外公開。
    internal static List<(string Chunk, int PageNumber)>? SplitPdfByHeadingSections(
        List<(int PageNumber, string Text)> pages)
    {
        var sb = new StringBuilder();
        var pageStartOffsets = new List<(int Offset, int PageNumber)>();
        foreach (var (pageNumber, text) in pages)
        {
            pageStartOffsets.Add((sb.Length, pageNumber));
            sb.Append(text);
            sb.Append('\n');
        }
        var fullText = sb.ToString();

        var matches = HeadingRegex.Matches(fullText);
        if (matches.Count == 0)
        {
            return null;
        }

        int PageAt(int offset)
        {
            var page = pageStartOffsets[0].PageNumber;
            foreach (var (start, pageNumber) in pageStartOffsets)
            {
                if (start > offset)
                {
                    break;
                }
                page = pageNumber;
            }
            return page;
        }

        var rawSections = new List<(string Section, int Page)>();

        // 第一個標題之前的內容（封面、目錄等）沒有明確的段落結構，維持舊的字數切法，
        // 這種內容本來就不該假裝它有語意完整性。
        var firstHeaderStart = matches[0].Index;
        if (firstHeaderStart > 0)
        {
            foreach (var chunk in SplitIntoChunks(fullText[..firstHeaderStart]))
            {
                rawSections.Add((chunk, PageAt(0)));
            }
        }

        for (var i = 0; i < matches.Count; i++)
        {
            var start = matches[i].Index;
            var end = i + 1 < matches.Count ? matches[i + 1].Index : fullText.Length;
            var section = fullText[start..end].Trim();
            if (section.Length == 0)
            {
                continue;
            }
            rawSections.Add((section, PageAt(start)));
        }

        return MergeShortSectionsAndFinalize(rawSections);
    }

    /// <summary>
    /// 依字級/粗體判斷標題，取代寫死的標題文字格式（regex 只認得「(一)、」這一種寫法）——只要
    /// 一行文字視覺上明顯比內文字級大、或是粗體，且夠短（標題通常簡短，避免把一整句加粗/放大
    /// 強調用的內文句子誤判成標題），就當作章節標題候選。是比 regex 更通用的切法，換一種標題
    /// 格式的報告書一樣適用，不用為新格式另外寫 pattern。
    ///
    /// 抓不到任何符合視覺特徵的標題（可能這份 PDF 沒有明顯的標題樣式、或掃描品質造成字型
    /// 資訊不可靠）就回傳 null，呼叫端會依序退回 SplitPdfByHeadingSections、再退回固定字數切法。
    /// </summary>
    internal static List<(string Chunk, int PageNumber)>? SplitPdfByFontHeadings(PdfDocument pdf) =>
        SplitByFontHeadings(ExtractLines(pdf));

    /// <summary>
    /// <see cref="SplitPdfByFontHeadings"/> 拆出來的純邏輯部分——只吃已經抽好的行資料，不碰
    /// PdfDocument/PdfPig I/O，讓 WebAPI1.Tests 能直接餵假的 <see cref="PdfTextLine"/> 測標題
    /// 判斷邏輯，不用真的產生一份 PDF 檔案（這個專案沒有 PDF 產生器套件，也沒必要為了測試加一個）。
    /// </summary>
    internal static List<(string Chunk, int PageNumber)>? SplitByFontHeadings(List<PdfTextLine> lines)
    {
        if (lines.Count == 0)
        {
            return null;
        }

        // 基準字級：整份文件裡「按字數加權」出現頻率最高的字級，代表內文的正常字級——加權是
        // 因為內文本來就字數遠多於標題，直接對「行」取眾數容易被一堆短標題自己拉高比例、
        // 誤判成基準值本身偏大。四捨五入到整數避免同一種字級因為浮點數誤差被當成好幾種不同值。
        var baselineFontSize = lines
            .GroupBy(l => Math.Round(l.FontSize))
            .OrderByDescending(g => g.Sum(l => l.Text.Length))
            .Select(g => g.Key)
            .FirstOrDefault();

        if (baselineFontSize <= 0)
        {
            return null;
        }

        // 這兩個比例、標題長度上限都是憑經驗抓的合理值，不是嚴謹調出來的——不同文件的視覺
        // 排版差異可能不小，之後有需要可以依實測結果調整，不是寫死不能改的常數。
        const double headingSizeRatio = 1.15;
        const double boldSizeRatio = 1.05;
        const int maxHeadingChars = 60;

        bool IsHeadingLine(PdfTextLine line) =>
            line.Text.Length > 0 && line.Text.Length <= maxHeadingChars &&
            (line.FontSize >= baselineFontSize * headingSizeRatio ||
             (line.IsBold && line.FontSize >= baselineFontSize * boldSizeRatio));

        var rawSections = new List<(string Section, int Page)>();
        var currentSection = new StringBuilder();
        int? currentPage = null;
        var sawAnyHeading = false;

        void FlushCurrent()
        {
            if (currentSection.Length > 0 && currentPage is not null)
            {
                rawSections.Add((currentSection.ToString().Trim(), currentPage.Value));
            }
            currentSection.Clear();
            currentPage = null;
        }

        foreach (var line in lines)
        {
            if (IsHeadingLine(line))
            {
                sawAnyHeading = true;
                FlushCurrent();
            }
            if (currentSection.Length > 0)
            {
                currentSection.Append('\n');
            }
            currentSection.Append(line.Text);
            currentPage ??= line.PageNumber;
        }
        FlushCurrent();

        // 整份文件沒有任何一行符合標題視覺特徵（例如全篇字級一致、沒有加粗），代表這份 PDF
        // 沒有明顯的結構線索可用，回傳 null 讓呼叫端退回下一種切法，不要硬套用。
        return sawAnyHeading ? MergeShortSectionsAndFinalize(rawSections) : null;
    }

    /// <summary>
    /// 短段落（regex 版常見於目錄式列表、字型版常見於誤判成標題的短行）往後併到下一段，累積
    /// 到超過門檻才真正切成一個 chunk；太長的段落保底用固定字數切法再切一次。兩種標題偵測
    /// 方式（regex／字型）切出來的原始段落，最後都走這同一套合併/保底邏輯，行為保持一致。
    /// </summary>
    private static List<(string Chunk, int PageNumber)> MergeShortSectionsAndFinalize(
        List<(string Section, int Page)> rawSections)
    {
        // 把太短的段落往後併到下一段，累積到超過門檻才真正切成一個 chunk——頁碼用這批被併起來
        // 的內容裡「第一段」的頁碼，跟切分前保持一致的「這段從哪一頁開始」語意。
        var merged = new List<(string Section, int Page)>();
        string? bufferedText = null;
        int? bufferedPage = null;
        foreach (var (section, page) in rawSections)
        {
            bufferedText = bufferedText is null ? section : bufferedText + "\n" + section;
            bufferedPage ??= page;
            if (bufferedText.Length >= MinHeadingSectionChars)
            {
                merged.Add((bufferedText, bufferedPage.Value));
                bufferedText = null;
                bufferedPage = null;
            }
        }
        if (bufferedText is not null)
        {
            // 結尾殘留的短片段：併不進「下一段」（已經沒有下一段了），併進最後一個已切好的段落；
            // 整份文件全部都短到湊不出一個門檻以上的段落時，就讓它自己單獨成一段，不能憑空消失。
            // bufferedPage 在這裡一定有值（跟 bufferedText 是同一輪迴圈裡一起被設進去的），
            // 不需要額外的 fallback 值。
            if (merged.Count > 0)
            {
                var (lastSection, lastPage) = merged[^1];
                merged[^1] = (lastSection + "\n" + bufferedText, lastPage);
            }
            else
            {
                merged.Add((bufferedText, bufferedPage!.Value));
            }
        }

        var result = new List<(string, int)>();
        foreach (var (section, page) in merged)
        {
            if (section.Length <= ChunkMaxChars * 2)
            {
                result.Add((section, page));
            }
            else
            {
                // 極少數章節底下內容特別長（例如附大量表格），保底還是要切，但至少不會切在
                // 語意邊界中間——只是保底措施，不是常態。
                foreach (var chunk in SplitIntoChunks(section))
                {
                    result.Add((chunk, page));
                }
            }
        }

        return result;
    }

    // internal（非 private）只是讓 WebAPI1.Tests 能直接建構假的行資料餵給 SplitByFontHeadings 測，
    // 不是要對外公開。
    internal readonly record struct PdfTextLine(int PageNumber, string Text, double FontSize, bool IsBold);

    /// <summary>
    /// 用 PdfPig 的字級/字型資訊把每頁內容重組成一行一行（Word 依 Y 座標分組），供
    /// <see cref="SplitPdfByFontHeadings"/> 判斷標題用。PdfPig 的 GetWords() 不保證回傳順序是
    /// 「由上到下、由左到右」的閱讀順序，這裡自己依 Y 座標（由大到小，PDF 座標系原點在左下角）
    /// 分組成行，組內再依 X 座標排序組回一行文字。同一行內字級不一致時取該行最大字級（標題
    /// 裡偶爾混排的標號/空格字級較小，不該拉低整行判定），粗體只要行內任何一個字是粗體就算。
    /// </summary>
    private static List<PdfTextLine> ExtractLines(PdfDocument pdf)
    {
        var lines = new List<PdfTextLine>();

        foreach (var page in pdf.GetPages())
        {
            var words = page.GetWords().Where(w => !string.IsNullOrWhiteSpace(w.Text)).ToList();
            if (words.Count == 0)
            {
                continue;
            }

            // 用該頁所有字的平均高度當「同一行」的容許誤差——字級差異大的文件（標題特別大）
            // 用固定 pt 數當容許誤差會不準，改用相對於這頁本身字高的值比較穩定。
            var avgHeight = words.Average(w => w.BoundingBox.Height);
            var tolerance = Math.Max(avgHeight * 0.5, 2.0);

            var sortedWords = words
                .OrderByDescending(w => w.BoundingBox.Bottom)
                .ThenBy(w => w.BoundingBox.Left)
                .ToList();

            var lineGroups = new List<List<Word>>();
            foreach (var word in sortedWords)
            {
                var lastGroup = lineGroups.Count > 0 ? lineGroups[^1] : null;
                if (lastGroup is not null &&
                    Math.Abs(lastGroup[0].BoundingBox.Bottom - word.BoundingBox.Bottom) <= tolerance)
                {
                    lastGroup.Add(word);
                }
                else
                {
                    lineGroups.Add(new List<Word> { word });
                }
            }

            foreach (var group in lineGroups)
            {
                var orderedWords = group.OrderBy(w => w.BoundingBox.Left).ToList();
                var lineText = string.Join("", orderedWords.Select(w => w.Text));
                var letters = orderedWords.SelectMany(w => w.Letters).ToList();
                if (letters.Count == 0 || string.IsNullOrWhiteSpace(lineText))
                {
                    continue;
                }
                var fontSize = letters.Max(l => l.FontSize);
                var isBold = letters.Any(l =>
                    l.Font.Name.Contains("Bold", StringComparison.OrdinalIgnoreCase) ||
                    l.Font.Name.Contains("黑體", StringComparison.OrdinalIgnoreCase));
                lines.Add(new PdfTextLine(page.Number, lineText, fontSize, isBold));
            }
        }

        return lines;
    }

    private async Task IngestDocxAsync(AgentDocument doc, string fullPath, CancellationToken ct)
    {
        XWPFDocument wordDoc;
        try
        {
            using var fs = System.IO.File.OpenRead(fullPath);
            wordDoc = new XWPFDocument(fs);
        }
        catch (Exception ex)
        {
            throw new AgentIngestionStageException(AgentDocumentFailureCategory.CorruptFile, ex);
        }

        var textBuilder = new StringBuilder();
        foreach (var paragraph in wordDoc.Paragraphs)
        {
            if (!string.IsNullOrWhiteSpace(paragraph.Text))
            {
                textBuilder.AppendLine(paragraph.Text);
            }
        }

        foreach (var chunk in SplitIntoChunks(textBuilder.ToString()))
        {
            await EmbedAndInsertChunkAsync(doc, chunk, null, null, ct);
        }

        var tableIndex = 0;
        foreach (var table in wordDoc.Tables)
        {
            tableIndex++;
            var grid = table.Rows
                .Select(row => row.GetTableCells().Select(cell => cell.GetText() ?? "").ToList())
                .ToList();
            await IngestTableGridAsync(doc, $"表格{tableIndex}", grid, ct);
        }
    }

    private async Task IngestXlsxAsync(AgentDocument doc, string fullPath, CancellationToken ct)
    {
        XSSFWorkbook workbook;
        try
        {
            using var fs = System.IO.File.OpenRead(fullPath);
            workbook = new XSSFWorkbook(fs);
        }
        catch (Exception ex)
        {
            throw new AgentIngestionStageException(AgentDocumentFailureCategory.CorruptFile, ex);
        }

        for (var sheetIndex = 0; sheetIndex < workbook.NumberOfSheets; sheetIndex++)
        {
            var sheet = workbook.GetSheetAt(sheetIndex);
            if (sheet.LastRowNum < 0)
            {
                continue;
            }

            var grid = new List<List<string>>();
            for (var rowIndex = sheet.FirstRowNum; rowIndex <= sheet.LastRowNum; rowIndex++)
            {
                var row = sheet.GetRow(rowIndex);
                if (row is null) continue;

                var cells = new List<string>();
                for (var cellIndex = 0; cellIndex < row.LastCellNum; cellIndex++)
                {
                    var cell = row.GetCell(cellIndex);
                    cells.Add(cell?.ToString() ?? "");
                }
                grid.Add(cells);
            }

            await IngestTableGridAsync(doc, sheet.SheetName, grid, ct);
        }
    }

    /// <summary>
    /// 表格處理的共用邏輯：第一列當表頭，(a) 轉 Markdown 摘要存一個 chunk 做語意檢索，
    /// (b) 逐列存 agent_document_table_rows（header→值的 JSON 物件）供精確查詢/計算。
    /// </summary>
    private async Task IngestTableGridAsync(AgentDocument doc, string sheetName, List<List<string>> grid,
        CancellationToken ct)
    {
        if (grid.Count < 2)
        {
            return; // 沒有表頭+至少一列資料，不當表格處理
        }

        var header = grid[0];
        var dataRows = grid.Skip(1).ToList();

        var markdown = new StringBuilder();
        markdown.AppendLine($"表格：{sheetName}");
        markdown.AppendLine("| " + string.Join(" | ", header) + " |");
        markdown.AppendLine("| " + string.Join(" | ", header.Select(_ => "---")) + " |");
        foreach (var row in dataRows.Take(200)) // Markdown 摘要只取前 200 列，避免單一 chunk 過大
        {
            markdown.AppendLine("| " + string.Join(" | ", row) + " |");
        }

        foreach (var chunk in SplitIntoChunks(markdown.ToString()))
        {
            await EmbedAndInsertChunkAsync(doc, chunk, null, sheetName, ct);
        }

        for (var i = 0; i < dataRows.Count; i++)
        {
            var row = dataRows[i];
            var obj = new Dictionary<string, string>();
            for (var col = 0; col < header.Count; col++)
            {
                obj[header[col]] = col < row.Count ? row[col] : "";
            }
            var rowJson = JsonSerializer.Serialize(obj);
            try
            {
                await _vectorStore.InsertTableRowAsync(doc.Id, doc.OrganizationId, sheetName, i, rowJson, ct);
            }
            catch (Exception ex)
            {
                throw new AgentIngestionStageException(AgentDocumentFailureCategory.EmbeddingError, ex);
            }
        }
    }

    // 找自然邊界時最多往回搜尋的範圍：理想切點的前 1/3 個 chunk 長度。範圍太大會切得太短、
    // 太小則常常找不到邊界又退回硬切，1/3 是經驗值，不是嚴謹調出來的。
    private const double NaturalBoundarySearchFraction = 1.0 / 3;

    private static readonly char[] SentenceEndPunctuation = { '。', '！', '？' };

    /// <summary>
    /// 保底切法：找不到標題結構（章節/字型都判斷不出來）時使用，或章節內容本身太長需要再切一次。
    /// 不是單純按字數砍——會先在「理想切點」往前的合理範圍內找最近的自然邊界（換行 > 句子結尾
    /// 標點），找到了就切在那裡，避免把一句話從中間攔腰切斷；範圍內完全找不到才真的照原本的
    /// 行為硬切在理想切點上，當最後手段。
    /// </summary>
    // internal（非 private）只是讓 WebAPI1.Tests 能直接測這個保底切法，不是要對外公開。
    internal static IEnumerable<string> SplitIntoChunks(string text)
    {
        text = text.Trim();
        if (text.Length == 0)
        {
            yield break;
        }

        var start = 0;
        while (start < text.Length)
        {
            var remaining = text.Length - start;
            if (remaining <= ChunkMaxChars)
            {
                yield return text[start..].Trim();
                yield break;
            }

            var idealEnd = start + ChunkMaxChars;
            var cutAt = FindNaturalCutPoint(text, start, idealEnd);
            yield return text[start..cutAt].Trim();
            // Math.Max 確保至少往前推進 1 個字元，避免自然邊界剛好落在 overlap 範圍內時
            // start 沒有前進、陷入無窮迴圈。
            start = Math.Max(start + 1, cutAt - ChunkOverlapChars);
        }
    }

    private static int FindNaturalCutPoint(string text, int start, int idealEnd)
    {
        var searchWindowStart = Math.Max(start, idealEnd - (int)(ChunkMaxChars * NaturalBoundarySearchFraction));

        var paragraphBreak = text.LastIndexOf('\n', idealEnd - 1, idealEnd - searchWindowStart);
        if (paragraphBreak > searchWindowStart)
        {
            return paragraphBreak + 1;
        }

        for (var i = idealEnd - 1; i >= searchWindowStart; i--)
        {
            if (Array.IndexOf(SentenceEndPunctuation, text[i]) >= 0)
            {
                return i + 1;
            }
        }

        return idealEnd; // 範圍內找不到自然邊界，退回硬切（原本的行為，當最後手段）
    }
}

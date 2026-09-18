using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WebAPI1.Services;

namespace WebAPI1.Entities;

public enum AgentDocumentStatus
{
    Pending = 0,
    Processing = 1,
    Indexed = 2,
    Failed = 3,
}

public enum AgentDocumentFileType
{
    Pdf = 0,
    Docx = 1,
    Xlsx = 2,
    Image = 3,
}

/// <summary>
/// 失敗原因分類，讓「向量索引狀態」面板能直接顯示失敗類型統計，
/// 不用管理員自己點進 FailureReason 逐筆看例外訊息。
/// </summary>
public enum AgentDocumentFailureCategory
{
    /// <summary>原始檔案在磁碟/volume 上找不到（含孤兒紀錄）。</summary>
    FileMissing = 0,
    /// <summary>檔案格式本身不支援目前的抽取方式（例如掃描版 PDF 沒有文字層）。</summary>
    UnsupportedFormat = 1,
    /// <summary>檔案存在但無法正確解析（可能損毀，或非預期的內部結構）。</summary>
    CorruptFile = 2,
    /// <summary>向量化（embedding）或寫入向量資料庫時發生錯誤。</summary>
    EmbeddingError = 3,
    Other = 4,
}

/// <summary>
/// 文件 metadata。原始檔案存在 docker volume（見 AgentDocuments:StorageRoot），
/// 這裡只存路徑跟 org 歸屬——org_id 是後面 search_documents/query_document_table
/// 做權限過濾的根，OrganizationId 為 null 代表「全體可見」的公版文件（僅限管理員上傳）。
/// </summary>
public class AgentDocument
{
    [Key]
    public int Id { get; set; }

    public int? OrganizationId { get; set; }

    [Required, MaxLength(255)]
    public string FileName { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string StoragePath { get; set; } = string.Empty;

    public AgentDocumentFileType FileType { get; set; }

    public AgentDocumentStatus Status { get; set; } = AgentDocumentStatus.Pending;

    [MaxLength(500)]
    public string? FailureReason { get; set; }

    public AgentDocumentFailureCategory? FailureCategory { get; set; }

    public Guid UploadedByUserId { get; set; }

    public DateTime UploadedAt { get; set; } = tool.GetTaiwanNow();

    public DateTime? IndexedAt { get; set; }

    /// <summary>
    /// 非 null 代表這筆是從 SuggestFile（工廠上傳的改善報告書歷史檔案）鏡射過來的，
    /// 不是透過文件管理頁手動上傳；StoragePath 這時存的是 wwwroot 相對路徑
    /// （例如 /Files/Reports/xxx.pdf），要用 wwwroot 而不是 AgentDocuments:StorageRoot
    /// 去組完整路徑（見 AgentDocumentIngestionService）。
    /// </summary>
    public int? SourceSuggestFileId { get; set; }

    [ForeignKey("OrganizationId")]
    public virtual Organization? Organization { get; set; }
}

using Forma.Domain.Enums;

namespace Forma.Domain.Entities;

/// <summary>
/// 上傳檔案
/// </summary>
public class UploadedFile : AuditableEntity
{
    /// <summary>
    /// 原始檔案名稱
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// 儲存檔案名稱
    /// </summary>
    public string StoredFileName { get; set; } = string.Empty;

    /// <summary>
    /// 檔案路徑
    /// </summary>
    public string FilePath { get; set; } = string.Empty;

    /// <summary>
    /// MIME 類型
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// 檔案大小 (bytes)
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// SHA256 雜湊值
    /// </summary>
    public string FileHash { get; set; } = string.Empty;

    /// <summary>
    /// 檔案狀態
    /// </summary>
    public FileStatus Status { get; set; } = FileStatus.Uploading;

    /// <summary>
    /// 檔案描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 關聯實體類型 (例如: FormSubmission, Project 等)
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// 關聯實體 ID
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// 上傳者 ID
    /// </summary>
    public Guid UploaderId { get; set; }

    /// <summary>
    /// 上傳者
    /// </summary>
    public virtual User Uploader { get; set; } = null!;

    /// <summary>
    /// 下載次數
    /// </summary>
    public int DownloadCount { get; set; }

    /// <summary>
    /// 最後下載時間
    /// </summary>
    public DateTime? LastDownloadAt { get; set; }

    /// <summary>
    /// 是否為公開檔案
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// 過期時間
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
}

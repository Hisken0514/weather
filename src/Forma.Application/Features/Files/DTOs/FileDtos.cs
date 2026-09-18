using Forma.Domain.Enums;

namespace Forma.Application.Features.Files.DTOs;

/// <summary>
/// 檔案上傳請求
/// </summary>
public class FileUploadRequest
{
    /// <summary>
    /// 檔案描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 關聯實體類型
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// 關聯實體 ID
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// 是否為公開檔案
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// 過期時間 (小時數)
    /// </summary>
    public int? ExpiresInHours { get; set; }
}

/// <summary>
/// 檔案上傳回應
/// </summary>
public class FileUploadResponse
{
    /// <summary>
    /// 檔案 ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// 原始檔案名稱
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// 檔案大小 (bytes)
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// MIME 類型
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// 上傳時間
    /// </summary>
    public DateTime UploadedAt { get; set; }

    /// <summary>
    /// 下載 URL
    /// </summary>
    public string DownloadUrl { get; set; } = string.Empty;
}

/// <summary>
/// 檔案資訊回應
/// </summary>
public class FileInfoResponse
{
    /// <summary>
    /// 檔案 ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// 原始檔案名稱
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

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
    public FileStatus Status { get; set; }

    /// <summary>
    /// 檔案描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 關聯實體類型
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
    /// 上傳者名稱
    /// </summary>
    public string UploaderName { get; set; } = string.Empty;

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
    /// 上傳時間
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 過期時間
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// 下載 URL
    /// </summary>
    public string DownloadUrl { get; set; } = string.Empty;
}

/// <summary>
/// 檔案統計回應
/// </summary>
public class FileStatisticsResponse
{
    /// <summary>
    /// 總檔案數
    /// </summary>
    public int TotalFiles { get; set; }

    /// <summary>
    /// 總檔案大小 (bytes)
    /// </summary>
    public long TotalSize { get; set; }

    /// <summary>
    /// 各狀態檔案數
    /// </summary>
    public Dictionary<FileStatus, int> FilesByStatus { get; set; } = new();

    /// <summary>
    /// 各類型檔案數
    /// </summary>
    public Dictionary<string, int> FilesByContentType { get; set; } = new();

    /// <summary>
    /// 本月上傳數
    /// </summary>
    public int UploadedThisMonth { get; set; }

    /// <summary>
    /// 本月下載總次數
    /// </summary>
    public int DownloadsThisMonth { get; set; }
}

/// <summary>
/// 檔案查詢請求
/// </summary>
public class FileQueryRequest
{
    /// <summary>
    /// 頁碼 (從 1 開始)
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 每頁筆數
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// 搜尋關鍵字 (檔案名稱)
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 檔案狀態篩選
    /// </summary>
    public FileStatus? Status { get; set; }

    /// <summary>
    /// MIME 類型篩選
    /// </summary>
    public string? ContentType { get; set; }

    /// <summary>
    /// 關聯實體類型篩選
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// 關聯實體 ID 篩選
    /// </summary>
    public Guid? EntityId { get; set; }

    /// <summary>
    /// 上傳者 ID 篩選
    /// </summary>
    public Guid? UploaderId { get; set; }

    /// <summary>
    /// 開始日期篩選
    /// </summary>
    public DateTime? FromDate { get; set; }

    /// <summary>
    /// 結束日期篩選
    /// </summary>
    public DateTime? ToDate { get; set; }

    /// <summary>
    /// 排序欄位 (CreatedAt, FileName, FileSize)
    /// </summary>
    public string SortBy { get; set; } = "CreatedAt";

    /// <summary>
    /// 是否降序排列
    /// </summary>
    public bool SortDescending { get; set; } = true;
}

/// <summary>
/// 檔案列表項目回應
/// </summary>
public class FileListItemResponse
{
    /// <summary>
    /// 檔案 ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// 原始檔案名稱
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// MIME 類型
    /// </summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// 檔案大小 (bytes)
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// 檔案狀態
    /// </summary>
    public FileStatus Status { get; set; }

    /// <summary>
    /// 上傳者名稱
    /// </summary>
    public string UploaderName { get; set; } = string.Empty;

    /// <summary>
    /// 下載次數
    /// </summary>
    public int DownloadCount { get; set; }

    /// <summary>
    /// 上傳時間
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 下載 URL
    /// </summary>
    public string DownloadUrl { get; set; } = string.Empty;
}

using System.ComponentModel.DataAnnotations;
using System.IO.Compression;
using System.Text;

namespace ISHAuditAPI.Services.檔案;

public class FileDto
{
    
/// <summary>
/// 檔案上傳結果
/// </summary>
public class FileUploadResult
{
    public bool Success { get; set; }
    public string? FileId { get; set; }
    public string? FileName { get; set; }
    public long FileSize { get; set; }
    public string? ErrorMessage { get; set; }
}






// 簡化的 DTO 類別
public class DriveSpaceInfoDto
{
    public string DriveName { get; set; }
    public string DriveFormat { get; set; }
    public string DriveType { get; set; }
    public long TotalSize { get; set; }
    public long TotalFreeSpace { get; set; }
    public long AvailableFreeSpace { get; set; }
    public double UsagePercentage { get; set; }
}

public class FileListOptions
{
    public bool IncludeHidden { get; set; } = false;
    public int PageSize { get; set; } = 100;
    public int PageIndex { get; set; } = 0;
    public FileSortBy SortBy { get; set; } = FileSortBy.Name;
    public SortDirection SortDirection { get; set; } = SortDirection.Ascending;
    public IEnumerable<string> FileExtensions { get; set; }
}

public class BatchOperationDto
{
    public BatchOperationType Type { get; set; }
    public IEnumerable<string> SourcePaths { get; set; }
    public string DestinationPath { get; set; }
}

public class BatchResultDto
{
    public int TotalItems { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public IEnumerable<string> Errors { get; set; }
}
/// <summary>
/// 檔案監控選項
/// </summary>
public class FileWatchOptions
{
    /// <summary>
    /// 是否包含子目錄
    /// </summary>
    public bool IncludeSubdirectories { get; set; } = true;

    /// <summary>
    /// 監控的檔案篩選器 (例如: "*.txt", "*.jpg")
    /// </summary>
    public string Filter { get; set; } = "*.*";

    /// <summary>
    /// 要監控的變更類型
    /// </summary>
    public NotifyFilters NotifyFilter { get; set; } = 
        NotifyFilters.FileName | 
        NotifyFilters.DirectoryName | 
        NotifyFilters.LastWrite | 
        NotifyFilters.Size;

    /// <summary>
    /// 緩衝區大小 (KB)
    /// </summary>
    public int BufferSizeKB { get; set; } = 8;

    /// <summary>
    /// 是否啟用事件聚合 (防止短時間內大量事件)
    /// </summary>
    public bool EnableEventAggregation { get; set; } = true;

    /// <summary>
    /// 事件聚合延遲時間 (毫秒)
    /// </summary>
    public int AggregationDelayMs { get; set; } = 100;

    /// <summary>
    /// 排除的檔案模式
    /// </summary>
    public IEnumerable<string> ExcludePatterns { get; set; } = new List<string>();

    /// <summary>
    /// 是否記錄到審計日誌
    /// </summary>
    public bool EnableAuditLog { get; set; } = true;
}
/// <summary>
/// 檔案變更事件參數
/// </summary>
public class FileChangeEventArgs : EventArgs
{
    /// <summary>
    /// 變更類型
    /// </summary>
    public WatcherChangeTypes ChangeType { get; set; }

    /// <summary>
    /// 檔案完整路徑
    /// </summary>
    public string FullPath { get; set; }

    /// <summary>
    /// 檔案相對路徑
    /// </summary>
    public string RelativePath { get; set; }

    /// <summary>
    /// 檔案名稱
    /// </summary>
    public string Name { get; set; }

    /// <summary>
    /// 是否為目錄
    /// </summary>
    public bool IsDirectory { get; set; }

    /// <summary>
    /// 事件發生時間
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// 監控路徑
    /// </summary>
    public string WatchPath { get; set; }

    /// <summary>
    /// 檔案大小 (如果適用)
    /// </summary>
    public long? FileSize { get; set; }
}
/// <summary>
/// 檔案重新命名事件參數
/// </summary>
public class FileRenamedEventArgs : FileChangeEventArgs
{
    /// <summary>
    /// 舊檔案路徑
    /// </summary>
    public string OldFullPath { get; set; }

    /// <summary>
    /// 舊檔案名稱
    /// </summary>
    public string OldName { get; set; }

    /// <summary>
    /// 舊檔案相對路徑
    /// </summary>
    public string OldRelativePath { get; set; }
}
/// <summary>
/// 檔案監控錯誤事件參數
/// </summary>
public class FileWatchErrorEventArgs : EventArgs
{
    /// <summary>
    /// 錯誤訊息
    /// </summary>
    public string ErrorMessage { get; set; }

    /// <summary>
    /// 異常物件
    /// </summary>
    public Exception Exception { get; set; }

    /// <summary>
    /// 監控路徑
    /// </summary>
    public string WatchPath { get; set; }

    /// <summary>
    /// 錯誤發生時間
    /// </summary>
    public DateTime Timestamp { get; set; }
}
/// <summary>
/// 監控狀態 DTO
/// </summary>
public class FileWatchStatusDto
{
    /// <summary>
    /// 監控路徑
    /// </summary>
    public string Path { get; set; }

    /// <summary>
    /// 是否正在監控
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// 開始監控時間
    /// </summary>
    public DateTime StartTime { get; set; }

    /// <summary>
    /// 監控選項
    /// </summary>
    public FileWatchOptions Options { get; set; }

    /// <summary>
    /// 事件計數統計
    /// </summary>
    public FileWatchStatistics Statistics { get; set; }

    /// <summary>
    /// 最後一次事件時間
    /// </summary>
    public DateTime? LastEventTime { get; set; }
}
/// <summary>
/// 監控統計資訊
/// </summary>
public class FileWatchStatistics
{
    /// <summary>
    /// 檔案建立事件數
    /// </summary>
    public int CreatedCount { get; set; }

    /// <summary>
    /// 檔案修改事件數
    /// </summary>
    public int ChangedCount { get; set; }

    /// <summary>
    /// 檔案刪除事件數
    /// </summary>
    public int DeletedCount { get; set; }

    /// <summary>
    /// 檔案重新命名事件數
    /// </summary>
    public int RenamedCount { get; set; }

    /// <summary>
    /// 錯誤事件數
    /// </summary>
    public int ErrorCount { get; set; }

    /// <summary>
    /// 總事件數
    /// </summary>
    public int TotalEvents => CreatedCount + ChangedCount + DeletedCount + RenamedCount;
}
// 列舉
public enum FileSortBy
{
    Name,
    Size,
    ModifiedDate,
    CreatedDate,
    Extension
}

public enum SortDirection
{
    Ascending,
    Descending
}

public enum BatchOperationType
{
    Delete,
    Move,
    Copy
}
}

/// <summary>
/// 安全驗證結果
/// </summary>
public class SecurityValidationResult
{
    /// <summary>
    /// 是否通過驗證
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// 錯誤訊息
    /// </summary>
    public string ErrorMessage { get; set; }

    /// <summary>
    /// 錯誤代碼
    /// </summary>
    public SecurityErrorCode ErrorCode { get; set; }

    /// <summary>
    /// 警告訊息
    /// </summary>
    public IList<string> Warnings { get; set; } = new List<string>();

    /// <summary>
    /// 額外資訊
    /// </summary>
    public Dictionary<string, object> AdditionalInfo { get; set; } = new Dictionary<string, object>();

    public static SecurityValidationResult Success(string message = null)
    {
        return new SecurityValidationResult { IsValid = true, ErrorMessage = message };
    }

    public static SecurityValidationResult Failure(string errorMessage, SecurityErrorCode errorCode)
    {
        return new SecurityValidationResult 
        { 
            IsValid = false, 
            ErrorMessage = errorMessage, 
            ErrorCode = errorCode 
        };
    }
}
/// <summary>
/// 安全掃描結果
/// </summary>
public class SecurityScanResult
{
    /// <summary>
    /// 是否安全
    /// </summary>
    public bool IsSafe { get; set; }

    /// <summary>
    /// 威脅類型
    /// </summary>
    public IList<ThreatType> ThreatTypes { get; set; } = new List<ThreatType>();

    /// <summary>
    /// 掃描詳細資訊
    /// </summary>
    public string Details { get; set; }

    /// <summary>
    /// 掃描時間
    /// </summary>
    public DateTime ScanTime { get; set; }

    /// <summary>
    /// 風險等級
    /// </summary>
    public RiskLevel RiskLevel { get; set; }
}

/// <summary>
/// 檔案安全設定
/// </summary>
public class FileSecuritySettings
{
    /// <summary>
    /// 工作目錄
    /// </summary>
    public string WorkingDirectory { get; set; }

    /// <summary>
    /// 最大檔案大小 (bytes)
    /// </summary>
    public long MaxFileSize { get; set; } = 50 * 1024 * 1024; // 50MB

    /// <summary>
    /// 允許的副檔名
    /// </summary>
    public HashSet<string> AllowedExtensions { get; set; } = new HashSet<string>();

    /// <summary>
    /// 封鎖的副檔名
    /// </summary>
    public HashSet<string> BlockedExtensions { get; set; } = new HashSet<string>();

    /// <summary>
    /// 允許的MIME類型
    /// </summary>
    public HashSet<string> AllowedMimeTypes { get; set; } = new HashSet<string>();

    /// <summary>
    /// 封鎖的MIME類型
    /// </summary>
    public HashSet<string> BlockedMimeTypes { get; set; } = new HashSet<string>();

    /// <summary>
    /// 是否啟用內容掃描
    /// </summary>
    public bool EnableContentScanning { get; set; } = true;

    /// <summary>
    /// 是否啟用雜湊驗證
    /// </summary>
    public bool EnableHashValidation { get; set; } = false;

    /// <summary>
    /// IP白名單
    /// </summary>
    public HashSet<string> AllowedIpAddresses { get; set; } = new HashSet<string>();

    /// <summary>
    /// 是否啟用IP限制
    /// </summary>
    public bool EnableIpRestriction { get; set; } = false;

    /// <summary>
    /// 危險檔案名稱模式
    /// </summary>
    public List<string> DangerousFilePatterns { get; set; } = new List<string>();

    /// <summary>
    /// 不安全字元
    /// </summary>
    public HashSet<char> UnsafeCharacters { get; set; } = new HashSet<char>();
}

/// <summary>
/// 安全錯誤代碼
/// </summary>
public enum SecurityErrorCode
{
    None = 0,
    InvalidPath = 1,
    PathTraversalAttack = 2,
    UnauthorizedAccess = 3,
    FileTypeNotAllowed = 4,
    FileSizeExceeded = 5,
    MaliciousContentDetected = 6,
    IntegrityCheckFailed = 7,
    IpNotAllowed = 8,
    DangerousFileName = 9,
    UnsafeCharacters = 10
}

/// <summary>
/// 威脅類型
/// </summary>
public enum ThreatType
{
    Virus,
    Malware,
    Trojan,
    Script,
    Executable,
    Suspicious
}

/// <summary>
/// 風險等級
/// </summary>
public enum RiskLevel
{
    Low,
    Medium,
    High,
    Critical
}

/// <summary>
/// 雜湊演算法類型
/// </summary>
public enum HashAlgorithmType
{
    MD5,
    SHA1,
    SHA256,
    SHA512
}

/// <summary>
/// 檔案操作類型
/// </summary>
public enum FileOperation
{
    Read,
    Write,
    Delete,
    Create,
    Modify,
    Rename,
    Copy,
    Move,
    Upload,
    Download,
    StartWatching,
    StopWatching,
    Unknown
}

/// <summary>
/// 操作結果
/// </summary>
public enum OperationResult
{
    Success,
    Failed,
    Unauthorized,
    NotFound
}


/// <summary>
/// 審計日誌 DTO
/// </summary>
public class FileAuditLogDto
{
    /// <summary>
    /// 日誌ID
    /// </summary>
    public string Id { get; set; }

    /// <summary>
    /// 使用者ID
    /// </summary>
    public string UserId { get; set; }

    /// <summary>
    /// 事件類型
    /// </summary>
    public string EventType { get; set; }

    /// <summary>
    /// 操作類型
    /// </summary>
    public FileOperation? Operation { get; set; }

    /// <summary>
    /// 檔案路徑
    /// </summary>
    public string FilePath { get; set; }

    /// <summary>
    /// 操作結果
    /// </summary>
    public OperationResult? Result { get; set; }

    /// <summary>
    /// 事件描述
    /// </summary>
    public string Description { get; set; }

    /// <summary>
    /// 嚴重等級
    /// </summary>
    public EventSeverity Severity { get; set; }

    /// <summary>
    /// IP地址
    /// </summary>
    public string IpAddress { get; set; }

    /// <summary>
    /// 發生時間
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// 額外資訊
    /// </summary>
    public Dictionary<string, object> AdditionalInfo { get; set; }

    /// <summary>
    /// 使用者代理
    /// </summary>
    public string UserAgent { get; set; }

    /// <summary>
    /// 會話ID
    /// </summary>
    public string SessionId { get; set; }
}

/// <summary>
/// 審計日誌查詢條件
/// </summary>
public class FileAuditLogFilter
{
    /// <summary>
    /// 使用者ID
    /// </summary>
    public string UserId { get; set; }

    /// <summary>
    /// 檔案路徑（支援萬用字元）
    /// </summary>
    public string FilePath { get; set; }

    /// <summary>
    /// 操作類型
    /// </summary>
    public FileOperation? Operation { get; set; }

    /// <summary>
    /// 操作結果
    /// </summary>
    public OperationResult? Result { get; set; }

    /// <summary>
    /// 事件類型
    /// </summary>
    public string EventType { get; set; }

    /// <summary>
    /// 嚴重等級
    /// </summary>
    public EventSeverity? Severity { get; set; }

    /// <summary>
    /// IP地址
    /// </summary>
    public string IpAddress { get; set; }

    /// <summary>
    /// 開始時間
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// 結束時間
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// 關鍵字搜尋（搜尋描述和額外資訊）
    /// </summary>
    public string Keyword { get; set; }

    /// <summary>
    /// 分頁大小
    /// </summary>
    [Range(1, 1000)]
    public int PageSize { get; set; } = 100;

    /// <summary>
    /// 頁碼
    /// </summary>
    [Range(0, int.MaxValue)]
    public int PageIndex { get; set; } = 0;

    /// <summary>
    /// 排序欄位
    /// </summary>
    public LogSortBy SortBy { get; set; } = LogSortBy.Timestamp;

    /// <summary>
    /// 排序方向
    /// </summary>
    public FileDto.SortDirection SortDirection { get; set; } = FileDto.SortDirection.Descending;
}

/// <summary>
/// 分頁結果
/// </summary>
public class PagedResult<T>
{
    /// <summary>
    /// 資料項目
    /// </summary>
    public IEnumerable<T> Items { get; set; }

    /// <summary>
    /// 總記錄數
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// 分頁大小
    /// </summary>
    public int PageSize { get; set; }

    /// <summary>
    /// 當前頁碼
    /// </summary>
    public int PageIndex { get; set; }

    /// <summary>
    /// 總頁數
    /// </summary>
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);

    /// <summary>
    /// 是否有下一頁
    /// </summary>
    public bool HasNextPage => PageIndex < TotalPages - 1;

    /// <summary>
    /// 是否有上一頁
    /// </summary>
    public bool HasPreviousPage => PageIndex > 0;
}
/// <summary>
/// 使用者操作統計
/// </summary>
public class UserOperationStatistics
{
    /// <summary>
    /// 使用者ID
    /// </summary>
    public string UserId { get; set; }

    /// <summary>
    /// 統計期間
    /// </summary>
    public DateRange Period { get; set; }

    /// <summary>
    /// 總操作次數
    /// </summary>
    public int TotalOperations { get; set; }

    /// <summary>
    /// 成功操作次數
    /// </summary>
    public int SuccessfulOperations { get; set; }

    /// <summary>
    /// 失敗操作次數
    /// </summary>
    public int FailedOperations { get; set; }

    /// <summary>
    /// 按操作類型統計
    /// </summary>
    public Dictionary<FileOperation, int> OperationCounts { get; set; }

    /// <summary>
    /// 按日期統計
    /// </summary>
    public Dictionary<DateTime, int> DailyOperations { get; set; }

    /// <summary>
    /// 最常操作的檔案
    /// </summary>
    public IEnumerable<FileAccessCount> MostAccessedFiles { get; set; }
}

/// <summary>
/// 系統操作統計
/// </summary>
public class SystemOperationStatistics
{
    /// <summary>
    /// 統計期間
    /// </summary>
    public DateRange Period { get; set; }

    /// <summary>
    /// 總操作次數
    /// </summary>
    public int TotalOperations { get; set; }

    /// <summary>
    /// 活躍使用者數
    /// </summary>
    public int ActiveUsers { get; set; }

    /// <summary>
    /// 按操作類型統計
    /// </summary>
    public Dictionary<FileOperation, int> OperationCounts { get; set; }

    /// <summary>
    /// 按結果統計
    /// </summary>
    public Dictionary<OperationResult, int> ResultCounts { get; set; }

    /// <summary>
    /// 安全事件統計
    /// </summary>
    public Dictionary<SecurityEventType, int> SecurityEventCounts { get; set; }

    /// <summary>
    /// 每小時操作統計
    /// </summary>
    public Dictionary<int, int> HourlyOperations { get; set; }

    /// <summary>
    /// 最活躍的使用者
    /// </summary>
    public IEnumerable<UserActivityCount> MostActiveUsers { get; set; }
}
/// <summary>
/// 匯出結果
/// </summary>
public class ExportResult
{
    /// <summary>
    /// 檔案路徑
    /// </summary>
    public string FilePath { get; set; }

    /// <summary>
    /// 檔案名稱
    /// </summary>
    public string FileName { get; set; }

    /// <summary>
    /// 匯出格式
    /// </summary>
    public ExportFormat Format { get; set; }

    /// <summary>
    /// 檔案大小
    /// </summary>
    public long FileSize { get; set; }

    /// <summary>
    /// 記錄數量
    /// </summary>
    public int RecordCount { get; set; }

    /// <summary>
    /// 匯出時間
    /// </summary>
    public DateTime ExportTime { get; set; }
}
/// <summary>
/// 清理結果
/// </summary>
public class CleanupResult
{
    /// <summary>
    /// 清理的記錄數
    /// </summary>
    public int DeletedRecords { get; set; }

    /// <summary>
    /// 釋放的空間大小
    /// </summary>
    public long FreedSpaceBytes { get; set; }

    /// <summary>
    /// 清理時間
    /// </summary>
    public DateTime CleanupTime { get; set; }

    /// <summary>
    /// 保留天數
    /// </summary>
    public int RetentionDays { get; set; }
}

/// <summary>
/// 審計日誌摘要
/// </summary>
public class AuditLogSummary
{
    /// <summary>
    /// 總記錄數
    /// </summary>
    public int TotalRecords { get; set; }

    /// <summary>
    /// 今日記錄數
    /// </summary>
    public int TodayRecords { get; set; }

    /// <summary>
    /// 本週記錄數
    /// </summary>
    public int WeekRecords { get; set; }

    /// <summary>
    /// 本月記錄數
    /// </summary>
    public int MonthRecords { get; set; }

    /// <summary>
    /// 資料庫大小
    /// </summary>
    public long DatabaseSizeBytes { get; set; }

    /// <summary>
    /// 最新記錄時間
    /// </summary>
    public DateTime? LatestRecordTime { get; set; }

    /// <summary>
    /// 最舊記錄時間
    /// </summary>
    public DateTime? OldestRecordTime { get; set; }

    /// <summary>
    /// 按嚴重等級統計
    /// </summary>
    public Dictionary<EventSeverity, int> SeverityCounts { get; set; }

    /// <summary>
    /// 最近警告和錯誤
    /// </summary>
    public IEnumerable<FileAuditLogDto> RecentWarningsAndErrors { get; set; }
}


/// <summary>
/// 輔助類別
/// </summary>
public class DateRange
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

public class FileAccessCount
{
    public string FilePath { get; set; }
    public int AccessCount { get; set; }
}

public class UserActivityCount
{
    public string UserId { get; set; }
    public int OperationCount { get; set; }
}

/// <summary>
/// 列舉定義
/// </summary>
public enum SecurityEventType
{
    LoginAttempt,
    LoginSuccess,
    LoginFailure,
    AccessDenied,
    UnauthorizedAccess,
    SuspiciousActivity,
    MaliciousFileDetected,
    PathTraversalAttempt,
    FileTypeBlocked,
    FileSizeExceeded,
    IpBlocked,
    SecurityScanFailed
}

public enum SystemEventType
{
    ServiceStarted,
    ServiceStopped,
    WatcherStarted,
    WatcherStopped,
    CacheCleared,
    ConfigurationChanged,
    DatabaseMaintenance,
    LogCleanup,
    BackupCreated,
    SystemError
}

public enum EventSeverity
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum ExportFormat
{
    Json,
    Csv,
    Excel,
    Xml
}

public enum LogSortBy
{
    Timestamp,
    UserId,
    Operation,
    FilePath,
    Severity,
    Result
}


/// <summary>
/// 磁碟空間資訊 DTO
/// </summary>
public class DriveSpaceInfoDto
{
    /// <summary>
    /// 磁碟名稱
    /// </summary>
    public string DriveName { get; set; }

    /// <summary>
    /// 檔案系統格式
    /// </summary>
    public string DriveFormat { get; set; }

    /// <summary>
    /// 磁碟類型
    /// </summary>
    public string DriveType { get; set; }

    /// <summary>
    /// 總容量
    /// </summary>
    public long TotalSize { get; set; }

    /// <summary>
    /// 總剩餘空間
    /// </summary>
    public long TotalFreeSpace { get; set; }

    /// <summary>
    /// 可用空間
    /// </summary>
    public long AvailableFreeSpace { get; set; }

    /// <summary>
    /// 使用率百分比
    /// </summary>
    public double UsagePercentage { get; set; }
}
    /// <summary>
    /// 檔案項目 DTO
    /// </summary>
    /// <summary>
    /// 檔案項目 DTO
    /// </summary>
    public class FileItemDto
    {
        /// <summary>
        /// 檔案名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 相對路徑
        /// </summary>
        public string Path { get; set; }

        /// <summary>
        /// 完整路徑
        /// </summary>
        public string FullPath { get; set; }

        /// <summary>
        /// 副檔名
        /// </summary>
        public string Extension { get; set; }

        /// <summary>
        /// 檔案大小（bytes）
        /// </summary>
        public long Size { get; set; }

        /// <summary>
        /// 格式化的檔案大小
        /// </summary>
        public string FormattedSize { get; set; }

        /// <summary>
        /// 建立時間
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// 修改時間
        /// </summary>
        public DateTime ModifiedAt { get; set; }

        /// <summary>
        /// 存取時間
        /// </summary>
        public DateTime AccessedAt { get; set; }

        /// <summary>
        /// 是否為目錄
        /// </summary>
        public bool IsDirectory { get; set; }

        /// <summary>
        /// 是否為唯讀
        /// </summary>
        public bool IsReadOnly { get; set; }

        /// <summary>
        /// 是否為隱藏檔案
        /// </summary>
        public bool IsHidden { get; set; }

        /// <summary>
        /// MIME 類型
        /// </summary>
        public string MimeType { get; set; }

        /// <summary>
        /// 檔案屬性
        /// </summary>
        public FileAttributes Attributes { get; set; }

        /// <summary>
        /// 檔案雜湊值（SHA256）
        /// </summary>
        public string Hash { get; set; }

        /// <summary>
        /// 父目錄路徑
        /// </summary>
        public string ParentPath { get; set; }

        /// <summary>
        /// 檔案圖示類型
        /// </summary>
        public string IconType { get; set; }

        /// <summary>
        /// 是否可預覽
        /// </summary>
        public bool CanPreview { get; set; }

        /// <summary>
        /// 子項目數量（如果是目錄）
        /// </summary>
        public int? ChildCount { get; set; }
    }

    /// <summary>
    /// 檔案列表選項
    /// </summary>
    public class FileListOptions
    {
        /// <summary>
        /// 是否包含隱藏檔案
        /// </summary>
        public bool IncludeHidden { get; set; } = false;

        /// <summary>
        /// 是否遞迴列出子目錄
        /// </summary>
        public bool Recursive { get; set; } = false;

        /// <summary>
        /// 分頁大小
        /// </summary>
        public int PageSize { get; set; } = 100;

        /// <summary>
        /// 頁碼
        /// </summary>
        public int PageIndex { get; set; } = 0;

        /// <summary>
        /// 排序方式
        /// </summary>
        public FileSortBy SortBy { get; set; } = FileSortBy.Name;

        /// <summary>
        /// 排序方向
        /// </summary>
        public SortDirection SortDirection { get; set; } = SortDirection.Ascending;

        /// <summary>
        /// 檔案類型篩選
        /// </summary>
        public IEnumerable<string> FileExtensions { get; set; }

        /// <summary>
        /// 是否計算雜湊值
        /// </summary>
        public bool CalculateHash { get; set; } = false;

        /// <summary>
        /// 是否取得預覽資訊
        /// </summary>
        public bool IncludePreviewInfo { get; set; } = false;

        /// <summary>
        /// 最小檔案大小篩選
        /// </summary>
        public long? MinSize { get; set; }

        /// <summary>
        /// 最大檔案大小篩選
        /// </summary>
        public long? MaxSize { get; set; }

        /// <summary>
        /// 修改時間篩選 - 開始時間
        /// </summary>
        public DateTime? ModifiedAfter { get; set; }

        /// <summary>
        /// 修改時間篩選 - 結束時間
        /// </summary>
        public DateTime? ModifiedBefore { get; set; }
        
        public bool IncludeMissingFiles { get; set; } = false;
        public bool IncludeHash { get; set; } = false;
    }

    /// <summary>
    /// 上傳選項
    /// </summary>
    public class UploadOptions
    {
        /// <summary>
        /// 是否覆蓋現有檔案
        /// </summary>
        public bool Overwrite { get; set; } = false;

        /// <summary>
        /// 是否自動建立目錄
        /// </summary>
        public bool CreateDirectory { get; set; } = true;

        /// <summary>
        /// 是否驗證檔案完整性
        /// </summary>
        public bool ValidateIntegrity { get; set; } = false;

        /// <summary>
        /// 預期的檔案雜湊值
        /// </summary>
        public string ExpectedHash { get; set; }

        /// <summary>
        /// 雜湊演算法
        /// </summary>
        public HashAlgorithmType HashAlgorithm { get; set; } = HashAlgorithmType.SHA256;

        /// <summary>
        /// 是否進行病毒掃描
        /// </summary>
        public bool ScanForVirus { get; set; } = true;

        /// <summary>
        /// 自訂檔案名稱
        /// </summary>
        public string? CustomFileName { get; set; }
        
        public string? Description { get; set; }

        /// <summary>
        /// 上傳完成後是否啟動監控
        /// </summary>
        public bool StartWatchingAfterUpload { get; set; } = false;

        /// <summary>
        /// 進度回調
        /// </summary>
        public IProgress<UploadProgressInfo>? ProgressCallback { get; set; }
    }

    /// <summary>
    /// 搜尋選項
    /// </summary>
    public class SearchOptions
    {
        /// <summary>
        /// 搜尋類型
        /// </summary>
        public SearchType SearchType { get; set; } = SearchType.FileName;

        /// <summary>
        /// 是否區分大小寫
        /// </summary>
        public bool CaseSensitive { get; set; } = false;

        /// <summary>
        /// 是否包含子目錄
        /// </summary>
        public bool IncludeSubdirectories { get; set; } = true;

        /// <summary>
        /// 檔案類型篩選
        /// </summary>
        public IEnumerable<string> FileExtensions { get; set; }

        /// <summary>
        /// 檔案大小範圍
        /// </summary>
        public (long? Min, long? Max) SizeRange { get; set; }

        /// <summary>
        /// 修改時間範圍
        /// </summary>
        public (DateTime? Start, DateTime? End) DateRange { get; set; }

        /// <summary>
        /// 最大結果數量
        /// </summary>
        public int MaxResults { get; set; } = 1000;
    }

    /// <summary>
    /// 上傳結果
    /// </summary>
    public class UploadResult
    {
        public int Id { get; set; }
        /// <summary>
        /// 檔案路徑
        /// </summary>
        public string FilePath { get; set; }

        /// <summary>
        /// 原始檔案名稱
        /// </summary>
        public string OriginalFileName { get; set; }

        /// <summary>
        /// 儲存的檔案名稱
        /// </summary>
        public string SavedFileName { get; set; }

        /// <summary>
        /// 檔案大小
        /// </summary>
        public long FileSize { get; set; }

        /// <summary>
        /// 檔案雜湊值
        /// </summary>
        public string FileHash { get; set; }

        /// <summary>
        /// 上傳時間
        /// </summary>
        public DateTime UploadTime { get; set; }

        /// <summary>
        /// 安全掃描結果
        /// </summary>
        public SecurityScanResult SecurityScanResult { get; set; }

        /// <summary>
        /// 是否需要人工審核
        /// </summary>
        public bool RequiresManualReview { get; set; }
    }

    /// <summary>
    /// 批次上傳結果
    /// </summary>
    public class BatchUploadResult
    {
        /// <summary>
        /// 總檔案數
        /// </summary>
        public int TotalFiles { get; set; }

        /// <summary>
        /// 成功上傳數
        /// </summary>
        public int SuccessCount { get; set; }

        /// <summary>
        /// 失敗上傳數
        /// </summary>
        public int FailureCount { get; set; }

        /// <summary>
        /// 成功上傳的檔案
        /// </summary>
        public IEnumerable<UploadResult> SuccessfulUploads { get; set; }

        /// <summary>
        /// 失敗的檔案及錯誤訊息
        /// </summary>
        public Dictionary<string, string> FailedUploads { get; set; }

        /// <summary>
        /// 總上傳大小
        /// </summary>
        public long TotalSize { get; set; }

        /// <summary>
        /// 上傳耗時
        /// </summary>
        public TimeSpan Duration { get; set; }
    }

    /// <summary>
    /// 檔案下載結果
    /// </summary>
    public class FileDownloadResult
    {
        /// <summary>
        /// 檔案串流
        /// </summary>
        public Stream FileStream { get; set; }

        /// <summary>
        /// 檔案名稱
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// MIME 類型
        /// </summary>
        public string MimeType { get; set; }

        /// <summary>
        /// 檔案大小
        /// </summary>
        public long FileSize { get; set; }

        /// <summary>
        /// 最後修改時間
        /// </summary>
        public DateTime LastModified { get; set; }

        /// <summary>
        /// ETag
        /// </summary>
        public string ETag { get; set; }
    }

    /// <summary>
    /// 批次操作請求
    /// </summary>
    public class BatchOperationRequest
    {
        /// <summary>
        /// 操作類型
        /// </summary>
        public BatchOperationType OperationType { get; set; }

        /// <summary>
        /// 來源路徑列表
        /// </summary>
        public IEnumerable<string> SourcePaths { get; set; }

        /// <summary>
        /// 目標路徑
        /// </summary>
        public string DestinationPath { get; set; }

        /// <summary>
        /// 是否覆蓋
        /// </summary>
        public bool Overwrite { get; set; } = false;

        /// <summary>
        /// 是否遞迴處理目錄
        /// </summary>
        public bool Recursive { get; set; } = false;

        /// <summary>
        /// 進度回調
        /// </summary>
        public IProgress<BatchOperationProgress> ProgressCallback { get; set; }
    }

    /// <summary>
    /// 批次操作結果
    /// </summary>
    public class BatchOperationResult
    {
        /// <summary>
        /// 操作ID
        /// </summary>
        public string OperationId { get; set; }

        /// <summary>
        /// 操作類型
        /// </summary>
        public BatchOperationType OperationType { get; set; }

        /// <summary>
        /// 總項目數
        /// </summary>
        public int TotalItems { get; set; }

        /// <summary>
        /// 成功項目數
        /// </summary>
        public int SuccessCount { get; set; }

        /// <summary>
        /// 失敗項目數
        /// </summary>
        public int FailureCount { get; set; }

        /// <summary>
        /// 跳過項目數
        /// </summary>
        public int SkippedCount { get; set; }

        /// <summary>
        /// 成功處理的項目
        /// </summary>
        public IEnumerable<string> SuccessfulItems { get; set; }

        /// <summary>
        /// 失敗的項目及錯誤訊息
        /// </summary>
        public Dictionary<string, string> FailedItems { get; set; }

        /// <summary>
        /// 操作開始時間
        /// </summary>
        public DateTime StartTime { get; set; }

        /// <summary>
        /// 操作結束時間
        /// </summary>
        public DateTime EndTime { get; set; }

        /// <summary>
        /// 操作耗時
        /// </summary>
        public TimeSpan Duration => EndTime - StartTime;

        /// <summary>
        /// 是否完全成功
        /// </summary>
        public bool IsCompletelySuccessful => FailureCount == 0;
    }

    /// <summary>
    /// 目錄大小資訊
    /// </summary>
    public class DirectorySizeInfo
    {
        /// <summary>
        /// 目錄路徑
        /// </summary>
        public string DirectoryPath { get; set; }

        /// <summary>
        /// 總大小（bytes）
        /// </summary>
        public long TotalSize { get; set; }

        /// <summary>
        /// 格式化的大小
        /// </summary>
        public string FormattedSize { get; set; }

        /// <summary>
        /// 檔案數量
        /// </summary>
        public int FileCount { get; set; }

        /// <summary>
        /// 目錄數量
        /// </summary>
        public int DirectoryCount { get; set; }

        /// <summary>
        /// 計算時間
        /// </summary>
        public DateTime CalculatedAt { get; set; }

        /// <summary>
        /// 計算耗時
        /// </summary>
        public TimeSpan CalculationDuration { get; set; }

        /// <summary>
        /// 最大檔案
        /// </summary>
        public FileItemDto LargestFile { get; set; }

        /// <summary>
        /// 按檔案類型分組的大小統計
        /// </summary>
        public Dictionary<string, FileSizeByType> SizeByFileType { get; set; }
    }

    /// <summary>
    /// 按檔案類型的大小統計
    /// </summary>
    public class FileSizeByType
    {
        /// <summary>
        /// 檔案類型
        /// </summary>
        public string FileType { get; set; }

        /// <summary>
        /// 總大小
        /// </summary>
        public long TotalSize { get; set; }

        /// <summary>
        /// 檔案數量
        /// </summary>
        public int FileCount { get; set; }

        /// <summary>
        /// 平均大小
        /// </summary>
        public long AverageSize => FileCount > 0 ? TotalSize / FileCount : 0;
    }

    /// <summary>
    /// 上傳進度資訊
    /// </summary>
    public class UploadProgressInfo
    {
        /// <summary>
        /// 檔案名稱
        /// </summary>
        public string FileName { get; set; }

        /// <summary>
        /// 已上傳位元組數
        /// </summary>
        public long BytesUploaded { get; set; }

        /// <summary>
        /// 總位元組數
        /// </summary>
        public long TotalBytes { get; set; }

        /// <summary>
        /// 完成百分比
        /// </summary>
        public double PercentComplete => TotalBytes > 0 ? (double)BytesUploaded / TotalBytes * 100 : 0;

        /// <summary>
        /// 上傳速度（bytes/second）
        /// </summary>
        public long UploadSpeed { get; set; }

        /// <summary>
        /// 預估剩餘時間
        /// </summary>
        public TimeSpan? EstimatedTimeRemaining { get; set; }
    }

    /// <summary>
    /// 批次操作進度
    /// </summary>
    public class BatchOperationProgress
    {
        /// <summary>
        /// 當前處理的項目
        /// </summary>
        public string CurrentItem { get; set; }

        /// <summary>
        /// 已處理項目數
        /// </summary>
        public int ProcessedCount { get; set; }

        /// <summary>
        /// 總項目數
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// 完成百分比
        /// </summary>
        public double PercentComplete => TotalCount > 0 ? (double)ProcessedCount / TotalCount * 100 : 0;

        /// <summary>
        /// 成功項目數
        /// </summary>
        public int SuccessCount { get; set; }

        /// <summary>
        /// 失敗項目數
        /// </summary>
        public int FailureCount { get; set; }
    }

    /// <summary>
    /// 列舉定義
    /// </summary>
    public enum FileSortBy
    {
        Name,
        Size,
        ModifiedDate,
        CreatedDate,
        Extension,
        Type
    }

    public enum SortDirection
    {
        Ascending,
        Descending
    }

    public enum SearchType
    {
        FileName,
        FileContent,
        Both
    }

    public enum BatchOperationType
    {
        Delete,
        Move,
        Copy,
        Rename
    }
    
        /// <summary>
    /// 縮圖尺寸
    /// </summary>
    public enum ThumbnailSize
    {
        Small = 64,    // 64x64
        Medium = 128,  // 128x128
        Large = 256,   // 256x256
        XLarge = 512   // 512x512
    }

    /// <summary>
    /// 快取清理結果
    /// </summary>
    public class CacheCleanupResult
    {
        /// <summary>
        /// 清理的項目數
        /// </summary>
        public int CleanedItems { get; set; }

        /// <summary>
        /// 釋放的記憶體大小（估算）
        /// </summary>
        public long FreedMemoryBytes { get; set; }

        /// <summary>
        /// 清理時間
        /// </summary>
        public DateTime CleanupTime { get; set; }

        /// <summary>
        /// 清理耗時
        /// </summary>
        public TimeSpan Duration { get; set; }

        /// <summary>
        /// 清理的快取類型統計
        /// </summary>
        public Dictionary<string, int> CleanedByType { get; set; } = new Dictionary<string, int>();
    }

    /// <summary>
    /// 快取統計資訊
    /// </summary>
    public class CacheStatistics
    {
        /// <summary>
        /// 總快取項目數
        /// </summary>
        public int TotalItems { get; set; }

        /// <summary>
        /// 估算的記憶體使用量
        /// </summary>
        public long EstimatedMemoryUsage { get; set; }

        /// <summary>
        /// 快取命中次數
        /// </summary>
        public long HitCount { get; set; }

        /// <summary>
        /// 快取未命中次數
        /// </summary>
        public long MissCount { get; set; }

        /// <summary>
        /// 命中率
        /// </summary>
        public double HitRate => (HitCount + MissCount) > 0 ? (double)HitCount / (HitCount + MissCount) * 100 : 0;

        /// <summary>
        /// 快取項目類型統計
        /// </summary>
        public Dictionary<string, int> ItemsByType { get; set; } = new Dictionary<string, int>();

        /// <summary>
        /// 最後清理時間
        /// </summary>
        public DateTime? LastCleanupTime { get; set; }

        /// <summary>
        /// 最大記憶體限制
        /// </summary>
        public long MaxMemoryLimit { get; set; }

        /// <summary>
        /// 記憶體使用率
        /// </summary>
        public double MemoryUsagePercentage => MaxMemoryLimit > 0 ? (double)EstimatedMemoryUsage / MaxMemoryLimit * 100 : 0;
    }

    /// <summary>
    /// 快取預熱結果
    /// </summary>
    public class CacheWarmupResult
    {
        /// <summary>
        /// 預熱的路徑數
        /// </summary>
        public int ProcessedPaths { get; set; }

        /// <summary>
        /// 成功快取的項目數
        /// </summary>
        public int SuccessfulItems { get; set; }

        /// <summary>
        /// 失敗的項目數
        /// </summary>
        public int FailedItems { get; set; }

        /// <summary>
        /// 預熱耗時
        /// </summary>
        public TimeSpan Duration { get; set; }

        /// <summary>
        /// 失敗的路徑及錯誤訊息
        /// </summary>
        public Dictionary<string, string> FailedPaths { get; set; } = new Dictionary<string, string>();
    }

    /// <summary>
    /// 快取項目
    /// </summary>
    internal class CacheItem<T>
    {
        /// <summary>
        /// 快取值
        /// </summary>
        public T Value { get; set; }

        /// <summary>
        /// 建立時間
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// 過期時間
        /// </summary>
        public DateTime? ExpiresAt { get; set; }

        /// <summary>
        /// 最後存取時間
        /// </summary>
        public DateTime LastAccessedAt { get; set; }

        /// <summary>
        /// 存取次數
        /// </summary>
        public int AccessCount { get; set; }

        /// <summary>
        /// 估算的大小
        /// </summary>
        public long EstimatedSize { get; set; }

        /// <summary>
        /// 快取類型
        /// </summary>
        public string CacheType { get; set; }

        /// <summary>
        /// 是否已過期
        /// </summary>
        public bool IsExpired => ExpiresAt.HasValue && DateTime.Now > ExpiresAt.Value;
    }

    /// <summary>
    /// 快取設定
    /// </summary>
    public class FileCacheSettings
    {
        /// <summary>
        /// 是否啟用快取
        /// </summary>
        public bool EnableCache { get; set; } = true;

        /// <summary>
        /// 預設過期時間（分鐘）
        /// </summary>
        public int DefaultExpirationMinutes { get; set; } = 30;

        /// <summary>
        /// 檔案資訊快取過期時間（分鐘）
        /// </summary>
        public int FileInfoExpirationMinutes { get; set; } = 15;

        /// <summary>
        /// 目錄列表快取過期時間（分鐘）
        /// </summary>
        public int DirectoryListingExpirationMinutes { get; set; } = 10;

        /// <summary>
        /// 檔案雜湊快取過期時間（分鐘）
        /// </summary>
        public int FileHashExpirationMinutes { get; set; } = 60;

        /// <summary>
        /// 縮圖快取過期時間（分鐘）
        /// </summary>
        public int ThumbnailExpirationMinutes { get; set; } = 120;

        /// <summary>
        /// 搜尋結果快取過期時間（分鐘）
        /// </summary>
        public int SearchResultsExpirationMinutes { get; set; } = 5;

        /// <summary>
        /// 最大記憶體使用量（MB）
        /// </summary>
        public int MaxMemoryUsageMB { get; set; } = 100;

        /// <summary>
        /// 自動清理間隔（分鐘）
        /// </summary>
        public int AutoCleanupIntervalMinutes { get; set; } = 30;

        /// <summary>
        /// 是否啟用統計
        /// </summary>
        public bool EnableStatistics { get; set; } = true;

        /// <summary>
        /// 最大快取項目數
        /// </summary>
        public int MaxCacheItems { get; set; } = 10000;

        /// <summary>
        /// 是否使用 LRU 策略
        /// </summary>
        public bool UseLRUEviction { get; set; } = true;
    }
    /// <summary>
    /// 預熱選項
    /// </summary>
    public class WarmupOptions
    {
        /// <summary>
        /// 是否預熱檔案資訊
        /// </summary>
        public bool WarmupFileInfo { get; set; } = true;

        /// <summary>
        /// 是否預熱目錄列表
        /// </summary>
        public bool WarmupDirectoryListing { get; set; } = true;

        /// <summary>
        /// 是否預熱檔案雜湊
        /// </summary>
        public bool WarmupFileHash { get; set; } = false;

        /// <summary>
        /// 是否預熱縮圖
        /// </summary>
        public bool WarmupThumbnails { get; set; } = false;

        /// <summary>
        /// 最大並行度
        /// </summary>
        public int MaxParallelism { get; set; } = 4;

        /// <summary>
        /// 預熱超時時間（秒）
        /// </summary>
        public int TimeoutSeconds { get; set; } = 300;
    }
    
    
        /// <summary>
    /// 預覽選項
    /// </summary>
    public class PreviewOptions
    {
        /// <summary>
        /// 預覽類型
        /// </summary>
        public PreviewType PreviewType { get; set; } = PreviewType.Auto;

        /// <summary>
        /// 最大預覽大小
        /// </summary>
        public int MaxSize { get; set; } = 1024;

        /// <summary>
        /// 品質設定 (1-100)
        /// </summary>
        public int Quality { get; set; } = 80;

        /// <summary>
        /// 是否使用快取
        /// </summary>
        public bool UseCache { get; set; } = true;

        /// <summary>
        /// 快取過期時間
        /// </summary>
        public TimeSpan? CacheExpiration { get; set; }

        /// <summary>
        /// 輸出格式
        /// </summary>
        public string OutputFormat { get; set; } = "JPEG";
    }

    /// <summary>
    /// 縮圖選項
    /// </summary>
    public class ThumbnailOptions
    {
        /// <summary>
        /// 品質設定 (1-100)
        /// </summary>
        public int Quality { get; set; } = 85;

        /// <summary>
        /// 是否保持比例
        /// </summary>
        public bool MaintainAspectRatio { get; set; } = true;

        /// <summary>
        /// 背景顏色 (用於填充)
        /// </summary>
        public string BackgroundColor { get; set; } = "#FFFFFF";

        /// <summary>
        /// 是否使用快取
        /// </summary>
        public bool UseCache { get; set; } = true;

        /// <summary>
        /// 快取過期時間
        /// </summary>
        public TimeSpan? CacheExpiration { get; set; }

        /// <summary>
        /// 縮圖生成模式
        /// </summary>
        public ThumbnailMode Mode { get; set; } = ThumbnailMode.Fit;
    }

    /// <summary>
    /// 文字預覽選項
    /// </summary>
    public class TextPreviewOptions
    {
        /// <summary>
        /// 最大行數
        /// </summary>
        public int MaxLines { get; set; } = 100;

        /// <summary>
        /// 最大字元數
        /// </summary>
        public int MaxCharacters { get; set; } = 10000;

        /// <summary>
        /// 編碼格式
        /// </summary>
        public Encoding Encoding { get; set; } = Encoding.UTF8;

        /// <summary>
        /// 是否檢測編碼
        /// </summary>
        public bool DetectEncoding { get; set; } = true;

        /// <summary>
        /// 是否顯示行號
        /// </summary>
        public bool ShowLineNumbers { get; set; } = false;
    }

    /// <summary>
    /// 預覽結果
    /// </summary>
    public class PreviewResult
    {
        /// <summary>
        /// 預覽資料
        /// </summary>
        public byte[] Data { get; set; }

        /// <summary>
        /// 內容類型
        /// </summary>
        public string ContentType { get; set; }

        /// <summary>
        /// 檔案大小
        /// </summary>
        public long Size { get; set; }

        /// <summary>
        /// 寬度
        /// </summary>
        public int Width { get; set; }

        /// <summary>
        /// 高度
        /// </summary>
        public int Height { get; set; }

        /// <summary>
        /// 生成時間
        /// </summary>
        public DateTime GeneratedAt { get; set; }

        /// <summary>
        /// 預覽類型
        /// </summary>
        public PreviewType PreviewType { get; set; }

        /// <summary>
        /// 是否來自快取
        /// </summary>
        public bool FromCache { get; set; }
    }

    /// <summary>
    /// 縮圖結果
    /// </summary>
    public class ThumbnailResult
    {
        /// <summary>
        /// 縮圖資料
        /// </summary>
        public byte[] Data { get; set; }

        /// <summary>
        /// 內容類型
        /// </summary>
        public string ContentType { get; set; }

        /// <summary>
        /// 檔案大小
        /// </summary>
        public long Size { get; set; }

        /// <summary>
        /// 寬度
        /// </summary>
        public int Width { get; set; }

        /// <summary>
        /// 高度
        /// </summary>
        public int Height { get; set; }

        /// <summary>
        /// 縮圖尺寸
        /// </summary>
        public ThumbnailSize ThumbnailSize { get; set; }

        /// <summary>
        /// 生成時間
        /// </summary>
        public DateTime GeneratedAt { get; set; }

        /// <summary>
        /// 是否來自快取
        /// </summary>
        public bool FromCache { get; set; }
    }

    /// <summary>
    /// 批次縮圖結果
    /// </summary>
    public class BatchThumbnailResult
    {
        /// <summary>
        /// 處理的檔案數
        /// </summary>
        public int ProcessedCount { get; set; }

        /// <summary>
        /// 成功生成的縮圖數
        /// </summary>
        public int SuccessCount { get; set; }

        /// <summary>
        /// 失敗的檔案數
        /// </summary>
        public int FailureCount { get; set; }

        /// <summary>
        /// 成功的縮圖結果
        /// </summary>
        public Dictionary<string, ThumbnailResult> SuccessResults { get; set; } = new Dictionary<string, ThumbnailResult>();

        /// <summary>
        /// 失敗的檔案及錯誤訊息
        /// </summary>
        public Dictionary<string, string> FailureResults { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// 處理耗時
        /// </summary>
        public TimeSpan Duration { get; set; }
    }

    /// <summary>
    /// 預覽資訊
    /// </summary>
    public class PreviewInfo
    {
        /// <summary>
        /// 檔案路徑
        /// </summary>
        public string FilePath { get; set; }

        /// <summary>
        /// 是否可預覽
        /// </summary>
        public bool CanPreview { get; set; }

        /// <summary>
        /// 是否可生成縮圖
        /// </summary>
        public bool CanGenerateThumbnail { get; set; }

        /// <summary>
        /// 支援的預覽類型
        /// </summary>
        public List<PreviewType> SupportedPreviewTypes { get; set; } = new List<PreviewType>();

        /// <summary>
        /// 檔案類型
        /// </summary>
        public string FileType { get; set; }

        /// <summary>
        /// MIME 類型
        /// </summary>
        public string MimeType { get; set; }

        /// <summary>
        /// 檔案大小
        /// </summary>
        public long FileSize { get; set; }
    }

    /// <summary>
    /// 文字預覽結果
    /// </summary>
    public class TextPreviewResult
    {
        /// <summary>
        /// 文字內容
        /// </summary>
        public string Content { get; set; }

        /// <summary>
        /// 行數
        /// </summary>
        public int LineCount { get; set; }

        /// <summary>
        /// 字元數
        /// </summary>
        public int CharacterCount { get; set; }

        /// <summary>
        /// 是否被截斷
        /// </summary>
        public bool IsTruncated { get; set; }

        /// <summary>
        /// 檢測到的編碼
        /// </summary>
        public string DetectedEncoding { get; set; }

        /// <summary>
        /// 檔案大小
        /// </summary>
        public long FileSize { get; set; }
    }

    /// <summary>
    /// 圖片資訊
    /// </summary>
    public class ImageInfo
    {
        /// <summary>
        /// 寬度
        /// </summary>
        public int Width { get; set; }

        /// <summary>
        /// 高度
        /// </summary>
        public int Height { get; set; }

        /// <summary>
        /// 圖片格式
        /// </summary>
        public string Format { get; set; }

        /// <summary>
        /// 色彩深度
        /// </summary>
        public int ColorDepth { get; set; }

        /// <summary>
        /// DPI 解析度
        /// </summary>
        public Double DpiX { get; set; }

        /// <summary>
        /// DPI 解析度
        /// </summary>
        public Double DpiY { get; set; }

        /// <summary>
        /// 是否有透明度
        /// </summary>
        public bool HasAlpha { get; set; }

        /// <summary>
        /// EXIF 資訊
        /// </summary>
        public Dictionary<string, string> ExifData { get; set; } = new Dictionary<string, string>();
    }

    /// <summary>
    /// 影片資訊
    /// </summary>
    public class VideoInfo
    {
        /// <summary>
        /// 影片長度（秒）
        /// </summary>
        public double Duration { get; set; }

        /// <summary>
        /// 寬度
        /// </summary>
        public int Width { get; set; }

        /// <summary>
        /// 高度
        /// </summary>
        public int Height { get; set; }

        /// <summary>
        /// 畫面率
        /// </summary>
        public double FrameRate { get; set; }

        /// <summary>
        /// 位元率
        /// </summary>
        public long BitRate { get; set; }

        /// <summary>
        /// 編解碼器
        /// </summary>
        public string Codec { get; set; }

        /// <summary>
        /// 音軌資訊
        /// </summary>
        public List<AudioTrackInfo> AudioTracks { get; set; } = new List<AudioTrackInfo>();
    }

    /// <summary>
    /// 音軌資訊
    /// </summary>
    public class AudioTrackInfo
    {
        /// <summary>
        /// 編解碼器
        /// </summary>
        public string Codec { get; set; }

        /// <summary>
        /// 位元率
        /// </summary>
        public long BitRate { get; set; }

        /// <summary>
        /// 取樣率
        /// </summary>
        public int SampleRate { get; set; }

        /// <summary>
        /// 聲道數
        /// </summary>
        public int Channels { get; set; }
    }

    /// <summary>
    /// 預覽清理結果
    /// </summary>
    public class PreviewCleanupResult
    {
        /// <summary>
        /// 清理的檔案數
        /// </summary>
        public int CleanedFiles { get; set; }

        /// <summary>
        /// 釋放的空間（位元組）
        /// </summary>
        public long FreedSpace { get; set; }

        /// <summary>
        /// 清理耗時
        /// </summary>
        public TimeSpan Duration { get; set; }

        /// <summary>
        /// 清理時間
        /// </summary>
        public DateTime CleanupTime { get; set; }
    }

    /// <summary>
    /// 列舉定義
    /// </summary>
    public enum PreviewType
    {
        Auto,
        Image,
        Text,
        Pdf,
        Video,
        Audio,
        Document
    }

    public enum ThumbnailMode
    {
        Fit,        // 完全適應，保持比例
        Fill,       // 填滿，可能裁切
        Stretch     // 拉伸，不保持比例
    }
    
    /// <summary>
    /// 檔案預覽設定
    /// </summary>
    public class FilePreviewSettings
    {
        /// <summary>
        /// 最大文字檔案大小
        /// </summary>
        public long MaxTextFileSize { get; set; } = 1024 * 1024; // 1MB

        /// <summary>
        /// 預設快取過期時間（分鐘）
        /// </summary>
        public int DefaultCacheExpirationMinutes { get; set; } = 60;

        /// <summary>
        /// 縮圖快取過期時間（分鐘）
        /// </summary>
        public int ThumbnailCacheExpirationMinutes { get; set; } = 120;

        /// <summary>
        /// 是否啟用預覽快取
        /// </summary>
        public bool EnablePreviewCache { get; set; } = true;

        /// <summary>
        /// 預設預覽品質
        /// </summary>
        public int DefaultPreviewQuality { get; set; } = 80;

        /// <summary>
        /// 預設縮圖品質
        /// </summary>
        public int DefaultThumbnailQuality { get; set; } = 85;

        /// <summary>
        /// 最大預覽尺寸
        /// </summary>
        public int MaxPreviewSize { get; set; } = 1024;
    }


    /// <summary>
    /// 壓縮選項
    /// </summary>
    public class CompressionOptions
    {
        /// <summary>
        /// 壓縮格式
        /// </summary>
        public CompressionFormat Format { get; set; } = CompressionFormat.Zip;

        /// <summary>
        /// 壓縮等級
        /// </summary>
        public CompressionLevel CompressionLevel { get; set; } = CompressionLevel.Optimal;

        /// <summary>
        /// 是否包含根目錄
        /// </summary>
        public bool IncludeRootDirectory { get; set; } = false;

        /// <summary>
        /// 密碼保護
        /// </summary>
        public string Password { get; set; }

        /// <summary>
        /// 是否覆蓋現有檔案
        /// </summary>
        public bool Overwrite { get; set; } = false;

        /// <summary>
        /// 排除的檔案模式
        /// </summary>
        public IEnumerable<string> ExcludePatterns { get; set; } = new List<string>();

        /// <summary>
        /// 最大檔案大小限制（bytes）
        /// </summary>
        public long? MaxFileSize { get; set; }

        /// <summary>
        /// 進度回調
        /// </summary>
        public IProgress<CompressionProgress> ProgressCallback { get; set; }

        /// <summary>
        /// 是否保留檔案時間戳
        /// </summary>
        public bool PreserveTimestamps { get; set; } = true;

        /// <summary>
        /// 註解
        /// </summary>
        public string Comment { get; set; }
    }

    /// <summary>
    /// 解壓縮選項
    /// </summary>
    public class ExtractionOptions
    {
        /// <summary>
        /// 密碼
        /// </summary>
        public string Password { get; set; }

        /// <summary>
        /// 是否覆蓋現有檔案
        /// </summary>
        public bool Overwrite { get; set; } = false;

        /// <summary>
        /// 是否保留目錄結構
        /// </summary>
        public bool PreserveDirectoryStructure { get; set; } = true;

        /// <summary>
        /// 進度回調
        /// </summary>
        public IProgress<ExtractionProgress> ProgressCallback { get; set; }

        /// <summary>
        /// 最大解壓縮大小限制（bytes）
        /// </summary>
        public long? MaxExtractedSize { get; set; }

        /// <summary>
        /// 是否驗證檔案完整性
        /// </summary>
        public bool VerifyIntegrity { get; set; } = true;

        /// <summary>
        /// 排除的檔案模式
        /// </summary>
        public IEnumerable<string> ExcludePatterns { get; set; } = new List<string>();
    }

    /// <summary>
    /// 壓縮結果
    /// </summary>
    public class CompressionResult
    {
        /// <summary>
        /// 輸出檔案路徑
        /// </summary>
        public string OutputPath { get; set; }

        /// <summary>
        /// 原始總大小
        /// </summary>
        public long OriginalSize { get; set; }

        /// <summary>
        /// 壓縮後大小
        /// </summary>
        public long CompressedSize { get; set; }

        /// <summary>
        /// 壓縮率（百分比）
        /// </summary>
        public double CompressionRatio => OriginalSize > 0 ? (double)(OriginalSize - CompressedSize) / OriginalSize * 100 : 0;

        /// <summary>
        /// 處理的檔案數量
        /// </summary>
        public int FileCount { get; set; }

        /// <summary>
        /// 處理的目錄數量
        /// </summary>
        public int DirectoryCount { get; set; }

        /// <summary>
        /// 壓縮格式
        /// </summary>
        public CompressionFormat Format { get; set; }

        /// <summary>
        /// 壓縮耗時
        /// </summary>
        public TimeSpan Duration { get; set; }

        /// <summary>
        /// 建立時間
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// 跳過的檔案
        /// </summary>
        public IEnumerable<string> SkippedFiles { get; set; } = new List<string>();

        /// <summary>
        /// 錯誤檔案
        /// </summary>
        public Dictionary<string, string> ErrorFiles { get; set; } = new Dictionary<string, string>();
    }

    /// <summary>
    /// 解壓縮結果
    /// </summary>
    public class ExtractionResult
    {
        /// <summary>
        /// 解壓縮目標路徑
        /// </summary>
        public string ExtractPath { get; set; }

        /// <summary>
        /// 解壓縮的檔案數量
        /// </summary>
        public int ExtractedFileCount { get; set; }

        /// <summary>
        /// 解壓縮的目錄數量
        /// </summary>
        public int ExtractedDirectoryCount { get; set; }

        /// <summary>
        /// 解壓縮總大小
        /// </summary>
        public long ExtractedSize { get; set; }

        /// <summary>
        /// 解壓縮耗時
        /// </summary>
        public TimeSpan Duration { get; set; }

        /// <summary>
        /// 解壓縮時間
        /// </summary>
        public DateTime ExtractedAt { get; set; }

        /// <summary>
        /// 跳過的檔案
        /// </summary>
        public IEnumerable<string> SkippedFiles { get; set; } = new List<string>();

        /// <summary>
        /// 錯誤檔案
        /// </summary>
        public Dictionary<string, string> ErrorFiles { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// 解壓縮的檔案列表
        /// </summary>
        public IEnumerable<string> ExtractedFiles { get; set; } = new List<string>();
    }

    /// <summary>
    /// 壓縮檔資訊
    /// </summary>
    public class ArchiveInfo
    {
        /// <summary>
        /// 壓縮檔路徑
        /// </summary>
        public string ArchivePath { get; set; }

        /// <summary>
        /// 壓縮格式
        /// </summary>
        public CompressionFormat Format { get; set; }

        /// <summary>
        /// 壓縮檔大小
        /// </summary>
        public long ArchiveSize { get; set; }

        /// <summary>
        /// 檔案數量
        /// </summary>
        public int FileCount { get; set; }

        /// <summary>
        /// 目錄數量
        /// </summary>
        public int DirectoryCount { get; set; }

        /// <summary>
        /// 未壓縮總大小
        /// </summary>
        public long UncompressedSize { get; set; }

        /// <summary>
        /// 壓縮率
        /// </summary>
        public double CompressionRatio => UncompressedSize > 0 ? (double)(UncompressedSize - ArchiveSize) / UncompressedSize * 100 : 0;

        /// <summary>
        /// 是否有密碼保護
        /// </summary>
        public bool IsPasswordProtected { get; set; }

        /// <summary>
        /// 註解
        /// </summary>
        public string Comment { get; set; }

        /// <summary>
        /// 建立時間
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// 修改時間
        /// </summary>
        public DateTime ModifiedAt { get; set; }

        /// <summary>
        /// 檔案列表
        /// </summary>
        public IEnumerable<ArchiveEntry> Entries { get; set; } = new List<ArchiveEntry>();
    }

    /// <summary>
    /// 壓縮檔項目
    /// </summary>
    public class ArchiveEntry
    {
        /// <summary>
        /// 檔案名稱
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// 完整路徑
        /// </summary>
        public string FullName { get; set; }

        /// <summary>
        /// 是否為目錄
        /// </summary>
        public bool IsDirectory { get; set; }

        /// <summary>
        /// 壓縮前大小
        /// </summary>
        public long UncompressedSize { get; set; }

        /// <summary>
        /// 壓縮後大小
        /// </summary>
        public long CompressedSize { get; set; }

        /// <summary>
        /// 最後修改時間
        /// </summary>
        public DateTime LastModified { get; set; }

        /// <summary>
        /// CRC32 校驗碼
        /// </summary>
        public uint Crc32 { get; set; }
    }

    /// <summary>
    /// 壓縮檔測試結果
    /// </summary>
    public class ArchiveTestResult
    {
        /// <summary>
        /// 是否通過測試
        /// </summary>
        public bool IsValid { get; set; }

        /// <summary>
        /// 測試的檔案數量
        /// </summary>
        public int TestedFileCount { get; set; }

        /// <summary>
        /// 錯誤的檔案數量
        /// </summary>
        public int ErrorFileCount { get; set; }

        /// <summary>
        /// 測試耗時
        /// </summary>
        public TimeSpan Duration { get; set; }

        /// <summary>
        /// 錯誤詳細資訊
        /// </summary>
        public Dictionary<string, string> Errors { get; set; } = new Dictionary<string, string>();

        /// <summary>
        /// 測試時間
        /// </summary>
        public DateTime TestedAt { get; set; }
    }

    /// <summary>
    /// 壓縮估算結果
    /// </summary>
    public class CompressionEstimate
    {
        /// <summary>
        /// 原始總大小
        /// </summary>
        public long OriginalSize { get; set; }

        /// <summary>
        /// 估算壓縮後大小
        /// </summary>
        public long EstimatedCompressedSize { get; set; }

        /// <summary>
        /// 估算壓縮率
        /// </summary>
        public double EstimatedCompressionRatio => OriginalSize > 0 ? (double)(OriginalSize - EstimatedCompressedSize) / OriginalSize * 100 : 0;

        /// <summary>
        /// 檔案數量
        /// </summary>
        public int FileCount { get; set; }

        /// <summary>
        /// 估算時間
        /// </summary>
        public DateTime EstimatedAt { get; set; }
    }

    /// <summary>
    /// 壓縮進度
    /// </summary>
    public class CompressionProgress
    {
        /// <summary>
        /// 當前處理的檔案
        /// </summary>
        public string CurrentFile { get; set; }

        /// <summary>
        /// 已處理的檔案數
        /// </summary>
        public int ProcessedFiles { get; set; }

        /// <summary>
        /// 總檔案數
        /// </summary>
        public int TotalFiles { get; set; }

        /// <summary>
        /// 已處理的位元組數
        /// </summary>
        public long ProcessedBytes { get; set; }

        /// <summary>
        /// 總位元組數
        /// </summary>
        public long TotalBytes { get; set; }

        /// <summary>
        /// 完成百分比
        /// </summary>
        public double PercentComplete => TotalBytes > 0 ? (double)ProcessedBytes / TotalBytes * 100 : 0;

        /// <summary>
        /// 當前壓縮率
        /// </summary>
        public double CurrentCompressionRatio { get; set; }
    }

    /// <summary>
    /// 解壓縮進度
    /// </summary>
    public class ExtractionProgress
    {
        /// <summary>
        /// 當前處理的檔案
        /// </summary>
        public string CurrentFile { get; set; }

        /// <summary>
        /// 已解壓縮的檔案數
        /// </summary>
        public int ExtractedFiles { get; set; }

        /// <summary>
        /// 總檔案數
        /// </summary>
        public int TotalFiles { get; set; }

        /// <summary>
        /// 已解壓縮的位元組數
        /// </summary>
        public long ExtractedBytes { get; set; }

        /// <summary>
        /// 總位元組數
        /// </summary>
        public long TotalBytes { get; set; }

        /// <summary>
        /// 完成百分比
        /// </summary>
        public double PercentComplete => TotalBytes > 0 ? (double)ExtractedBytes / TotalBytes * 100 : 0;
    }

    /// <summary>
    /// 壓縮格式資訊
    /// </summary>
    public class CompressionFormatInfo
    {
        /// <summary>
        /// 是否為壓縮檔
        /// </summary>
        public bool IsCompressed { get; set; }

        /// <summary>
        /// 壓縮格式
        /// </summary>
        public CompressionFormat? Format { get; set; }

        /// <summary>
        /// 格式名稱
        /// </summary>
        public string FormatName { get; set; }

        /// <summary>
        /// MIME 類型
        /// </summary>
        public string MimeType { get; set; }

        /// <summary>
        /// 副檔名
        /// </summary>
        public string Extension { get; set; }
    }
    
    
    /// <summary>
    /// 壓縮格式列舉
    /// </summary>
    public enum CompressionFormat
    {
        Zip,
        GZip,
        Tar,
        TarGz,
        SevenZip,
        Rar
    }
    /// <summary>
    /// 壓縮設定
    /// </summary>
    public class CompressionSettings
    {
        /// <summary>
        /// 最大壓縮檔大小（bytes）
        /// </summary>
        public long MaxArchiveSize { get; set; } = 1024 * 1024 * 1024; // 1GB

        /// <summary>
        /// 最大壓縮時間（秒）
        /// </summary>
        public int MaxCompressionTime { get; set; } = 300; // 5分鐘

        /// <summary>
        /// 預設壓縮等級
        /// </summary>
        public CompressionLevel DefaultCompressionLevel { get; set; } = CompressionLevel.Optimal;

        /// <summary>
        /// 是否啟用密碼保護
        /// </summary>
        public bool EnablePasswordProtection { get; set; } = true;

        /// <summary>
        /// 預設排除的檔案模式
        /// </summary>
        public List<string> DefaultExcludePatterns { get; set; } = new List<string>
        {
            @"\.tmp$",
            @"\.temp$",
            @"^~.*",
            @"Thumbs\.db$",
            @"\.DS_Store$"
        };

        /// <summary>
        /// 臨時檔案目錄
        /// </summary>
        public string TempDirectory { get; set; }
    }
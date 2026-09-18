namespace Forma.Application.Features.SystemInfo.DTOs;

/// <summary>
/// 系統資訊 DTO
/// </summary>
public class SystemInfoDto
{
    /// <summary>
    /// 系統版本
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// 建置時間
    /// </summary>
    public string BuildTime { get; set; } = string.Empty;

    /// <summary>
    /// 運行環境
    /// </summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>
    /// 伺服器時間
    /// </summary>
    public string ServerTime { get; set; } = string.Empty;

    /// <summary>
    /// 運行時間
    /// </summary>
    public string Uptime { get; set; } = string.Empty;

    /// <summary>
    /// 記憶體使用量
    /// </summary>
    public MemoryUsageDto MemoryUsage { get; set; } = new();

    /// <summary>
    /// 磁碟使用量
    /// </summary>
    public DiskUsageDto DiskUsage { get; set; } = new();

    /// <summary>
    /// 資料庫資訊
    /// </summary>
    public DatabaseInfoDto Database { get; set; } = new();

    /// <summary>
    /// .NET 運行時資訊
    /// </summary>
    public RuntimeInfoDto Runtime { get; set; } = new();
}

/// <summary>
/// 記憶體使用量 DTO
/// </summary>
public class MemoryUsageDto
{
    /// <summary>
    /// 總記憶體 (bytes)
    /// </summary>
    public long Total { get; set; }

    /// <summary>
    /// 已使用記憶體 (bytes)
    /// </summary>
    public long Used { get; set; }

    /// <summary>
    /// 可用記憶體 (bytes)
    /// </summary>
    public long Free { get; set; }
}

/// <summary>
/// 磁碟使用量 DTO
/// </summary>
public class DiskUsageDto
{
    /// <summary>
    /// 總磁碟空間 (bytes)
    /// </summary>
    public long Total { get; set; }

    /// <summary>
    /// 已使用磁碟空間 (bytes)
    /// </summary>
    public long Used { get; set; }

    /// <summary>
    /// 可用磁碟空間 (bytes)
    /// </summary>
    public long Free { get; set; }
}

/// <summary>
/// 資料庫資訊 DTO
/// </summary>
public class DatabaseInfoDto
{
    /// <summary>
    /// 資料庫類型
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// 資料庫版本
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// 資料庫大小 (bytes)
    /// </summary>
    public long Size { get; set; }

    /// <summary>
    /// 連線狀態
    /// </summary>
    public bool IsConnected { get; set; }
}

/// <summary>
/// .NET 運行時資訊 DTO
/// </summary>
public class RuntimeInfoDto
{
    /// <summary>
    /// .NET 版本
    /// </summary>
    public string DotNetVersion { get; set; } = string.Empty;

    /// <summary>
    /// 作業系統
    /// </summary>
    public string OperatingSystem { get; set; } = string.Empty;

    /// <summary>
    /// 處理器數量
    /// </summary>
    public int ProcessorCount { get; set; }

    /// <summary>
    /// 是否為 64 位元
    /// </summary>
    public bool Is64Bit { get; set; }
}

/// <summary>
/// 系統健康狀態 DTO
/// </summary>
public class HealthStatusDto
{
    /// <summary>
    /// 整體狀態 (Healthy, Degraded, Unhealthy)
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// 時間戳記
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// 各元件健康狀態
    /// </summary>
    public HealthComponentsDto Components { get; set; } = new();
}

/// <summary>
/// 健康狀態元件 DTO
/// </summary>
public class HealthComponentsDto
{
    /// <summary>
    /// 資料庫狀態
    /// </summary>
    public string Database { get; set; } = string.Empty;
}

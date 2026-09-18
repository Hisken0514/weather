using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.SystemInfo.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Forma.API.Controllers;

/// <summary>
/// 系統資訊 API
/// </summary>
[ApiController]
[Route("api/system-info")]
[Authorize(Policy = Policies.RequireSystemAdmin)]
public class SystemInfoController : ControllerBase
{
    private readonly IApplicationDbContext _dbContext;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SystemInfoController> _logger;
    private static readonly DateTime _startTime = DateTime.UtcNow;

    public SystemInfoController(
        IApplicationDbContext dbContext,
        IWebHostEnvironment environment,
        ILogger<SystemInfoController> logger)
    {
        _dbContext = dbContext;
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// 取得系統資訊
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(SystemInfoDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SystemInfoDto>> GetSystemInfo()
    {
        var info = new SystemInfoDto
        {
            Version = GetVersion(),
            BuildTime = GetBuildTime(),
            Environment = _environment.EnvironmentName,
            ServerTime = DateTime.UtcNow.ToString("O"),
            Uptime = GetUptime(),
            MemoryUsage = GetMemoryUsage(),
            DiskUsage = GetDiskUsage(),
            Database = await GetDatabaseInfoAsync(),
            Runtime = GetRuntimeInfo()
        };

        return Ok(info);
    }

    /// <summary>
    /// 取得健康狀態
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(HealthStatusDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(HealthStatusDto), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<HealthStatusDto>> GetHealthStatus()
    {
        var dbConnected = await CheckDatabaseConnectionAsync();

        var status = new HealthStatusDto
        {
            Status = dbConnected ? "Healthy" : "Degraded",
            Timestamp = DateTime.UtcNow,
            Components = new HealthComponentsDto
            {
                Database = dbConnected ? "Healthy" : "Unhealthy"
            }
        };

        return dbConnected ? Ok(status) : StatusCode(503, status);
    }

    private string GetVersion()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var version = assembly.GetName().Version;
        return version != null ? $"{version.Major}.{version.Minor}.{version.Build}" : "1.0.0";
    }

    private string GetBuildTime()
    {
        try
        {
            var assembly = Assembly.GetExecutingAssembly();
            var buildDate = System.IO.File.GetLastWriteTime(assembly.Location);
            return buildDate.ToString("O");
        }
        catch
        {
            return DateTime.UtcNow.ToString("O");
        }
    }

    private string GetUptime()
    {
        var uptime = DateTime.UtcNow - _startTime;

        if (uptime.TotalDays >= 1)
        {
            return $"{(int)uptime.TotalDays} days {uptime.Hours} hours";
        }
        else if (uptime.TotalHours >= 1)
        {
            return $"{(int)uptime.TotalHours} hours {uptime.Minutes} minutes";
        }
        else
        {
            return $"{(int)uptime.TotalMinutes} minutes";
        }
    }

    private MemoryUsageDto GetMemoryUsage()
    {
        var process = Process.GetCurrentProcess();
        var workingSet = process.WorkingSet64;

        // 取得系統總記憶體
        long totalMemory = 0;
        long availableMemory = 0;

        try
        {
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
            {
                // Linux: 從 /proc/meminfo 讀取
                var memInfo = System.IO.File.ReadAllLines("/proc/meminfo");
                foreach (var line in memInfo)
                {
                    if (line.StartsWith("MemTotal:"))
                    {
                        totalMemory = ParseMemInfoValue(line) * 1024; // KB to bytes
                    }
                    else if (line.StartsWith("MemAvailable:"))
                    {
                        availableMemory = ParseMemInfoValue(line) * 1024;
                    }
                }
            }
            else if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                // Windows: 使用 GC 取得託管記憶體
                totalMemory = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes;
                availableMemory = totalMemory - workingSet;
            }
            else
            {
                // 其他平台：使用進程記憶體
                totalMemory = workingSet * 2;
                availableMemory = totalMemory - workingSet;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get memory info");
            totalMemory = workingSet * 2;
            availableMemory = totalMemory - workingSet;
        }

        return new MemoryUsageDto
        {
            Total = totalMemory,
            Used = totalMemory - availableMemory,
            Free = availableMemory
        };
    }

    private long ParseMemInfoValue(string line)
    {
        var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length >= 2 && long.TryParse(parts[1], out var value))
        {
            return value;
        }
        return 0;
    }

    private DiskUsageDto GetDiskUsage()
    {
        try
        {
            // 取得應用程式所在磁碟的資訊
            var appPath = AppContext.BaseDirectory;
            var driveInfo = new DriveInfo(Path.GetPathRoot(appPath) ?? "/");

            return new DiskUsageDto
            {
                Total = driveInfo.TotalSize,
                Used = driveInfo.TotalSize - driveInfo.AvailableFreeSpace,
                Free = driveInfo.AvailableFreeSpace
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get disk info");
            return new DiskUsageDto();
        }
    }

    private async Task<DatabaseInfoDto> GetDatabaseInfoAsync()
    {
        var dbInfo = new DatabaseInfoDto
        {
            Type = "PostgreSQL"
        };

        try
        {
            // 檢查連線 - 需要透過 DbContext 來執行
            var dbContext = _dbContext as DbContext;
            if (dbContext == null)
            {
                dbInfo.IsConnected = false;
                return dbInfo;
            }

            dbInfo.IsConnected = await dbContext.Database.CanConnectAsync();

            if (dbInfo.IsConnected)
            {
                // 使用 ADO.NET 直接執行 SQL
                var connection = dbContext.Database.GetDbConnection();
                if (connection.State != System.Data.ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                // 取得 PostgreSQL 版本
                using (var versionCmd = connection.CreateCommand())
                {
                    versionCmd.CommandText = "SELECT version()";
                    var versionResult = await versionCmd.ExecuteScalarAsync();
                    if (versionResult != null)
                    {
                        var versionString = versionResult.ToString() ?? "";
                        // 解析版本，例如 "PostgreSQL 14.5 on x86_64..."
                        var versionParts = versionString.Split(' ');
                        if (versionParts.Length >= 2)
                        {
                            dbInfo.Version = versionParts[1];
                        }
                    }
                }

                // 取得資料庫大小
                using (var sizeCmd = connection.CreateCommand())
                {
                    sizeCmd.CommandText = "SELECT pg_database_size(current_database())";
                    var sizeResult = await sizeCmd.ExecuteScalarAsync();
                    if (sizeResult != null && long.TryParse(sizeResult.ToString(), out var size))
                    {
                        dbInfo.Size = size;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get database info");
            dbInfo.IsConnected = false;
        }

        return dbInfo;
    }

    private RuntimeInfoDto GetRuntimeInfo()
    {
        return new RuntimeInfoDto
        {
            DotNetVersion = RuntimeInformation.FrameworkDescription,
            OperatingSystem = RuntimeInformation.OSDescription,
            ProcessorCount = System.Environment.ProcessorCount,
            Is64Bit = System.Environment.Is64BitProcess
        };
    }

    private async Task<bool> CheckDatabaseConnectionAsync()
    {
        try
        {
            var dbContext = _dbContext as DbContext;
            if (dbContext == null)
            {
                return false;
            }
            return await dbContext.Database.CanConnectAsync();
        }
        catch
        {
            return false;
        }
    }
}

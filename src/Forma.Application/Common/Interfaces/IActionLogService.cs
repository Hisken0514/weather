namespace Forma.Application.Common.Interfaces;

/// <summary>
/// 操作日誌服務介面
/// </summary>
public interface IActionLogService
{
    /// <summary>
    /// 寫入一筆操作日誌並儲存。
    /// 呼叫端無需自行呼叫 SaveChangesAsync。
    /// </summary>
    Task LogAsync(
        string actionType,
        string actionName,
        Guid? userId = null,
        string? userName = null,
        string? entityType = null,
        string? entityId = null,
        string? entityName = null,
        string? description = null,
        string? ipAddress = null,
        bool isSuccess = true,
        string? errorMessage = null,
        CancellationToken ct = default);
}

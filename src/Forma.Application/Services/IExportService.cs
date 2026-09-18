using Forma.Application.Features.Exports.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 匯出服務介面
/// </summary>
public interface IExportService
{
    /// <summary>
    /// 建立匯出任務
    /// </summary>
    Task<ExportDto> CreateExportAsync(
        CreateExportRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得匯出任務詳情
    /// </summary>
    Task<ExportDto> GetExportByIdAsync(
        Guid exportId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 建立匯出任務請求
/// </summary>
public class CreateExportRequest
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 匯出格式 (CSV, Excel, JSON)
    /// </summary>
    public string Format { get; set; } = "CSV";

    /// <summary>
    /// 篩選條件 JSON
    /// </summary>
    public string? Filters { get; set; }

    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid CurrentUserId { get; set; }

    /// <summary>
    /// 是否為系統管理員
    /// </summary>
    public bool IsSystemAdmin { get; set; }
}

#endregion

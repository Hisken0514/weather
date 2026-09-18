using Forma.Application.Features.Reports.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 報告服務介面
/// </summary>
public interface IReportService
{
    /// <summary>
    /// 取得表單報告
    /// </summary>
    Task<ReportDto> GetFormReportAsync(
        GetFormReportRequest request,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得表單報告請求
/// </summary>
public class GetFormReportRequest
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 開始日期
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// 結束日期
    /// </summary>
    public DateTime? EndDate { get; set; }

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

using Forma.Application.Common.Models;
using Forma.Application.Features.Submissions.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 表單提交服務介面
/// </summary>
public interface ISubmissionService
{
    /// <summary>
    /// 取得表單提交列表（分頁）
    /// </summary>
    Task<PagedResult<SubmissionListDto>> GetFormSubmissionsAsync(
        GetFormSubmissionsRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得提交詳情
    /// </summary>
    Task<SubmissionDto> GetSubmissionByIdAsync(
        Guid submissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 建立表單提交
    /// </summary>
    Task<Guid> CreateSubmissionAsync(
        CreateSubmissionRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新表單提交
    /// </summary>
    Task<SubmissionDto> UpdateSubmissionAsync(
        UpdateSubmissionRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 記錄報告下載時間
    /// </summary>
    Task RecordReportDownloadedAsync(
        Guid submissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 刪除表單提交
    /// </summary>
    Task DeleteSubmissionAsync(
        Guid submissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得表單提交列表請求
/// </summary>
public class GetFormSubmissionsRequest
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid CurrentUserId { get; set; }

    /// <summary>
    /// 是否為系統管理員
    /// </summary>
    public bool IsSystemAdmin { get; set; }

    /// <summary>
    /// 狀態篩選
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// 排序欄位
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 是否降序排序
    /// </summary>
    public bool SortDescending { get; set; } = true;

    /// <summary>
    /// 頁碼
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 每頁筆數
    /// </summary>
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// 建立表單提交請求
/// </summary>
public class CreateSubmissionRequest
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 提交資料 (JSON)
    /// </summary>
    public string SubmissionData { get; set; } = "{}";

    /// <summary>
    /// 是否為草稿
    /// </summary>
    public bool IsDraft { get; set; }

    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid? CurrentUserId { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }
}

/// <summary>
/// 更新表單提交請求
/// </summary>
public class UpdateSubmissionRequest
{
    /// <summary>
    /// 提交 ID
    /// </summary>
    public Guid SubmissionId { get; set; }

    /// <summary>
    /// 提交資料 (JSON)
    /// </summary>
    public string SubmissionData { get; set; } = "{}";

    /// <summary>
    /// 狀態
    /// </summary>
    public string? Status { get; set; }

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

using Forma.Application.Common.Models;
using Forma.Application.Features.Projects.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 專案服務介面
/// </summary>
public interface IProjectService
{
    /// <summary>
    /// 取得專案列表（分頁、篩選）
    /// </summary>
    Task<PagedResult<ProjectListDto>> GetProjectsAsync(
        GetProjectsRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得專案詳情
    /// </summary>
    Task<ProjectDto> GetProjectByIdAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 建立專案
    /// </summary>
    Task<Guid> CreateProjectAsync(
        CreateProjectRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新專案
    /// </summary>
    Task<ProjectDto> UpdateProjectAsync(
        Guid projectId,
        UpdateProjectRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 刪除專案
    /// </summary>
    Task DeleteProjectAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 封存專案
    /// </summary>
    Task<ProjectDto> ArchiveProjectAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得專案成員列表
    /// </summary>
    Task<List<ProjectMemberDto>> GetProjectMembersAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 新增專案成員
    /// </summary>
    Task<ProjectMemberDto> AddProjectMemberAsync(
        Guid projectId,
        AddProjectMemberRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新專案成員角色
    /// </summary>
    Task<ProjectMemberDto> UpdateProjectMemberAsync(
        Guid projectId,
        Guid userId,
        UpdateProjectMemberRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 移除專案成員
    /// </summary>
    Task RemoveProjectMemberAsync(
        Guid projectId,
        Guid userId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得可新增的成員列表
    /// </summary>
    Task<List<AvailableMemberDto>> GetAvailableMembersAsync(
        Guid projectId,
        GetAvailableMembersRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得專案列表請求
/// </summary>
public class GetProjectsRequest
{
    /// <summary>
    /// 頁碼
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 每頁筆數
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// 搜尋關鍵字
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 篩選年度
    /// </summary>
    public int? Year { get; set; }

    /// <summary>
    /// 篩選狀態
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// 僅顯示我參與的專案
    /// </summary>
    public bool OnlyMyProjects { get; set; } = true;

    /// <summary>
    /// 排序欄位
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 是否降序
    /// </summary>
    public bool SortDescending { get; set; }
}

/// <summary>
/// 建立專案請求
/// </summary>
public class CreateProjectRequest
{
    /// <summary>
    /// 組織 ID
    /// </summary>
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// 專案名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 專案代碼
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// 專案描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 年度
    /// </summary>
    public int Year { get; set; }

    /// <summary>
    /// 預算
    /// </summary>
    public decimal? Budget { get; set; }

    /// <summary>
    /// 開始日期
    /// </summary>
    public DateOnly? StartDate { get; set; }

    /// <summary>
    /// 結束日期
    /// </summary>
    public DateOnly? EndDate { get; set; }
}

/// <summary>
/// 更新專案請求
/// </summary>
public class UpdateProjectRequest
{
    /// <summary>
    /// 專案名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 專案描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 年度
    /// </summary>
    public int Year { get; set; }

    /// <summary>
    /// 預算
    /// </summary>
    public decimal? Budget { get; set; }

    /// <summary>
    /// 開始日期
    /// </summary>
    public DateOnly? StartDate { get; set; }

    /// <summary>
    /// 結束日期
    /// </summary>
    public DateOnly? EndDate { get; set; }

    /// <summary>
    /// 專案狀態
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// 計畫設定 (JSON)
    /// </summary>
    public string? Settings { get; set; }
}

/// <summary>
/// 新增專案成員請求
/// </summary>
public class AddProjectMemberRequest
{
    /// <summary>
    /// 要新增的使用者 ID
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// 專案角色
    /// </summary>
    public string Role { get; set; } = string.Empty;
}

/// <summary>
/// 更新專案成員請求
/// </summary>
public class UpdateProjectMemberRequest
{
    /// <summary>
    /// 新的專案角色
    /// </summary>
    public string Role { get; set; } = string.Empty;
}

/// <summary>
/// 取得可新增成員請求
/// </summary>
public class GetAvailableMembersRequest
{
    /// <summary>
    /// 搜尋關鍵字
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 回傳數量限制
    /// </summary>
    public int Limit { get; set; } = 20;
}

#endregion

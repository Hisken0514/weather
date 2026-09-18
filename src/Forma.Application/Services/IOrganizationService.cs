using Forma.Application.Common.Models;
using Forma.Application.Features.Organizations.DTOs;
using Forma.Application.Features.Projects.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 組織服務介面
/// </summary>
public interface IOrganizationService
{
    /// <summary>
    /// 取得組織列表
    /// </summary>
    Task<PagedResult<OrganizationListDto>> GetOrganizationsAsync(
        GetOrganizationsRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得組織詳情
    /// </summary>
    Task<OrganizationDto> GetOrganizationByIdAsync(
        Guid organizationId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得組織下的專案列表
    /// </summary>
    Task<PagedResult<ProjectListDto>> GetOrganizationProjectsAsync(
        GetOrganizationProjectsRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 建立組織
    /// </summary>
    Task<Guid> CreateOrganizationAsync(
        CreateOrganizationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新組織
    /// </summary>
    Task<OrganizationDto> UpdateOrganizationAsync(
        Guid organizationId,
        UpdateOrganizationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 刪除組織
    /// </summary>
    Task DeleteOrganizationAsync(
        Guid organizationId,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得組織列表請求
/// </summary>
public class GetOrganizationsRequest
{
    /// <summary>
    /// 搜尋關鍵字
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 組織類型篩選
    /// </summary>
    public string? Type { get; set; }

    /// <summary>
    /// 排序欄位
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 是否降序
    /// </summary>
    public bool SortDescending { get; set; }

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
/// 建立組織請求
/// </summary>
public class CreateOrganizationRequest
{
    /// <summary>
    /// 組織名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 組織代碼
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 組織類型
    /// </summary>
    public string Type { get; set; } = "Central";
}

/// <summary>
/// 更新組織請求
/// </summary>
public class UpdateOrganizationRequest
{
    /// <summary>
    /// 組織名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 組織類型
    /// </summary>
    public string? Type { get; set; }
}

/// <summary>
/// 取得組織專案列表請求
/// </summary>
public class GetOrganizationProjectsRequest
{
    /// <summary>
    /// 組織 ID
    /// </summary>
    public Guid OrganizationId { get; set; }

    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid CurrentUserId { get; set; }

    /// <summary>
    /// 是否為系統管理員
    /// </summary>
    public bool IsSystemAdmin { get; set; }

    /// <summary>
    /// 搜尋關鍵字
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 年度篩選
    /// </summary>
    public int? Year { get; set; }

    /// <summary>
    /// 狀態篩選
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// 排序欄位
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 是否降序
    /// </summary>
    public bool SortDescending { get; set; }

    /// <summary>
    /// 頁碼
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 每頁筆數
    /// </summary>
    public int PageSize { get; set; } = 20;
}

#endregion

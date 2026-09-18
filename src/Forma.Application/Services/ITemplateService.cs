using Forma.Application.Common.Models;
using Forma.Application.Features.Templates.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 範本服務介面
/// </summary>
public interface ITemplateService
{
    /// <summary>
    /// 取得範本列表
    /// </summary>
    Task<PagedResult<TemplateListDto>> GetTemplatesAsync(
        GetTemplatesRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得範本詳情
    /// </summary>
    Task<TemplateDto> GetTemplateByIdAsync(
        Guid templateId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 建立範本
    /// </summary>
    Task<Guid> CreateTemplateAsync(
        CreateTemplateRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新範本
    /// </summary>
    Task<TemplateDto> UpdateTemplateAsync(
        Guid templateId,
        UpdateTemplateRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 刪除範本
    /// </summary>
    Task DeleteTemplateAsync(
        Guid templateId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得範本列表請求
/// </summary>
public class GetTemplatesRequest
{
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
    /// 分類
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// 是否公開
    /// </summary>
    public bool? IsPublic { get; set; }

    /// <summary>
    /// 只顯示自己建立的
    /// </summary>
    public bool OnlyMine { get; set; }

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
/// 建立範本請求
/// </summary>
public class CreateTemplateRequest
{
    /// <summary>
    /// 範本名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 分類
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Schema JSON
    /// </summary>
    public string Schema { get; set; } = "{}";

    /// <summary>
    /// 縮圖 URL
    /// </summary>
    public string? ThumbnailUrl { get; set; }

    /// <summary>
    /// 是否公開
    /// </summary>
    public bool IsPublic { get; set; }

    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    public Guid CurrentUserId { get; set; }
}

/// <summary>
/// 更新範本請求
/// </summary>
public class UpdateTemplateRequest
{
    /// <summary>
    /// 範本名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 分類
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Schema JSON
    /// </summary>
    public string Schema { get; set; } = "{}";

    /// <summary>
    /// 縮圖 URL
    /// </summary>
    public string? ThumbnailUrl { get; set; }

    /// <summary>
    /// 是否公開
    /// </summary>
    public bool? IsPublic { get; set; }

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

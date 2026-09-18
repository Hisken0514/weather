using Forma.Application.Common.Models;
using Forma.Application.Features.Forms.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 表單服務介面
/// </summary>
public interface IFormService
{
    /// <summary>
    /// 取得專案的表單列表（分頁）
    /// </summary>
    Task<PagedResult<FormListDto>> GetFormsAsync(
        GetFormsRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得表單詳情
    /// </summary>
    Task<FormDto> GetFormByIdAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 建立表單
    /// </summary>
    Task<Guid> CreateFormAsync(
        CreateFormRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新表單
    /// </summary>
    Task<FormDto> UpdateFormAsync(
        Guid formId,
        UpdateFormRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 刪除表單
    /// </summary>
    Task DeleteFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 發布表單
    /// </summary>
    Task<FormDto> PublishFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 下架表單
    /// </summary>
    Task<FormDto> UnpublishFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 複製表單
    /// </summary>
    Task<Guid> CloneFormAsync(
        CloneFormRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得表單版本歷史
    /// </summary>
    Task<List<FormVersionDto>> GetFormVersionsAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得公開表單（需 AccessControl==Public、已發布、啟用中）
    /// </summary>
    Task<FormDto> GetPublicFormAsync(
        Guid formId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 鎖定表單
    /// </summary>
    Task<FormDto> LockFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 解鎖表單
    /// </summary>
    Task<FormDto> UnlockFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得表單列表請求
/// </summary>
public class GetFormsRequest
{
    /// <summary>
    /// 專案 ID
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// 搜尋關鍵字
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 是否只顯示已發布
    /// </summary>
    public bool? IsPublished { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool? IsActive { get; set; }

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
/// 建立表單請求
/// </summary>
public class CreateFormRequest
{
    /// <summary>
    /// 專案 ID
    /// </summary>
    public Guid ProjectId { get; set; }

    /// <summary>
    /// 表單名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 表單結構定義 (JSON)
    /// </summary>
    public string Schema { get; set; } = "{}";

    /// <summary>
    /// 範本 ID (選填)
    /// </summary>
    public Guid? TemplateId { get; set; }

    /// <summary>
    /// 存取控制
    /// </summary>
    public string AccessControl { get; set; } = "Private";
}

/// <summary>
/// 更新表單請求
/// </summary>
public class UpdateFormRequest
{
    /// <summary>
    /// 表單名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 表單結構定義 (JSON)
    /// </summary>
    public string Schema { get; set; } = "{}";

    /// <summary>
    /// 存取控制
    /// </summary>
    public string? AccessControl { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool? IsActive { get; set; }
}

/// <summary>
/// 複製表單請求
/// </summary>
public class CloneFormRequest
{
    /// <summary>
    /// 來源表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 目標專案 ID (可選，預設為同專案)
    /// </summary>
    public Guid? TargetProjectId { get; set; }

    /// <summary>
    /// 新表單名稱 (可選)
    /// </summary>
    public string? NewName { get; set; }
}

#endregion

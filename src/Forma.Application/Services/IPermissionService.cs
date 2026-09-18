using Forma.Application.Features.Permissions.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 權限服務介面
/// </summary>
public interface IPermissionService
{
    /// <summary>
    /// 取得表單權限列表
    /// </summary>
    Task<FormPermissionSummaryDto> GetFormPermissionsAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 授予權限
    /// </summary>
    Task<Guid> GrantPermissionAsync(
        GrantPermissionRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 移除權限
    /// </summary>
    Task RevokePermissionAsync(
        Guid permissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 授予權限請求
/// </summary>
public class GrantPermissionRequest
{
    /// <summary>
    /// 表單 ID
    /// </summary>
    public Guid FormId { get; set; }

    /// <summary>
    /// 使用者 ID（指定使用者）
    /// </summary>
    public Guid? UserId { get; set; }

    /// <summary>
    /// 專案成員角色（指定角色）
    /// </summary>
    public string? ProjectMemberRole { get; set; }

    /// <summary>
    /// 權限類型
    /// </summary>
    public string PermissionType { get; set; } = string.Empty;

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

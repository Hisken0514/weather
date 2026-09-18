using Forma.Application.Common.Models;
using Forma.Application.Features.Users.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 使用者服務介面
/// </summary>
public interface IUserService
{
    /// <summary>
    /// 取得使用者列表 (支援分頁與篩選)
    /// </summary>
    Task<PagedResult<UserListDto>> GetUsersAsync(
        GetUsersRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 根據 ID 取得使用者
    /// </summary>
    Task<UserProfileDto> GetUserByIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得當前使用者資料
    /// </summary>
    Task<UserProfileDto> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 管理員更新使用者資料
    /// </summary>
    Task<UserProfileDto> UpdateUserAsync(
        Guid userId,
        UpdateUserRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 修改密碼
    /// </summary>
    Task<bool> ChangePasswordAsync(
        Guid userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 切換使用者狀態 (啟用/停用)
    /// </summary>
    Task<bool> ToggleUserStatusAsync(
        Guid userId,
        bool activate,
        CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 取得使用者列表請求
/// </summary>
public class GetUsersRequest
{
    /// <summary>
    /// 頁碼 (從 1 開始)
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 每頁筆數
    /// </summary>
    public int PageSize { get; set; } = 10;

    /// <summary>
    /// 搜尋關鍵字 (使用者名稱、電子郵件、部門)
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 篩選啟用狀態
    /// </summary>
    public bool? IsActive { get; set; }

    /// <summary>
    /// 排序欄位
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 是否降序排列
    /// </summary>
    public bool SortDescending { get; set; }
}

/// <summary>
/// 管理員更新使用者請求
/// </summary>
public class UpdateUserRequest
{
    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// 電子郵件
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// 自訂角色 ID
    /// </summary>
    public Guid? RoleId { get; set; }

    /// <summary>
    /// 部門
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// 職稱
    /// </summary>
    public string? JobTitle { get; set; }

    /// <summary>
    /// 電話號碼
    /// </summary>
    public string? PhoneNumber { get; set; }
}

/// <summary>
/// 修改密碼請求
/// </summary>
public class ChangePasswordRequest
{
    /// <summary>
    /// 目前密碼
    /// </summary>
    public string CurrentPassword { get; set; } = string.Empty;

    /// <summary>
    /// 新密碼
    /// </summary>
    public string NewPassword { get; set; } = string.Empty;

    /// <summary>
    /// 確認新密碼
    /// </summary>
    public string ConfirmNewPassword { get; set; } = string.Empty;
}

#endregion

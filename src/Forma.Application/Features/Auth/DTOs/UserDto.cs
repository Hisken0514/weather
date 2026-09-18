namespace Forma.Application.Features.Auth.DTOs;

/// <summary>
/// 個人資料 DTO
/// </summary>
public class ProfileDto
{
    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 電子郵件
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 角色名稱
    /// </summary>
    public string? RoleName { get; set; }

    /// <summary>
    /// 權限值
    /// </summary>
    public long Permissions { get; set; }

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

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// 最後登入時間
    /// </summary>
    public DateTime? LastLoginAt { get; set; }
}

/// <summary>
/// 使用者 DTO
/// </summary>
public class UserDto
{
    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 電子郵件
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 角色名稱
    /// </summary>
    public string? RoleName { get; set; }

    /// <summary>
    /// 權限值
    /// </summary>
    public long Permissions { get; set; }

    /// <summary>
    /// 部門
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// 職稱
    /// </summary>
    public string? JobTitle { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; }
}

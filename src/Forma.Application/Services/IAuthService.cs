using Forma.Application.Features.Auth.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 認證服務介面
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// 取得系統初始化狀態
    /// </summary>
    Task<SystemStatusDto> GetSystemStatusAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// 註冊首位系統管理員
    /// </summary>
    Task<AuthResponseDto> RegisterAdminAsync(RegisterAdminRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// 使用者登入
    /// </summary>
    Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// 使用者註冊
    /// </summary>
    Task<AuthResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// 刷新 Token
    /// </summary>
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// 登出
    /// </summary>
    Task LogoutAsync(Guid userId, string? refreshToken, bool logoutAll, CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得個人資料
    /// </summary>
    Task<ProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新個人資料
    /// </summary>
    Task<ProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
}

#region Request DTOs

/// <summary>
/// 登入請求
/// </summary>
public class LoginRequest
{
    /// <summary>
    /// 電子郵件或使用者名稱
    /// </summary>
    public string EmailOrUsername { get; set; } = string.Empty;

    /// <summary>
    /// 密碼
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 裝置資訊
    /// </summary>
    public string? DeviceInfo { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }
}

/// <summary>
/// 註冊請求
/// </summary>
public class RegisterRequest
{
    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 電子郵件
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 密碼
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 部門
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// 職稱
    /// </summary>
    public string? JobTitle { get; set; }

    /// <summary>
    /// 裝置資訊
    /// </summary>
    public string? DeviceInfo { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }
}

/// <summary>
/// 註冊管理員請求
/// </summary>
public class RegisterAdminRequest
{
    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 電子郵件
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 密碼
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 部門
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// 職稱
    /// </summary>
    public string? JobTitle { get; set; }

    /// <summary>
    /// 裝置資訊
    /// </summary>
    public string? DeviceInfo { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }
}

/// <summary>
/// 刷新 Token 請求
/// </summary>
public class RefreshTokenRequest
{
    /// <summary>
    /// Refresh Token
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// 裝置資訊
    /// </summary>
    public string? DeviceInfo { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }
}

/// <summary>
/// 更新個人資料請求
/// </summary>
public class UpdateProfileRequest
{
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

#endregion

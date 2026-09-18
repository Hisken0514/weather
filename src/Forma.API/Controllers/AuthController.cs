using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Auth.DTOs;
using Forma.Application.Features.SystemSettings.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UpdateProfileServiceRequest = Forma.Application.Services.UpdateProfileRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 認證 API 控制器
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISystemSettingService _systemSettingService;

    public AuthController(IAuthService authService, ICurrentUserService currentUserService, ISystemSettingService systemSettingService)
    {
        _authService = authService;
        _currentUserService = currentUserService;
        _systemSettingService = systemSettingService;
    }

    /// <summary>
    /// 檢查系統初始化狀態
    /// </summary>
    /// <returns>系統狀態</returns>
    [HttpGet("status")]
    [ProducesResponseType(typeof(SystemStatusDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SystemStatusDto>> GetSystemStatus()
    {
        var result = await _authService.GetSystemStatusAsync();
        return Ok(result);
    }

    /// <summary>
    /// 註冊首位系統管理員（僅在系統未初始化時可用）
    /// </summary>
    /// <param name="request">管理員註冊資訊</param>
    /// <returns>認證回應</returns>
    [HttpPost("setup")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponseDto>> RegisterFirstAdmin([FromBody] RegisterAdminRequest request)
    {
        request.IpAddress = GetIpAddress();
        request.DeviceInfo = GetDeviceInfo();

        try
        {
            var result = await _authService.RegisterAdminAsync(request);
            await SetTokenCookies(result);
            return CreatedAtAction(nameof(Login), result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 使用者登入
    /// </summary>
    /// <param name="request">登入資訊</param>
    /// <returns>認證回應</returns>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginRequest request)
    {
        request.IpAddress = GetIpAddress();
        request.DeviceInfo = GetDeviceInfo();

        try
        {
            var result = await _authService.LoginAsync(request);
            await SetTokenCookies(result);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 使用者註冊
    /// </summary>
    /// <param name="request">註冊資訊</param>
    /// <returns>認證回應</returns>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterRequest request)
    {
        request.IpAddress = GetIpAddress();
        request.DeviceInfo = GetDeviceInfo();

        try
        {
            var result = await _authService.RegisterAsync(request);
            await SetTokenCookies(result);
            return CreatedAtAction(nameof(Login), result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 刷新 Token
    /// </summary>
    /// <param name="request">刷新 Token 資訊（可選，若未提供則從 Cookie 讀取）</param>
    /// <returns>認證回應</returns>
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<AuthResponseDto>> RefreshToken([FromBody] RefreshTokenRequest? request = null)
    {
        var refreshToken = request?.RefreshToken;

        // 若 body 未提供 refresh token，從 cookie 讀取
        if (string.IsNullOrEmpty(refreshToken))
        {
            refreshToken = Request.Cookies["forma_refresh_token"];
        }

        if (string.IsNullOrEmpty(refreshToken))
        {
            return BadRequest(new { message = "未提供 Refresh Token" });
        }

        var tokenRequest = new RefreshTokenRequest
        {
            RefreshToken = refreshToken,
            IpAddress = GetIpAddress(),
            DeviceInfo = GetDeviceInfo()
        };

        try
        {
            var result = await _authService.RefreshTokenAsync(tokenRequest);
            await SetTokenCookies(result);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            ClearTokenCookies();
            return Unauthorized(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 登出 (單一裝置)
    /// </summary>
    /// <param name="request">登出請求 (可選)</param>
    /// <returns>登出結果</returns>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout([FromBody] LogoutRequestDto? request = null)
    {
        var userId = _currentUserService.UserId;
        if (userId == null)
        {
            return Unauthorized(new { message = "未認證" });
        }

        var refreshToken = request?.RefreshToken;
        if (string.IsNullOrEmpty(refreshToken))
        {
            refreshToken = Request.Cookies["forma_refresh_token"];
        }

        await _authService.LogoutAsync(userId.Value, refreshToken, logoutAll: false);
        ClearTokenCookies();
        return Ok(new { message = "已成功登出" });
    }

    /// <summary>
    /// 登出所有裝置
    /// </summary>
    /// <returns>登出結果</returns>
    [HttpPost("logout-all")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> LogoutAll()
    {
        var userId = _currentUserService.UserId;
        if (userId == null)
        {
            return Unauthorized(new { message = "未認證" });
        }

        await _authService.LogoutAsync(userId.Value, null, logoutAll: true);
        ClearTokenCookies();
        return Ok(new { message = "已成功登出所有裝置" });
    }

    /// <summary>
    /// 取得個人資料
    /// </summary>
    /// <returns>個人資料</returns>
    [HttpGet("profile")]
    [Authorize]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProfileDto>> GetProfile()
    {
        var userId = _currentUserService.UserId;
        if (userId == null)
        {
            return Unauthorized(new { message = "未認證" });
        }

        try
        {
            var result = await _authService.GetProfileAsync(userId.Value);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 更新個人資料
    /// </summary>
    /// <param name="request">更新資料</param>
    /// <returns>更新後的個人資料</returns>
    [HttpPut("profile")]
    [Authorize]
    [ProducesResponseType(typeof(ProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProfileDto>> UpdateProfile([FromBody] UpdateProfileRequestDto request)
    {
        var userId = _currentUserService.UserId;
        if (userId == null)
        {
            return Unauthorized(new { message = "未認證" });
        }

        try
        {
            var serviceRequest = new UpdateProfileServiceRequest
            {
                Department = request.Department,
                JobTitle = request.JobTitle,
                PhoneNumber = request.PhoneNumber
            };
            var result = await _authService.UpdateProfileAsync(userId.Value, serviceRequest);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    #region Private Helpers

    private async Task SetTokenCookies(AuthResponseDto result)
    {
        SecuritySettingsDto? settings = null;
        try
        {
            settings = await _systemSettingService.GetSettingAsync<SecuritySettingsDto>("security");
        }
        catch
        {
            // 使用預設值
        }

        var httpOnly = settings?.CookieHttpOnly ?? true;
        var secure = settings?.CookieSecure ?? Request.IsHttps;
        var sameSite = ParseSameSite(settings?.CookieSameSite ?? "Lax");
        var accessTokenMinutes = settings?.AccessTokenExpirationMinutes ?? 30;
        var refreshTokenDays = settings?.RefreshTokenExpirationDays ?? 7;

        Response.Cookies.Append("forma_access_token", result.AccessToken, new CookieOptions
        {
            HttpOnly = httpOnly,
            Secure = secure,
            SameSite = sameSite,
            Path = "/api",
            Expires = DateTimeOffset.UtcNow.AddMinutes(accessTokenMinutes)
        });

        Response.Cookies.Append("forma_refresh_token", result.RefreshToken, new CookieOptions
        {
            HttpOnly = httpOnly,
            Secure = secure,
            SameSite = sameSite,
            Path = "/api/auth",
            Expires = DateTimeOffset.UtcNow.AddDays(refreshTokenDays)
        });

        // 清空 response body 中的 token
        result.AccessToken = string.Empty;
        result.RefreshToken = string.Empty;
    }

    private void ClearTokenCookies()
    {
        Response.Cookies.Delete("forma_access_token", new CookieOptions { Path = "/api" });
        Response.Cookies.Delete("forma_refresh_token", new CookieOptions { Path = "/api/auth" });
    }

    private static SameSiteMode ParseSameSite(string value) => value.ToLowerInvariant() switch
    {
        "strict" => SameSiteMode.Strict,
        "none" => SameSiteMode.None,
        _ => SameSiteMode.Lax
    };

    private string? GetIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            var ip = forwardedFor.FirstOrDefault()?.Split(',')[0].Trim();
            if (!string.IsNullOrEmpty(ip))
                return ip.Length > 45 ? ip[..45] : ip;
        }

        return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString();
    }

    private string? GetDeviceInfo()
    {
        return Request.Headers.UserAgent.FirstOrDefault();
    }

    #endregion
}

/// <summary>
/// 登出請求
/// </summary>
public class LogoutRequestDto
{
    /// <summary>
    /// Refresh Token (可選)
    /// </summary>
    public string? RefreshToken { get; set; }
}

/// <summary>
/// 更新個人資料請求
/// </summary>
public class UpdateProfileRequestDto
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

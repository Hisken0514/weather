using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Auth.DTOs;
using Forma.Application.Features.SystemSettings.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// FIDO2 / Passkey 控制器
/// </summary>
[ApiController]
[Route("api/auth/fido2")]
public class Fido2Controller : ControllerBase
{
    private readonly IFido2Service _fido2Service;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISystemSettingService _systemSettingService;

    public Fido2Controller(
        IFido2Service fido2Service,
        ICurrentUserService currentUserService,
        ISystemSettingService systemSettingService)
    {
        _fido2Service = fido2Service;
        _currentUserService = currentUserService;
        _systemSettingService = systemSettingService;
    }

    /// <summary>
    /// 查詢 FIDO2 啟用狀態
    /// </summary>
    [HttpGet("status")]
    [AllowAnonymous]
    public async Task<ActionResult<Fido2SettingsDto>> GetFido2Status()
    {
        var settings = await _systemSettingService.GetSettingAsync<Fido2SettingsDto>("Fido2");
        return Ok(settings);
    }

    /// <summary>
    /// 開始 FIDO2 註冊
    /// </summary>
    [HttpPost("register/start")]
    [Authorize]
    public async Task<IActionResult> StartRegistration([FromBody] Fido2RegisterStartRequest? request = null)
    {
        var userId = _currentUserService.UserId;
        if (userId == null) return Unauthorized(new { message = "未認證" });

        try
        {
            var options = await _fido2Service.StartRegistrationAsync(userId.Value, request?.DeviceName);
            return Ok(options);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 完成 FIDO2 註冊
    /// </summary>
    [HttpPost("register/complete")]
    [Authorize]
    public async Task<IActionResult> CompleteRegistration([FromBody] Fido2RegisterCompleteRequest request)
    {
        var userId = _currentUserService.UserId;
        if (userId == null) return Unauthorized(new { message = "未認證" });

        try
        {
            await _fido2Service.CompleteRegistrationAsync(userId.Value, request.AttestationResponse, request.DeviceName);
            return Ok(new { message = "安全金鑰已成功註冊" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得目前使用者的所有 FIDO2 憑證
    /// </summary>
    [HttpGet("credentials")]
    [Authorize]
    public async Task<ActionResult<List<Fido2CredentialInfo>>> GetCredentials()
    {
        var userId = _currentUserService.UserId;
        if (userId == null) return Unauthorized(new { message = "未認證" });

        var credentials = await _fido2Service.GetCredentialsAsync(userId.Value);
        return Ok(credentials);
    }

    /// <summary>
    /// 刪除 FIDO2 憑證
    /// </summary>
    [HttpDelete("credentials/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> DeleteCredential(Guid id)
    {
        var userId = _currentUserService.UserId;
        if (userId == null) return Unauthorized(new { message = "未認證" });

        try
        {
            await _fido2Service.DeleteCredentialAsync(id, userId.Value);
            return Ok(new { message = "憑證已刪除" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 開始 FIDO2 認證
    /// </summary>
    [HttpPost("authenticate/start")]
    [AllowAnonymous]
    public async Task<IActionResult> StartAuthentication([FromBody] Fido2AuthenticateStartRequest? request = null)
    {
        try
        {
            var options = await _fido2Service.StartAuthenticationAsync(request?.Email);
            return Ok(options);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 完成 FIDO2 認證（回傳 JWT token）
    /// </summary>
    [HttpPost("authenticate/complete")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> CompleteAuthentication([FromBody] Fido2AuthenticateCompleteRequest request)
    {
        try
        {
            var result = await _fido2Service.CompleteAuthenticationAsync(
                request.AssertionResponse,
                Request.Headers.UserAgent.FirstOrDefault(),
                GetIpAddress());

            await SetTokenCookies(result);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
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
        catch { }

        var httpOnly = settings?.CookieHttpOnly ?? true;
        var secure = settings?.CookieSecure ?? Request.IsHttps;
        var sameSite = settings?.CookieSameSite?.ToLowerInvariant() switch
        {
            "strict" => SameSiteMode.Strict,
            "none" => SameSiteMode.None,
            _ => SameSiteMode.Lax
        };
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

        result.AccessToken = string.Empty;
        result.RefreshToken = string.Empty;
    }

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

    #endregion
}

/// <summary>
/// FIDO2 註冊開始請求
/// </summary>
public class Fido2RegisterStartRequest
{
    public string? DeviceName { get; set; }
}

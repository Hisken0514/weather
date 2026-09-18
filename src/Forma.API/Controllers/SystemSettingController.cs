using Forma.Application.Common.Authorization;
using Forma.Application.Features.SystemSettings.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 系統設定控制器
/// </summary>
[ApiController]
[Route("api/settings")]
[Authorize(Policy = Policies.RequireSystemAdmin)]
public class SystemSettingController : ControllerBase
{
    private readonly ISystemSettingService _settingService;

    public SystemSettingController(ISystemSettingService settingService)
    {
        _settingService = settingService;
    }

    /// <summary>
    /// 獲取所有設定分類
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<SystemSettingDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<SystemSettingDto>>> GetAllCategories()
    {
        var result = await _settingService.GetAllCategoriesAsync();
        return Ok(result);
    }

    // ==================== Email 設定 ====================

    /// <summary>
    /// 獲取 Email 設定
    /// </summary>
    [HttpGet("email")]
    [ProducesResponseType(typeof(EmailSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<EmailSettingsDto>> GetEmailSettings()
    {
        var result = await _settingService.GetSettingAsync<EmailSettingsDto>("Email");
        return Ok(result);
    }

    /// <summary>
    /// 更新 Email 設定
    /// </summary>
    [HttpPut("email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateEmailSettings([FromBody] EmailSettingsDto settings)
    {
        await _settingService.UpdateSettingAsync("Email", settings);
        return Ok(new { message = "Email 設定已更新" });
    }

    // ==================== 檔案存儲設定 ====================

    /// <summary>
    /// 獲取檔案存儲設定
    /// </summary>
    [HttpGet("file-storage")]
    [ProducesResponseType(typeof(FileStorageSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FileStorageSettingsDto>> GetFileStorageSettings()
    {
        var result = await _settingService.GetSettingAsync<FileStorageSettingsDto>("FileStorage");
        return Ok(result);
    }

    /// <summary>
    /// 更新檔案存儲設定
    /// </summary>
    [HttpPut("file-storage")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateFileStorageSettings([FromBody] FileStorageSettingsDto settings)
    {
        await _settingService.UpdateSettingAsync("FileStorage", settings);
        return Ok(new { message = "檔案存儲設定已更新" });
    }

    // ==================== 安全性設定 ====================

    /// <summary>
    /// 獲取安全性設定
    /// </summary>
    [HttpGet("security")]
    [ProducesResponseType(typeof(SecuritySettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SecuritySettingsDto>> GetSecuritySettings()
    {
        var result = await _settingService.GetSettingAsync<SecuritySettingsDto>("Security");
        return Ok(result);
    }

    /// <summary>
    /// 更新安全性設定
    /// </summary>
    [HttpPut("security")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSecuritySettings([FromBody] SecuritySettingsDto settings)
    {
        await _settingService.UpdateSettingAsync("Security", settings);
        return Ok(new { message = "安全性設定已更新" });
    }

    // ==================== 密碼策略設定 ====================

    /// <summary>
    /// 獲取密碼策略設定
    /// </summary>
    [HttpGet("password-policy")]
    [ProducesResponseType(typeof(PasswordPolicyDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<PasswordPolicyDto>> GetPasswordPolicySettings()
    {
        var result = await _settingService.GetSettingAsync<PasswordPolicyDto>("PasswordPolicy");
        return Ok(result);
    }

    /// <summary>
    /// 更新密碼策略設定
    /// </summary>
    [HttpPut("password-policy")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePasswordPolicySettings([FromBody] PasswordPolicyDto settings)
    {
        await _settingService.UpdateSettingAsync("PasswordPolicy", settings);
        return Ok(new { message = "密碼策略設定已更新" });
    }

    // ==================== CAPTCHA 設定 ====================

    /// <summary>
    /// 獲取 CAPTCHA 設定
    /// </summary>
    [HttpGet("captcha")]
    [ProducesResponseType(typeof(CaptchaSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CaptchaSettingsDto>> GetCaptchaSettings()
    {
        var result = await _settingService.GetSettingAsync<CaptchaSettingsDto>("Captcha");
        return Ok(result);
    }

    /// <summary>
    /// 更新 CAPTCHA 設定
    /// </summary>
    [HttpPut("captcha")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateCaptchaSettings([FromBody] CaptchaSettingsDto settings)
    {
        await _settingService.UpdateSettingAsync("Captcha", settings);
        return Ok(new { message = "CAPTCHA 設定已更新" });
    }

    // ==================== Security Headers 設定 ====================

    /// <summary>
    /// 獲取 Security Headers 設定
    /// </summary>
    [HttpGet("security-headers")]
    [ProducesResponseType(typeof(SecurityHeadersSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SecurityHeadersSettingsDto>> GetSecurityHeadersSettings()
    {
        var result = await _settingService.GetSettingAsync<SecurityHeadersSettingsDto>("SecurityHeaders");
        return Ok(result);
    }

    /// <summary>
    /// 更新 Security Headers 設定
    /// </summary>
    [HttpPut("security-headers")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateSecurityHeadersSettings([FromBody] SecurityHeadersSettingsDto settings)
    {
        await _settingService.UpdateSettingAsync("SecurityHeaders", settings);
        return Ok(new { message = "Security Headers 設定已更新" });
    }

    // ==================== FIDO2 設定 ====================

    /// <summary>
    /// 獲取 FIDO2 設定
    /// </summary>
    [HttpGet("fido2")]
    [ProducesResponseType(typeof(Fido2SettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<Fido2SettingsDto>> GetFido2Settings()
    {
        var result = await _settingService.GetSettingAsync<Fido2SettingsDto>("Fido2");
        return Ok(result);
    }

    /// <summary>
    /// 更新 FIDO2 設定
    /// </summary>
    [HttpPut("fido2")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateFido2Settings([FromBody] Fido2SettingsDto settings)
    {
        await _settingService.UpdateSettingAsync("Fido2", settings);
        return Ok(new { message = "FIDO2 設定已更新" });
    }

    // ==================== CORS 設定 ====================

    /// <summary>
    /// 獲取 CORS 設定
    /// </summary>
    [HttpGet("cors")]
    [ProducesResponseType(typeof(CorsSettingsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<CorsSettingsDto>> GetCorsSettings()
    {
        var result = await _settingService.GetSettingAsync<CorsSettingsDto>("Cors");
        return Ok(result);
    }

    /// <summary>
    /// 更新 CORS 設定
    /// </summary>
    [HttpPut("cors")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateCorsSettings([FromBody] CorsSettingsDto settings)
    {
        await _settingService.UpdateSettingAsync("Cors", settings);
        return Ok(new { message = "CORS 設定已更新" });
    }
}

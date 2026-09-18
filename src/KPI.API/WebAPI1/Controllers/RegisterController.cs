using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

[Route("[controller]")]
public class RegisterController: ControllerBase
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<RegisterController> _logger;
    private readonly IOrganizationService _organizationService;
    private readonly IUserService _userService;

    public RegisterController(ILogger<RegisterController> logger, IOrganizationService organizationService,ISHAuditDbcontext db, IUserService userService)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _organizationService = organizationService;
        _db = db;
        _userService = userService;
    }

    public class SendCodeDto
    {
        public string Email { get; set; }
    }

    public class VerifyEmailDto
    {
        public string Email { get; set; }
        public string Code { get; set; }
    }

    static readonly Regex EmailRegex = new Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    // 驗證 email 格式、網域與是否已註冊（共用邏輯）
    private (bool ok, IActionResult? error) ValidateEmailForRegistration(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return (false, BadRequest(new { message = "Email 不能為空" }));

        if (!EmailRegex.IsMatch(email))
            return (false, BadRequest(new { message = "Email 格式錯誤" }));

        if (_db.Users.Any(u => u.Email.ToLower() == email.ToLower()))
            return (false, Conflict(new { message = "此 Email 已註冊過" }));

        return (true, null);
    }

    // POST /Register/send-code
    // 驗證 email 合法後發送 8 碼 OTP
    [HttpPost("send-code")]
    public async Task<IActionResult> SendCode([FromBody] SendCodeDto dto)
    {
        var (ok, error) = ValidateEmailForRegistration(dto.Email);
        if (!ok) return error!;

        var domain = dto.Email.Split('@').Last().ToLower();
        var orgInfo = await _organizationService.GetOrganizationTreeByDomainAsync(domain);
        if (orgInfo == null || orgInfo.Count == 0)
            return BadRequest(new { message = "此 Email 所屬網域未被允許註冊" });

        var success = await _userService.SendVerificationCodeAsync(dto.Email);
        if (!success)
            return StatusCode(500, new { message = "驗證碼發送失敗，請稍後再試" });

        return Ok(new { message = "驗證碼已發送，請於 5 分鐘內完成驗證" });
    }

    // POST /Register/verify-email
    // 驗證 OTP 碼正確後回傳組織樹
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        var (ok, error) = ValidateEmailForRegistration(dto.Email);
        if (!ok) return error!;

        if (string.IsNullOrWhiteSpace(dto.Code))
            return BadRequest(new { message = "請輸入驗證碼" });

        // 驗證 OTP（不更新 User 資料表，使用者尚未建立）
        bool codeValid;
        try
        {
            codeValid = await _userService.VerifyRegistrationCodeAsync(dto.Email, dto.Code);
        }
        catch (ArgumentException)
        {
            return BadRequest(new { message = "驗證碼格式錯誤" });
        }

        if (!codeValid)
            return BadRequest(new { message = "驗證碼錯誤或已過期，請重新發送" });

        var domain = dto.Email.Split('@').Last().ToLower();
        try
        {
            var orgInfo = await _organizationService.GetOrganizationTreeByDomainAsync(domain);
            if (orgInfo == null || orgInfo.Count == 0)
                return BadRequest(new { message = "此 Email 所屬網域未被允許註冊" });

            return Ok(orgInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while getting all organizations");
            return StatusCode(500, "Internal server error");
        }
    }

    [HttpPost("insert-user")]
    public async Task<IActionResult> InsertUser([FromBody] RegisterUserDto dto)
    {
        var success = await _userService.CreateUserAsync(dto);
        if (!success)
        {
            return StatusCode(500, "註冊失敗，請稍後再試");
        }

        return Ok("註冊成功");
    }

}

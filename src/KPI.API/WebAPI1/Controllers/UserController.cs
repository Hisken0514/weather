using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Isopoh.Cryptography.Argon2;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers
{
    
    public class LoginDto
    {
        public string Usermail { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
    
    [Route("[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly ISHAuditDbcontext _db;
        private readonly IConfiguration _configuration;
        private readonly IUserService _userService;
        private readonly ILogger<UserController> _logger;

        public UserController(ISHAuditDbcontext db, IConfiguration configuration, IUserService userService, ILogger<UserController> logger)
        {
            _db = db;
            _configuration = configuration;
            _userService = userService;
            _logger = logger;
        }
        
        private string GenerateJwtToken(string username, SymmetricSecurityKey key)
        {
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: _configuration["JwtSettings:Issuer"],
                audience: _configuration["JwtSettings:Audience"],
                expires: DateTime.Now.AddMinutes(30),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
        
        
        /// <summary>登入</summary>
        [HttpPost("login")]
        [Consumes("application/json")]
        [ProducesResponseType(typeof(LoginResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(LoginResultDto), StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginDto loginDto)
        {
            var result = await _userService.VerifyUserLoginAsync(loginDto);

            if (!result.Success)
            {
                var clientIp = Request.Headers["X-Forwarded-For"].FirstOrDefault()
                               ?? HttpContext.Connection.RemoteIpAddress?.ToString();
                try
                {
                    _db.LoginLogs.Add(new WebAPI1.Entities.LoginLog
                    {
                        OccurredAtUtc = tool.GetTaiwanNow(),
                        UserEmail = loginDto.Usermail,
                        IsSuccess = false,
                        FailReason = result.Message,
                        ClientIp = clientIp
                    });
                    await _db.SaveChangesAsync();
                }
                catch { /* 日誌寫入失敗不中斷登入流程 */ }
                return Unauthorized(result);
            }

            // 成功：設定 httpOnly Cookie
            if (!string.IsNullOrEmpty(result.Token))
            {
                Response.Cookies.Append("token", result.Token, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddMinutes(30),
                    Path = "/"
                });
            }

            if (!string.IsNullOrEmpty(result.RefreshToken))
            {
                Response.Cookies.Append("refresh_token", result.RefreshToken, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = Request.IsHttps,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTimeOffset.UtcNow.AddDays(7),
                    Path = "/"
                });
            }

            var successIp = Request.Headers["X-Forwarded-For"].FirstOrDefault()
                            ?? HttpContext.Connection.RemoteIpAddress?.ToString();
            try
            {
                _db.LoginLogs.Add(new WebAPI1.Entities.LoginLog
                {
                    OccurredAtUtc = tool.GetTaiwanNow(),
                    UserEmail = loginDto.Usermail,
                    IsSuccess = true,
                    ClientIp = successIp
                });
                await _db.SaveChangesAsync();
            }
            catch { /* 日誌寫入失敗不中斷登入流程 */ }

            // 可能包含 WarningMessage（進入到期警示期）
            return Ok(result);
        }
        
        
        [HttpPost("test")]
        public IActionResult test()
        {
            string hashedPassword = Argon2.Hash("T!es@t7QwQ033",
                type: Argon2Type.HybridAddressing,  
                timeCost: 2,  
                memoryCost: 32768,
                parallelism: 2);
            // var testUser = new User
            // {
            //     Id = Guid.NewGuid(),
            //     Username = "testuser",
            //     PasswordHash = hashedPassword, // 使用 Argon2 雜湊密碼
            //     Nickname = "測試用戶",
            //     OrganizationId = 1,
            //     Email = "testuser@example.com",
            //     Unit = "測試部門",
            //     Position = "測試職位",
            //     RegistrationDomain = "example.com",
            //     CreatedAt = tool.GetTaiwanNow(),
            //     UpdatedAt = tool.GetTaiwanNow(),
            //     IsActive = true,
            //     LastLoginAt = null,
            //     PasswordChangedAt = tool.GetTaiwanNow(),
            //     PasswordExpiresAt = tool.GetTaiwanNow().AddMonths(3),
            //     ForceChangePassword = false,
            //     PasswordFailedAttempts = 0,
            //     PasswordLockedUntil = null,
            //     LastPasswordExpiryReminder = null
            // };
            //
            // _db.Users.Add(testUser);
            // _db.SaveChanges();
            
            
            // 更新所有使用者的密碼
            var users = _db.Users.ToList(); // 取得所有使用者
            foreach (var user in users)
            {
                user.PasswordHash = hashedPassword;
            }
            _db.SaveChanges();

            return Ok(new { message = "Test Successful" });
        }
        
        [HttpGet("{id}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDto dto)
        {
            var success = await _userService.UpdateUserAsync(id, dto);
            if (!success) return NotFound();
            return NoContent();
        }
        
        [HttpPut("{id}/ChangePassword")]
        public async Task<IActionResult> ChangePassword(Guid id, [FromBody] ChangePasswordDto dto)
        {
            if (dto is null || string.IsNullOrWhiteSpace(dto.OldPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { code = "INVALID_REQUEST", message = "請填寫所有密碼欄位。" });

            // （可選）安全起見，再確認 JWT 內的使用者就是自己，不得幫別人改
            // var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
            // if (!Guid.TryParse(sub, out var currentUserId) || currentUserId != id)
            //     return Forbid();

            try
            {
                var ok = await _userService.ChangePasswordAsync(id, dto.OldPassword, dto.NewPassword);
                if (!ok) return NotFound(new { code = "USER_NOT_FOUND" });

                return Ok(new { message = "Password changed." });
            }
            catch (ArgumentException ex) when (ex.Message == "OLD_PASSWORD_INCORRECT")
            {
                return BadRequest(new { code = "OLD_PASSWORD_INCORRECT", message = "舊密碼錯誤，請重新輸入。" });
            }
            catch (ArgumentException ex) when (ex.Message == "PASSWORD_POLICY_NOT_MET")
            {
                // 422 Unprocessable Entity：語意正確但不符合政策
                return UnprocessableEntity(new
                {
                    code = "PASSWORD_POLICY_NOT_MET",
                    message = "新密碼不符合安全要求（至少12碼且含大小寫、數字、特殊字元）。"
                });
            }
            catch (InvalidOperationException ex) when (ex.Message == "PASSWORD_REUSE_CURRENT")
            {
                return Conflict(new { code = "PASSWORD_REUSE_CURRENT", message = "新密碼不得與目前使用中的密碼相同。" });
            }
            catch (InvalidOperationException ex) when (ex.Message == "PASSWORD_REUSE_LAST3")
            {
                return Conflict(new { code = "PASSWORD_REUSE_LAST3", message = "新密碼不得與最近三次使用過的密碼相同。" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ChangePassword failed for user {UserId}", id);
                return StatusCode(500, new { code = "INTERNAL_ERROR", message = "密碼修改失敗，請稍後再試。" });
            }
        }
        
        [HttpPost("ResetPassword")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (string.IsNullOrEmpty(dto.Email) || string.IsNullOrEmpty(dto.NewPassword))
                return BadRequest(new { message = "Email 與新密碼不能為空" });

            var success = await _userService.ResetPasswordAsync(dto.Email, dto.NewPassword);
            
            if (!success)
                return NotFound(new { message = "找不到使用者" });

            return Ok(new { message = "密碼重設成功" });
        }
        
        [HttpPost("SendVerificationEmail")]
        public async Task<IActionResult> SendVerificationEmail([FromBody] EmailRequestDto request)
        {
            bool success = await _userService.SendVerificationCodeAsync(request.Email);

            if (success)
            {
                return Ok(new
                {
                    success = true,
                    message = "驗證碼已發送"
                });
            }

            return BadRequest(new
            {
                success = false,
                message = "無法發送驗證碼"
            });
        }
        
        [HttpPost("VerifyEmailCode")]
        public async Task<IActionResult> VerifyEmailCode([FromBody] VerifyCodeDto request)
        {
            bool success = await _userService.VerifyEmailCodeAsync(request.Email, request.Code);

            if (success)
            {
                return Ok(new
                {
                    success = true,
                    message = "驗證成功"
                });
            }

            return BadRequest(new
            {
                success = false,
                message = "驗證碼錯誤或已失效"
            });
        }
    }
}

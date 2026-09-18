using System.Security.Cryptography;
using System.Text.Json;
using Isopoh.Cryptography.Argon2;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using WebAPI1.Context;
using WebAPI1.Controllers;
using WebAPI1.Entities;


namespace WebAPI1.Services;

public class ResetPasswordDto
{
    public string Email { get; set; }
    public string NewPassword { get; set; }
}
public class VerifyCodeDto
{
    public string Code { get; set; }
    public string Email { get; set; }
}
public class VerificationData
{
    public string Code { get; set; }
    public int Attempts { get; set; }
}
public class EmailRequestDto
{
    public string Email { get; set; }
}

public class UserDto
{
    public Guid Id { get; set; }
    public string NickName { get; set; }
}
public class RegisterUserDto
{
    public string UserName { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string Name { get; set; }
    public string Password { get; set; }
    public int OrganizationId { get; set; }
    public string Unit { get; set; }
    public string Position { get; set; }
}

public class LoginResultDto
{
    public bool Success { get; set; }
    public string? Message { get; set; }

    public string? Token { get; set; }
    public string? RefreshToken { get; set; }
    public string? Nickname { get; set; }
    public string? Email { get; set; }

    // ⬇️ 新增的結構化欄位
    public string? WarningMessage { get; set; }           // 將到期提醒（人類可讀）
    public DateTimeOffset? PasswordExpiryAt { get; set; } // 密碼到期時間
    public int? DaysUntilExpiry { get; set; }             // 剩餘天數（無條件進位）
    public bool ForceChangePassword { get; set; } = false;
    public bool NeedEmailVerification { get; set; } = false;
}

public class UpdateUserDto
{
    public string? Nickname { get; set; }
    public string? Mobile { get; set; }
    public string? Unit { get; set; }
    public string? Position { get; set; }
}

public class ChangePasswordDto
{
    public string OldPassword { get; set; }
    public string NewPassword { get; set; }
}

public interface IUserService
{
    Task<bool> CreateUserAsync(RegisterUserDto dto);
    Task<LoginResultDto> VerifyUserLoginAsync(LoginDto dto);
    
    //獲取委員資料名單
    Task<List<UserDto>> GetCommitteeUsers();
    
    Task<User?> GetUserByIdAsync(Guid id);
    Task<bool> UpdateUserAsync(Guid id, UpdateUserDto dto);
    Task<bool> ChangePasswordAsync(Guid id, string oldPassword, string newPassword);
    Task<bool> SendVerificationCodeAsync(string email);
    Task<bool> VerifyEmailCodeAsync(string email, string inputCode);
    Task<bool> VerifyRegistrationCodeAsync(string email, string inputCode);
    Task<bool> ResetPasswordAsync(string email, string newPassword);
}

public class UserService:IUserService
{
    private readonly ISHAuditDbcontext _db;
    private readonly ILogger<UserService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IAuthService _authService;
    private readonly IDatabase _redisDb;
    private readonly IEmailService _emailService;
    public UserService(
        ISHAuditDbcontext db,
        ILogger<UserService> logger,IConfiguration configuration,IAuthService authService,IConnectionMultiplexer redis,IEmailService emailService)
    {
        _db = db;
        _logger = logger;
        _configuration = configuration;
        _authService = authService;
        _redisDb = redis.GetDatabase(); 
        _emailService = emailService;
    }
    
    static string Generate8DigitNumber()
    {
        // 產生一個隨機的 8 碼數字
        using (var rng = RandomNumberGenerator.Create())
        {
            byte[] bytes = new byte[4]; // 4 bytes 可表示一個 32-bit 整數
            rng.GetBytes(bytes);
            int number = Math.Abs(BitConverter.ToInt32(bytes, 0)) % 100000000; // 限制在 8 位數
            return number.ToString("D8"); // 確保補滿 8 碼
        }
    }
    public async Task<bool> CreateUserAsync(RegisterUserDto dto)
    {
        string hashedPassword = Argon2.Hash(dto.Password,
            type: Argon2Type.HybridAddressing,
            timeCost: 2,
            memoryCost: 32768,
            parallelism: 2);

        var user = new User
        {
            Username = dto.UserName,
            Email = dto.Email,
            Mobile = dto.Phone,
            Nickname = dto.Name,
            Unit = dto.Unit,
            Position = dto.Position,
            OrganizationId = dto.OrganizationId,
            PasswordHash = hashedPassword,
            IsActive = false,
            EmailVerified = true,   // 已在 Step 1 完成 email OTP 驗證
            EmailVerifiedAt = DateTime.UtcNow,
            TokenExpiresAt = null,
            ForceChangePassword = false,
            PasswordPolicyId = 1,
            PasswordChangedAt = null,
            PasswordExpiresAt = null,
            PasswordFailedAttempts = 0,
            PasswordLockedUntil = null,
            LastPasswordExpiryReminder = null,
            CreatedAt = tool.GetTaiwanNow(),
            UpdatedAt = tool.GetTaiwanNow()
        };

        _db.Users.Add(user);
        var result = await _db.SaveChangesAsync();

        if (result <= 0) return false;

        // 取得該使用者組織的 TypeId
        var org = await _db.Organizations
            .FirstOrDefaultAsync(o => o.Id == dto.OrganizationId);

        if (org == null)
            throw new Exception("無效的組織 ID，找不到對應的組織");

        // 根據 TypeId 決定 RoleId
        int roleId;
        if (new[] { 1, 5, 6 }.Contains(org.TypeId))
            roleId = 1;
        else if (new[] { 2, 3, 4 }.Contains(org.TypeId))
            roleId = 2;
        else
            throw new Exception($"尚未定義 TypeId {org.TypeId} 對應的角色");

        // 指派角色
        var userRole = new UserRole
        {
            UserId = user.Id, // 注意：user.Id 是 Entity Framework 自動生成的 Guid
            RoleId = roleId,
            AssignedAt = tool.GetTaiwanNow(),
            AssignedBy = Guid.Empty // ⚠️ 根據實務可改為系統帳號或管理者帳號
        };

        _db.UserRoles.Add(userRole);
        var roleResult = await _db.SaveChangesAsync();

        return roleResult > 0;
    }
    
    public async Task<LoginResultDto> VerifyUserLoginAsync(LoginDto dto)
    {
        // 時間統一取台灣時間（你現有的工具）
        var now = tool.GetTaiwanNow();

        // 讀取使用者與密碼策略
        var user = await _db.Users
            .Include(u => u.PasswordPolicy)
            .FirstOrDefaultAsync(u => u.Email == dto.Usermail);

        // 避免帳號枚舉：不要暴露「使用者不存在」，統一錯誤訊息
        if (user == null)
        {
            await Task.Delay(50); // 輕微延遲，拉齊時間側信道（可選）
            return new LoginResultDto { Success = false, Message = "帳號或密碼錯誤" };
        }

        // 帳號啟用檢查（需管理員審核）
        if (!user.IsActive)
        {
            return new LoginResultDto
            {
                Success = false,
                Message = "帳號尚未啟用，請等待管理員審核"
            };
        }

        // 鎖定檢查
        if (user.PasswordLockedUntil.HasValue && user.PasswordLockedUntil.Value > now)
        {
            return new LoginResultDto
            {
                Success = false,
                Message = $"帳號已鎖定，請於 {user.PasswordLockedUntil.Value:yyyy-MM-dd HH:mm} 後再試"
            };
        }

        // 密碼驗證
        if (!Argon2.Verify(user.PasswordHash, dto.Password))
        {
            user.PasswordFailedAttempts++;

            var policy = user.PasswordPolicy ?? await _db.PasswordPolicy.FirstOrDefaultAsync(p => p.IsDefault);
            if (policy != null && user.PasswordFailedAttempts >= policy.LockoutThreshold)
            {
                user.PasswordLockedUntil = now.AddMinutes(policy.LockoutDurationMinutes);
            }

            await _db.SaveChangesAsync();
            return new LoginResultDto { Success = false, Message = "帳號或密碼錯誤" };
        }

        // 驗證成功：重置狀態
        user.PasswordFailedAttempts = 0;
        user.PasswordLockedUntil = null;
        user.LastLoginAt = DateTime.UtcNow;

        var currentPolicy = user.PasswordPolicy ?? await _db.PasswordPolicy.FirstOrDefaultAsync(p => p.IsDefault);

        // Email 驗證檢查（每月台灣時間第一天重置）
        // EmailVerifiedAt 存 UTC，+8 小時轉成台灣時間再比對年份與月份
        var nowTaiwan = now.AddHours(8);
        var verifiedThisMonthTaiwan = user.EmailVerified
            && user.EmailVerifiedAt.HasValue
            && user.EmailVerifiedAt.Value.AddHours(8).Year == nowTaiwan.Year
            && user.EmailVerifiedAt.Value.AddHours(8).Month == nowTaiwan.Month;

        if (!verifiedThisMonthTaiwan)
        {
            user.EmailVerified = false; // 確保驗完後 VerifyEmailCodeAsync 能正確更新
            await _db.SaveChangesAsync();
            return new LoginResultDto
            {
                Success = false,
                NeedEmailVerification = true,
                Email = user.Email,
                Message = "請先完成每月 Email 驗證"
            };
        }

        // 密碼到期邏輯（結構化欄位）
        string? warningMessage = null;
        DateTime? expiryDate = null;
        int? daysUntilExpiry = null;
        if (user.ForceChangePassword)
        {
            return new LoginResultDto
            {
                Success = false,
                Message = "請更改密碼",
                ForceChangePassword = true
            };
            
        }
        if (currentPolicy?.PasswordExpiryDays > 0 )
        {
            var passwordSetTime = user.PasswordChangedAt ?? user.CreatedAt;
            expiryDate = passwordSetTime.AddDays(currentPolicy.PasswordExpiryDays);
            var remaining = expiryDate.Value - now;
            daysUntilExpiry = (int)Math.Ceiling(remaining.TotalDays);

            if (now > expiryDate.Value)
            {
                await _db.SaveChangesAsync();

                return new LoginResultDto
                {
                    Success = false,
                    Message = "密碼已過期，請重設密碼",
                    ForceChangePassword = true,
                    PasswordExpiryAt = new DateTimeOffset(expiryDate.Value),
                    DaysUntilExpiry = 0
                };
            }
            else if (remaining.TotalDays <= currentPolicy.PasswordExpiryWarningDays)
            {
                // 當天提醒一次
                if (user.LastPasswordExpiryReminder == null || user.LastPasswordExpiryReminder.Value.Date < now.Date)
                {
                    user.LastPasswordExpiryReminder = now;
                    warningMessage =
                        $"密碼將於 {expiryDate:yyyy-MM-dd HH:mm:ss} 過期（剩餘 {Math.Max(daysUntilExpiry.Value, 0)} 天），將會強制變更密碼";
                }
            }
        }

        await _db.SaveChangesAsync();

        // 簽發 Token（提醒仍為成功登入）
        var accessToken = await _authService.GenerateAccessToken(user.Id.ToString());
        var refreshToken = _authService.GenerateRefreshToken(user.Id.ToString());
        // _authService.SetRefreshTokenCookie(refreshToken); // 如需 Cookie 可打開

        return new LoginResultDto
        {
            Success = true,
            Message = "登入成功",
            WarningMessage = warningMessage,
            PasswordExpiryAt = expiryDate.HasValue ? new DateTimeOffset(expiryDate.Value) : null,
            DaysUntilExpiry = daysUntilExpiry,
            Token = accessToken,
            RefreshToken = refreshToken,
            Nickname = user.Nickname,
            Email = user.Email
        };
    }

    
    public async Task<List<UserDto>> GetCommitteeUsers()
    {
        var result = await _db.Users
            .Include(u => u.Organization) // 明確載入關聯資料
            .Where(u => u.OrganizationId != null &&
                        u.Organization != null &&
                        new[] { 5, 6, 7, 8, 9 }.Contains(u.Organization.TypeId))
            .Select(u => new UserDto
            {
                Id = u.Id,
                NickName = u.Nickname
            })
            .ToListAsync();

        return result;
    }
    
    public async Task<User?> GetUserByIdAsync(Guid id)
    {
        return await _db.Users.FindAsync(id);
    }

    public async Task<bool> UpdateUserAsync(Guid id, UpdateUserDto dto)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return false;

        user.Nickname = dto.Nickname;
        user.Mobile = dto.Mobile;
        user.Unit = dto.Unit;
        user.Position = dto.Position;

        await _db.SaveChangesAsync();
        return true;
    }
    
    public async Task<bool> ChangePasswordAsync(Guid id, string oldPassword, string newPassword)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return false;

        // 1) 驗證舊密碼
        if (!Argon2.Verify(user.PasswordHash, oldPassword))
            throw new ArgumentException("OLD_PASSWORD_INCORRECT");

        // 2) 後端再驗一次密碼政策（至少 12 碼，含大小寫、數字、特殊字元）
        if (!IsPasswordValid(newPassword))
            throw new ArgumentException("PASSWORD_POLICY_NOT_MET");

        // 3) 不可與目前密碼相同
        if (Argon2.Verify(user.PasswordHash, newPassword))
            throw new InvalidOperationException("PASSWORD_REUSE_CURRENT");

        // 4) 讀取最近三筆歷史並比對
        var last3 = await _db.UserRPasswordHistories
            .Where(h => h.UserId == id)
            .OrderByDescending(h => h.CreatedAt)
            .Take(3)
            .ToListAsync();

        foreach (var h in last3)
        {
            if (Argon2.Verify(h.PasswordHash, newPassword))
                throw new InvalidOperationException("PASSWORD_REUSE_LAST3");
        }

        // 5) 交易：寫入歷史 + 更新新密碼 + 裁剪歷史
        using var tx = await _db.Database.BeginTransactionAsync();

        // 5-1) 先把「舊密碼 hash」存進歷史（CreatedAt 用你的 tool）
        await _db.UserRPasswordHistories.AddAsync(new UserPasswordHistory
        {
            UserId = user.Id,
            PasswordHash = user.PasswordHash,                     // ← 存舊的 hash
            Salt = [],                      // ← 若你把欄位改可空，這裡可改成 null
            CreatedAt = tool.GetTaiwanNow(),
        });

        // 5-2) 變更為新密碼（Argon2 自含 salt）
        user.PasswordHash = Argon2.Hash(newPassword);
        user.PasswordChangedAt = tool.GetTaiwanNow();
        await _db.SaveChangesAsync();

        // 5-3) 只保留最近 10 筆歷史（可依需求調整）
        var toDelete = await _db.UserRPasswordHistories
            .Where(h => h.UserId == id)
            .OrderByDescending(h => h.CreatedAt)
            .Skip(10)
            .ToListAsync();

        if (toDelete.Count > 0)
        {
            _db.UserRPasswordHistories.RemoveRange(toDelete);
            await _db.SaveChangesAsync();
        }

        await tx.CommitAsync();
        return true;
    }

    // --- 小工具 ---
    private static bool IsPasswordValid(string password)
    {
        if (string.IsNullOrWhiteSpace(password)) return false;
        if (password.Length < 12) return false;
        bool hasUpper = password.Any(char.IsUpper);
        bool hasLower = password.Any(char.IsLower);
        bool hasDigit = password.Any(char.IsDigit);
        bool hasSymbol = password.Any(ch => !char.IsLetterOrDigit(ch));
        return hasUpper && hasLower && hasDigit && hasSymbol;
    }
    
    public async Task<bool> ResetPasswordAsync(string email, string newPassword)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null) return false;
        
        // ✅ 更新新密碼（使用 Argon2 雜湊）
        user.PasswordHash = Argon2.Hash(newPassword);
        user.PasswordChangedAt = tool.GetTaiwanNow();
        await _db.SaveChangesAsync();
        return true;
    }
    
    public async Task<bool> SendVerificationCodeAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email 不可為空", nameof(email));

        // 產生 8 碼驗證碼
        var verificationCode = Generate8DigitNumber();
        var redisKey = $"email_verification:{email}";

        // 儲存驗證碼，設定 5 分鐘過期，並初始化錯誤次數
        var data = new VerificationData { Code = verificationCode, Attempts = 0 };
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        await _redisDb.StringSetAsync(redisKey, JsonSerializer.Serialize(data, options), TimeSpan.FromMinutes(5));

        bool emailSent = await _emailService.SendVerificationEmailCodeAsync(email, verificationCode);
        if (!emailSent)
        {
            _logger.LogError("無法發送驗證碼至 {Email}", email);
            return false;
        }

        _logger.LogInformation("已發送驗證碼至 {Email}: {Code}", email, verificationCode);
        return true;
    }
    
    public async Task<bool> VerifyEmailCodeAsync(string email, string inputCode)
    {
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(inputCode))
            throw new ArgumentException("Email 和驗證碼不可為空");

        var redisKey = $"email_verification:{email}";

        var storedData = await _redisDb.StringGetAsync(redisKey);
        if (string.IsNullOrEmpty(storedData))
        {
            _logger.LogWarning("驗證碼不存在或已過期: {Email}", email);
            return false;
        }

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };
        var data = JsonSerializer.Deserialize<VerificationData>(storedData, options);

        if (data == null)
        {
            _logger.LogWarning("無法解析存儲的驗證數據: {Email}", email);
            await _redisDb.KeyDeleteAsync(redisKey); // 刪除 Redis 記錄
            return false;
        }

        if (data.Attempts >= 3)
        {
            _logger.LogWarning("驗證碼已達最大嘗試次數: {Email}", email);
            await _redisDb.KeyDeleteAsync(redisKey); // 刪除 Redis 記錄
            return false;
        }

        if (data.Code != inputCode)
        {
            data.Attempts += 1;
            await _redisDb.StringSetAsync(redisKey, JsonSerializer.Serialize(data, options), TimeSpan.FromMinutes(5));
            _logger.LogWarning("驗證碼輸入錯誤 (第 {Attempts} 次): {Email}", data.Attempts, email);
            return false;
        }

        // 驗證成功，刪除 Redis 記錄
        await _redisDb.KeyDeleteAsync(redisKey);
        _logger.LogInformation("驗證碼驗證成功: {Email}", email);

        // 更新使用者 EmailVerified 狀態
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user != null)
        {
            user.EmailVerified = true;
            user.EmailVerifiedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        return true;
    }

    // 用於註冊流程：僅驗碼並刪除 Redis key，不嘗試更新 User 資料表（此時使用者尚未建立）
    public async Task<bool> VerifyRegistrationCodeAsync(string email, string inputCode)
    {
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(inputCode))
            throw new ArgumentException("Email 和驗證碼不可為空");

        var redisKey = $"email_verification:{email}";

        var storedData = await _redisDb.StringGetAsync(redisKey);
        if (string.IsNullOrEmpty(storedData))
        {
            _logger.LogWarning("驗證碼不存在或已過期: {Email}", email);
            return false;
        }

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var data = JsonSerializer.Deserialize<VerificationData>(storedData, options);

        if (data == null)
        {
            await _redisDb.KeyDeleteAsync(redisKey);
            return false;
        }

        if (data.Attempts >= 3)
        {
            _logger.LogWarning("驗證碼已達最大嘗試次數: {Email}", email);
            await _redisDb.KeyDeleteAsync(redisKey);
            return false;
        }

        if (data.Code != inputCode)
        {
            data.Attempts += 1;
            await _redisDb.StringSetAsync(redisKey, JsonSerializer.Serialize(data, options), TimeSpan.FromMinutes(5));
            _logger.LogWarning("驗證碼輸入錯誤 (第 {Attempts} 次): {Email}", data.Attempts, email);
            return false;
        }

        // 驗證成功，刪除 Redis 記錄（使用者尚未建立，不更新 User 資料表）
        await _redisDb.KeyDeleteAsync(redisKey);
        _logger.LogInformation("註冊驗證碼驗證成功: {Email}", email);
        return true;
    }
}
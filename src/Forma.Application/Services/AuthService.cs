using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Auth.DTOs;
using Forma.Application.Features.SystemSettings.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Forma.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 認證服務實作
/// </summary>
public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtSettings _jwtSettings;
    private readonly ISystemSettingService _systemSettingService;
    private readonly IPasswordPolicyService _passwordPolicyService;
    private readonly IAuditService _audit;

    public AuthService(
        IApplicationDbContext context,
        IJwtService jwtService,
        IPasswordHasher passwordHasher,
        IJwtSettings jwtSettings,
        ISystemSettingService systemSettingService,
        IPasswordPolicyService passwordPolicyService,
        IAuditService audit)
    {
        _context = context;
        _jwtService = jwtService;
        _passwordHasher = passwordHasher;
        _jwtSettings = jwtSettings;
        _systemSettingService = systemSettingService;
        _passwordPolicyService = passwordPolicyService;
        _audit = audit;
    }

    /// <inheritdoc />
    public async Task<SystemStatusDto> GetSystemStatusAsync(CancellationToken cancellationToken = default)
    {
        var hasAdmin = await _context.Users
            .AnyAsync(u => u.Role != null && u.Role.PermissionValue == (long)UserPermission.All && u.IsActive, cancellationToken);

        return new SystemStatusDto
        {
            IsInitialized = hasAdmin,
            Version = "1.0.0"
        };
    }

    /// <inheritdoc />
    public async Task<AuthResponseDto> RegisterAdminAsync(RegisterAdminRequest request, CancellationToken cancellationToken = default)
    {
        // 檢查是否已有系統管理員
        var hasAdmin = await _context.Users
            .AnyAsync(u => u.Role != null && u.Role.PermissionValue == (long)UserPermission.All, cancellationToken);

        if (hasAdmin)
        {
            throw new InvalidOperationException("系統已初始化，無法再次建立管理員帳號");
        }

        // 檢查電子郵件是否已存在
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == request.Email, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("此電子郵件已被使用");
        }

        // 密碼策略驗證
        var (isValid, errors) = await _passwordPolicyService.ValidatePasswordAsync(request.Password, cancellationToken);
        if (!isValid)
        {
            throw new InvalidOperationException(string.Join("；", errors));
        }

        // 建立或取得系統管理員角色
        var adminRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.PermissionValue == (long)UserPermission.All, cancellationToken);

        if (adminRole == null)
        {
            adminRole = new Role
            {
                Name = "系統管理員",
                Description = "擁有所有系統權限",
                PermissionValue = (long)UserPermission.All,
                CreatedAt = DateTime.UtcNow
            };
            _context.Roles.Add(adminRole);
        }

        // 建立系統管理員
        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            RoleId = adminRole.Id,
            Department = request.Department ?? "系統管理",
            JobTitle = request.JobTitle ?? "系統管理員",
            IsActive = true,
            LastLoginAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _audit.Log("USER_CREATED", "User", user.Id,
            $"{{\"username\":\"{user.Username}\",\"email\":\"{user.Email}\",\"role\":\"系統管理員\"}}");

        // 產生 Tokens 並儲存
        var authResponse = await CreateAuthResponseAsync(user, request.DeviceInfo, request.IpAddress, cancellationToken);

        return authResponse;
    }

    /// <inheritdoc />
    public async Task<AuthResponseDto> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        // 尋找使用者 (支援電子郵件或使用者名稱)
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u =>
                u.Email == request.EmailOrUsername ||
                u.Username == request.EmailOrUsername,
                cancellationToken);

        if (user == null)
        {
            throw new UnauthorizedAccessException("無效的電子郵件/使用者名稱或密碼");
        }

        // 檢查帳號是否啟用
        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("此帳號已被停用");
        }

        // 驗證密碼
        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("無效的電子郵件/使用者名稱或密碼");
        }

        // 更新最後登入時間
        user.LastLoginAt = DateTime.UtcNow;

        // 產生 Tokens 並儲存
        var authResponse = await CreateAuthResponseAsync(user, request.DeviceInfo, request.IpAddress, cancellationToken);

        return authResponse;
    }

    /// <inheritdoc />
    public async Task<AuthResponseDto> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        // 檢查電子郵件是否已存在
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == request.Email, cancellationToken);

        if (emailExists)
        {
            throw new InvalidOperationException("此電子郵件已被使用");
        }

        // 密碼策略驗證
        var (isValid, errors) = await _passwordPolicyService.ValidatePasswordAsync(request.Password, cancellationToken);
        if (!isValid)
        {
            throw new InvalidOperationException(string.Join("；", errors));
        }

        // 建立使用者
        var user = new User
        {
            Username = request.Username,
            Email = request.Email,
            PasswordHash = _passwordHasher.HashPassword(request.Password),
            Department = request.Department,
            JobTitle = request.JobTitle,
            IsActive = true,
            LastLoginAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _audit.Log("USER_CREATED", "User", user.Id,
            $"{{\"username\":\"{user.Username}\",\"email\":\"{user.Email}\"}}");

        // 產生 Tokens 並儲存
        var authResponse = await CreateAuthResponseAsync(user, request.DeviceInfo, request.IpAddress, cancellationToken);

        return authResponse;
    }

    /// <inheritdoc />
    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken = default)
    {
        // 尋找 Refresh Token
        var existingToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken, cancellationToken);

        if (existingToken == null)
        {
            throw new UnauthorizedAccessException("無效的 Refresh Token");
        }

        // 檢查 Token 是否有效
        if (!existingToken.IsActive)
        {
            // 如果 Token 已被撤銷，可能是被盜用，撤銷該使用者所有 Token
            if (existingToken.IsRevoked)
            {
                await RevokeAllUserTokensAsync(existingToken.UserId, "嘗試使用已撤銷的 Token", cancellationToken);
            }

            throw new UnauthorizedAccessException("Refresh Token 已失效");
        }

        var user = existingToken.User;

        // 檢查使用者是否啟用
        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("此帳號已被停用");
        }

        // 撤銷舊的 Refresh Token
        existingToken.RevokedAt = DateTime.UtcNow;
        existingToken.RevokedReason = "Token 輪換";

        // 讀取安全設定以取得動態效期
        SecuritySettingsDto? securitySettings = null;
        try
        {
            securitySettings = await _systemSettingService.GetSettingAsync<SecuritySettingsDto>("security", cancellationToken);
        }
        catch
        {
            // 使用預設值
        }

        var accessTokenMinutes = securitySettings?.AccessTokenExpirationMinutes ?? _jwtSettings.AccessTokenExpirationMinutes;
        var refreshTokenDays = securitySettings?.RefreshTokenExpirationDays ?? _jwtSettings.RefreshTokenExpirationDays;

        // 產生新的 Tokens
        var accessToken = _jwtService.GenerateAccessToken(user, accessTokenMinutes);
        var newRefreshToken = _jwtService.GenerateRefreshToken();

        // 標記舊 Token 被新 Token 替換
        existingToken.ReplacedByToken = newRefreshToken;

        // 儲存新的 Refresh Token
        var refreshTokenEntity = new RefreshToken
        {
            Token = newRefreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenDays),
            CreatedAt = DateTime.UtcNow,
            DeviceInfo = request.DeviceInfo ?? existingToken.DeviceInfo,
            IpAddress = request.IpAddress ?? existingToken.IpAddress
        };

        _context.RefreshTokens.Add(refreshTokenEntity);

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = newRefreshToken,
            ExpiresIn = accessTokenMinutes * 60,
            User = MapToUserDto(user)
        };
    }

    /// <inheritdoc />
    public async Task LogoutAsync(Guid userId, string? refreshToken, bool logoutAll, CancellationToken cancellationToken = default)
    {
        if (logoutAll)
        {
            // 登出所有裝置 - 撤銷該使用者所有有效的 Refresh Token
            var activeTokens = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
                .ToListAsync(cancellationToken);

            foreach (var token in activeTokens)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedReason = "使用者登出所有裝置";
            }
        }
        else if (!string.IsNullOrEmpty(refreshToken))
        {
            // 登出單一裝置 - 撤銷指定的 Refresh Token
            var token = await _context.RefreshTokens
                .FirstOrDefaultAsync(rt =>
                    rt.Token == refreshToken &&
                    rt.UserId == userId,
                    cancellationToken);

            if (token != null && token.IsActive)
            {
                token.RevokedAt = DateTime.UtcNow;
                token.RevokedReason = "使用者登出";
            }
        }
        else
        {
            // 沒有提供 RefreshToken，撤銷該使用者最近使用的 Token
            var latestToken = await _context.RefreshTokens
                .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
                .OrderByDescending(rt => rt.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (latestToken != null)
            {
                latestToken.RevokedAt = DateTime.UtcNow;
                latestToken.RevokedReason = "使用者登出";
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<ProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        return MapToProfileDto(user);
    }

    /// <inheritdoc />
    public async Task<ProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        // 更新允許修改的欄位
        user.Department = request.Department;
        user.JobTitle = request.JobTitle;
        user.PhoneNumber = request.PhoneNumber;

        await _context.SaveChangesAsync(cancellationToken);

        return MapToProfileDto(user);
    }

    #region Private Methods

    private async Task<AuthResponseDto> CreateAuthResponseAsync(
        User user,
        string? deviceInfo,
        string? ipAddress,
        CancellationToken cancellationToken)
    {
        // 讀取安全設定以取得動態效期
        SecuritySettingsDto? securitySettings = null;
        try
        {
            securitySettings = await _systemSettingService.GetSettingAsync<SecuritySettingsDto>("security", cancellationToken);
        }
        catch
        {
            // 使用預設值
        }

        var accessTokenMinutes = securitySettings?.AccessTokenExpirationMinutes ?? _jwtSettings.AccessTokenExpirationMinutes;
        var refreshTokenDays = securitySettings?.RefreshTokenExpirationDays ?? _jwtSettings.RefreshTokenExpirationDays;

        var accessToken = _jwtService.GenerateAccessToken(user, accessTokenMinutes);
        var refreshToken = _jwtService.GenerateRefreshToken();

        var refreshTokenEntity = new RefreshToken
        {
            Token = refreshToken,
            UserId = user.Id,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenDays),
            CreatedAt = DateTime.UtcNow,
            DeviceInfo = deviceInfo,
            IpAddress = ipAddress
        };

        _context.RefreshTokens.Add(refreshTokenEntity);

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = accessTokenMinutes * 60,
            User = MapToUserDto(user)
        };
    }

    private async Task RevokeAllUserTokensAsync(Guid userId, string reason, CancellationToken cancellationToken)
    {
        var activeTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var token in activeTokens)
        {
            token.RevokedAt = DateTime.UtcNow;
            token.RevokedReason = reason;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static UserDto MapToUserDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Email = user.Email,
        RoleName = user.Role?.Name,
        Permissions = user.Role?.PermissionValue ?? 0,
        Department = user.Department,
        JobTitle = user.JobTitle,
        IsActive = user.IsActive
    };

    private static ProfileDto MapToProfileDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        Email = user.Email,
        RoleName = user.Role?.Name,
        Permissions = user.Role?.PermissionValue ?? 0,
        Department = user.Department,
        JobTitle = user.JobTitle,
        PhoneNumber = user.PhoneNumber,
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    };

    #endregion
}

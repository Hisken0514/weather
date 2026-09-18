using System.Text.Json;
using Fido2NetLib;
using Fido2NetLib.Objects;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Auth.DTOs;
using Forma.Application.Features.SystemSettings.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Forma.Application.Services;

/// <summary>
/// FIDO2 / Passkey 服務實作
/// </summary>
public class Fido2Service : IFido2Service
{
    private readonly IApplicationDbContext _context;
    private readonly IFido2 _fido2;
    private readonly IDistributedCache _cache;
    private readonly IJwtService _jwtService;
    private readonly IJwtSettings _jwtSettings;
    private readonly ISystemSettingService _systemSettingService;
    private readonly ILogger<Fido2Service> _logger;

    private static readonly DistributedCacheEntryOptions CacheOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
    };

    public Fido2Service(
        IApplicationDbContext context,
        IFido2 fido2,
        IDistributedCache cache,
        IJwtService jwtService,
        IJwtSettings jwtSettings,
        ISystemSettingService systemSettingService,
        ILogger<Fido2Service> logger)
    {
        _context = context;
        _fido2 = fido2;
        _cache = cache;
        _jwtService = jwtService;
        _jwtSettings = jwtSettings;
        _systemSettingService = systemSettingService;
        _logger = logger;
    }

    public async Task<CredentialCreateOptions> StartRegistrationAsync(
        Guid userId, string? deviceName, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException("使用者不存在");

        var existingCredentials = await _context.FidoCredentials
            .Where(f => f.UserId == userId)
            .Select(f => new PublicKeyCredentialDescriptor(f.CredentialId))
            .ToListAsync(ct);

        var fidoUser = new Fido2User
        {
            Id = userId.ToByteArray(),
            Name = user.Email,
            DisplayName = user.Username
        };

        var options = _fido2.RequestNewCredential(new RequestNewCredentialParams
        {
            User = fidoUser,
            ExcludeCredentials = existingCredentials,
            AuthenticatorSelection = new AuthenticatorSelection
            {
                ResidentKey = ResidentKeyRequirement.Preferred,
                UserVerification = UserVerificationRequirement.Preferred
            },
            AttestationPreference = AttestationConveyancePreference.None
        });

        var sessionKey = $"fido2:reg:{userId}";
        await _cache.SetStringAsync(sessionKey, options.ToJson(), CacheOptions, ct);

        return options;
    }

    public async Task CompleteRegistrationAsync(
        Guid userId, AuthenticatorAttestationRawResponse attestation, string? deviceName, CancellationToken ct = default)
    {
        var sessionKey = $"fido2:reg:{userId}";
        var sessionData = await _cache.GetStringAsync(sessionKey, ct)
            ?? throw new InvalidOperationException("註冊 session 已過期，請重新開始");

        var options = CredentialCreateOptions.FromJson(sessionData);

        var credential = await _fido2.MakeNewCredentialAsync(new MakeNewCredentialParams
        {
            AttestationResponse = attestation,
            OriginalOptions = options,
            IsCredentialIdUniqueToUserCallback = async (args, cancellationToken) =>
            {
                var exists = await _context.FidoCredentials
                    .AnyAsync(f => f.CredentialId == args.CredentialId, cancellationToken);
                return !exists;
            }
        }, ct);

        var fidoCredential = new FidoCredential
        {
            CredentialId = credential.Id,
            PublicKey = credential.PublicKey,
            UserHandle = credential.User.Id,
            SignatureCounter = credential.SignCount,
            UserId = userId,
            DeviceName = deviceName,
            AaGuid = credential.AaGuid
        };

        _context.FidoCredentials.Add(fidoCredential);
        await _context.SaveChangesAsync(ct);
        await _cache.RemoveAsync(sessionKey, ct);
    }

    public async Task<AssertionOptions> StartAuthenticationAsync(
        string? email, CancellationToken ct = default)
    {
        var allowedCredentials = new List<PublicKeyCredentialDescriptor>();

        if (!string.IsNullOrEmpty(email))
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email, ct)
                ?? throw new KeyNotFoundException("使用者不存在");

            var credentials = await _context.FidoCredentials
                .Where(f => f.UserId == user.Id)
                .Select(f => new PublicKeyCredentialDescriptor(f.CredentialId))
                .ToListAsync(ct);

            if (credentials.Count == 0)
                throw new InvalidOperationException("此帳號尚未註冊安全金鑰");

            allowedCredentials = credentials;
        }

        var options = _fido2.GetAssertionOptions(new GetAssertionOptionsParams
        {
            AllowedCredentials = allowedCredentials,
            UserVerification = UserVerificationRequirement.Preferred
        });

        var challengeKey = $"fido2:auth:{Convert.ToBase64String(options.Challenge)}";
        await _cache.SetStringAsync(challengeKey, options.ToJson(), CacheOptions, ct);

        return options;
    }

    public async Task<AuthResponseDto> CompleteAuthenticationAsync(
        AuthenticatorAssertionRawResponse assertion, string? deviceInfo, string? ipAddress, CancellationToken ct = default)
    {
        var fidoCredential = await _context.FidoCredentials
            .FirstOrDefaultAsync(f => f.CredentialId == assertion.RawId, ct)
            ?? throw new InvalidOperationException("憑證不存在");

        var options = await FindAuthSessionAsync(assertion, ct)
            ?? throw new InvalidOperationException("認證 session 已過期，請重新開始");

        var assertionResult = await _fido2.MakeAssertionAsync(new MakeAssertionParams
        {
            AssertionResponse = assertion,
            OriginalOptions = options,
            StoredPublicKey = fidoCredential.PublicKey,
            StoredSignatureCounter = fidoCredential.SignatureCounter,
            IsUserHandleOwnerOfCredentialIdCallback = async (args, cancellationToken) =>
            {
                var cred = await _context.FidoCredentials
                    .FirstOrDefaultAsync(f => f.CredentialId == args.CredentialId, cancellationToken);
                return cred?.UserHandle?.SequenceEqual(args.UserHandle) ?? false;
            }
        }, ct);

        fidoCredential.SignatureCounter = assertionResult.SignCount;
        fidoCredential.LastUsedAt = DateTime.UtcNow;

        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == fidoCredential.UserId, ct)
            ?? throw new InvalidOperationException("使用者不存在");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("此帳號已被停用");

        user.LastLoginAt = DateTime.UtcNow;

        // 讀取安全設定
        SecuritySettingsDto? securitySettings = null;
        try
        {
            securitySettings = await _systemSettingService.GetSettingAsync<SecuritySettingsDto>("security", ct);
        }
        catch { }

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
        await _context.SaveChangesAsync(ct);

        await RemoveAuthSessionAsync(assertion, ct);

        return new AuthResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = accessTokenMinutes * 60,
            User = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                RoleName = user.Role?.Name,
                Permissions = user.Role?.PermissionValue ?? 0,
                Department = user.Department,
                JobTitle = user.JobTitle,
                IsActive = user.IsActive
            }
        };
    }

    public async Task<List<Fido2CredentialInfo>> GetCredentialsAsync(
        Guid userId, CancellationToken ct = default)
    {
        return await _context.FidoCredentials
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new Fido2CredentialInfo
            {
                Id = f.Id,
                DeviceName = f.DeviceName,
                AaGuid = f.AaGuid,
                CreatedAt = f.CreatedAt,
                LastUsedAt = f.LastUsedAt
            })
            .ToListAsync(ct);
    }

    public async Task DeleteCredentialAsync(
        Guid credentialEntityId, Guid userId, CancellationToken ct = default)
    {
        var credential = await _context.FidoCredentials
            .FirstOrDefaultAsync(f => f.Id == credentialEntityId && f.UserId == userId, ct)
            ?? throw new KeyNotFoundException("憑證不存在");

        _context.FidoCredentials.Remove(credential);
        await _context.SaveChangesAsync(ct);
    }

    #region Private Helpers

    private async Task<AssertionOptions?> FindAuthSessionAsync(
        AuthenticatorAssertionRawResponse assertion, CancellationToken ct)
    {
        try
        {
            var clientData = JsonSerializer.Deserialize<JsonElement>(assertion.Response.ClientDataJson);
            var challengeB64Url = clientData.GetProperty("challenge").GetString();
            if (challengeB64Url == null) return null;

            var challenge = Convert.FromBase64String(Base64UrlToBase64(challengeB64Url));
            var challengeKey = $"fido2:auth:{Convert.ToBase64String(challenge)}";
            var sessionData = await _cache.GetStringAsync(challengeKey, ct);
            if (sessionData == null) return null;

            return AssertionOptions.FromJson(sessionData);
        }
        catch
        {
            return null;
        }
    }

    private async Task RemoveAuthSessionAsync(
        AuthenticatorAssertionRawResponse assertion, CancellationToken ct)
    {
        try
        {
            var clientData = JsonSerializer.Deserialize<JsonElement>(assertion.Response.ClientDataJson);
            var challengeB64Url = clientData.GetProperty("challenge").GetString();
            if (challengeB64Url == null) return;

            var challenge = Convert.FromBase64String(Base64UrlToBase64(challengeB64Url));
            var challengeKey = $"fido2:auth:{Convert.ToBase64String(challenge)}";
            await _cache.RemoveAsync(challengeKey, ct);
        }
        catch { }
    }

    private static string Base64UrlToBase64(string base64Url)
    {
        var s = base64Url.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return s;
    }

    #endregion
}

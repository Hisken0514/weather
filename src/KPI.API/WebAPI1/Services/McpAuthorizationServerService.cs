using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using WebAPI1.Common;
using WebAPI1.Context;
using WebAPI1.DTOs;
using WebAPI1.Entities;

namespace WebAPI1.Services;

public class McpAuthorizationServerService : IMcpAuthorizationServerService
{
    private readonly ISHAuditDbcontext _db;
    private readonly IConnectionMultiplexer _redis;
    private readonly IConfiguration _configuration;

    private const string PendingKeyPrefix = "mcp:oauth:pending:";

    public McpAuthorizationServerService(ISHAuditDbcontext db, IConnectionMultiplexer redis, IConfiguration configuration)
    {
        _db = db;
        _redis = redis;
        _configuration = configuration;
    }

    public async Task<McpClientRegistrationResponse> RegisterClientAsync(McpClientRegistrationRequest request, CancellationToken ct)
    {
        if (request.RedirectUris is null || request.RedirectUris.Count == 0)
        {
            throw new ArgumentException("redirect_uris 至少要有一個");
        }

        var client = new McpOAuthClient
        {
            ClientId = Guid.NewGuid().ToString("N"),
            ClientName = string.IsNullOrWhiteSpace(request.ClientName) ? "未命名 MCP Client" : request.ClientName,
            RedirectUrisRaw = string.Join(',', request.RedirectUris),
        };
        _db.McpOAuthClients.Add(client);
        await _db.SaveChangesAsync(ct);

        return new McpClientRegistrationResponse(client.ClientId, client.ClientName, request.RedirectUris);
    }

    public async Task<string> CreatePendingAuthorizationAsync(
        string clientId, string redirectUri, string codeChallenge, string? state, string? scope, string userId, CancellationToken ct)
    {
        var client = await _db.McpOAuthClients.AsNoTracking().FirstOrDefaultAsync(c => c.ClientId == clientId, ct)
            ?? throw new InvalidOperationException("client_id 不存在，請先呼叫 /oauth/register");

        if (!client.RedirectUris.Contains(redirectUri))
        {
            throw new InvalidOperationException("redirect_uri 跟註冊時的不一致");
        }

        var requestId = Guid.NewGuid().ToString("N");
        var state_ = new PendingAuthorizationState(clientId, client.ClientName, redirectUri, codeChallenge, state, scope, userId);
        var db = _redis.GetDatabase();
        await db.StringSetAsync(PendingKeyPrefix + requestId, JsonSerializer.Serialize(state_), McpOAuthConstants.PendingAuthorizationLifetime);
        return requestId;
    }

    public async Task<PendingMcpAuthorizationDto?> GetPendingAuthorizationAsync(string requestId, CancellationToken ct)
    {
        var raw = await _redis.GetDatabase().StringGetAsync(PendingKeyPrefix + requestId);
        if (raw.IsNullOrEmpty)
        {
            return null;
        }
        var state = JsonSerializer.Deserialize<PendingAuthorizationState>(raw!);
        return state is null ? null : new PendingMcpAuthorizationDto(requestId, state.ClientId, state.ClientName, state.Scope);
    }

    public async Task<string> DecideAuthorizationAsync(string requestId, bool approve, CancellationToken ct)
    {
        var redisDb = _redis.GetDatabase();
        var key = PendingKeyPrefix + requestId;
        var raw = await redisDb.StringGetAsync(key);
        if (raw.IsNullOrEmpty)
        {
            throw new InvalidOperationException("這個授權請求不存在或已過期");
        }
        var state = JsonSerializer.Deserialize<PendingAuthorizationState>(raw!)
            ?? throw new InvalidOperationException("授權請求內容損毀");
        await redisDb.KeyDeleteAsync(key);

        if (!approve)
        {
            return BuildRedirect(state.RedirectUri, ("error", "access_denied"), ("state", state.State));
        }

        var code = new McpAuthorizationCode
        {
            Code = Guid.NewGuid().ToString("N"),
            ClientId = state.ClientId,
            RedirectUri = state.RedirectUri,
            UserId = state.UserId,
            CodeChallenge = state.CodeChallenge,
            ExpiresAtUtc = DateTime.UtcNow.Add(McpOAuthConstants.AuthorizationCodeLifetime),
        };
        _db.McpAuthorizationCodes.Add(code);
        await _db.SaveChangesAsync(ct);

        return BuildRedirect(state.RedirectUri, ("code", code.Code), ("state", state.State));
    }

    public async Task<McpTokenResponse> ExchangeAuthorizationCodeAsync(
        string code, string redirectUri, string clientId, string codeVerifier, CancellationToken ct)
    {
        var authCode = await _db.McpAuthorizationCodes.FirstOrDefaultAsync(c => c.Code == code, ct)
            ?? throw new InvalidOperationException("authorization code 不存在或已使用過");

        if (authCode.Used || authCode.ExpiresAtUtc < DateTime.UtcNow)
        {
            throw new InvalidOperationException("authorization code 已過期或已使用過");
        }
        if (authCode.ClientId != clientId || authCode.RedirectUri != redirectUri)
        {
            throw new InvalidOperationException("client_id 或 redirect_uri 跟核發時不一致");
        }
        if (ComputeCodeChallengeS256(codeVerifier) != authCode.CodeChallenge)
        {
            throw new InvalidOperationException("code_verifier 驗證失敗");
        }

        authCode.Used = true;
        await _db.SaveChangesAsync(ct);

        return await IssueTokenPairAsync(clientId, authCode.UserId, ct);
    }

    public async Task<McpTokenResponse> ExchangeRefreshTokenAsync(string refreshToken, string clientId, CancellationToken ct)
    {
        var hash = ComputeSha256(refreshToken);
        var stored = await _db.McpRefreshTokens
            .FirstOrDefaultAsync(t => t.TokenHash == hash && t.ClientId == clientId, ct)
            ?? throw new InvalidOperationException("refresh token 不存在");

        if (stored.Revoked || stored.ExpiresAtUtc < DateTime.UtcNow)
        {
            throw new InvalidOperationException("refresh token 已撤銷或過期");
        }

        stored.Revoked = true; // rotation：用過就整筆撤銷，換一組新的
        await _db.SaveChangesAsync(ct);

        return await IssueTokenPairAsync(clientId, stored.UserId, ct);
    }

    public async Task<string?> ResolveCallerUserIdAsync(string userId, CancellationToken ct)
    {
        if (!Guid.TryParse(userId, out var userGuid))
        {
            return null;
        }

        var hasAccess = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == userGuid)
            .SelectMany(u => u.UserRoles)
            .SelectMany(ur => ur.Role.RolePermissions)
            .AnyAsync(rp => rp.Permission.Key == "agent-use", ct);

        return hasAccess ? userId : null;
    }

    public async Task<List<McpOAuthClientAdminDto>> ListClientsAsync(CancellationToken ct)
    {
        var clients = await _db.McpOAuthClients.AsNoTracking().OrderByDescending(c => c.CreatedAt).ToListAsync(ct);
        var activeCounts = await _db.McpRefreshTokens.AsNoTracking()
            .Where(t => !t.Revoked && t.ExpiresAtUtc > DateTime.UtcNow)
            .GroupBy(t => t.ClientId)
            .Select(g => new { ClientId = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var countMap = activeCounts.ToDictionary(x => x.ClientId, x => x.Count);

        return clients.Select(c => new McpOAuthClientAdminDto(
            c.ClientId, c.ClientName, c.RedirectUris.ToList(), c.CreatedAt,
            countMap.TryGetValue(c.ClientId, out var n) ? n : 0)).ToList();
    }

    public async Task RevokeClientAsync(string clientId, CancellationToken ct)
    {
        var client = await _db.McpOAuthClients.FirstOrDefaultAsync(c => c.ClientId == clientId, ct);
        if (client is null)
        {
            return;
        }
        _db.McpOAuthClients.Remove(client);
        _db.McpRefreshTokens.RemoveRange(_db.McpRefreshTokens.Where(t => t.ClientId == clientId));
        _db.McpAuthorizationCodes.RemoveRange(_db.McpAuthorizationCodes.Where(c => c.ClientId == clientId));
        await _db.SaveChangesAsync(ct);
    }

    private async Task<McpTokenResponse> IssueTokenPairAsync(string clientId, string userId, CancellationToken ct)
    {
        var accessToken = GenerateAccessToken(clientId, userId);

        var refreshTokenRaw = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        _db.McpRefreshTokens.Add(new McpRefreshToken
        {
            ClientId = clientId,
            UserId = userId,
            TokenHash = ComputeSha256(refreshTokenRaw),
            ExpiresAtUtc = DateTime.UtcNow.Add(McpOAuthConstants.RefreshTokenLifetime),
        });
        await _db.SaveChangesAsync(ct);

        return new McpTokenResponse(
            accessToken, "Bearer", (int)McpOAuthConstants.AccessTokenLifetime.TotalSeconds, refreshTokenRaw, null);
    }

    private string GenerateAccessToken(string clientId, string userId)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim("client_id", clientId),
        };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: McpOAuthConstants.Audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(McpOAuthConstants.AccessTokenLifetime),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string ComputeCodeChallengeS256(string codeVerifier)
    {
        var hash = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));
        return Base64UrlEncoder.Encode(hash);
    }

    private static string ComputeSha256(string raw)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash);
    }

    private static string BuildRedirect(string redirectUri, params (string Key, string? Value)[] queryParams)
    {
        var query = string.Join('&', queryParams
            .Where(p => !string.IsNullOrEmpty(p.Value))
            .Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value!)}"));
        var separator = redirectUri.Contains('?') ? '&' : '?';
        return query.Length == 0 ? redirectUri : $"{redirectUri}{separator}{query}";
    }
}

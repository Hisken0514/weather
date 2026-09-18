using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;

namespace WebAPI1.Services;

public interface IAuthService
{
    Task<string> GenerateAccessToken(string userId);
    string GenerateRefreshToken(string userId);
    ClaimsPrincipal? ValidateRefreshToken(string refreshToken);
    // void SetRefreshTokenCookie(string refreshToken);
    Task<List<string>> GetUserPermissionsAsync(Guid userId);
    Task<UserProfileDto?> GetCurrentUserAsync(ClaimsPrincipal user);
}

public class UserProfileDto
{
    public Guid UserId { get; set; }
    public string Nickname { get; set; } = "";
    public string Email { get; set; } = "";
    public int OrganizationId { get; set; }
    public string OrganizationName { get; set; } = "";
    public int OrganizationTypeId { get; set; }
    public string Role { get; set; } = "";  // "admin" or "company"
}

public class AuthService: IAuthService
{
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ISHAuditDbcontext _context;

    public AuthService(IConfiguration configuration, IHttpContextAccessor httpContextAccessor, ISHAuditDbcontext context)
    {
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
        _context = context;
    }

    public Task<string> GenerateAccessToken(string userId)
    {
        var user = _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .ThenInclude(ur => ur.RolePermissions)
            .ThenInclude(ur => ur.Permission)
            .FirstOrDefault(a => a.Id == Guid.Parse(userId));
        var permissions = user.UserRoles
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Key)
            .ToList();
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Nickname),
            new Claim("token_type", "access"),
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // 🔑 加入每一個權限作為 claims（ClaimTypes.Role 或自定 key）
        foreach (var permission in permissions)
        {
            claims.Add(new Claim("permission", permission));
        }
        var expires = int.Parse(_configuration["JwtSettings:Expires"]?? "30");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expires),
            signingCredentials: creds
        );

        return Task.FromResult(new JwtSecurityTokenHandler().WriteToken(token));
    }

    
    public string GenerateRefreshToken(string userId)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim("token_type", "refresh")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JwtSettings:Key"]));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["JwtSettings:Issuer"],
            audience: _configuration["JwtSettings:Audience"],
            claims: claims,
            expires: tool.GetTaiwanNow().AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateRefreshToken(string refreshToken)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["JwtSettings:Key"]);

            var principal = tokenHandler.ValidateToken(refreshToken, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _configuration["JwtSettings:Issuer"],
                ValidateAudience = true,
                ValidAudience = _configuration["JwtSettings:Audience"],
                ClockSkew = TimeSpan.Zero
            }, out _);

            // ✅ 加上這段判斷是否為 Refresh Token
            var tokenType = principal.FindFirst("token_type")?.Value;
            if (tokenType != "refresh")
            {
                return null; // 若不是 refresh token，則視為驗證失敗
            }

            return principal;
        }
        catch
        {
            return null;
        }
    }

    // public void SetRefreshTokenCookie(string refreshToken)
    // {
    //     var context = _httpContextAccessor.HttpContext;
    //     if (context != null)
    //     {
    //         context.Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
    //         {
    //             HttpOnly = true,
    //             Secure = true,
    //             SameSite = SameSiteMode.Strict,
    //             Path = "/",
    //             Expires = tool.GetTaiwanNow().AddDays(7)
    //         });
    //     }
    // }
    
    public async Task<List<string>> GetUserPermissionsAsync(Guid userId)
    {
        var permissions = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Key)
            .Distinct()
            .ToListAsync();

        return permissions;
    }
    
    public async Task<UserProfileDto?> GetCurrentUserAsync(ClaimsPrincipal user)
    {
        var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
            return null;

        var dbUser = await _context.Users
            .Include(u => u.Organization)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (dbUser == null || dbUser.Organization == null)
            return null;

        var typeId = dbUser.Organization.TypeId;

        // 角色一律以 UserRoles 實際指派為準（優先序：superAdmin > admin > official > company > user）。
        // 舊邏輯只看組織 TypeId 猜角色——非公司型組織（TypeId 不是 2/3/4）一律猜成 admin，完全沒管
        // UserRoles 裡真正指派了什麼，導致政府型組織的一般承辦人員（指派 user/official）、甚至連組織
        // 都還沒分類好的帳號（TypeId=9「未知」，沒有任何角色指派）全部被判定成 admin，後台管理功能、
        // AI 助手等 admin-only 功能因此對這些人曝露。只有使用者完全沒有任何 UserRoles 指派時，才退回
        // 組織型別猜測，且猜測不再預設 admin，改成低權限的 company，安全邊界寧可猜低不要猜高。
        var assignedRoleNames = dbUser.UserRoles.Select(ur => ur.Role?.Name).Where(n => n != null).ToHashSet();
        string role;
        if (assignedRoleNames.Contains("superAdmin")) role = "superAdmin";
        else if (assignedRoleNames.Contains("admin")) role = "admin";
        else if (assignedRoleNames.Contains("official")) role = "official";
        else if (assignedRoleNames.Contains("company")) role = "company";
        else if (assignedRoleNames.Contains("user")) role = "user";
        else role = "company";

        return new UserProfileDto
        {
            UserId = dbUser.Id,
            Nickname = dbUser.Nickname,
            Email = dbUser.Email,
            OrganizationId = dbUser.OrganizationId,
            OrganizationName = dbUser.Organization.Name,
            OrganizationTypeId = typeId,
            Role = role
        };
    }
}
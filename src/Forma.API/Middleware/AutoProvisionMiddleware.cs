using System.Security.Claims;
using Forma.Domain.Entities;
using Forma.Infrastructure.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace Forma.API.Middleware;

/// <summary>
/// KPI SSO 自動開通 Middleware。
///
/// KPI 使用者首次攜帶 KPI token 存取 Forma API 時，
/// 自動在 Forma DB 建立對應帳號（僅 SSO 存取，無法用密碼登入），
/// 後續請求直接通過，不再查詢 DB。
/// </summary>
public class AutoProvisionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AutoProvisionMiddleware> _logger;

    public AutoProvisionMiddleware(
        RequestDelegate next,
        IServiceScopeFactory scopeFactory,
        ILogger<AutoProvisionMiddleware> logger)
    {
        _next = next;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var formaUserId = await EnsureKpiUserProvisionedAsync(context.User);

            // 把 Forma User ID 注入成 "uid" claim，讓 CurrentUserService 能抓到正確的 ID
            if (formaUserId.HasValue)
            {
                var extraIdentity = new ClaimsIdentity();
                extraIdentity.AddClaim(new Claim("uid", formaUserId.Value.ToString()));
                context.User.AddIdentity(extraIdentity);
            }
        }

        await _next(context);
    }

    /// <returns>Forma User 的 ID；若非 KPI token 則回傳 null</returns>
    private async Task<Guid?> EnsureKpiUserProvisionedAsync(ClaimsPrincipal user)
    {
        // 只處理 KPI token：
        //   KPI access token 一定有 "token_type" = "access"（不管有無 permission claim）
        //   注意：KpiClaimsTransformation 在此之前已跑，會把 KPI permission 轉成 Forma "permissions"，
        //         所以無法用 "permissions" claim 來區分 KPI/Forma token
        //   Forma 自己的 token 沒有 "token_type" claim
        var isKpiToken = user.HasClaim(c => c.Type == "token_type" && c.Value == "access") &&
                         !user.HasClaim(c => c.Type == "uid");

        if (!isKpiToken) return null;

        var email = user.FindFirst(ClaimTypes.Email)?.Value;
        if (string.IsNullOrEmpty(email)) return null;

        // KPI admin 識別：擁有 "delete" permission
        var isAdmin = user.FindAll("permission")
                         .Any(c => c.Value.Equals("delete", StringComparison.OrdinalIgnoreCase));

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FormaDbContext>();

        // 查找系統管理員角色（由 DataSeeder 建立）
        var adminRole = isAdmin
            ? await db.Roles.FirstOrDefaultAsync(r => r.Name == "系統管理員")
            : null;

        // 已存在 → 檢查是否需要補上角色，回傳 Forma User ID
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (existing != null)
        {
            if (isAdmin && adminRole != null && existing.RoleId == null)
            {
                existing.RoleId = adminRole.Id;
                await db.SaveChangesAsync();
                _logger.LogInformation(
                    "KPI SSO: 已補上 Forma 角色 [{Role}] 給 [{Username}] <{Email}>",
                    adminRole.Name, existing.Username, email);
            }
            return existing.Id;
        }

        // 從 KPI claims 取出顯示名稱
        var username = user.FindFirst(ClaimTypes.Name)?.Value
                       ?? email.Split('@')[0];

        var newUser = new User
        {
            Email        = email,
            Username     = username,
            // SSO 帳號不設密碼：PasswordHasher.VerifyPassword 會因格式不符直接回傳 false
            PasswordHash = "!KPI_SSO",
            IsActive     = true,
            LastLoginAt  = DateTime.UtcNow,
            RoleId       = adminRole?.Id   // admin → 系統管理員角色；一般用戶 → null
        };

        db.Users.Add(newUser);

        try
        {
            await db.SaveChangesAsync();
            _logger.LogInformation(
                "KPI SSO: 已自動開通 Forma 帳號 [{Username}] <{Email}>，角色：{Role}",
                username, email, adminRole?.Name ?? "無");
            return newUser.Id;
        }
        catch (DbUpdateException)
        {
            // 極少數 race condition（兩個請求同時新增同一 email）→ 查一次確認
            var raceUser = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            return raceUser?.Id;
        }
    }
}

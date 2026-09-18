using System.Security.Claims;
using Forma.Application.Common.Interfaces;
using Forma.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace Forma.Infrastructure.Services;

/// <summary>
/// 當前使用者服務實作
/// </summary>
public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    /// <inheritdoc />
    public Guid? UserId
    {
        get
        {
            // 優先使用 AutoProvisionMiddleware 注入的 "uid"（Forma User ID）
            // KPI SSO token 的 NameIdentifier 是 KPI 系統的 ID，不在 Forma Users 表中
            var userIdClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("uid")
                              ?? _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.NameIdentifier)
                              ?? _httpContextAccessor.HttpContext?.User?.FindFirst("sub");

            if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
            {
                return userId;
            }

            return null;
        }
    }

    /// <inheritdoc />
    public string? Username => _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Name)?.Value;

    /// <inheritdoc />
    public string? Email => _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Email)?.Value;

    /// <inheritdoc />
    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    /// <inheritdoc />
    public long Permissions
    {
        get
        {
            var permClaim = _httpContextAccessor.HttpContext?.User?.FindFirst("permissions");
            if (permClaim != null && long.TryParse(permClaim.Value, out var perms))
                return perms;
            return 0;
        }
    }

    /// <inheritdoc />
    public bool IsSystemAdmin
    {
        get
        {
            const long adminPerms = (long)UserPermission.ManageUsers | (long)UserPermission.ManageRoles | (long)UserPermission.ManageSettings;
            return (Permissions & adminPerms) == adminPerms;
        }
    }
}

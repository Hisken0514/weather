using Forma.Application.Common.Authorization;
using Forma.Domain.Enums;

namespace Forma.API.Extensions;

/// <summary>
/// 授權配置擴充方法
/// </summary>
public static class AuthorizationExtensions
{
    /// <summary>
    /// 新增授權策略
    /// </summary>
    public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            // RequireUser: 任何已認證的使用者
            .AddPolicy(Policies.RequireUser, policy =>
            {
                policy.RequireAuthenticatedUser();
            })
            // RequireAuditor: 需要有權限的使用者
            .AddPolicy(Policies.RequireAuditor, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireClaim("permissions");
            })
            // RequireSystemAdmin: 僅系統管理員
            .AddPolicy(Policies.RequireSystemAdmin, policy =>
            {
                policy.RequireAuthenticatedUser();
                policy.RequireAssertion(context =>
                {
                    var permClaim = context.User.FindFirst("permissions");
                    if (permClaim == null || !long.TryParse(permClaim.Value, out var perms))
                        return false;
                    const long adminPerms = (long)UserPermission.ManageUsers | (long)UserPermission.ManageRoles | (long)UserPermission.ManageSettings;
                    return (perms & adminPerms) == adminPerms;
                });
            });

        return services;
    }
}

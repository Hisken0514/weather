using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace WebAPI1.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireAccessTokenAttribute : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        // 驗證是否有登入
        if (user == null || !(user.Identity?.IsAuthenticated ?? false))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        // 驗證 token_type 是不是 access
        var tokenType = user.FindFirst("token_type")?.Value;
        // ❗ 更嚴格：沒有 token_type 也視為不合法
        if (string.IsNullOrEmpty(tokenType) || tokenType != "access")
        {
            context.Result = new UnauthorizedResult();
        }
    }
}
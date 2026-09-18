using Microsoft.AspNetCore.Authorization;

namespace WebAPI1.Services;

public class HasPermissionAttribute : AuthorizeAttribute
{
    public HasPermissionAttribute(string permission)
    {
        Policy = $"Permission:{permission}";
    }
}
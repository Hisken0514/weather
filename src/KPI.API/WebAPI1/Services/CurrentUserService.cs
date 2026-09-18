using System.Security.Claims;

namespace WebAPI1.Services;

public interface ICurrentUserService
{
    string? UserId { get; }
    string? UserName { get; }
    string? ClientIp { get; }
    string? RequestPath { get; }
}

public class CurrentUserService : ICurrentUserService
{
    public string? UserId { get; }
    public string? UserName { get; }
    public string? ClientIp { get; }
    public string? RequestPath { get; }

    public CurrentUserService(IHttpContextAccessor accessor)
    {
        var http = accessor.HttpContext;
        var user = http?.User;
        UserId = user?.FindFirst("sub")?.Value
                 ?? user?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        UserName = user?.FindFirst(ClaimTypes.Name)?.Value
                   ?? user?.FindFirst("name")?.Value
                   ?? "Undefined";
        ClientIp = http?.Connection?.RemoteIpAddress?.ToString();
        RequestPath = http?.Request?.Path.Value;
    }
}
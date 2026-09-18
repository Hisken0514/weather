using Forma.Application.Common.Interfaces;
using Forma.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace Forma.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUser;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuditService(
        IApplicationDbContext context,
        ICurrentUserService currentUser,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _currentUser = currentUser;
        _httpContextAccessor = httpContextAccessor;
    }

    public void Log(string action, string entityType, Guid? entityId, string? changes = null)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        var ip = httpContext?.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                 ?? httpContext?.Connection.RemoteIpAddress?.ToString();

        _context.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = _currentUser.UserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Changes = changes,
            Timestamp = DateTime.UtcNow,
            IpAddress = ip
        });
    }
}

namespace Forma.Application.Features.Logs.DTOs;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? UserName { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? Changes { get; set; }
    public DateTime Timestamp { get; set; }
    public string? IpAddress { get; set; }
}

public class AuditLogQueryParameters
{
    public int PageNumber { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
    public string? Action { get; set; }
    public string? EntityType { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool Descending { get; set; } = true;
}

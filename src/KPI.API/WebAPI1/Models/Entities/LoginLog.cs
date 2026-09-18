using WebAPI1.Services;

namespace WebAPI1.Entities;

public class LoginLog
{
    public long Id { get; set; }
    public DateTime OccurredAtUtc { get; set; } = tool.GetTaiwanNow();
    public string? UserId { get; set; }
    public string? UserEmail { get; set; }
    public bool IsSuccess { get; set; }
    public string? FailReason { get; set; }
    public string? ClientIp { get; set; }
}

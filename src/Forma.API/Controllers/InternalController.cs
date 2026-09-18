using Forma.Domain.Entities;
using Forma.Infrastructure.Data.Context;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Forma.API.Controllers;

/// <summary>
/// 僅供系統內部（KPI API）呼叫的端點，不對外開放。
/// 以 X-Internal-Secret header 做 server-to-server 驗證。
/// </summary>
[ApiController]
[Route("api/internal")]
public class InternalController : ControllerBase
{
    private readonly FormaDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<InternalController> _logger;

    public InternalController(FormaDbContext db, IConfiguration config, ILogger<InternalController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    public record ProvisionRequest(string Email, string Username, bool IsAdmin, string? Unit, string? Position);

    /// <summary>
    /// 在 Forma 建立 KPI 用戶的帳號（若已存在則補齊資料後回傳）。
    /// </summary>
    [HttpPost("provision")]
    public async Task<IActionResult> Provision([FromBody] ProvisionRequest req, CancellationToken ct)
    {
        var secret = _config["InternalApi:Secret"];
        if (string.IsNullOrEmpty(secret) ||
            Request.Headers["X-Internal-Secret"].ToString() != secret)
        {
            return Unauthorized(new { message = "Invalid internal secret" });
        }

        if (string.IsNullOrWhiteSpace(req.Email))
            return BadRequest(new { message = "Email is required" });

        // 已存在 → 補齊單位/職稱後回傳
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email, ct);
        if (existing != null)
        {
            existing.Department = req.Unit;
            existing.JobTitle   = req.Position;
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("InternalProvision: 用戶已存在，已更新資料 <{Email}>", req.Email);
            return Ok(new { created = false, formaUserId = existing.Id });
        }

        var adminRole = req.IsAdmin
            ? await _db.Roles.FirstOrDefaultAsync(r => r.Name == "系統管理員", ct)
            : null;

        var newUser = new User
        {
            Email        = req.Email,
            Username     = req.Username,
            PasswordHash = "!KPI_SSO",
            IsActive     = true,
            LastLoginAt  = DateTime.UtcNow,
            RoleId       = adminRole?.Id,
            Department   = req.Unit,
            JobTitle     = req.Position,
        };

        _db.Users.Add(newUser);

        try
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation(
                "InternalProvision: 已建立 Forma 帳號 [{Username}] <{Email}>，角色：{Role}",
                req.Username, req.Email, adminRole?.Name ?? "無");
            return Ok(new { created = true, formaUserId = newUser.Id });
        }
        catch (DbUpdateException)
        {
            var race = await _db.Users.FirstOrDefaultAsync(u => u.Email == req.Email, ct);
            return Ok(new { created = false, formaUserId = race?.Id });
        }
    }

    public record SyncUserRequest(string Email, string? Unit, string? Position);

    /// <summary>
    /// 批次更新已存在 Forma 帳號的單位與職稱（一次性補齊用）。
    /// </summary>
    [HttpPost("sync-users")]
    public async Task<IActionResult> SyncUsers([FromBody] List<SyncUserRequest> users, CancellationToken ct)
    {
        var secret = _config["InternalApi:Secret"];
        if (string.IsNullOrEmpty(secret) ||
            Request.Headers["X-Internal-Secret"].ToString() != secret)
        {
            return Unauthorized(new { message = "Invalid internal secret" });
        }

        var emails = users.Select(u => u.Email).ToHashSet();
        var formaUsers = await _db.Users
            .Where(u => u.Email != null && emails.Contains(u.Email))
            .ToListAsync(ct);

        var lookup = users.ToDictionary(u => u.Email, StringComparer.OrdinalIgnoreCase);
        foreach (var u in formaUsers)
        {
            if (u.Email is null || !lookup.TryGetValue(u.Email, out var src)) continue;
            u.Department = src.Unit;
            u.JobTitle   = src.Position;
        }

        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("SyncUsers: 已更新 {Count} 位使用者的單位與職稱", formaUsers.Count);
        return Ok(new { updated = formaUsers.Count });
    }
}

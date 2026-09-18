using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using System.Text.Json;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

public class DataChangeLogInterceptor : SaveChangesInterceptor
{
    private readonly IServiceProvider _sp;
    private readonly ICurrentUserService _currentUser;
    
    public DataChangeLogInterceptor(ICurrentUserService currentUser,IServiceProvider sp)
    {
        _currentUser = currentUser;
        _sp = sp;
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var ctx = eventData.Context;
        if (ctx == null) return await base.SavingChangesAsync(eventData, result, cancellationToken);

        var entries = ctx.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Where(e => e.Entity is not DataChangeLog and not LoginLog)
            .ToList();

        if (entries.Count == 0)
            return await base.SavingChangesAsync(eventData, result, cancellationToken);

        var logs = new List<DataChangeLog>();

        foreach (var e in entries)
        {
            string action = e.State switch
            {
                EntityState.Added => "Insert",
                EntityState.Modified => "Update",
                EntityState.Deleted => "Delete",
                _ => "Unknown"
            };

            var pk = e.Properties.FirstOrDefault(p => p.Metadata.IsPrimaryKey());
            string? entityId = pk?.CurrentValue?.ToString() ?? pk?.OriginalValue?.ToString();

            var payload = new Dictionary<string, object?>();
            foreach (var p in e.Properties)
            {
                if (p.Metadata.IsPrimaryKey()) continue;
                payload[p.Metadata.Name] =
                    e.State == EntityState.Deleted ? p.OriginalValue : p.CurrentValue;
            }

            logs.Add(new DataChangeLog
            {
                OccurredAtUtc = tool.GetTaiwanNow(),
                UserId = _currentUser.UserId,
                UserName = _currentUser.UserName,
                Action = action,
                EntityName = e.Metadata.ClrType.Name,
                TableName = e.Metadata.GetTableName(),
                EntityId = entityId,
                RequestPath = _currentUser.RequestPath,
                ClientIp = _currentUser.ClientIp,
                PayloadJson = JsonSerializer.Serialize(payload)
            });
        }

        // ✅ 用 DI 建立新的 DbContext Scope，不要手動 new
        using (var scope = _sp.CreateScope())
        {
            var auditDb = scope.ServiceProvider.GetRequiredService<ISHAuditDbcontext>();
            await auditDb.DataChangeLogs.AddRangeAsync(logs, cancellationToken);
            await auditDb.SaveChangesAsync(cancellationToken);
        }

        return await base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}

using Forma.Application.Common.Interfaces;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public class FactoryIdentitySyncService : IFactoryIdentitySyncService
{
    private readonly IApplicationDbContext _context;

    public FactoryIdentitySyncService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SyncFactoryNameAsync(string? registrationNo, string? name, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(registrationNo) || string.IsNullOrWhiteSpace(name))
            return;

        // FactoryMaster 是同步的中樞：沒有這個登記編號就建立最小一筆（DataSource 留空，
        // 代表這筆不是來自官方清冊匯入，只是被動同步產生的），有的話名稱不同才更新，
        // 其他官方欄位（地址、統編等）不動，不會被這邊的存檔覆蓋掉。
        var master = await _context.FactoryMasters
            .FirstOrDefaultAsync(m => m.FactoryRegistrationNo == registrationNo, ct);
        if (master == null)
        {
            _context.FactoryMasters.Add(new FactoryMaster
            {
                Id = Guid.NewGuid(),
                FactoryRegistrationNo = registrationNo,
                FactoryName = name,
                LastImportedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
            });
        }
        else if (master.FactoryName != name)
        {
            master.FactoryName = name;
        }

        var supervisedFactories = await _context.SupervisedFactories
            .Where(f => f.FactoryRegistrationNo == registrationNo && f.FactoryName != name)
            .ToListAsync(ct);
        foreach (var f in supervisedFactories)
            f.FactoryName = name;

        var riskFactories = await _context.RiskAssessedFactories
            .Where(f => f.FactoryRegistrationNo == registrationNo && f.FactoryName != name)
            .ToListAsync(ct);
        foreach (var f in riskFactories)
            f.FactoryName = name;

        await _context.SaveChangesAsync(ct);
    }
}

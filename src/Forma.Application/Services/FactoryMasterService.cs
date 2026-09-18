using Forma.Application.Common.Interfaces;
using Forma.Domain.Entities;
using Forma.Shared;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public record FactoryMasterImportResult(int Inserted, int Updated, int Skipped, string DataSource);

public record RawFactoryRow(
    string FactoryRegistrationNo, string FactoryName,
    string? UnifiedBusinessNo, string? Address,
    string? County, string? Township,
    string? OwnerName, string? OrganizationType,
    string? RegistrationStatus, string? IndustryCategory, string? MainProducts,
    double? Lat = null, double? Lng = null
);

public interface IFactoryMasterService
{
    Task<FactoryMasterImportResult> ImportAsync(IEnumerable<RawFactoryRow> rows, string dataSource, CancellationToken ct = default);
    Task<(int Total, int ByCounty)> GetStatsAsync(CancellationToken ct = default);
    Task<List<CountySummary>> GetCountySummaryAsync(CancellationToken ct = default);

    /// <summary>
    /// 依登記編號排序、串流輸出全部工廠主資料（給匯出用，避免十幾萬筆一次載入記憶體）。
    /// 欄位順序跟匯入（Import）解析的欄位位置完全對應，匯出後可以直接改一改再匯入回來。
    /// </summary>
    IAsyncEnumerable<FactoryMaster> StreamAllAsync(CancellationToken ct = default);

    /// <summary>刪除全部工廠主資料，回傳實際刪除的筆數。不可復原，前端要有明確確認。</summary>
    Task<int> DeleteAllAsync(CancellationToken ct = default);
}

public record CountySummary(string County, int Total);

public class FactoryMasterService : IFactoryMasterService
{
    private readonly IApplicationDbContext _context;

    public FactoryMasterService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<FactoryMasterImportResult> ImportAsync(IEnumerable<RawFactoryRow> rows, string dataSource, CancellationToken ct = default)
    {
        return await UpsertAsync(rows, dataSource, ct);
    }

    public async Task<(int Total, int ByCounty)> GetStatsAsync(CancellationToken ct = default)
    {
        var total = await _context.FactoryMasters.CountAsync(ct);
        var byCounty = await _context.FactoryMasters.Select(f => f.County).Distinct().CountAsync(ct);
        return (total, byCounty);
    }

    public async Task<List<CountySummary>> GetCountySummaryAsync(CancellationToken ct = default)
    {
        return await _context.FactoryMasters
            .Where(f => f.County != null)
            .GroupBy(f => f.County!)
            .Select(g => new CountySummary(g.Key, g.Count()))
            .OrderByDescending(x => x.Total)
            .ToListAsync(ct);
    }

    public IAsyncEnumerable<FactoryMaster> StreamAllAsync(CancellationToken ct = default)
    {
        return _context.FactoryMasters
            .AsNoTracking()
            .OrderBy(f => f.FactoryRegistrationNo)
            .AsAsyncEnumerable();
    }

    public async Task<int> DeleteAllAsync(CancellationToken ct = default)
    {
        var count = await _context.FactoryMasters.CountAsync(ct);
        // 用 ExecuteDeleteAsync 直接在資料庫端刪除，避免十幾萬筆先整批載入記憶體再逐筆刪
        await _context.FactoryMasters.ExecuteDeleteAsync(ct);
        return count;
    }

    // ── 核心 Upsert ────────────────────────────────────────────────

    private async Task<FactoryMasterImportResult> UpsertAsync(
        IEnumerable<RawFactoryRow> rows, string dataSource, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        int inserted = 0, updated = 0, skipped = 0;

        // 批次查詢已存在的登記編號（Excel 把登記編號當數字存會被去掉前面的0，這裡先正規化，
        // 避免同一家工廠因為補0與否被當成兩筆不同資料重複匯入）
        var regNos = rows.Select(r => r.FactoryRegistrationNo)
                         .Where(n => !string.IsNullOrWhiteSpace(n))
                         .Select(FactoryRegistrationNoNormalizer.Normalize)
                         .Distinct()
                         .ToList();

        var existing = await _context.FactoryMasters
            .Where(f => regNos.Contains(f.FactoryRegistrationNo))
            .ToDictionaryAsync(f => f.FactoryRegistrationNo, ct);

        const int batchSize = 1000;
        var toAdd = new List<FactoryMaster>();
        var pendingNos = new HashSet<string>(); // 防止同一檔案內的重複登記編號

        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.FactoryRegistrationNo))
            {
                skipped++;
                continue;
            }

            var regNo = FactoryRegistrationNoNormalizer.Normalize(row.FactoryRegistrationNo);

            if (existing.TryGetValue(regNo, out var ef))
            {
                // 更新
                ef.FactoryName        = row.FactoryName;
                ef.UnifiedBusinessNo  = NormalizeUnifiedBusinessNo(row.UnifiedBusinessNo);
                ef.Address            = row.Address;
                ef.County             = row.County;
                ef.Township           = row.Township;
                ef.OwnerName          = row.OwnerName;
                ef.OrganizationType   = row.OrganizationType;
                ef.RegistrationStatus = row.RegistrationStatus;
                ef.IndustryCategory   = row.IndustryCategory;
                ef.MainProducts       = row.MainProducts;
                ef.DataSource         = dataSource;
                ef.LastImportedAt     = now;
                if (row.Lat.HasValue) ef.Lat = row.Lat;
                if (row.Lng.HasValue) ef.Lng = row.Lng;
                updated++;
            }
            else if (pendingNos.Add(regNo))
            {
                toAdd.Add(new FactoryMaster
                {
                    Id                    = Guid.NewGuid(),
                    FactoryRegistrationNo = regNo,
                    FactoryName           = row.FactoryName,
                    UnifiedBusinessNo     = NormalizeUnifiedBusinessNo(row.UnifiedBusinessNo),
                    Address               = row.Address,
                    County                = row.County,
                    Township              = row.Township,
                    OwnerName             = row.OwnerName,
                    OrganizationType      = row.OrganizationType,
                    RegistrationStatus    = row.RegistrationStatus,
                    IndustryCategory      = row.IndustryCategory,
                    MainProducts          = row.MainProducts,
                    Lat                   = row.Lat,
                    Lng                   = row.Lng,
                    DataSource            = dataSource,
                    LastImportedAt        = now,
                    CreatedAt             = now,
                });
                inserted++;

                // 每批 1000 筆寫入一次
                if (toAdd.Count >= batchSize)
                {
                    _context.FactoryMasters.AddRange(toAdd);
                    await _context.SaveChangesAsync(ct);
                    toAdd.Clear();
                }
            }
            else
            {
                skipped++;
            }
        }

        if (toAdd.Count > 0)
            _context.FactoryMasters.AddRange(toAdd);

        await _context.SaveChangesAsync(ct);

        return new FactoryMasterImportResult(inserted, updated, skipped, dataSource);
    }

    // 統一編號跟工廠登記編號是同一類問題：Excel 把它當數字存會被去掉前面的0，
    // 台灣統編固定8碼，用同一個 normalizer 補回來就好
    private static string? NormalizeUnifiedBusinessNo(string? no) =>
        string.IsNullOrWhiteSpace(no) ? no : FactoryRegistrationNoNormalizer.Normalize(no);

}

using Forma.Application.Common.Interfaces;
using Forma.Application.Features.FactoryRisk.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public class FactoryRiskDataService : IFactoryRiskDataService
{
    private readonly IApplicationDbContext _context;
    private readonly IFactoryIdentitySyncService _identitySyncService;

    public FactoryRiskDataService(IApplicationDbContext context, IFactoryIdentitySyncService identitySyncService)
    {
        _context = context;
        _identitySyncService = identitySyncService;
    }

    public async Task<PagedFactoryRiskRawDataResponse> GetFactoriesAsync(
        int page, int pageSize, string? search, int? dataYear = null, CancellationToken ct = default)
    {
        var query = _context.FactoryRiskInputs
            .Include(i => i.Factory)
            .Include(i => i.IndicatorValues)
            .AsNoTracking()
            .AsQueryable();

        if (dataYear.HasValue)
            query = query.Where(i => i.DataYear == dataYear.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(i =>
                i.Factory.FactoryName.Contains(s) ||
                (i.Factory.FactoryRegistrationNo != null && i.Factory.FactoryRegistrationNo.Contains(s)));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(i => i.Factory.FactoryName)
            .ThenByDescending(i => i.DataYear)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedFactoryRiskRawDataResponse(items.Select(ToDto).ToList(), total, page, pageSize);
    }

    public async Task<FactoryRiskRawDataDto> GetFactoryAsync(Guid riskInputId, CancellationToken ct = default)
    {
        var input = await _context.FactoryRiskInputs
            .Include(i => i.Factory)
            .Include(i => i.IndicatorValues)
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == riskInputId, ct)
            ?? throw new KeyNotFoundException($"找不到原始資料 {riskInputId}");

        return ToDto(input);
    }

    public async Task<Guid> CreateFactoryAsync(UpsertFactoryRiskRawDataRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request);

        var regNo = NullIfBlank(request.FactoryRegistrationNo);

        // 跟 Excel 匯入的 upsert 邏輯一致：先用登記編號、再用名稱比對既有工廠身分，
        // 避免同一家工廠因為手動新增又被拆成兩筆不同的 RiskAssessedFactory
        RiskAssessedFactory? factory = null;
        if (regNo != null)
            factory = await _context.RiskAssessedFactories.FirstOrDefaultAsync(f => f.FactoryRegistrationNo == regNo, ct);
        factory ??= await _context.RiskAssessedFactories
            .FirstOrDefaultAsync(f => f.FactoryRegistrationNo == null && f.FactoryName == request.FactoryName, ct);

        if (factory != null)
        {
            var duplicate = await _context.FactoryRiskInputs
                .AnyAsync(i => i.FactoryId == factory.Id && i.DataYear == request.DataYear, ct);
            if (duplicate)
                throw new InvalidOperationException(
                    $"工廠「{factory.FactoryName}」在資料年度 {request.DataYear} 已經有資料了，請改用編輯，不要重複新增。");
        }
        else
        {
            factory = new RiskAssessedFactory { Id = Guid.NewGuid() };
            _context.RiskAssessedFactories.Add(factory);
        }

        factory.FactoryName = request.FactoryName;
        factory.FactoryRegistrationNo = regNo;
        factory.Address = NullIfBlank(request.Address);
        factory.IndustryCategory = NullIfBlank(request.IndustryCategory);
        factory.IndustrialPark = NullIfBlank(request.IndustrialPark);
        factory.Region = NullIfBlank(request.Region);
        factory.County = NullIfBlank(request.County);

        var riskInput = new FactoryRiskInput
        {
            Id = Guid.NewGuid(),
            FactoryId = factory.Id,
            DataYear = request.DataYear,
            MaxHazardChemicalTypeName = request.MaxHazardChemicalTypeName,
            MaxHazardQuantity = request.MaxHazardQuantity,
            MaxHazardSubstanceName = NullIfBlank(request.MaxHazardSubstanceName),
        };
        _context.FactoryRiskInputs.Add(riskInput);
        AddIndicatorValues(riskInput.Id, request.IndicatorValues);

        await _context.SaveChangesAsync(ct);

        await _identitySyncService.SyncFactoryNameAsync(factory.FactoryRegistrationNo, factory.FactoryName, ct);

        return riskInput.Id;
    }

    public async Task UpdateFactoryAsync(Guid riskInputId, UpsertFactoryRiskRawDataRequest request, CancellationToken ct = default)
    {
        ValidateRequest(request);

        var riskInput = await _context.FactoryRiskInputs
            .Include(i => i.IndicatorValues)
            .Include(i => i.Factory)
            .FirstOrDefaultAsync(i => i.Id == riskInputId, ct)
            ?? throw new KeyNotFoundException($"找不到原始資料 {riskInputId}");

        // 改資料年度時，要確認不會撞到同一家工廠另一筆已經存在的年度快照
        if (request.DataYear != riskInput.DataYear)
        {
            var duplicate = await _context.FactoryRiskInputs
                .AnyAsync(i => i.FactoryId == riskInput.FactoryId && i.DataYear == request.DataYear && i.Id != riskInputId, ct);
            if (duplicate)
                throw new InvalidOperationException($"這家工廠在資料年度 {request.DataYear} 已經有另一筆資料了，不能改成一樣的年度。");
        }

        var factory = riskInput.Factory;
        factory.FactoryName = request.FactoryName;
        factory.FactoryRegistrationNo = NullIfBlank(request.FactoryRegistrationNo);
        factory.Address = NullIfBlank(request.Address);
        factory.IndustryCategory = NullIfBlank(request.IndustryCategory);
        factory.IndustrialPark = NullIfBlank(request.IndustrialPark);
        factory.Region = NullIfBlank(request.Region);
        factory.County = NullIfBlank(request.County);

        riskInput.DataYear = request.DataYear;
        riskInput.MaxHazardChemicalTypeName = request.MaxHazardChemicalTypeName;
        riskInput.MaxHazardQuantity = request.MaxHazardQuantity;
        riskInput.MaxHazardSubstanceName = NullIfBlank(request.MaxHazardSubstanceName);

        // 指標值整批替換（跟 Excel 匯入覆蓋同一筆資料的邏輯一致），不用逐一比對哪些改了
        _context.FactoryIndicatorValues.RemoveRange(riskInput.IndicatorValues);
        AddIndicatorValues(riskInput.Id, request.IndicatorValues);

        await _context.SaveChangesAsync(ct);

        await _identitySyncService.SyncFactoryNameAsync(factory.FactoryRegistrationNo, factory.FactoryName, ct);
    }

    public async Task DeleteFactoryAsync(Guid riskInputId, CancellationToken ct = default)
    {
        var riskInput = await _context.FactoryRiskInputs.FirstOrDefaultAsync(i => i.Id == riskInputId, ct)
            ?? throw new KeyNotFoundException($"找不到原始資料 {riskInputId}");

        _context.FactoryRiskInputs.Remove(riskInput);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<int> BulkDeleteFactoriesAsync(List<Guid> riskInputIds, CancellationToken ct = default)
    {
        var riskInputs = await _context.FactoryRiskInputs
            .Where(i => riskInputIds.Contains(i.Id))
            .ToListAsync(ct);

        _context.FactoryRiskInputs.RemoveRange(riskInputs);
        await _context.SaveChangesAsync(ct);
        return riskInputs.Count;
    }

    public async Task<int> DeleteAllFactoriesAsync(CancellationToken ct = default)
    {
        // 刪整個工廠身分（連帶 cascade 掉它所有年度的原始資料），才是真正「全部刪除」
        var factories = await _context.RiskAssessedFactories.ToListAsync(ct);
        _context.RiskAssessedFactories.RemoveRange(factories);
        await _context.SaveChangesAsync(ct);
        return factories.Count;
    }

    public async Task<FactoryYearComparisonDto> CompareYearsAsync(int year1, int year2, CancellationToken ct = default)
    {
        if (year1 <= 0 || year2 <= 0)
            throw new InvalidOperationException("請指定要比較的兩個資料年度。");
        if (year1 == year2)
            throw new InvalidOperationException("請選擇兩個不同的資料年度進行比較。");

        var year1Factories = await _context.FactoryRiskInputs
            .Where(i => i.DataYear == year1)
            .Select(i => new { i.FactoryId, i.Factory.FactoryName, i.Factory.FactoryRegistrationNo, i.Factory.County })
            .AsNoTracking()
            .ToListAsync(ct);
        var year2Factories = await _context.FactoryRiskInputs
            .Where(i => i.DataYear == year2)
            .Select(i => new { i.FactoryId, i.Factory.FactoryName, i.Factory.FactoryRegistrationNo, i.Factory.County })
            .AsNoTracking()
            .ToListAsync(ct);

        var year1ById = year1Factories.ToDictionary(x => x.FactoryId);
        var year2ById = year2Factories.ToDictionary(x => x.FactoryId);

        var bothYears = year1ById.Keys.Intersect(year2ById.Keys)
            .Select(id => { var x = year1ById[id]; return new FactoryYearComparisonItemDto(id, x.FactoryName, x.FactoryRegistrationNo, x.County); })
            .OrderBy(x => x.FactoryName)
            .ToList();
        var onlyYear1 = year1ById.Keys.Except(year2ById.Keys)
            .Select(id => { var x = year1ById[id]; return new FactoryYearComparisonItemDto(id, x.FactoryName, x.FactoryRegistrationNo, x.County); })
            .OrderBy(x => x.FactoryName)
            .ToList();
        var onlyYear2 = year2ById.Keys.Except(year1ById.Keys)
            .Select(id => { var x = year2ById[id]; return new FactoryYearComparisonItemDto(id, x.FactoryName, x.FactoryRegistrationNo, x.County); })
            .OrderBy(x => x.FactoryName)
            .ToList();

        return new FactoryYearComparisonDto(
            year1, year2, year1ById.Count, year2ById.Count, bothYears, onlyYear1, onlyYear2);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void AddIndicatorValues(Guid riskInputId, Dictionary<string, decimal> indicatorValues)
    {
        foreach (var (key, value) in indicatorValues)
        {
            if (string.IsNullOrWhiteSpace(key)) continue;
            _context.FactoryIndicatorValues.Add(new FactoryIndicatorValue
            {
                Id = Guid.NewGuid(),
                FactoryRiskInputId = riskInputId,
                IndicatorCanonicalKey = key,
                Value = value,
            });
        }
    }

    private static void ValidateRequest(UpsertFactoryRiskRawDataRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FactoryName))
            throw new InvalidOperationException("工廠名稱為必填。");
        if (string.IsNullOrWhiteSpace(request.MaxHazardChemicalTypeName))
            throw new InvalidOperationException("最大危害化學品類型為必填。");
        if (request.DataYear <= 0)
            throw new InvalidOperationException("資料年度為必填。");
    }

    private static string? NullIfBlank(string? value) => string.IsNullOrWhiteSpace(value) ? null : value;

    private static FactoryRiskRawDataDto ToDto(FactoryRiskInput i) => new(
        i.Id,
        i.FactoryId,
        i.DataYear,
        i.Factory.FactoryName,
        i.Factory.FactoryRegistrationNo,
        i.Factory.Address,
        i.Factory.IndustryCategory,
        i.Factory.IndustrialPark,
        i.Factory.Region,
        i.Factory.County,
        i.MaxHazardChemicalTypeName,
        i.MaxHazardQuantity,
        i.MaxHazardSubstanceName,
        i.IndicatorValues.ToDictionary(v => v.IndicatorCanonicalKey, v => v.Value)
    );
}

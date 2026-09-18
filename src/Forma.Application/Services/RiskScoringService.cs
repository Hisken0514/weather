using Forma.Application.Common.Interfaces;
using Forma.Application.Features.RiskScoring.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public class RiskScoringService : IRiskScoringService
{
    private readonly IApplicationDbContext _context;

    public RiskScoringService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SchemeListDto>> GetSchemesAsync(CancellationToken ct = default)
    {
        return await _context.RiskScoringSchemes
            .Include(s => s.CreatedBy)
            .AsNoTracking()
            .OrderByDescending(s => s.Year)
            .Select(s => new SchemeListDto(
                s.Id, s.Year, s.Name, s.IsActive, s.CreatedAt, s.CreatedBy.Username))
            .ToListAsync(ct);
    }

    public async Task<SchemeDetailDto> GetSchemeByIdAsync(Guid id, CancellationToken ct = default)
    {
        var scheme = await LoadSchemeAsync(id, ct);
        return ToDetailDto(scheme);
    }

    public async Task<Guid> CreateSchemeAsync(CreateSchemeRequest request, Guid userId, CancellationToken ct = default)
    {
        ValidateReferentialIntegrity(request.Indicators, request.ChemicalTypes, request.Bands, request.HazardTypeLevels, request.QuantityThresholds);

        var scheme = new RiskScoringScheme
        {
            Id = Guid.NewGuid(),
            Year = request.Year,
            Name = request.Name,
            IsActive = false,
            CreatedById = userId,
            HazardQuantityMatrixWeight = request.HazardQuantityMatrixWeight,
        };

        ApplyIndicatorsAndTypes(scheme, request.Indicators, request.ChemicalTypes);
        ApplyBandsAndThresholds(scheme, request.Bands, request.HazardTypeLevels, request.QuantityThresholds);

        _context.RiskScoringSchemes.Add(scheme);
        await _context.SaveChangesAsync(ct);
        return scheme.Id;
    }

    public async Task UpdateSchemeAsync(Guid id, UpdateSchemeRequest request, CancellationToken ct = default)
    {
        ValidateReferentialIntegrity(request.Indicators, request.ChemicalTypes, request.Bands, request.HazardTypeLevels, request.QuantityThresholds);

        var scheme = await LoadSchemeAsync(id, ct);

        scheme.Name = request.Name;
        scheme.HazardQuantityMatrixWeight = request.HazardQuantityMatrixWeight;

        // Indicators／ChemicalTypes 用 upsert（更新既有、新增缺少的、只刪除真的被移除的），
        // 不能像 Bands 那樣整批刪除再重建：Bands/HazardTypeLevels/QuantityThresholds
        // 會引用這些 Id，就算馬上用同一個 Id 重建，中間那一刻的 DELETE 還是會先被砍掉，
        // 導致這次請求裡還沒送到的舊 Band/HazardTypeLevel 暫時失去對應。
        // （全台工廠風險排名的歷史匯入資料改用 CanonicalKey／化學品類型名稱對應，
        // 不再有 FK 指向這裡，所以刪除指標／化學品類型不會被匯入資料擋下來。）
        UpsertIndicators(scheme, request.Indicators);
        UpsertChemicalTypes(scheme, request.ChemicalTypes);

        // Bands/HazardTypeLevels/QuantityThresholds 沒有其他表引用它們的 Id，
        // 維持原本「全刪除再全新增」的簡單作法，分兩次 SaveChanges 避免同一個 Id
        // 同時有「待刪除」與「待新增」兩筆追蹤紀錄。
        _context.RiskScoringBands.RemoveRange(scheme.Bands);
        _context.HazardTypeLevels.RemoveRange(scheme.HazardTypeLevels);
        _context.QuantityThresholds.RemoveRange(scheme.QuantityThresholds);
        scheme.Bands.Clear();
        scheme.HazardTypeLevels.Clear();
        scheme.QuantityThresholds.Clear();

        await _context.SaveChangesAsync(ct);

        ApplyBandsAndThresholds(scheme, request.Bands, request.HazardTypeLevels, request.QuantityThresholds);

        await _context.SaveChangesAsync(ct);
    }

    private void UpsertIndicators(
        RiskScoringScheme scheme, List<CreateIndicatorDefinitionRequest> indicators)
    {
        var requestIds = indicators.Select(i => i.Id).ToHashSet();
        var toRemove = scheme.Indicators.Where(i => !requestIds.Contains(i.Id)).ToList();
        if (toRemove.Count > 0)
            _context.RiskIndicatorDefinitions.RemoveRange(toRemove);

        var existingById = scheme.Indicators.ToDictionary(i => i.Id);
        foreach (var i in indicators)
        {
            if (existingById.TryGetValue(i.Id, out var existing))
            {
                existing.Name = i.Name;
                existing.Category = i.Category;
                existing.Description = i.Description;
                existing.DisplayOrder = i.DisplayOrder;
                existing.Weight = i.Weight;
                existing.CanonicalKey = i.CanonicalKey;
                existing.TreatMissingAsZero = i.TreatMissingAsZero;
            }
            else
            {
                _context.RiskIndicatorDefinitions.Add(new RiskIndicatorDefinition
                {
                    Id = i.Id, SchemeId = scheme.Id, Name = i.Name, Category = i.Category,
                    Description = i.Description, DisplayOrder = i.DisplayOrder, Weight = i.Weight,
                    CanonicalKey = i.CanonicalKey, TreatMissingAsZero = i.TreatMissingAsZero,
                });
            }
        }
    }

    private void UpsertChemicalTypes(
        RiskScoringScheme scheme, List<CreateChemicalTypeDefinitionRequest> chemicalTypes)
    {
        var requestIds = chemicalTypes.Select(c => c.Id).ToHashSet();
        var toRemove = scheme.ChemicalTypes.Where(c => !requestIds.Contains(c.Id)).ToList();
        if (toRemove.Count > 0)
            _context.HazardChemicalTypeDefinitions.RemoveRange(toRemove);

        var existingById = scheme.ChemicalTypes.ToDictionary(c => c.Id);
        foreach (var c in chemicalTypes)
        {
            if (existingById.TryGetValue(c.Id, out var existing))
            {
                existing.Name = c.Name;
                existing.DisplayOrder = c.DisplayOrder;
                existing.MemberNames = c.MemberNames;
            }
            else
            {
                _context.HazardChemicalTypeDefinitions.Add(new HazardChemicalTypeDefinition
                {
                    Id = c.Id, SchemeId = scheme.Id, Name = c.Name, DisplayOrder = c.DisplayOrder,
                    MemberNames = c.MemberNames,
                });
            }
        }
    }

    public async Task DeleteSchemeAsync(Guid id, CancellationToken ct = default)
    {
        var scheme = await _context.RiskScoringSchemes
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException($"評分標準 {id} 不存在");

        if (scheme.IsActive)
            throw new InvalidOperationException("不可刪除目前生效的評分標準，請先切換至其他標準。");

        _context.RiskScoringSchemes.Remove(scheme);
        await _context.SaveChangesAsync(ct);
    }

    public async Task SetActiveSchemeAsync(Guid id, CancellationToken ct = default)
    {
        // 取消所有現有的 IsActive
        var allSchemes = await _context.RiskScoringSchemes.ToListAsync(ct);
        foreach (var s in allSchemes)
            s.IsActive = false;

        var target = allSchemes.FirstOrDefault(s => s.Id == id)
            ?? throw new KeyNotFoundException($"評分標準 {id} 不存在");

        target.IsActive = true;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<SchemeDetailDto> CloneSchemeAsync(Guid id, CloneSchemeRequest request, Guid userId, CancellationToken ct = default)
    {
        var source = await LoadSchemeAsync(id, ct);

        var clone = new RiskScoringScheme
        {
            Year = request.NewYear,
            Name = request.NewName,
            IsActive = false,
            CreatedById = userId,
            HazardQuantityMatrixWeight = source.HazardQuantityMatrixWeight,
        };

        // 先複製指標／化學品類型定義，並記錄舊 Id → 新 Id 的對照，
        // 讓後面複製 Bands/HazardTypeLevels/QuantityThresholds 時能重新指向複製後的定義。
        var indicatorMap = new Dictionary<Guid, Guid>();
        foreach (var i in source.Indicators)
        {
            var newId = Guid.NewGuid();
            clone.Indicators.Add(new RiskIndicatorDefinition
            {
                Id = newId, Name = i.Name, Category = i.Category, Description = i.Description, DisplayOrder = i.DisplayOrder, Weight = i.Weight,
                CanonicalKey = i.CanonicalKey, TreatMissingAsZero = i.TreatMissingAsZero,
            });
            indicatorMap[i.Id] = newId;
        }

        var chemicalTypeMap = new Dictionary<Guid, Guid>();
        foreach (var c in source.ChemicalTypes)
        {
            var newId = Guid.NewGuid();
            clone.ChemicalTypes.Add(new HazardChemicalTypeDefinition
            {
                Id = newId, Name = c.Name, DisplayOrder = c.DisplayOrder, MemberNames = new List<string>(c.MemberNames),
            });
            chemicalTypeMap[c.Id] = newId;
        }

        foreach (var b in source.Bands)
            clone.Bands.Add(new RiskScoringBand
            {
                IndicatorId = indicatorMap[b.IndicatorId], MinValue = b.MinValue, MaxValue = b.MaxValue, Score = b.Score, Label = b.Label,
            });

        foreach (var h in source.HazardTypeLevels)
            clone.HazardTypeLevels.Add(new HazardTypeLevel
            {
                ChemicalTypeId = chemicalTypeMap[h.ChemicalTypeId], HazardLevel = h.HazardLevel,
            });

        foreach (var q in source.QuantityThresholds)
            clone.QuantityThresholds.Add(new QuantityThreshold
            {
                ChemicalTypeId = chemicalTypeMap[q.ChemicalTypeId], Level = q.Level, MinQuantity = q.MinQuantity, MaxQuantity = q.MaxQuantity,
            });

        _context.RiskScoringSchemes.Add(clone);
        await _context.SaveChangesAsync(ct);

        // Reload to get CreatedBy navigation
        return await GetSchemeByIdAsync(clone.Id, ct);
    }

    public async Task<List<string>> GetDistinctIndicatorCanonicalKeysAsync(CancellationToken ct = default)
    {
        return await _context.RiskIndicatorDefinitions
            .Select(i => i.CanonicalKey)
            .Distinct()
            .OrderBy(k => k)
            .ToListAsync(ct);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private async Task<RiskScoringScheme> LoadSchemeAsync(Guid id, CancellationToken ct)
    {
        return await _context.RiskScoringSchemes
            .Include(s => s.CreatedBy)
            .Include(s => s.Indicators)
            .Include(s => s.ChemicalTypes)
            .Include(s => s.Bands)
            .Include(s => s.HazardTypeLevels)
            .Include(s => s.QuantityThresholds)
            .FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException($"評分標準 {id} 不存在");
    }

    /// <summary>
    /// 送出的 Bands/HazardTypeLevels/QuantityThresholds 引用的 IndicatorId/ChemicalTypeId
    /// 都必須存在於同一份請求的 Indicators/ChemicalTypes 清單裡，且清單本身不能有重複 Id。
    /// 在刪除舊資料之前先驗證，避免驗證失敗時舊資料已經被砍掉一半。
    /// </summary>
    private static void ValidateReferentialIntegrity(
        List<CreateIndicatorDefinitionRequest> indicators,
        List<CreateChemicalTypeDefinitionRequest> chemicalTypes,
        List<CreateBandRequest> bands,
        List<CreateHazardTypeLevelRequest> hazardTypeLevels,
        List<CreateQuantityThresholdRequest> quantityThresholds)
    {
        var indicatorIds = new HashSet<Guid>();
        foreach (var i in indicators)
            if (!indicatorIds.Add(i.Id))
                throw new InvalidOperationException($"指標清單中有重複的 Id：{i.Id}。");

        var canonicalKeys = new HashSet<string>();
        foreach (var i in indicators)
        {
            if (string.IsNullOrWhiteSpace(i.CanonicalKey))
                throw new InvalidOperationException($"指標「{i.Name}」缺少對應資料欄位設定，請先設定再儲存。");
            if (!canonicalKeys.Add(i.CanonicalKey))
                throw new InvalidOperationException($"指標清單中有重複的對應資料欄位：{i.CanonicalKey}，同一個標準底下不能有兩個指標對應到同一個欄位。");
        }

        var chemicalTypeIds = new HashSet<Guid>();
        foreach (var c in chemicalTypes)
            if (!chemicalTypeIds.Add(c.Id))
                throw new InvalidOperationException($"化學品類型清單中有重複的 Id：{c.Id}。");

        // 每個類型「有效對應的政府原始分類名稱」：有勾選 MemberNames 就用那些，
        // 沒勾選（預設）就是自己的 Name。同一份請求裡，這些名稱不能重複對應到兩個類型，
        // 否則匯入資料比對時會不知道要套用哪一個類型的危害性等級／使用量級距。
        var seenMemberNames = new Dictionary<string, string>();
        foreach (var c in chemicalTypes)
        {
            var effectiveNames = c.MemberNames.Count > 0 ? c.MemberNames : new List<string> { c.Name };
            foreach (var name in effectiveNames)
            {
                if (seenMemberNames.TryGetValue(name, out var owner))
                    throw new InvalidOperationException(
                        $"政府分類「{name}」同時被「{owner}」和「{c.Name}」兩個化學品類型對應，同一個標準底下不能重複對應。");
                seenMemberNames[name] = c.Name;
            }
        }

        foreach (var b in bands)
            if (!indicatorIds.Contains(b.IndicatorId))
                throw new InvalidOperationException($"找不到指標 Id {b.IndicatorId} 對應的指標定義，請確認表單資料完整。");

        foreach (var h in hazardTypeLevels)
            if (!chemicalTypeIds.Contains(h.ChemicalTypeId))
                throw new InvalidOperationException($"找不到化學品類型 Id {h.ChemicalTypeId} 對應的類型定義，請確認表單資料完整。");

        foreach (var q in quantityThresholds)
            if (!chemicalTypeIds.Contains(q.ChemicalTypeId))
                throw new InvalidOperationException($"找不到化學品類型 Id {q.ChemicalTypeId} 對應的類型定義，請確認表單資料完整。");
    }

    // 注意：這裡刻意用 _context.Xxx.Add(...) 直接把新實體加進 DbSet，並手動指定
    // SchemeId，而不是透過 scheme.Indicators.Add(...) 這種導覽屬性的方式掛上去。
    // 原因：當 scheme 本身是「已經被追蹤、狀態為 Unchanged」的既有實體時（也就是
    // UpdateSchemeAsync 的情境，不是新建立的 Scheme），透過導覽屬性加入、且該實體
    // 的主鍵（Guid）已經手動設定非空值的新物件，EF Core 的 ChangeTracker 在
    // DetectChanges 時会因為找不到明確的「這是新增」訊號，把它誤判為 Modified
    // （以為是既有資料被重新關聯過來），而不是 Added。若這筆資料剛好是這次全量替換
    // 流程裡被刪除的舊資料重複使用的 Id，SaveChanges 送出的就會是一筆 UPDATE，但
    // 資料庫裡已經沒有這筆舊資料，因而丟出 DbUpdateConcurrencyException，導致這次
    // 儲存直接失敗、子資料被清空或維持成刪除前的舊值。直接呼叫 DbSet.Add() 會明確
    // 把實體狀態設為 Added，不受這個推斷邏輯影響，新建與更新兩種情境都能正確運作。
    private void ApplyIndicatorsAndTypes(
        RiskScoringScheme scheme,
        List<CreateIndicatorDefinitionRequest> indicators,
        List<CreateChemicalTypeDefinitionRequest> chemicalTypes)
    {
        foreach (var i in indicators)
            _context.RiskIndicatorDefinitions.Add(new RiskIndicatorDefinition
            {
                Id = i.Id, SchemeId = scheme.Id, Name = i.Name, Category = i.Category, Description = i.Description, DisplayOrder = i.DisplayOrder, Weight = i.Weight,
                CanonicalKey = i.CanonicalKey, TreatMissingAsZero = i.TreatMissingAsZero,
            });

        foreach (var c in chemicalTypes)
            _context.HazardChemicalTypeDefinitions.Add(new HazardChemicalTypeDefinition
            {
                Id = c.Id, SchemeId = scheme.Id, Name = c.Name, DisplayOrder = c.DisplayOrder, MemberNames = c.MemberNames,
            });
    }

    private void ApplyBandsAndThresholds(
        RiskScoringScheme scheme,
        List<CreateBandRequest> bands,
        List<CreateHazardTypeLevelRequest> hazardTypeLevels,
        List<CreateQuantityThresholdRequest> quantityThresholds)
    {
        foreach (var b in bands)
            _context.RiskScoringBands.Add(new RiskScoringBand
                { SchemeId = scheme.Id, IndicatorId = b.IndicatorId, MinValue = b.MinValue, MaxValue = b.MaxValue, Score = b.Score, Label = b.Label });

        foreach (var h in hazardTypeLevels)
            _context.HazardTypeLevels.Add(new HazardTypeLevel
                { SchemeId = scheme.Id, ChemicalTypeId = h.ChemicalTypeId, HazardLevel = h.HazardLevel });

        foreach (var q in quantityThresholds)
            _context.QuantityThresholds.Add(new QuantityThreshold
                { SchemeId = scheme.Id, ChemicalTypeId = q.ChemicalTypeId, Level = q.Level, MinQuantity = q.MinQuantity, MaxQuantity = q.MaxQuantity });
    }

    private static SchemeDetailDto ToDetailDto(RiskScoringScheme s) => new(
        s.Id, s.Year, s.Name, s.IsActive, s.CreatedAt, s.CreatedBy.Username,
        s.Indicators.OrderBy(i => i.DisplayOrder)
            .Select(i => new IndicatorDefinitionDto(i.Id, i.Name, i.Category, i.Description, i.DisplayOrder, i.Weight, i.CanonicalKey, i.TreatMissingAsZero)).ToList(),
        s.ChemicalTypes.OrderBy(c => c.DisplayOrder)
            .Select(c => new ChemicalTypeDefinitionDto(c.Id, c.Name, c.DisplayOrder, c.MemberNames)).ToList(),
        s.Bands.Select(b => new BandDto(b.Id, b.IndicatorId, b.MinValue, b.MaxValue, b.Score, b.Label)).ToList(),
        s.HazardTypeLevels.Select(h => new HazardTypeLevelDto(h.Id, h.ChemicalTypeId, h.HazardLevel)).ToList(),
        s.QuantityThresholds.Select(q => new QuantityThresholdDto(q.Id, q.ChemicalTypeId, q.Level, q.MinQuantity, q.MaxQuantity)).ToList(),
        s.HazardQuantityMatrixWeight
    );
}

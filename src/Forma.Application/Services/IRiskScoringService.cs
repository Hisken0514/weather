using Forma.Application.Features.RiskScoring.DTOs;

namespace Forma.Application.Services;

public interface IRiskScoringService
{
    Task<List<SchemeListDto>> GetSchemesAsync(CancellationToken ct = default);
    Task<SchemeDetailDto> GetSchemeByIdAsync(Guid id, CancellationToken ct = default);
    Task<Guid> CreateSchemeAsync(CreateSchemeRequest request, Guid userId, CancellationToken ct = default);
    Task UpdateSchemeAsync(Guid id, UpdateSchemeRequest request, CancellationToken ct = default);
    Task DeleteSchemeAsync(Guid id, CancellationToken ct = default);
    Task SetActiveSchemeAsync(Guid id, CancellationToken ct = default);
    Task<SchemeDetailDto> CloneSchemeAsync(Guid id, CloneSchemeRequest request, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// 取得所有標準裡已經用過的指標對應資料欄位（CanonicalKey，distinct），
    /// 給前端新增/編輯指標時當作下拉建議，讓不同年度的指標可以選到同一個既有欄位。
    /// </summary>
    Task<List<string>> GetDistinctIndicatorCanonicalKeysAsync(CancellationToken ct = default);
}

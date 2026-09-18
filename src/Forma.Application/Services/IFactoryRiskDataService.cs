using Forma.Application.Features.FactoryRisk.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 瀏覽／新增／編輯／刪除個別工廠、個別資料年度的原始風險資料（跟 Excel 批次匯入互補：
/// 匯入用來一次灌大量資料，這裡用來排查/補齊/修正單一筆資料）。
/// 每一筆資料的識別碼是 FactoryRiskInput.Id（riskInputId），不是 FactoryId——
/// 同一家工廠可能有好幾個資料年度各自一筆。
/// </summary>
public interface IFactoryRiskDataService
{
    Task<PagedFactoryRiskRawDataResponse> GetFactoriesAsync(
        int page, int pageSize, string? search, int? dataYear = null, CancellationToken ct = default);

    Task<FactoryRiskRawDataDto> GetFactoryAsync(Guid riskInputId, CancellationToken ct = default);

    /// <summary>
    /// 新增一筆原始資料。工廠身分（名稱/登記編號）比對邏輯跟 Excel 匯入一致：對得到既有
    /// 工廠就沿用同一個工廠身分，只是新增一個資料年度；同一工廠、同一資料年度已經有資料
    /// 時會擋下來（請改用編輯）。
    /// </summary>
    Task<Guid> CreateFactoryAsync(UpsertFactoryRiskRawDataRequest request, CancellationToken ct = default);

    Task UpdateFactoryAsync(Guid riskInputId, UpsertFactoryRiskRawDataRequest request, CancellationToken ct = default);

    Task DeleteFactoryAsync(Guid riskInputId, CancellationToken ct = default);

    /// <summary>刪除多筆原始資料，回傳實際刪除的筆數</summary>
    Task<int> BulkDeleteFactoriesAsync(List<Guid> riskInputIds, CancellationToken ct = default);

    /// <summary>刪除所有工廠的原始資料（含所有年度），回傳實際刪除的筆數。不可復原，前端要有明確確認。</summary>
    Task<int> DeleteAllFactoriesAsync(CancellationToken ct = default);

    /// <summary>
    /// 比較兩個資料年度的工廠名單差異：兩年度都有的、只有 year1 有的、只有 year2 有的。
    /// 依 FactoryId 判斷是不是同一家工廠（同一工廠不同年度共用同一個 FactoryId）。
    /// </summary>
    Task<FactoryYearComparisonDto> CompareYearsAsync(int year1, int year2, CancellationToken ct = default);
}

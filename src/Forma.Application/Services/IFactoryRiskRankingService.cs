using Forma.Application.Features.FactoryRisk.DTOs;

namespace Forma.Application.Services;

public interface IFactoryRiskRankingService
{
    /// <summary>
    /// 依指定評分標準，對指定資料年度（不指定就是全資料庫最新資料年度）的原始資料現場
    /// 算一遍公式，依風險值由高到低排名。資料不完整（e.g. 標準新增了匯入資料當初沒有的
    /// 指標）的工廠不列入排名，會列在回傳結果的 IncompleteFactories 供使用者了解原因。
    /// </summary>
    Task<FactoryRiskRankingResultDto> GetRankingAsync(Guid schemeId, int? dataYear = null, CancellationToken ct = default);

    /// <summary>
    /// 比對指定標準「設定的對應資料欄位」跟指定資料年度（不指定就是全資料庫最新資料年度）
    /// 「實際存在的欄位」，用來排查指標／化學品類型的對應資料欄位設錯、或匯入範本表頭打錯字。
    /// </summary>
    Task<SchemeDataCoverageDto> GetDataCoverageAsync(Guid schemeId, int? dataYear = null, CancellationToken ct = default);

    /// <summary>取得所有已匯入資料裡出現過的資料年度（distinct，新到舊排序），給前端年度選單用</summary>
    Task<List<int>> GetAvailableDataYearsAsync(CancellationToken ct = default);

    /// <summary>
    /// 單一工廠跨資料年度的風險值走勢。fixedSchemeId 有值時全部年度套用同一個標準；
    /// 沒給的話每個資料年度各自套用「Year 相同」的標準。
    /// </summary>
    Task<FactoryTrendResultDto> GetFactoryTrendAsync(Guid factoryId, Guid? fixedSchemeId, CancellationToken ct = default);
}

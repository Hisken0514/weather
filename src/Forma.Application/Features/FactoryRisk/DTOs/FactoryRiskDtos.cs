namespace Forma.Application.Features.FactoryRisk.DTOs;

/// <summary>全台工廠風險排名裡的一列（現場依當下標準算出來，不是存死的分數）</summary>
public record FactoryRiskRankingItemDto(
    int Rank,
    Guid FactoryId,
    string FactoryName,
    string? FactoryRegistrationNo,
    string? County,
    string? IndustrialPark,
    string? Region,
    string? IndustryCategory,
    int RiskScore,
    int HazardSeverityScore,
    int ManagementRiskScore,
    string MaxHazardChemicalTypeName,
    decimal MaxHazardQuantity,
    string? MaxHazardSubstanceName,
    int DataYear,
    /// <summary>
    /// 這筆分數裡，有哪些指標是因為「這個資料年度全資料庫都沒有任何一筆值」而補0計算
    /// 的（跟個別工廠自己缺資料不同，那種還是會被排除，不會出現在這裡）。
    /// </summary>
    List<string> ZeroFillNotes,
    /// <summary>
    /// 這家工廠去年度（資料年度-1）套用同一個標準算出來的排名，沒有的話是 null（去年
    /// 沒有這家工廠的資料，或去年資料在這個標準下不完整、沒被列入排名，沒有東西可比）。
    /// </summary>
    int? PreviousYearRank
);

/// <summary>
/// 有匯入原始資料、但套用目前選定標準時資料不完整而未列入排名的工廠
/// （e.g. 標準新增了這筆資料當初匯入時沒有的指標）。
/// </summary>
public record IncompleteFactoryDto(
    Guid FactoryId,
    string FactoryName,
    string Reason
);

/// <summary>
/// 全台工廠風險排名結果：正常排名列表 + 因資料不完整而被排除的工廠清單。
/// ResolvedDataYear 是這次排名實際套用的資料年度（沒指定就是全資料庫最新年度；
/// 資料庫完全沒有任何原始資料時是 null）。
/// </summary>
public record FactoryRiskRankingResultDto(
    List<FactoryRiskRankingItemDto> Items,
    List<IncompleteFactoryDto> IncompleteFactories,
    int? ResolvedDataYear
);

/// <summary>匯入歷史資料的結果摘要</summary>
public record ImportFactoryRiskDataResult(
    int TotalRows,
    int ImportedCount,
    List<string> Errors,
    List<string> UnmatchedRegistrationNoFactoryNames
);

// ─── 資料欄位比對（診斷用：標準設定的對應資料欄位 vs 匯入資料實際的欄位）────────

/// <summary>一個指標的「對應資料欄位」在目前匯入資料裡實際找得到幾筆值</summary>
public record IndicatorCoverageDto(
    string IndicatorName,
    string CanonicalKey,
    int MatchedFactoryCount
);

/// <summary>一個化學品類型（含合併的政府分類）在目前匯入資料裡實際找得到幾家工廠</summary>
public record ChemicalTypeCoverageDto(
    string TypeName,
    List<string> MemberNames,
    int MatchedFactoryCount
);

/// <summary>匯入資料裡實際存在、但目前標準完全沒有指標／類型對應到的原始欄位名稱（可能是打錯字或忘記設定對應）</summary>
public record UnmatchedDataFieldDto(
    string RawFieldName,
    int FactoryCount
);

/// <summary>
/// 依指定標準比對「標準設定的對應資料欄位」跟「匯入資料實際存在的欄位」，
/// 幫助找出哪裡打錯字、哪個指標忘記改對應資料欄位，不用再去看後端 log。
/// </summary>
public record SchemeDataCoverageDto(
    int TotalImportedFactories,
    List<IndicatorCoverageDto> Indicators,
    List<ChemicalTypeCoverageDto> ChemicalTypes,
    List<UnmatchedDataFieldDto> UnmatchedIndicatorFields,
    List<UnmatchedDataFieldDto> UnmatchedChemicalTypeNames,
    int? ResolvedDataYear
);

// ─── 原始資料維護（瀏覽／新增／編輯／刪除個別工廠的匯入資料）──────────────

/// <summary>
/// 一家工廠、某一個資料年度的完整原始資料（工廠基本資料 + 風險輸入值 + 所有指標值）。
/// 同一家工廠可能有好幾個資料年度各自一筆，RiskInputId 才是這一筆資料真正的識別碼
/// （FactoryId 只代表「哪一家工廠」，會在同一工廠的多個年度快照裡重複出現）。
/// </summary>
public record FactoryRiskRawDataDto(
    Guid RiskInputId,
    Guid FactoryId,
    int DataYear,
    string FactoryName,
    string? FactoryRegistrationNo,
    string? Address,
    string? IndustryCategory,
    string? IndustrialPark,
    string? Region,
    string? County,
    string MaxHazardChemicalTypeName,
    decimal MaxHazardQuantity,
    string? MaxHazardSubstanceName,
    /// <summary>CanonicalKey → 值</summary>
    Dictionary<string, decimal> IndicatorValues
);

public record UpsertFactoryRiskRawDataRequest(
    int DataYear,
    string FactoryName,
    string? FactoryRegistrationNo,
    string? Address,
    string? IndustryCategory,
    string? IndustrialPark,
    string? Region,
    string? County,
    string MaxHazardChemicalTypeName,
    decimal MaxHazardQuantity,
    string? MaxHazardSubstanceName,
    Dictionary<string, decimal> IndicatorValues
);

public record PagedFactoryRiskRawDataResponse(
    List<FactoryRiskRawDataDto> Items,
    int Total,
    int Page,
    int PageSize
);

// ─── 單廠趨勢圖（跨資料年度的風險值走勢）────────────────────────────

/// <summary>某一個資料年度套用某個標準算出來的一個趨勢點；套用失敗時 Success=false 並附原因</summary>
public record FactoryTrendPointDto(
    int DataYear,
    bool Success,
    int? RiskScore,
    int? HazardSeverityScore,
    int? ManagementRiskScore,
    Guid? SchemeId,
    int? SchemeYear,
    string? Reason,
    /// <summary>成功算出分數時，有哪些指標是因為這個資料年度整年度都沒收集而補0計算的</summary>
    List<string> ZeroFillNotes
);

public record FactoryTrendResultDto(
    Guid FactoryId,
    string FactoryName,
    List<FactoryTrendPointDto> Points
);

// ─── 年度比較統計（比對兩個資料年度的工廠名單差異，依 FactoryId 判斷是不是同一家工廠）───

/// <summary>年度比較清單裡的一家工廠（精簡欄位，給前端列表顯示用）</summary>
public record FactoryYearComparisonItemDto(
    Guid FactoryId,
    string FactoryName,
    string? FactoryRegistrationNo,
    string? County
);

/// <summary>
/// 比較 Year1、Year2 兩個資料年度的工廠名單：BothYears（兩年度都有）、
/// OnlyYear1（只有 Year1 有、Year2 沒有）、OnlyYear2（只有 Year2 有、Year1 沒有）。
/// 判斷「同一家工廠」的依據是 FactoryId，不是工廠名稱字串。
/// </summary>
public record FactoryYearComparisonDto(
    int Year1,
    int Year2,
    int Year1Count,
    int Year2Count,
    List<FactoryYearComparisonItemDto> BothYears,
    List<FactoryYearComparisonItemDto> OnlyYear1,
    List<FactoryYearComparisonItemDto> OnlyYear2
);

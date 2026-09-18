using Forma.Domain.Enums;

namespace Forma.Application.Features.RiskScoring.DTOs;

// ─── Scheme ───────────────────────────────────────────────

public record SchemeListDto(
    Guid Id,
    int Year,
    string Name,
    bool IsActive,
    DateTime CreatedAt,
    string CreatedByName
);

public record SchemeDetailDto(
    Guid Id,
    int Year,
    string Name,
    bool IsActive,
    DateTime CreatedAt,
    string CreatedByName,
    List<IndicatorDefinitionDto> Indicators,
    List<ChemicalTypeDefinitionDto> ChemicalTypes,
    List<BandDto> Bands,
    List<HazardTypeLevelDto> HazardTypeLevels,
    List<QuantityThresholdDto> QuantityThresholds,
    int HazardQuantityMatrixWeight
);

// ─── Indicator / ChemicalType 定義 ──────────────────────────

public record IndicatorDefinitionDto(
    Guid Id,
    string Name,
    RiskIndicatorCategory Category,
    string? Description,
    int DisplayOrder,
    int Weight,
    string CanonicalKey,
    bool TreatMissingAsZero
);

public record ChemicalTypeDefinitionDto(
    Guid Id,
    string Name,
    int DisplayOrder,
    List<string> MemberNames
);

// ─── Bands ────────────────────────────────────────────────

public record BandDto(
    Guid Id,
    Guid IndicatorId,
    decimal? MinValue,
    decimal? MaxValue,
    int Score,
    string? Label
);

// ─── HazardTypeLevel ──────────────────────────────────────

public record HazardTypeLevelDto(
    Guid Id,
    Guid ChemicalTypeId,
    int HazardLevel
);

// ─── QuantityThreshold ────────────────────────────────────

public record QuantityThresholdDto(
    Guid Id,
    Guid ChemicalTypeId,
    int Level,
    decimal MinQuantity,
    decimal? MaxQuantity
);

// ─── Create / Update requests ────────────────────────────

public record CreateSchemeRequest(
    int Year,
    string Name,
    List<CreateIndicatorDefinitionRequest> Indicators,
    List<CreateChemicalTypeDefinitionRequest> ChemicalTypes,
    List<CreateBandRequest> Bands,
    List<CreateHazardTypeLevelRequest> HazardTypeLevels,
    List<CreateQuantityThresholdRequest> QuantityThresholds,
    int HazardQuantityMatrixWeight
);

// 這兩個 Create request 都帶 Id：由前端在畫面上新增指標／化學品類型的當下就用
// crypto.randomUUID() 產生真正的 GUID，讓同一份送出的表單裡，新增的 Band／
// HazardTypeLevel／QuantityThreshold 可以立刻用這個 Id 引用一個「還沒存進資料庫」
// 的新指標／類型，不需要額外設計暫存 key 對照機制。
public record CreateIndicatorDefinitionRequest(
    Guid Id,
    string Name,
    RiskIndicatorCategory Category,
    string? Description,
    int DisplayOrder,
    int Weight,
    string CanonicalKey,
    bool TreatMissingAsZero
);

public record CreateChemicalTypeDefinitionRequest(
    Guid Id,
    string Name,
    int DisplayOrder,
    List<string> MemberNames
);

public record CreateBandRequest(
    Guid IndicatorId,
    decimal? MinValue,
    decimal? MaxValue,
    int Score,
    string? Label
);

public record CreateHazardTypeLevelRequest(
    Guid ChemicalTypeId,
    int HazardLevel
);

public record CreateQuantityThresholdRequest(
    Guid ChemicalTypeId,
    int Level,
    decimal MinQuantity,
    decimal? MaxQuantity
);

public record UpdateSchemeRequest(
    string Name,
    List<CreateIndicatorDefinitionRequest> Indicators,
    List<CreateChemicalTypeDefinitionRequest> ChemicalTypes,
    List<CreateBandRequest> Bands,
    List<CreateHazardTypeLevelRequest> HazardTypeLevels,
    List<CreateQuantityThresholdRequest> QuantityThresholds,
    int HazardQuantityMatrixWeight
);

public record CloneSchemeRequest(int NewYear, string NewName);

// ─── Calculation ─────────────────────────────────────────

public record IndicatorValueInput(Guid IndicatorId, decimal Value);

public record RiskCalculationInput(
    List<IndicatorValueInput> IndicatorValues,
    Guid MaxHazardChemicalTypeId,
    decimal MaxHazardQuantity
);

public record IndicatorScoreDetail(
    Guid IndicatorId,
    string IndicatorName,
    RiskIndicatorCategory Category,
    decimal InputValue,
    // 分段計分規則查到的原始分數（未乘權重）
    int Score,
    // 併入嚴重度／機率小計前要乘的權重，預設 1
    int Weight
);

public record RiskCalculationResult(
    // 最終分數
    int RiskScore,
    int HazardSeverityScore,
    int ManagementRiskScore,
    // 指標明細
    List<IndicatorScoreDetail> IndicatorScores,
    // 危害嚴重度矩陣明細（HazardQuantityMatrixScore 為危害性等級×使用量級距的原始分數，未乘權重）
    int HazardQuantityMatrixScore,
    int HazardQuantityMatrixWeight,
    int HazardLevel,
    int QuantityLevel,
    // 使用的標準
    Guid SchemeId,
    int SchemeYear
);

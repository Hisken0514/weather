export interface FactoryRiskRankingItemDto {
  rank: number;
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  county: string | null;
  industrialPark: string | null;
  region: string | null;
  industryCategory: string | null;
  riskScore: number;
  hazardSeverityScore: number;
  managementRiskScore: number;
  maxHazardChemicalTypeName: string;
  maxHazardQuantity: number;
  maxHazardSubstanceName: string | null;
  dataYear: number;
  /** 有哪些指標是因為這個資料年度全資料庫都沒有任何一筆值，套公式時被統一補0計算 */
  zeroFillNotes: string[];
  /** 這家工廠去年度（資料年度-1）套用同一個標準的排名，沒有可比較資料時是 null */
  previousYearRank: number | null;
}

/** 有匯入原始資料，但套用目前選定標準時資料不完整而未列入排名的工廠 */
export interface IncompleteFactoryDto {
  factoryId: string;
  factoryName: string;
  reason: string;
}

/** resolvedDataYear：這次排名實際套用的資料年度（沒指定就是全資料庫最新年度；完全沒資料時是 null） */
export interface FactoryRiskRankingResultDto {
  items: FactoryRiskRankingItemDto[];
  incompleteFactories: IncompleteFactoryDto[];
  resolvedDataYear: number | null;
}

export interface ImportFactoryRiskDataResult {
  totalRows: number;
  importedCount: number;
  errors: string[];
  unmatchedRegistrationNoFactoryNames: string[];
}

// ─── 資料欄位比對（診斷用）──────────────────────────────

export interface IndicatorCoverageDto {
  indicatorName: string;
  canonicalKey: string;
  matchedFactoryCount: number;
}

export interface ChemicalTypeCoverageDto {
  typeName: string;
  memberNames: string[];
  matchedFactoryCount: number;
}

/** 匯入資料裡實際存在、但目前標準完全沒有指標／類型對應到的原始欄位名稱 */
export interface UnmatchedDataFieldDto {
  rawFieldName: string;
  factoryCount: number;
}

export interface SchemeDataCoverageDto {
  totalImportedFactories: number;
  indicators: IndicatorCoverageDto[];
  chemicalTypes: ChemicalTypeCoverageDto[];
  unmatchedIndicatorFields: UnmatchedDataFieldDto[];
  unmatchedChemicalTypeNames: UnmatchedDataFieldDto[];
  resolvedDataYear: number | null;
}

// ─── 原始資料維護 ────────────────────────────────────────

/**
 * 一家工廠、某一個資料年度的完整原始資料。riskInputId 才是這一筆資料真正的識別碼
 * （factoryId 只代表「哪一家工廠」，同一家工廠的不同資料年度會共用同一個 factoryId）。
 */
export interface FactoryRiskRawDataDto {
  riskInputId: string;
  factoryId: string;
  dataYear: number;
  factoryName: string;
  factoryRegistrationNo: string | null;
  address: string | null;
  industryCategory: string | null;
  industrialPark: string | null;
  region: string | null;
  county: string | null;
  maxHazardChemicalTypeName: string;
  maxHazardQuantity: number;
  maxHazardSubstanceName: string | null;
  /** CanonicalKey → 值 */
  indicatorValues: Record<string, number>;
}

export interface UpsertFactoryRiskRawDataRequest {
  dataYear: number;
  factoryName: string;
  factoryRegistrationNo: string | null;
  address: string | null;
  industryCategory: string | null;
  industrialPark: string | null;
  region: string | null;
  county: string | null;
  maxHazardChemicalTypeName: string;
  maxHazardQuantity: number;
  maxHazardSubstanceName: string | null;
  indicatorValues: Record<string, number>;
}

export interface PagedFactoryRiskRawDataResponse {
  items: FactoryRiskRawDataDto[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── 單廠趨勢圖 ──────────────────────────────────────────

/** 某一個資料年度套用某個標準算出來的一個趨勢點；套用失敗時 success=false 並附原因 */
export interface FactoryTrendPointDto {
  dataYear: number;
  success: boolean;
  riskScore: number | null;
  hazardSeverityScore: number | null;
  managementRiskScore: number | null;
  schemeId: string | null;
  schemeYear: number | null;
  reason: string | null;
  /** 算分成功時，有哪些指標是因為這個資料年度整年度都沒收集而補0計算的 */
  zeroFillNotes: string[];
}

export interface FactoryTrendResultDto {
  factoryId: string;
  factoryName: string;
  points: FactoryTrendPointDto[];
}

// ─── 年度比較統計 ────────────────────────────────────────

export interface FactoryYearComparisonItemDto {
  factoryId: string;
  factoryName: string;
  factoryRegistrationNo: string | null;
  county: string | null;
}

/** 比較 year1、year2 兩個資料年度的工廠名單差異（依 factoryId 判斷是不是同一家工廠） */
export interface FactoryYearComparisonDto {
  year1: number;
  year2: number;
  year1Count: number;
  year2Count: number;
  bothYears: FactoryYearComparisonItemDto[];
  onlyYear1: FactoryYearComparisonItemDto[];
  onlyYear2: FactoryYearComparisonItemDto[];
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type RiskIndicatorCategory = 'Severity' | 'Probability';

// ─── Scheme DTOs ─────────────────────────────────────────────────────────────

export interface SchemeListItem {
  id: string;
  year: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  createdByUsername: string;
}

export interface IndicatorDefinitionDto {
  id: string;
  name: string;
  category: RiskIndicatorCategory;
  description: string | null;
  displayOrder: number;
  weight: number;
  /** 對應資料欄位的穩定識別碼，跨年度改名也能對到同一份原始匯入資料 */
  canonicalKey: string;
  /** 匯入時這個欄位空白要不要當 0 分（而不是資料不完整） */
  treatMissingAsZero: boolean;
}

export interface ChemicalTypeDefinitionDto {
  id: string;
  name: string;
  displayOrder: number;
  /** 這個類型對應哪些政府原始分類名稱（合併多類時用）；空陣列代表直接用 name 本身比對 */
  memberNames: string[];
}

export interface BandDto {
  id: string;
  indicatorId: string;
  minValue: number | null;
  maxValue: number | null;
  score: number;
  label: string | null;
}

export interface HazardTypeLevelDto {
  id: string;
  chemicalTypeId: string;
  hazardLevel: number;
}

export interface QuantityThresholdDto {
  id: string;
  chemicalTypeId: string;
  level: number;
  minQuantity: number;
  maxQuantity: number | null;
}

export interface SchemeDetail extends SchemeListItem {
  indicators: IndicatorDefinitionDto[];
  chemicalTypes: ChemicalTypeDefinitionDto[];
  bands: BandDto[];
  hazardTypeLevels: HazardTypeLevelDto[];
  quantityThresholds: QuantityThresholdDto[];
  hazardQuantityMatrixWeight: number;
}

// ─── Request types ───────────────────────────────────────────────────────────

// 這兩個 Create request 都帶 id：新增指標／化學品類型的當下就在瀏覽器產生真正的
// GUID（crypto.randomUUID()），同一份送出的表單裡，Band/HazardTypeLevel/
// QuantityThreshold 才能立刻用這個 id 引用一個「還沒存進資料庫」的新定義。
export interface CreateIndicatorDefinitionRequest {
  id: string;
  name: string;
  category: RiskIndicatorCategory;
  description: string | null;
  displayOrder: number;
  weight: number;
  canonicalKey: string;
  treatMissingAsZero: boolean;
}

export interface CreateChemicalTypeDefinitionRequest {
  id: string;
  name: string;
  displayOrder: number;
  memberNames: string[];
}

export interface CreateBandRequest {
  indicatorId: string;
  minValue: number | null;
  maxValue: number | null;
  score: number;
  label: string | null;
}

export interface CreateHazardTypeLevelRequest {
  chemicalTypeId: string;
  hazardLevel: number;
}

export interface CreateQuantityThresholdRequest {
  chemicalTypeId: string;
  level: number;
  minQuantity: number;
  maxQuantity: number | null;
}

export interface CreateSchemeRequest {
  year: number;
  name: string;
  indicators: CreateIndicatorDefinitionRequest[];
  chemicalTypes: CreateChemicalTypeDefinitionRequest[];
  bands: CreateBandRequest[];
  hazardTypeLevels: CreateHazardTypeLevelRequest[];
  quantityThresholds: CreateQuantityThresholdRequest[];
  hazardQuantityMatrixWeight: number;
}

export interface UpdateSchemeRequest {
  name: string;
  indicators: CreateIndicatorDefinitionRequest[];
  chemicalTypes: CreateChemicalTypeDefinitionRequest[];
  bands: CreateBandRequest[];
  hazardTypeLevels: CreateHazardTypeLevelRequest[];
  quantityThresholds: CreateQuantityThresholdRequest[];
  hazardQuantityMatrixWeight: number;
}

export interface CloneSchemeRequest {
  newYear: number;
  newName: string;
}

// ─── Calculator ──────────────────────────────────────────────────────────────

export interface IndicatorValueInput {
  indicatorId: string;
  value: number;
}

export interface RiskCalculationInput {
  indicatorValues: IndicatorValueInput[];
  maxHazardChemicalTypeId: string;
  maxHazardQuantity: number;
}

export interface IndicatorScoreDetail {
  indicatorId: string;
  indicatorName: string;
  category: RiskIndicatorCategory;
  inputValue: number;
  score: number;
  weight: number;
}

export interface RiskCalculationResult {
  riskScore: number;
  hazardSeverityScore: number;
  managementRiskScore: number;
  indicatorScores: IndicatorScoreDetail[];
  hazardQuantityMatrixScore: number;
  hazardQuantityMatrixWeight: number;
  hazardLevel: number;
  quantityLevel: number;
  schemeId: string;
  schemeYear: number;
}

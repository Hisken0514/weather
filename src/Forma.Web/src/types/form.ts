/**
 * Form Schema TypeScript Type Definitions
 *
 * 動態表單 Schema 的完整型別定義
 * 參考 SurveyJS 元件類型設計
 */

// ============================================================================
// 基礎型別
// ============================================================================

/** 欄位類型列舉 */
export type FieldType =
  // 文字輸入類
  | 'text'
  | 'textarea'
  | 'multipletext'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  // 數值輸入類
  | 'number'
  | 'slider'
  | 'rating'
  // 日期時間類
  | 'date'
  | 'time'
  | 'datetime'
  // 選擇類
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'boolean'
  | 'imagepicker'
  | 'ranking'
  | 'cascadingselect'
  // 矩陣類
  | 'matrix'
  | 'matrixdropdown'
  | 'matrixdynamic'
  // 檔案與媒體類
  | 'file'
  | 'image'
  | 'signature'
  // 版面配置類
  | 'panel'
  | 'section'
  | 'html'
  // 特殊類
  | 'hidden'
  | 'expression'
  | 'paneldynamic'
  // 顯示專用類
  | 'welcome'
  | 'ending'
  | 'downloadreport';

/** 版面寬度 */
export type LayoutWidth = 'full' | 'half' | 'third' | 'quarter' | 'auto';

/** 條件動作 */
export type ConditionalAction = 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'unrequire';

/** 條件邏輯類型 */
export type LogicType = 'and' | 'or';

/** 條件運算符 */
export type ConditionalOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'startsWith'
  | 'endsWith';

/** 驗證規則類型 */
export type ValidationRuleType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'url'
  | 'minSelect'
  | 'maxSelect'
  | 'fileSize'
  | 'fileType'
  | 'custom';

/** 計算欄位顯示格式 */
export type DisplayFormat = 'number' | 'currency' | 'percent' | 'text';

/** 選項來源類型 */
export type OptionsSourceType = 'api' | 'lookup';

/** 表單顯示模式 */
export type FormDisplayMode = 'card' | 'classic' | 'hybrid';

/** 卡片模式動畫類型 */
export type CardAnimation = 'slide' | 'fade' | 'none';

/** 經典模式每頁顯示 */
export type QuestionsPerPage = 'all' | 'section' | number;

/** 矩陣響應式策略 */
export type MatrixResponsiveMode = 'stack' | 'dropdown' | 'accordion' | 'scroll' | 'forceClassic' | 'default';

/** 裝置斷點 */
export type DeviceBreakpoint = 'mobile' | 'tablet' | 'desktop';

// ============================================================================
// 表單整體結構
// ============================================================================

/** 表單 Schema */
export interface FormSchema {
  version: string;
  id: string;
  metadata: FormMetadata;
  settings: FormSettings;
  pages: FormPage[];
  theme?: FormTheme;
}

/** 表單元資料 */
export interface FormMetadata {
  title: string;
  description?: string;
  language?: string;
  submitButtonText?: string;
  successMessage?: string;
}

/** 卡片模式設定 */
export interface CardModeSettings {
  showProgressBar?: boolean;
  showQuestionNumber?: boolean;
  animation?: CardAnimation;
  stackedCards?: number;
  autoAdvance?: boolean;
}

/** 經典模式設定 */
export interface ClassicModeSettings {
  questionsPerPage?: QuestionsPerPage;
  showAllValidationErrors?: boolean;
  stickyNavigation?: boolean;
  columnLayout?: boolean;
}

/** 顯示模式設定 */
export interface DisplayModeSettings {
  default?: FormDisplayMode;
  allowUserSwitch?: boolean;
  /** 卡片模式在所有裝置一致顯示（含桌面），預設 false 表示僅在平板/手機使用卡片模式 */
  forceCardOnDesktop?: boolean;
  cardMode?: CardModeSettings;
  classicMode?: ClassicModeSettings;
}

/** 文字樣式設定 */
export interface TextStyleSettings {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
}

/** 可用字型 */
export type FontFamily =
  | 'default'
  | 'Noto Sans TC'
  | 'Noto Serif TC'
  | 'Microsoft JhengHei'
  | 'Arial'
  | 'Times New Roman';

/** 表單設定 */
export interface FormSettings {
  allowDraft?: boolean;
  allowMultipleSubmissions?: boolean;
  requireAuthentication?: boolean;
  showProgressBar?: boolean;
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
  displayMode?: DisplayModeSettings;
  /** 所有欄位設為必填 */
  allFieldsRequired?: boolean;
  /** 隨機顯示問題順序 */
  shuffleQuestions?: boolean;
  /** 啟用自訂樣式（覆寫計畫主題） */
  useCustomTheme?: boolean;
  /** 表單背景顏色 */
  backgroundColor?: string;
  /** 表單首頁圖片 */
  headerImage?: string;
  /** 頁首文字樣式 */
  headerStyle?: TextStyleSettings;
  /** 問題文字樣式 */
  questionStyle?: TextStyleSettings;
  /** 說明文字樣式 */
  descriptionStyle?: TextStyleSettings;
}

/** 表單頁面 */
/** 頁面導航規則 */
export interface PageNavigationRule {
  id: string;
  fieldName: string;
  operator: ConditionalOperator;
  value: string | number | boolean;
  targetPageId: string;
}

export interface FormPage {
  id: string;
  title?: string;
  description?: string;
  fields: Field[];
  /** 強制此頁面使用特定顯示模式 */
  forceDisplayMode?: 'card' | 'classic';
  /** 是否允許返回上一頁 */
  allowPrevious?: boolean;
  /** 條件導航規則 */
  navigationRules?: PageNavigationRule[];
  /** 預設顯示 */
  visible?: boolean;
  /** 頁面顯示條件 */
  visibilityCondition?: Conditional;
}

/** 表單主題 */
export interface FormTheme {
  primaryColor?: string;
  fontFamily?: string;
}

// ============================================================================
// 欄位定義
// ============================================================================

/** 欄位版面配置 */
export interface FieldLayout {
  width?: LayoutWidth;
  order?: number;
}

/** 欄位圖片設定 */
export interface FieldImage {
  url: string;
  alignment?: 'left' | 'center' | 'right';
  alt?: string;
}

/** 基礎欄位定義 */
export interface BaseField {
  id: string;
  type: FieldType;
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  defaultValue?: unknown;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  visible?: boolean;
  validation?: FieldValidation;
  conditional?: Conditional;
  layout?: FieldLayout;
  /** 欄位附加圖片 */
  image?: FieldImage;
}

// ============================================================================
// 各元件專屬屬性
// ============================================================================

/** 文字欄位屬性 */
export interface TextFieldProperties {
  minLength?: number;
  maxLength?: number;
  pattern?: string | null;
  rows?: number;
  inputMask?: string | null;
}

/** 多重文字欄位項目 */
export interface MultipleTextItem {
  name: string;
  label: string;
  placeholder?: string;
}

/** 多重文字欄位屬性 */
export interface MultipleTextFieldProperties {
  items: MultipleTextItem[];
  colCount?: number;
}

/** 數字/滑桿欄位屬性 */
export interface NumberFieldProperties {
  min?: number | null;
  max?: number | null;
  step?: number;
  precision?: number;
  unit?: string;
  showButtons?: boolean;
}

/** 選項定義 */
export interface FieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

/** 選擇欄位屬性 */
export interface SelectFieldProperties {
  options?: FieldOption[];
  allowOther?: boolean;
  otherLabel?: string;
  noneOption?: boolean;
  noneLabel?: string;
  selectAllOption?: boolean;
  selectAllLabel?: string;
  minSelect?: number | null;
  maxSelect?: number | null;
  colCount?: number;
  optionsSource?: OptionsSource | null;
}

/** 布林欄位屬性 */
export interface BooleanFieldProperties {
  labelTrue?: string;
  labelFalse?: string;
  displayStyle?: 'switch' | 'radio' | 'checkbox';
}

/** 圖片選擇項目 */
export interface ImagePickerChoice {
  value: string;
  imageUrl: string;
  label?: string;
}

/** 圖片選擇欄位屬性 */
export interface ImagePickerFieldProperties {
  choices: ImagePickerChoice[];
  multiSelect?: boolean;
  showLabel?: boolean;
  imageWidth?: number;
  imageHeight?: number;
}

/** 排序欄位項目 */
export interface RankingChoice {
  value: string;
  label: string;
}

/** 排序欄位屬性 */
export interface RankingFieldProperties {
  choices: RankingChoice[];
  maxSelectedChoices?: number | null;
  selectToRankEnabled?: boolean;
}

/** 日期時間欄位屬性 */
export interface DateTimeFieldProperties {
  minDate?: string | null;
  maxDate?: string | null;
  format?: string;
  disabledDates?: string[];
  disabledDaysOfWeek?: number[];
}

/** 檔案上傳欄位屬性 */
export interface FileFieldProperties {
  accept?: string[];
  maxSize?: number;
  maxFiles?: number;
  multiple?: boolean;
  allowCamera?: boolean;
}

/** 評分欄位屬性 */
export interface RatingFieldProperties {
  maxRating?: number;
  icon?: string;
  allowHalf?: boolean;
  labels?: string[];
  displayMode?: 'buttons' | 'dropdown';
}

/** 矩陣行定義 */
export interface MatrixRow {
  id: string;
  label: string;
}

/** 矩陣列定義 */
export interface MatrixColumn {
  id: string;
  label: string;
  value?: number;
}

/** 響應式模式設定（按裝置） */
export interface ResponsiveModeSettings {
  mobile?: MatrixResponsiveMode;
  tablet?: MatrixResponsiveMode;
  desktop?: MatrixResponsiveMode;
}

/** 矩陣欄位屬性 */
export interface MatrixFieldProperties {
  rows: MatrixRow[];
  columns: MatrixColumn[];
  alternateRows?: boolean;
  showHeader?: boolean;
  /** 是否允許填寫其他 */
  allowOther?: boolean;
  /** 其他選項標籤 */
  otherLabel?: string;
  /** 是否加入「無」選項 */
  noneOption?: boolean;
  /** 無選項標籤 */
  noneLabel?: string;
  /** 響應式顯示策略 */
  responsiveMode?: ResponsiveModeSettings;
}

/** 矩陣下拉欄位的列定義 */
export interface MatrixDropdownColumn {
  name: string;
  label: string;
  cellType: FieldType;
  options?: FieldOption[];
}

/** 矩陣下拉欄位屬性 */
export interface MatrixDropdownFieldProperties {
  rows: MatrixRow[];
  columns: MatrixDropdownColumn[];
  /** 響應式顯示策略 */
  responsiveMode?: ResponsiveModeSettings;
}

/** 動態矩陣列定義 */
export interface MatrixDynamicColumn {
  name: string;
  label: string;
  cellType: FieldType;
}

/** 動態矩陣欄位屬性 */
export interface MatrixDynamicFieldProperties {
  columns: MatrixDynamicColumn[];
  minRowCount?: number;
  maxRowCount?: number;
  addRowText?: string;
  removeRowText?: string;
  /** 響應式顯示策略 */
  responsiveMode?: ResponsiveModeSettings;
}

/** 簽名欄位屬性 */
export interface SignatureFieldProperties {
  width?: number;
  height?: number;
  penColor?: string;
  backgroundColor?: string;
}

/** 計算欄位屬性 */
export interface ExpressionFieldProperties {
  formula: string;
  precision?: number;
  unit?: string;
  displayFormat?: DisplayFormat;
}

/** 面板欄位屬性 */
export interface PanelFieldProperties {
  title?: string;
  description?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: Field[];
}

/** 動態面板欄位屬性 */
export interface PanelDynamicFieldProperties {
  minItems?: number;
  maxItems?: number;
  addButtonText?: string;
  removeButtonText?: string;
  itemLabel?: string;
  fields: Field[];
}

/** HTML 欄位屬性 */
export interface HtmlFieldProperties {
  content: string;
}

/** 階層式選項節點 */
export interface CascadingOption {
  value: string;
  label: string;
  children?: CascadingOption[];
}

/** 階層式選單欄位屬性 */
export interface CascadingSelectFieldProperties {
  levels: { label: string; placeholder?: string }[];
  options: CascadingOption[];
}

/** 歡迎欄位屬性 */
export interface WelcomeFieldProperties {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  alignment?: 'left' | 'center' | 'right';
}

/** 結束欄位屬性 */
export interface EndingFieldProperties {
  title?: string;
  message?: string;
  imageUrl?: string;
  alignment?: 'left' | 'center' | 'right';
}

/** 下載報告欄位屬性 */
export interface DownloadReportFieldProperties {
  coverTitle?: string;
  showDate?: boolean;
  dateLabel?: string;
  buttonText?: string;
  excludeFieldTypes?: string[];
  showLogo?: boolean;
}

/** 欄位屬性聯合類型 */
export type FieldProperties =
  | TextFieldProperties
  | MultipleTextFieldProperties
  | NumberFieldProperties
  | SelectFieldProperties
  | BooleanFieldProperties
  | ImagePickerFieldProperties
  | RankingFieldProperties
  | DateTimeFieldProperties
  | FileFieldProperties
  | RatingFieldProperties
  | MatrixFieldProperties
  | MatrixDropdownFieldProperties
  | MatrixDynamicFieldProperties
  | SignatureFieldProperties
  | ExpressionFieldProperties
  | PanelFieldProperties
  | PanelDynamicFieldProperties
  | HtmlFieldProperties
  | CascadingSelectFieldProperties
  | WelcomeFieldProperties
  | EndingFieldProperties
  | DownloadReportFieldProperties;

// ============================================================================
// 具體欄位類型定義
// ============================================================================

export interface TextField extends BaseField {
  type: 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'password';
  properties?: TextFieldProperties;
}

export interface MultipleTextField extends BaseField {
  type: 'multipletext';
  properties: MultipleTextFieldProperties;
}

export interface NumberField extends BaseField {
  type: 'number' | 'slider';
  properties?: NumberFieldProperties;
}

export interface SelectField extends BaseField {
  type: 'select' | 'multiselect' | 'radio' | 'checkbox';
  properties?: SelectFieldProperties;
}

export interface BooleanField extends BaseField {
  type: 'boolean';
  properties?: BooleanFieldProperties;
}

export interface ImagePickerField extends BaseField {
  type: 'imagepicker';
  properties: ImagePickerFieldProperties;
}

export interface RankingField extends BaseField {
  type: 'ranking';
  properties: RankingFieldProperties;
}

export interface DateTimeField extends BaseField {
  type: 'date' | 'time' | 'datetime';
  properties?: DateTimeFieldProperties;
}

export interface FileField extends BaseField {
  type: 'file' | 'image';
  properties?: FileFieldProperties;
}

export interface RatingField extends BaseField {
  type: 'rating';
  properties?: RatingFieldProperties;
}

export interface MatrixField extends BaseField {
  type: 'matrix';
  properties: MatrixFieldProperties;
}

export interface MatrixDropdownField extends BaseField {
  type: 'matrixdropdown';
  properties: MatrixDropdownFieldProperties;
}

export interface MatrixDynamicField extends BaseField {
  type: 'matrixdynamic';
  properties: MatrixDynamicFieldProperties;
}

export interface SignatureField extends BaseField {
  type: 'signature';
  properties?: SignatureFieldProperties;
}

export interface ExpressionField extends BaseField {
  type: 'expression';
  properties: ExpressionFieldProperties;
}

export interface PanelField extends BaseField {
  type: 'panel';
  properties: PanelFieldProperties;
}

export interface PanelDynamicField extends BaseField {
  type: 'paneldynamic';
  properties: PanelDynamicFieldProperties;
}

export interface SectionField extends BaseField {
  type: 'section';
}

export interface HtmlField extends BaseField {
  type: 'html';
  properties: HtmlFieldProperties;
}

export interface CascadingSelectField extends BaseField {
  type: 'cascadingselect';
  properties?: CascadingSelectFieldProperties;
}

export interface HiddenField extends BaseField {
  type: 'hidden';
}

export interface WelcomeField extends BaseField {
  type: 'welcome';
  properties?: WelcomeFieldProperties;
}

export interface EndingField extends BaseField {
  type: 'ending';
  properties?: EndingFieldProperties;
}

export interface DownloadReportField extends BaseField {
  type: 'downloadreport';
  properties?: DownloadReportFieldProperties;
}

/** 欄位聯合類型 */
export type Field =
  | TextField
  | MultipleTextField
  | NumberField
  | SelectField
  | BooleanField
  | ImagePickerField
  | RankingField
  | DateTimeField
  | FileField
  | RatingField
  | MatrixField
  | MatrixDropdownField
  | MatrixDynamicField
  | SignatureField
  | ExpressionField
  | PanelField
  | PanelDynamicField
  | SectionField
  | HtmlField
  | CascadingSelectField
  | HiddenField
  | WelcomeField
  | EndingField
  | DownloadReportField;

// ============================================================================
// 動態選項來源
// ============================================================================

/** 動態選項來源 */
export interface OptionsSource {
  type: OptionsSourceType;
  url?: string;
  method?: 'GET' | 'POST';
  params?: Record<string, string>;
  headers?: Record<string, string>;
  valuePath?: string;
  labelPath?: string;
  cache?: boolean;
  cacheDuration?: number;
  dependsOn?: string[];
  placeholder?: string;
}

// ============================================================================
// 驗證規則
// ============================================================================

/** 驗證規則 */
export interface ValidationRule {
  type: ValidationRuleType;
  value?: string | number | string[];
  message: string;
  expression?: string;
}

/** 欄位驗證 */
export interface FieldValidation {
  rules: ValidationRule[];
}

// ============================================================================
// 條件邏輯
// ============================================================================

/** 單一條件 */
export interface Condition {
  field: string;
  operator: ConditionalOperator;
  value?: unknown;
}

/** 條件邏輯（單一條件） */
export interface SingleConditional {
  action: ConditionalAction;
  when: Condition;
}

/** 條件邏輯（多條件） */
export interface MultiConditional {
  action: ConditionalAction;
  logicType: LogicType;
  conditions: Condition[];
}

/** 條件邏輯聯合類型 */
export type Conditional = SingleConditional | MultiConditional;

// ============================================================================
// 提交資料
// ============================================================================

/** 提交資料元資料 */
export interface SubmissionMetadata {
  duration?: number;
  device?: string;
  browser?: string;
}

/** 表單提交資料 */
export interface FormSubmissionData {
  formId: string;
  formVersion: string;
  submittedAt: string;
  data: Record<string, unknown>;
  metadata?: SubmissionMetadata;
}

/** 動態面板項目資料 */
export interface PanelDynamicItemData {
  _index: number;
  [key: string]: unknown;
}

// ============================================================================
// 工具型別
// ============================================================================

/** 取得特定類型欄位的屬性 */
export type GetFieldProperties<T extends FieldType> = T extends 'text' | 'textarea' | 'email' | 'phone' | 'url' | 'password'
  ? TextFieldProperties
  : T extends 'multipletext'
  ? MultipleTextFieldProperties
  : T extends 'number' | 'slider'
  ? NumberFieldProperties
  : T extends 'select' | 'multiselect' | 'radio' | 'checkbox'
  ? SelectFieldProperties
  : T extends 'boolean'
  ? BooleanFieldProperties
  : T extends 'imagepicker'
  ? ImagePickerFieldProperties
  : T extends 'ranking'
  ? RankingFieldProperties
  : T extends 'date' | 'time' | 'datetime'
  ? DateTimeFieldProperties
  : T extends 'file' | 'image'
  ? FileFieldProperties
  : T extends 'rating'
  ? RatingFieldProperties
  : T extends 'matrix'
  ? MatrixFieldProperties
  : T extends 'matrixdropdown'
  ? MatrixDropdownFieldProperties
  : T extends 'matrixdynamic'
  ? MatrixDynamicFieldProperties
  : T extends 'signature'
  ? SignatureFieldProperties
  : T extends 'expression'
  ? ExpressionFieldProperties
  : T extends 'panel'
  ? PanelFieldProperties
  : T extends 'paneldynamic'
  ? PanelDynamicFieldProperties
  : T extends 'html'
  ? HtmlFieldProperties
  : T extends 'cascadingselect'
  ? CascadingSelectFieldProperties
  : never;

/** 判斷條件是否為多條件類型 */
export function isMultiConditional(conditional: Conditional): conditional is MultiConditional {
  return 'conditions' in conditional;
}

/** 判斷條件是否為單一條件類型 */
export function isSingleConditional(conditional: Conditional): conditional is SingleConditional {
  return 'when' in conditional;
}

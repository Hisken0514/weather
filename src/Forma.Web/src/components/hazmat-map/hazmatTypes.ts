export type RiskLevel = 'high' | 'medium' | 'mediumLow' | 'low';

export const RISK_LEVELS_ORDER: RiskLevel[] = ['high', 'medium', 'mediumLow', 'low'];

export interface Factory {
  id: number;
  name: string;
  county: string;
  industrialPark?: string;
  lat?: number;
  lng?: number;
  riskScore: number;
  riskLevel: RiskLevel;
  chemicals?: string[];
  supervisedFactoryId?: string;
  /** 去年（依去年年度標準計算）的風險分數，無法比較時為 undefined */
  prevRiskScore?: number;
  /** 風險分數是否較去年上升 */
  riskIncreased?: boolean;
  /** 風險分數是否較去年下降 */
  riskDecreased?: boolean;
}

export const RISK_COLOR: Record<RiskLevel, string> = {
  high:      '#ef4444',
  medium:    '#f97316',
  mediumLow: '#eab308',
  low:       '#22c55e',
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  high:      '高風險',
  medium:    '中風險',
  mediumLow: '中低風險',
  low:       '低風險',
};

// 全台 22 縣市，依地理位置概略排序（北 → 東 → 南 → 西 → 離島），
// 用於「全部」檢視時固定列出每個縣市（即使該縣市目前是 0 筆也要顯示）。
export const TAIWAN_COUNTIES: string[] = [
  '基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
  '宜蘭縣', '花蓮縣', '台東縣',
  '屏東縣', '高雄市', '台南市', '嘉義市', '嘉義縣', '雲林縣', '彰化縣', '台中市', '南投縣',
  '澎湖縣', '金門縣', '連江縣',
];

// 縣市統計欄位排列用：西部（含離島）縣市由北到南排在地圖左側，
// 東部縣市由北到南排在地圖右側。
export const WEST_COUNTIES_NS: string[] = [
  '連江縣', '基隆市', '台北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
  '金門縣', '台中市', '彰化縣', '南投縣', '雲林縣', '澎湖縣', '嘉義市', '嘉義縣',
  '台南市', '高雄市', '屏東縣',
];
export const EAST_COUNTIES_NS: string[] = ['宜蘭縣', '花蓮縣', '台東縣'];

import { apiClient } from './client';
import type {
  FactoryRiskRankingResultDto,
  ImportFactoryRiskDataResult,
  SchemeDataCoverageDto,
  FactoryRiskRawDataDto,
  UpsertFactoryRiskRawDataRequest,
  PagedFactoryRiskRawDataResponse,
  FactoryTrendResultDto,
  FactoryYearComparisonDto,
} from '@/types/api/factoryRisk';

export const factoryRiskApi = {
  getRanking: (schemeId: string, dataYear?: number) =>
    apiClient.get<FactoryRiskRankingResultDto>(`/factory-risk/schemes/${schemeId}/ranking`, { dataYear }),

  getDataCoverage: (schemeId: string, dataYear?: number) =>
    apiClient.get<SchemeDataCoverageDto>(`/factory-risk/schemes/${schemeId}/data-coverage`, { dataYear }),

  // 所有已匯入資料裡出現過的資料年度（distinct，新到舊），給年度選單用
  getAvailableDataYears: () =>
    apiClient.get<number[]>('/factory-risk/data-years'),

  // 單一工廠跨資料年度的風險值走勢；schemeId 不給就每年套用自己年度的標準
  getFactoryTrend: (factoryId: string, schemeId?: string) =>
    apiClient.get<FactoryTrendResultDto>(`/factory-risk/factories/${factoryId}/trend`, { schemeId }),

  // ─── 原始資料維護（riskInputId＝某家工廠某個資料年度的一筆資料）──────────
  getFactories: (params: { page?: number; pageSize?: number; search?: string; dataYear?: number } = {}) =>
    apiClient.get<PagedFactoryRiskRawDataResponse>('/factory-risk/factories', {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
      search: params.search || undefined,
      dataYear: params.dataYear,
    }),

  getFactory: (riskInputId: string) =>
    apiClient.get<FactoryRiskRawDataDto>(`/factory-risk/factories/${riskInputId}`),

  createFactory: (data: UpsertFactoryRiskRawDataRequest) =>
    apiClient.post<{ id: string }>('/factory-risk/factories', data),

  updateFactory: (riskInputId: string, data: UpsertFactoryRiskRawDataRequest) =>
    apiClient.put(`/factory-risk/factories/${riskInputId}`, data),

  deleteFactory: (riskInputId: string) =>
    apiClient.delete(`/factory-risk/factories/${riskInputId}`),

  bulkDeleteFactories: (riskInputIds: string[]) =>
    apiClient.post<{ deletedCount: number }>('/factory-risk/factories/bulk-delete', riskInputIds),

  deleteAllFactories: () =>
    apiClient.delete<{ deletedCount: number }>('/factory-risk/factories/all'),

  // 比較兩個資料年度的工廠名單差異（重複的／只有 year1 有的／只有 year2 有的）
  compareYears: (year1: number, year2: number) =>
    apiClient.get<FactoryYearComparisonDto>('/factory-risk/year-comparison', { year1, year2 }),

  // 原始資料跟評分標準無關，匯入不用指定標準，但要指定這份資料的資料年度
  importExcel: async (file: File, dataYear: number): Promise<ImportFactoryRiskDataResult> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm<ImportFactoryRiskDataResult>(`/factory-risk/import?dataYear=${dataYear}`, formData);
  },

  // 下載匯入範本：依指定標準目前的指標動態產生表頭（含 cookie 認證）
  downloadTemplate: async (schemeId: string, schemeYear: number) => {
    const url = `${import.meta.env.VITE_API_BASE_URL || '/api'}/factory-risk/schemes/${schemeId}/import-template`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('下載範本失敗');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `全台工廠風險排名匯入範本_${schemeYear}年.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
};

import { apiClient } from './client';
import type {
  SchemeListItem,
  SchemeDetail,
  CreateSchemeRequest,
  UpdateSchemeRequest,
  CloneSchemeRequest,
  RiskCalculationInput,
  RiskCalculationResult,
} from '@/types/api/riskScoring';

export const riskScoringApi = {
  getSchemes: () =>
    apiClient.get<SchemeListItem[]>('/risk-scoring/schemes'),

  getIndicatorCanonicalKeys: () =>
    apiClient.get<string[]>('/risk-scoring/indicator-canonical-keys'),

  getScheme: (id: string) =>
    apiClient.get<SchemeDetail>(`/risk-scoring/schemes/${id}`),

  createScheme: (data: CreateSchemeRequest) =>
    apiClient.post<{ id: string }>('/risk-scoring/schemes', data),

  updateScheme: (id: string, data: UpdateSchemeRequest) =>
    apiClient.put(`/risk-scoring/schemes/${id}`, data),

  deleteScheme: (id: string) =>
    apiClient.delete(`/risk-scoring/schemes/${id}`),

  activateScheme: (id: string) =>
    apiClient.post(`/risk-scoring/schemes/${id}/activate`, {}),

  cloneScheme: (id: string, data: CloneSchemeRequest) =>
    apiClient.post<SchemeDetail>(`/risk-scoring/schemes/${id}/clone`, data),

  calculate: (input: RiskCalculationInput) =>
    apiClient.post<RiskCalculationResult>('/risk-scoring/calculate', input),

  calculateWithScheme: (schemeId: string, input: RiskCalculationInput) =>
    apiClient.post<RiskCalculationResult>(`/risk-scoring/calculate/${schemeId}`, input),
};

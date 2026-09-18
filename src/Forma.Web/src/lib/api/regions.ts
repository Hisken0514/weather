import { apiClient } from './client';

export interface RegionDto {
  id: string;
  name: string;
  sortOrder: number;
}

export const regionsApi = {
  getAll: () =>
    apiClient.get<RegionDto[]>('/regions'),

  create: (data: { name: string; sortOrder?: number }) =>
    apiClient.post<RegionDto>('/regions', data),

  update: (id: string, data: { name: string; sortOrder: number }) =>
    apiClient.put<RegionDto>(`/regions/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/regions/${id}`),
};

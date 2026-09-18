import { apiClient } from './client';
import type {
  AgencyDto,
  AgencyUserDto,
  CreateAgencyRequest,
  UpdateAgencyRequest,
  AddAgencyFormTypeRequest,
} from '@/types/api/supervision';

export const agenciesApi = {
  getAll: () =>
    apiClient.get<AgencyDto[]>('/agencies'),

  getMine: () =>
    apiClient.get<AgencyDto[]>('/agencies/mine'),

  getById: (id: string) =>
    apiClient.get<AgencyDto>(`/agencies/${id}`),

  create: (data: CreateAgencyRequest) =>
    apiClient.post<{ id: string }>('/agencies', data),

  update: (id: string, data: UpdateAgencyRequest) =>
    apiClient.put<AgencyDto>(`/agencies/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/agencies/${id}`),

  // 表單類型
  addFormType: (agencyId: string, data: AddAgencyFormTypeRequest) =>
    apiClient.post(`/agencies/${agencyId}/form-types`, data),

  removeFormType: (agencyFormTypeId: string) =>
    apiClient.delete(`/agencies/form-types/${agencyFormTypeId}`),

  bindForm: (agencyFormTypeId: string, formId: string) =>
    apiClient.put(`/agencies/form-types/${agencyFormTypeId}/bind-form/${formId}`, {}),

  // 使用者綁定
  getUsers: (agencyId: string) =>
    apiClient.get<AgencyUserDto[]>(`/agencies/${agencyId}/users`),

  addUser: (agencyId: string, userId: string) =>
    apiClient.post(`/agencies/${agencyId}/users/${userId}`, {}),

  removeUser: (agencyId: string, userId: string) =>
    apiClient.delete(`/agencies/${agencyId}/users/${userId}`),
};

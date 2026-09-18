// 信件範本 API

import { apiClient } from './client';
import type {
  EmailTemplateDto,
  UpdateEmailTemplateRequest,
  SendTestTemplateEmailRequest,
} from '@/types/api/emailTemplates';

export const emailTemplatesApi = {
  getAll: () =>
    apiClient.get<EmailTemplateDto[]>('/email-templates'),

  get: (id: string) =>
    apiClient.get<EmailTemplateDto>(`/email-templates/${id}`),

  update: (id: string, data: UpdateEmailTemplateRequest) =>
    apiClient.put<EmailTemplateDto>(`/email-templates/${id}`, data),

  sendTest: (data: SendTestTemplateEmailRequest) =>
    apiClient.post<{ message: string }>('/email-templates/send-test', data),
};

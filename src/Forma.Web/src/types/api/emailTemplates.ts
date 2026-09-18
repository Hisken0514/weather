// 信件範本相關類型定義

export interface EmailTemplateDto {
  id: string;
  templateKey: string;
  name: string;
  subject: string;
  htmlContent: string;
  isEnabled: boolean;
  availableVariables: string[];
  testVariables: Record<string, string>;
  updatedAt?: string;
}

export interface UpdateEmailTemplateRequest {
  name: string;
  subject: string;
  htmlContent: string;
  isEnabled: boolean;
  testVariables?: Record<string, string>;
}

export interface SendTestTemplateEmailRequest {
  templateId: string;
  recipientEmail: string;
  variables: Record<string, string>;
}

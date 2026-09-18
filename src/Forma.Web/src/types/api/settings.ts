// 系統設定相關類型定義

export interface SystemSettingDto {
  id: number;
  category: string;
  description?: string;
  updatedAt?: string;
}

// Email 設定
export interface EmailSettingsDto {
  smtpServer: string;
  port: number;
  userName: string;
  password: string;
  senderName: string;
  senderEmail: string;
  enableSsl: boolean;
}

// 檔案存儲設定
export interface FileStorageSettingsDto {
  uploadPath: string;
  allowedExtensions: string;
  maxFileSizeInMB: number;
}

// 安全性設定
export interface SecuritySettingsDto {
  enableLoginLockout: boolean;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  requirePasswordChangeOnFirstLogin: boolean;
  enablePasswordExpiry: boolean;
  passwordExpiryDays: number;
  cookieHttpOnly: boolean;
  cookieSecure: boolean;
  cookieSameSite: string;
  accessTokenExpirationMinutes: number;
  refreshTokenExpirationDays: number;
}

// 密碼策略設定
export interface PasswordPolicyDto {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecialCharacter: boolean;
  passwordHistoryCount: number;
}

// CAPTCHA 設定
export interface CaptchaSettingsDto {
  enabled: boolean;
  captchaType: number;
  scenarios: CaptchaScenarios;
  turnstile: TurnstileSettings;
  imageCaptcha: ImageCaptchaSettings;
}

export interface CaptchaScenarios {
  userLogin: boolean;
  userRegister: boolean;
  adminLogin: boolean;
  forgotPassword: boolean;
}

export interface TurnstileSettings {
  siteKey: string;
  secretKey: string;
}

export interface ImageCaptchaSettings {
  codeLength: number;
  expirationSeconds: number;
  maxAttempts: number;
  enableAudio: boolean;
}

// Security Headers 設定
export interface SecurityHeadersSettingsDto {
  enableXssProtection: boolean;
  enableNoSniff: boolean;
  xFrameOptions: string;
  enableHsts: boolean;
  hstsMaxAgeSeconds: number;
  hstsIncludeSubDomains: boolean;
  referrerPolicy: string;
  enableCsp: boolean;
  cspReportOnly: boolean;
  cspDefaultSrc: string;
  cspScriptSrc: string;
  cspStyleSrc: string;
  cspImgSrc: string;
  cspFontSrc: string;
  cspConnectSrc: string;
  cspFrameSrc: string;
  cspFrameAncestors: string;
}

// FIDO2 設定
export interface Fido2SettingsDto {
  enableFido2: boolean;
}

// FIDO2 憑證資訊
export interface Fido2CredentialInfo {
  id: string;
  deviceName?: string;
  aaGuid?: string;
  createdAt: string;
  lastUsedAt?: string;
}

// CORS 設定
export interface CorsSettingsDto {
  trustProxyHeaders: boolean;
  allowCredentials: boolean;
  allowedOrigins: string;
}

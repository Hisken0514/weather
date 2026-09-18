namespace Forma.Application.Features.SystemSettings.DTOs;

/// <summary>
/// Email 設定
/// </summary>
public class EmailSettingsDto
{
    /// <summary>
    /// SMTP 伺服器
    /// </summary>
    public string SmtpServer { get; set; } = string.Empty;

    /// <summary>
    /// 連接埠
    /// </summary>
    public int Port { get; set; }

    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string UserName { get; set; } = string.Empty;

    /// <summary>
    /// 密碼
    /// </summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 寄件者名稱
    /// </summary>
    public string SenderName { get; set; } = string.Empty;

    /// <summary>
    /// 寄件者 Email
    /// </summary>
    public string SenderEmail { get; set; } = string.Empty;

    /// <summary>
    /// 是否啟用 SSL
    /// </summary>
    public bool EnableSsl { get; set; }
}

/// <summary>
/// 檔案存儲設定
/// </summary>
public class FileStorageSettingsDto
{
    /// <summary>
    /// 本地上傳目錄 (例如: "Uploads")
    /// </summary>
    public string UploadPath { get; set; } = "Uploads";

    /// <summary>
    /// 允許的檔案副檔名 (逗號分隔，例如: ".jpg,.png,.pdf")
    /// </summary>
    public string AllowedExtensions { get; set; } = ".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx";

    /// <summary>
    /// 最大檔案大小 (MB)
    /// </summary>
    public long MaxFileSizeInMB { get; set; } = 10;
}

/// <summary>
/// 安全性設定
/// </summary>
public class SecuritySettingsDto
{
    /// <summary>
    /// 是否啟用登入失敗鎖定機制
    /// </summary>
    public bool EnableLoginLockout { get; set; } = false;

    /// <summary>
    /// 最大登入失敗次數
    /// </summary>
    public int MaxFailedAttempts { get; set; } = 5;

    /// <summary>
    /// 鎖定時長（分鐘）
    /// </summary>
    public int LockoutDurationMinutes { get; set; } = 30;

    /// <summary>
    /// 是否強制首次登入修改密碼
    /// </summary>
    public bool RequirePasswordChangeOnFirstLogin { get; set; } = false;

    /// <summary>
    /// 是否啟用密碼過期策略
    /// </summary>
    public bool EnablePasswordExpiry { get; set; } = false;

    /// <summary>
    /// 密碼過期天數
    /// </summary>
    public int PasswordExpiryDays { get; set; } = 90;

    /// <summary>
    /// Cookie HttpOnly 設定
    /// </summary>
    public bool CookieHttpOnly { get; set; } = true;

    /// <summary>
    /// Cookie Secure 設定
    /// </summary>
    public bool CookieSecure { get; set; } = false;

    /// <summary>
    /// Cookie SameSite 設定 (Strict, Lax, None)
    /// </summary>
    public string CookieSameSite { get; set; } = "Lax";

    /// <summary>
    /// Access Token 效期（分鐘）
    /// </summary>
    public int AccessTokenExpirationMinutes { get; set; } = 30;

    /// <summary>
    /// Refresh Token 效期（天）
    /// </summary>
    public int RefreshTokenExpirationDays { get; set; } = 7;
}

/// <summary>
/// 密碼策略設定
/// </summary>
public class PasswordPolicyDto
{
    /// <summary>
    /// 最小密碼長度
    /// </summary>
    public int MinLength { get; set; } = 8;

    /// <summary>
    /// 是否需要大寫字母
    /// </summary>
    public bool RequireUppercase { get; set; } = true;

    /// <summary>
    /// 是否需要小寫字母
    /// </summary>
    public bool RequireLowercase { get; set; } = true;

    /// <summary>
    /// 是否需要數字
    /// </summary>
    public bool RequireDigit { get; set; } = true;

    /// <summary>
    /// 是否需要特殊字符
    /// </summary>
    public bool RequireSpecialCharacter { get; set; } = false;

    /// <summary>
    /// 密碼歷史記錄數量（不可重複使用前 N 組密碼，0 表示不限制）
    /// </summary>
    public int PasswordHistoryCount { get; set; } = 0;
}

/// <summary>
/// CAPTCHA 系統設定
/// </summary>
public class CaptchaSettingsDto
{
    /// <summary>
    /// 是否啟用 CAPTCHA
    /// </summary>
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// 驗證碼類型：0=None, 1=Turnstile, 2=ImageCode
    /// </summary>
    public int CaptchaType { get; set; } = 0;

    /// <summary>
    /// 適用場景設定
    /// </summary>
    public CaptchaScenarios Scenarios { get; set; } = new();

    /// <summary>
    /// Turnstile 設定
    /// </summary>
    public TurnstileSettings Turnstile { get; set; } = new();

    /// <summary>
    /// 圖片驗證碼設定
    /// </summary>
    public ImageCaptchaSettings ImageCaptcha { get; set; } = new();
}

/// <summary>
/// CAPTCHA 適用場景
/// </summary>
public class CaptchaScenarios
{
    /// <summary>
    /// 使用者登入
    /// </summary>
    public bool UserLogin { get; set; } = false;

    /// <summary>
    /// 使用者註冊
    /// </summary>
    public bool UserRegister { get; set; } = false;

    /// <summary>
    /// 管理員登入
    /// </summary>
    public bool AdminLogin { get; set; } = false;

    /// <summary>
    /// 忘記密碼
    /// </summary>
    public bool ForgotPassword { get; set; } = false;
}

/// <summary>
/// Cloudflare Turnstile 設定
/// </summary>
public class TurnstileSettings
{
    /// <summary>
    /// 網站金鑰（前端使用）
    /// </summary>
    public string SiteKey { get; set; } = string.Empty;

    /// <summary>
    /// 秘密金鑰（後端驗證用）
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;
}

/// <summary>
/// 圖片驗證碼設定
/// </summary>
public class ImageCaptchaSettings
{
    /// <summary>
    /// 驗證碼長度
    /// </summary>
    public int CodeLength { get; set; } = 4;

    /// <summary>
    /// 過期時間（秒）
    /// </summary>
    public int ExpirationSeconds { get; set; } = 120;

    /// <summary>
    /// 最大嘗試次數
    /// </summary>
    public int MaxAttempts { get; set; } = 5;

    /// <summary>
    /// 是否啟用音訊驗證碼
    /// </summary>
    public bool EnableAudio { get; set; } = true;
}

/// <summary>
/// 系統設定基本資訊 DTO
/// </summary>
public class SystemSettingDto
{
    /// <summary>
    /// ID
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// 設定分類
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 更新時間
    /// </summary>
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// Security Headers 設定
/// </summary>
public class SecurityHeadersSettingsDto
{
    /// <summary>
    /// X-XSS-Protection
    /// </summary>
    public bool EnableXssProtection { get; set; } = true;

    /// <summary>
    /// X-Content-Type-Options: nosniff
    /// </summary>
    public bool EnableNoSniff { get; set; } = true;

    /// <summary>
    /// X-Frame-Options (DENY, SAMEORIGIN, 空字串=不設定)
    /// </summary>
    public string XFrameOptions { get; set; } = "SAMEORIGIN";

    /// <summary>
    /// 啟用 HSTS
    /// </summary>
    public bool EnableHsts { get; set; } = true;

    /// <summary>
    /// HSTS Max-Age (秒)
    /// </summary>
    public int HstsMaxAgeSeconds { get; set; } = 31536000;

    /// <summary>
    /// HSTS 包含子網域
    /// </summary>
    public bool HstsIncludeSubDomains { get; set; } = true;

    /// <summary>
    /// Referrer-Policy
    /// </summary>
    public string ReferrerPolicy { get; set; } = "strict-origin-when-cross-origin";

    /// <summary>
    /// 啟用 CSP
    /// </summary>
    public bool EnableCsp { get; set; } = false;

    /// <summary>
    /// CSP Report-Only 模式
    /// </summary>
    public bool CspReportOnly { get; set; } = true;

    /// <summary>
    /// CSP default-src
    /// </summary>
    public string CspDefaultSrc { get; set; } = "'self'";

    /// <summary>
    /// CSP script-src
    /// </summary>
    public string CspScriptSrc { get; set; } = "'self' 'unsafe-inline' 'unsafe-eval'";

    /// <summary>
    /// CSP style-src
    /// </summary>
    public string CspStyleSrc { get; set; } = "'self' 'unsafe-inline'";

    /// <summary>
    /// CSP img-src
    /// </summary>
    public string CspImgSrc { get; set; } = "'self' data: https:";

    /// <summary>
    /// CSP font-src
    /// </summary>
    public string CspFontSrc { get; set; } = "'self' data:";

    /// <summary>
    /// CSP connect-src
    /// </summary>
    public string CspConnectSrc { get; set; } = "'self' https: wss:";

    /// <summary>
    /// CSP frame-src
    /// </summary>
    public string CspFrameSrc { get; set; } = "'self'";

    /// <summary>
    /// CSP frame-ancestors
    /// </summary>
    public string CspFrameAncestors { get; set; } = "'self'";
}

/// <summary>
/// FIDO2 設定
/// </summary>
public class Fido2SettingsDto
{
    /// <summary>
    /// 是否啟用 FIDO2 / Passkey
    /// </summary>
    public bool EnableFido2 { get; set; } = false;
}

/// <summary>
/// CORS 設定
/// </summary>
public class CorsSettingsDto
{
    /// <summary>
    /// 信任 Proxy Headers (X-Forwarded-For, X-Real-IP)
    /// </summary>
    public bool TrustProxyHeaders { get; set; } = false;

    /// <summary>
    /// 允許憑證 (Cookie)
    /// </summary>
    public bool AllowCredentials { get; set; } = true;

    /// <summary>
    /// 允許的來源 (每行一個)
    /// </summary>
    public string AllowedOrigins { get; set; } = "";
}


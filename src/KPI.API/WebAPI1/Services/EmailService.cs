using System.Net.Security;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Helpers;
namespace WebAPI1.Services;

/// <summary>
/// 提供電子郵件發送服務的介面。
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// 發送一般電子郵件。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="subject">郵件主旨。</param>
    /// <param name="body">郵件內容。</param>
    Task SendEmailAsync(EmailOption option);

    /// <summary>
    /// 發送驗證郵件。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="verificationLink">驗證連結。</param>
    Task SendVerificationEmailUrlAsync(string to, string verificationLink);

    Task<bool>SendVerificationEmailCodeAsync(string to, string code);

    /// <summary>
    /// 發送密碼重置郵件。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="resetLink">密碼重置連結。</param>
    Task SendPasswordResetEmailAsync(string to, string resetLink);

    /// <summary>
    /// 發送網域驗證郵件。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="organizationName">組織名稱。</param>
    /// <param name="verificationToken">驗證令牌。</param>
    Task SendDomainVerificationEmailAsync(string to, string organizationName, string verificationToken);

    /// <summary>
    /// 發送帳號開通通知信。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="userName">使用者名稱。</param>
    /// <param name="loginUrl">登入網址。</param>
    Task SendActivationEmailAsync(string to, string userName, string loginUrl);

    /// <summary>
    /// 發送 KPI 填報催繳提醒信。
    /// </summary>
    Task SendReminderEmailAsync(string to, string userName, string orgName, int year, string period);
}

/// <summary>
/// 電子郵件設定類別，包含 SMTP 相關配置。
/// </summary>
public class EmailSettings
{
    /// <summary>
    /// SMTP 伺服器地址。
    /// </summary>
    public string SmtpServer { get; set; } 

    /// <summary>
    /// SMTP 伺服器端口號。
    /// </summary>
    public int SmtpPort { get; set; }

    /// <summary>
    /// SMTP 使用者名稱。
    /// </summary>
    public string SmtpUsername { get; set; }

    /// <summary>
    /// SMTP 密碼。
    /// </summary>
    public string SmtpPassword { get; set; }

    /// <summary>
    /// 發件人電子郵件地址。
    /// </summary>
    public string FromEmail { get; set; }

    /// <summary>
    /// 發件人名稱。
    /// </summary>
    public string FromName { get; set; }

    /// <summary>
    /// 是否啟用 SSL 加密。
    /// </summary>
    public bool EnableSsl { get; set; }
}

/// <summary>
/// 提供電子郵件發送功能的服務。
/// </summary>
public class EmailService : IEmailService
{
    private readonly EmailSettings _settings;
    private readonly ILogger<EmailService> _logger;
    private readonly IConfiguration _configuration;
    private readonly ISHAuditDbcontext _dbContext;

    /// <summary>
    /// 初始化 EmailService 類別。
    /// </summary>
    /// <param name="settings">電子郵件設定。</param>
    /// <param name="logger">日誌記錄器。</param>
    public EmailService(
        IOptions<EmailSettings> settings,
        ILogger<EmailService> logger,
        IConfiguration configuration,
        ISHAuditDbcontext dbContext)
    {
        _settings = settings.Value;
        _logger = logger;
        _configuration = configuration;
        _dbContext = dbContext;
        _settings.SmtpServer = _configuration.GetValue<string>("Email_Setting:SmtpServer");
        _settings.SmtpPort = _configuration.GetValue<int>("Email_Setting:SmtpPort");
        _settings.SmtpUsername = _configuration.GetValue<string>("Email_Setting:SmtpUsername");
        _settings.SmtpPassword = _configuration.GetValue<string>("Email_Setting:SmtpPassword");
        _settings.FromEmail = _configuration.GetValue<string>("Email_Setting:FromEmail");
        _settings.FromName = _configuration.GetValue<string>("Email_Setting:FromName");
        _settings.EnableSsl = _configuration.GetValue<bool>("Email_Setting:EnableSSL");
    }

    /// <summary>伺服器憑證驗證回調，失敗時記錄詳細原因方便排查。</summary>
    private bool ValidateServerCertificate(object sender, System.Security.Cryptography.X509Certificates.X509Certificate? cert,
        System.Security.Cryptography.X509Certificates.X509Chain? chain, SslPolicyErrors sslPolicyErrors)
    {
        if (sslPolicyErrors == SslPolicyErrors.None)
            return true;
        _logger.LogError("[SMTP 憑證錯誤]：{Errors}", sslPolicyErrors);
        return false;
    }

    /// <summary>
    /// 郵件寄送失敗時，判斷是否值得重試：連線層級的暫時性問題（逾時、連線中斷、SMTP
    /// 4xx 暫時性拒絕）值得重試；帳密錯誤、SMTP 5xx 永久性拒絕這種重試也不會成功的
    /// 情況，直接失敗、不要浪費時間重試。
    /// </summary>
    private static bool IsTransientSmtpFailure(Exception ex) => ex switch
    {
        SmtpCommandException smtpEx => (int)smtpEx.StatusCode is >= 400 and < 500,
        SmtpProtocolException => true,
        System.Net.Sockets.SocketException => true,
        TimeoutException => true,
        IOException => true,
        _ => false,
    };

    /// <summary>
    /// 發送電子郵件，支援收件人、副本 (CC) 和密件副本 (BCC)。連線／逾時這類暫時性失敗
    /// 會自動重試最多 3 次（間隔漸增），帳密錯誤或伺服器永久性拒絕則不重試、直接失敗，
    /// 每次嘗試的結果都會記錄下來，方便事後從 log 判斷是連線問題還是被伺服器拒絕。
    /// </summary>
    /// <param name="option">包含電子郵件發送資訊的選項。</param>
    /// <exception cref="EmailServiceException">當郵件發送失敗時拋出異常。</exception>
    public async Task SendEmailAsync(EmailOption option)
    {
        // 產生本系統專屬的 Message-ID（.kpi@ 標記），退信處理服務靠這個標記識別
        // 「這封退信是不是本系統寄出去的」，並比對回對應的 MailLog。
        var domain = _settings.FromEmail.Contains('@') ? _settings.FromEmail.Split('@')[1] : _settings.SmtpServer;
        var rawMessageId = $"{Guid.NewGuid()}.kpi@{domain}";

        var allReceivers = new List<string> { option.To };
        if (option.Cc != null) allReceivers.AddRange(option.Cc);
        if (option.Bcc != null) allReceivers.AddRange(option.Bcc);

        var mailLog = new MailLog
        {
            SentAtUtc = tool.GetTaiwanNow(),
            Receivers = string.Join(", ", allReceivers),
            ReceiverCount = allReceivers.Count,
            Subject = option.Subject,
            Content = option.Body,
            MailType = option.MailType,
            MessageId = $"<{rawMessageId}>",
            IsSuccess = false,
        };

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_settings.FromName, _settings.FromEmail));
        message.To.Add(MailboxAddress.Parse(option.To));
        if (option.Cc != null)
            foreach (var cc in option.Cc) message.Cc.Add(MailboxAddress.Parse(cc));
        if (option.Bcc != null)
            foreach (var bcc in option.Bcc) message.Bcc.Add(MailboxAddress.Parse(bcc));
        message.Subject = option.Subject;
        message.MessageId = rawMessageId;
        message.Body = new TextPart(MimeKit.Text.TextFormat.Html) { Text = option.Body };

        const int maxAttempts = 3;
        var secureOption = _settings.EnableSsl ? SecureSocketOptions.StartTls : SecureSocketOptions.None;

        try
        {
            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                try
                {
                    using var client = new SmtpClient { Timeout = 15000 };
                    client.ServerCertificateValidationCallback = ValidateServerCertificate;
                    await client.ConnectAsync(_settings.SmtpServer, _settings.SmtpPort, secureOption);
                    await client.AuthenticateAsync(_settings.SmtpUsername, _settings.SmtpPassword);
                    await client.SendAsync(message);
                    await client.DisconnectAsync(true);

                    _logger.LogInformation(
                        "[Email] 寄送成功 To={To} SMTP={Server}:{Port} 第{Attempt}次嘗試",
                        option.To, _settings.SmtpServer, _settings.SmtpPort, attempt);
                    mailLog.IsSuccess = true;
                    return;
                }
                catch (Exception ex) when (attempt < maxAttempts && IsTransientSmtpFailure(ex))
                {
                    var delay = TimeSpan.FromSeconds(Math.Pow(2, attempt));
                    _logger.LogWarning(
                        ex, "[Email] 第{Attempt}次寄送失敗（暫時性錯誤），{Delay}秒後重試 To={To}",
                        attempt, delay.TotalSeconds, option.To);
                    await Task.Delay(delay);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Email] 寄送失敗（第{Attempt}次，不再重試）To={To}", attempt, option.To);
                    mailLog.ErrorMessage = ex.Message;
                    throw new EmailServiceException("Failed to send email", ex);
                }
            }
        }
        finally
        {
            try
            {
                _dbContext.MailLogs.Add(mailLog);
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception logEx)
            {
                _logger.LogError(logEx, "[Email] 寫入寄信紀錄失敗 To={To}", option.To);
            }
        }
    }

    /// <summary>
    /// 發送驗證電子郵件。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="verificationLink">驗證連結。</param>
    public async Task SendVerificationEmailUrlAsync(string to, string verificationLink)
    {
        var subject = "驗證您的電子郵件地址";
        var body = GenerateEmailTemplate(
            "電子郵件驗證",
            @$"您好，

    請點擊下方按鈕來驗證您的電子郵件地址。此驗證連結將在24小時後失效。

    <a href='{verificationLink}' style='background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;'>驗證電子郵件</a>

    如果您沒有註冊帳號，請忽略此郵件。

    謝謝"
        );
        var option = new EmailOption
        {
            To = to,
            Subject = subject,
            Body = body,
            MailType = "VerificationUrl",
        };

        await SendEmailAsync(option);
    }

    public async Task<bool>SendVerificationEmailCodeAsync(string to, string code)
    {
        var subject = "電子郵件地址驗證碼";
        var body = GenerateEmailTemplate(
            "電子郵件登入驗證",
            @$"
            <p style='margin-bottom: 16px;'>親愛的用戶，您好！</p>

            <p style='margin-bottom: 16px;'>您正在進行電子郵件登入驗證，請使用以下驗證碼完成登入流程：</p>

            <div style='background-color: #f8f9fa; border-left: 4px solid #4285f4; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 24px; text-align: center; letter-spacing: 5px;'>{code}</div>

            <p style='margin-bottom: 16px;'>此驗證碼將在 5 分鐘內有效。<br>如果您並未要求進行此操作，請忽略此郵件，並考慮檢查您的帳號安全。</p>

            "
        );
    
        var option = new EmailOption
        {
            To = to,
            Subject = subject,
            Body = body,
            MailType = "VerificationCode",
        };

        await SendEmailAsync(option);
        return true;
    }

    /// <summary>
    /// 發送密碼重設郵件。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="resetLink">密碼重設連結。</param>
    public async Task SendPasswordResetEmailAsync(string to, string resetLink)
    {
        var subject = "密碼重設請求";
        var body = GenerateEmailTemplate(
            "重設密碼",
            @$"您好，

    我們收到了您的密碼重設請求。請點擊下方按鈕來重設您的密碼。此連結將在1小時後失效。

    <a href='{resetLink}' style='background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;'>重設密碼</a>
    <br>
    如果這不是您發起的請求，請忽略此郵件並確保您的帳號安全。

    謝謝"
        );
        var option = new EmailOption
        {
            To = to,
            Subject = subject,
            Body = body,
            MailType = "PasswordReset",
        };

        await SendEmailAsync(option);
    }

    /// <summary>
    /// 發送組織域名驗證郵件。
    /// </summary>
    /// <param name="to">收件人電子郵件地址。</param>
    /// <param name="organizationName">組織名稱。</param>
    /// <param name="verificationToken">驗證令牌。</param>
    public async Task SendDomainVerificationEmailAsync(string to, string organizationName, string verificationToken)
    {
        var subject = "組織域名驗證";
        var body = GenerateEmailTemplate(
            "域名驗證",
            @$"您好，
                您的組織 {organizationName} 已請求域名驗證。請使用以下驗證令牌來完成域名驗證流程：

                <div style='background-color: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 4px;'>
                    <code>{verificationToken}</code>
                </div>

                您可以通過以下兩種方式之一來驗證您的域名：

                1. 添加 DNS TXT 記錄：
                   - 主機名：@ 或域名
                   - 值：{verificationToken}

                2. 上傳 HTML 檔案：
                   - 檔案名：{verificationToken}.html
                   - 放置於網站根目錄

                完成上述步驟後，請返回系統點擊「驗證域名」按鈕。

                如果您沒有請求域名驗證，請忽略此郵件。

                謝謝"
        );

        var option = new EmailOption
        {
            To = to,
            Subject = subject,
            Body = body,
            MailType = "DomainVerification",
        };

        await SendEmailAsync(option);
    }

    /// <summary>
    /// 發送帳號開通通知信。
    /// </summary>
    public async Task SendActivationEmailAsync(string to, string userName, string loginUrl)
    {
        var subject = "您的帳號已開通，請登入系統";
        var body = GenerateEmailTemplate(
            "帳號開通通知",
            @$"<p style='margin-bottom: 16px;'>親愛的 {userName}，您好！</p>

            <p style='margin-bottom: 16px;'>您的帳號已完成審核並正式開通，請點擊下方按鈕登入系統。</p>

            <div style='text-align: center; margin: 24px 0;'>
                <a href='{loginUrl}' style='background-color: #4285f4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px;'>登入系統</a>
            </div>

            <p style='margin-bottom: 8px; color: #888; font-size: 13px;'>若按鈕無法點擊，請複製以下網址至瀏覽器開啟：</p>
            <p style='color: #4285f4; font-size: 13px; word-break: break-all;'>{loginUrl}</p>"
        );
        await SendEmailAsync(new EmailOption { To = to, Subject = subject, Body = body, MailType = "Activation" });
    }

    public async Task SendReminderEmailAsync(string to, string userName, string orgName, int year, string period)
    {
        var periodLabel = QuarterLabelHelper.GetLabel(period);
        var subject = $"【填報提醒】{orgName} 民國 {year} 年 {periodLabel} KPI 績效指標填報提醒";
        var loginUrl = _configuration["FrontendUrl"] ?? "/";
        var body = GenerateEmailTemplate(
            "KPI 填報提醒",
            @$"<p style='margin-bottom: 16px;'>親愛的 {userName}，您好！</p>

            <p style='margin-bottom: 16px;'>提醒您，<strong>{orgName}</strong> 目前尚未完成 <strong>民國 {year} 年 {periodLabel}</strong> KPI 績效指標填報作業。</p>

            <p style='margin-bottom: 16px;'>請盡快登入系統，完成本期填報，以利後續審核作業進行。</p>

            <div style='text-align: center; margin: 24px 0;'>
                <a href='{loginUrl}' style='background-color: #4285f4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px;'>前往系統填報</a>
            </div>

            <p style='margin-bottom: 8px; color: #888; font-size: 13px;'>若按鈕無法點擊，請複製以下網址至瀏覽器開啟：</p>
            <p style='color: #4285f4; font-size: 13px; word-break: break-all;'>{loginUrl}</p>"
        );
        await SendEmailAsync(new EmailOption { To = to, Subject = subject, Body = body, MailType = "Reminder" });
    }

    /// <summary>
    /// 產生電子郵件 HTML 模板。
    /// </summary>
    /// <param name="title">郵件標題。</param>
    /// <param name="content">郵件內容。</param>
    /// <returns>返回完整的 HTML 格式郵件內容。</returns>
    private string GenerateEmailTemplate(string title, string content)
    {
        string svgContent = System.IO.File.ReadAllText("wwwroot/images/logo.svg");
        
        string styledSvgContent = svgContent.Replace("<svg ", "<svg style='width: 70%; height: auto;' ");

        return @$"
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <title>{title}</title>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;'>
        <div style='background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1);'>
            <h2 style='color: #333; margin-bottom: 20px;'>{title}</h2>
            <div style='color: #666;'>
                {content}
            </div>
            <hr style='margin: 20px 0; border: none; border-top: 1px solid #eee;'>
            <p style='color: #999; font-size: 12px;'>
                此郵件由系統自動發送，請勿直接回覆。
            </p>
        </div>
        <div style='text-align: center; margin-top: 20px;'>
            {styledSvgContent}
        </div>
    </body>
    </html>";
    }
    
    
}

public class EmailServiceException : Exception
{
    public EmailServiceException(string message) : base(message)
    {
    }

    public EmailServiceException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

/// <summary>
/// 表示電子郵件的選項，包括收件人、副本、密件副本等資訊。
/// </summary>
public class EmailOption
{
    /// <summary>
    /// 收件人電子郵件地址。
    /// </summary>
    public string To { get; set; }

    /// <summary>
    /// 郵件主旨。
    /// </summary>
    public string? Subject { get; set; }

    /// <summary>
    /// 郵件內容。
    /// </summary>
    public string? Body { get; set; }

    /// <summary>
    /// 副本 (CC) 電子郵件地址列表。
    /// </summary>
    public List<string>? Cc { get; set; } = new List<string>();

    /// <summary>
    /// 密件副本 (BCC) 電子郵件地址列表。
    /// </summary>
    public List<string>? Bcc { get; set; } = new List<string>();

    /// <summary>
    /// 郵件類型，用於寄信紀錄分類查詢（e.g. VerificationCode, PasswordReset, Reminder, Test）。
    /// </summary>
    public string? MailType { get; set; }
}
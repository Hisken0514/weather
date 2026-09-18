using System.Text.RegularExpressions;
using MailKit;
using MailKit.Net.Imap;
using MailKit.Search;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using WebAPI1.Context;
using WebAPI1.Entities;

namespace WebAPI1.Services;

/// <summary>
/// 退信監控設定。跟寄信用的 SMTP 帳密可能是同一個信箱（DSN 退信預設會回到寄件者
/// 地址），但走的是 IMAP 協定，要另外確認信箱有沒有開放 IMAP 存取。
/// </summary>
public class BounceMailSettings
{
    public bool Enabled { get; set; }
    public string ImapServer { get; set; } = string.Empty;
    public int ImapPort { get; set; } = 993;
    public bool UseSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Folder { get; set; } = "INBOX";
    public bool DeleteAfterProcessing { get; set; }
    public string? MoveToFolder { get; set; } = "Processed";
    public int CheckIntervalMinutes { get; set; } = 5;

    public static BounceMailSettings FromConfiguration(IConfiguration configuration) => new()
    {
        Enabled = configuration.GetValue<bool>("BounceMail_Setting:Enabled"),
        ImapServer = configuration.GetValue<string>("BounceMail_Setting:ImapServer") ?? string.Empty,
        ImapPort = configuration.GetValue<int?>("BounceMail_Setting:ImapPort") ?? 993,
        UseSsl = configuration.GetValue<bool?>("BounceMail_Setting:UseSsl") ?? true,
        Username = configuration.GetValue<string>("BounceMail_Setting:Username") ?? string.Empty,
        Password = configuration.GetValue<string>("BounceMail_Setting:Password") ?? string.Empty,
        Folder = configuration.GetValue<string>("BounceMail_Setting:Folder") ?? "INBOX",
        DeleteAfterProcessing = configuration.GetValue<bool>("BounceMail_Setting:DeleteAfterProcessing"),
        MoveToFolder = configuration.GetValue<string>("BounceMail_Setting:MoveToFolder") ?? "Processed",
        CheckIntervalMinutes = configuration.GetValue<int?>("BounceMail_Setting:CheckIntervalMinutes") ?? 5,
    };
}

public class BounceProcessingResult
{
    public int TotalFound { get; set; }
    public int ProcessedCount { get; set; }
    public int SkippedCount { get; set; }
    public int ErrorCount { get; set; }
    public string? Error { get; set; }
    public bool Success => string.IsNullOrEmpty(Error);
}

/// <summary>
/// 退信處理服務——用 IMAP 讀取監控信箱，找出退信通知（DSN），比對回本系統寄出的
/// 那一筆 MailLog（靠寄信時產生的 Message-ID 上的 .kpi@ 標記識別），回填退信狀態。
/// 只能看到「有沒有收到退信」，收不到退信不代表一定送達，只是還沒偵測到失敗。
/// </summary>
public class BounceProcessingService
{
    private readonly ISHAuditDbcontext _context;
    private readonly ILogger<BounceProcessingService> _logger;

    public BounceProcessingService(ISHAuditDbcontext context, ILogger<BounceProcessingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BounceProcessingResult> ProcessBouncesAsync(
        BounceMailSettings settings,
        CancellationToken ct = default)
    {
        var result = new BounceProcessingResult();

        if (!settings.Enabled)
        {
            _logger.LogDebug("退信處理未啟用");
            return result;
        }

        try
        {
            using var client = new ImapClient();

            await client.ConnectAsync(settings.ImapServer, settings.ImapPort, settings.UseSsl, ct);
            _logger.LogDebug("已連接到 IMAP 伺服器: {Server}:{Port}", settings.ImapServer, settings.ImapPort);

            await client.AuthenticateAsync(settings.Username, settings.Password, ct);
            _logger.LogDebug("IMAP 認證成功");

            var folder = await client.GetFolderAsync(settings.Folder, ct);
            await folder.OpenAsync(FolderAccess.ReadWrite, ct);

            _logger.LogDebug("已開啟資料夾: {Folder}, 郵件數: {Count}", settings.Folder, folder.Count);

            var query = SearchQuery.Or(
                SearchQuery.SubjectContains("Undelivered"),
                SearchQuery.Or(
                    SearchQuery.SubjectContains("Delivery Status Notification"),
                    SearchQuery.Or(
                        SearchQuery.SubjectContains("Mail delivery failed"),
                        SearchQuery.Or(
                            SearchQuery.SubjectContains("Returned mail"),
                            SearchQuery.SubjectContains("failure notice")
                        )
                    )
                )
            );

            var uids = await folder.SearchAsync(query, ct);
            result.TotalFound = uids.Count;
            _logger.LogInformation("找到 {Count} 封可能的退信郵件", uids.Count);

            IMailFolder? processedFolder = null;
            if (!settings.DeleteAfterProcessing && !string.IsNullOrEmpty(settings.MoveToFolder))
            {
                try
                {
                    processedFolder = await client.GetFolderAsync(settings.MoveToFolder, ct);
                }
                catch
                {
                    try
                    {
                        var rootFolder = client.GetFolder(client.PersonalNamespaces[0]);
                        processedFolder = await rootFolder.CreateAsync(settings.MoveToFolder, true, ct);
                        _logger.LogInformation("已建立資料夾: {Folder}", settings.MoveToFolder);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "無法建立資料夾 {Folder}", settings.MoveToFolder);
                    }
                }
            }

            var processedUids = new List<UniqueId>();
            foreach (var uid in uids)
            {
                try
                {
                    var message = await folder.GetMessageAsync(uid, ct);
                    var processed = await ProcessBounceMessageAsync(message, ct);

                    if (processed)
                    {
                        result.ProcessedCount++;
                        processedUids.Add(uid);
                    }
                    else
                    {
                        result.SkippedCount++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "處理郵件 {Uid} 時發生錯誤", uid);
                    result.ErrorCount++;
                }
            }

            if (processedUids.Count > 0)
            {
                if (settings.DeleteAfterProcessing)
                {
                    await folder.AddFlagsAsync(processedUids, MessageFlags.Deleted, true, ct);
                    await folder.ExpungeAsync(ct);
                    _logger.LogInformation("已刪除 {Count} 封已處理的退信", processedUids.Count);
                }
                else if (processedFolder != null)
                {
                    await folder.MoveToAsync(processedUids, processedFolder, ct);
                    _logger.LogInformation("已移動 {Count} 封已處理的退信到 {Folder}",
                        processedUids.Count, settings.MoveToFolder);
                }
            }

            await client.DisconnectAsync(true, ct);

            _logger.LogInformation("退信處理完成: 找到={Total}, 處理={Processed}, 跳過={Skipped}, 錯誤={Errors}",
                result.TotalFound, result.ProcessedCount, result.SkippedCount, result.ErrorCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "退信處理服務發生錯誤");
            result.Error = ex.Message;
        }

        return result;
    }

    private async Task<bool> ProcessBounceMessageAsync(MimeMessage message, CancellationToken ct)
    {
        var bounceInfo = ParseBounceMessage(message);
        if (bounceInfo == null)
        {
            _logger.LogDebug("無法解析退信: {Subject}", message.Subject);
            return false;
        }

        if (!IsFromOurSystem(bounceInfo.OriginalMessageId))
        {
            _logger.LogDebug("非本系統郵件: {MessageId}", bounceInfo.OriginalMessageId);
            return false;
        }

        MailLog? mailLog = null;

        if (!string.IsNullOrEmpty(bounceInfo.OriginalMessageId))
        {
            mailLog = await _context.MailLogs
                .FirstOrDefaultAsync(m => m.MessageId == bounceInfo.OriginalMessageId, ct);
        }

        if (mailLog == null && !string.IsNullOrEmpty(bounceInfo.FinalRecipient))
        {
            var cutoff = DateTime.UtcNow.AddDays(-7);
            mailLog = await _context.MailLogs
                .Where(m => m.Receivers != null &&
                            m.Receivers.Contains(bounceInfo.FinalRecipient) &&
                            m.SentAtUtc >= cutoff &&
                            m.BounceStatus == MailBounceStatus.None)
                .OrderByDescending(m => m.SentAtUtc)
                .FirstOrDefaultAsync(ct);
        }

        if (mailLog == null)
        {
            _logger.LogDebug("找不到對應的郵件記錄: {Recipient}", bounceInfo.FinalRecipient);
            return false;
        }

        if (mailLog.BounceStatus != MailBounceStatus.None)
        {
            _logger.LogDebug("郵件已標記為退信: {Id}", mailLog.Id);
            return true;
        }

        mailLog.BounceStatus = bounceInfo.IsHardBounce ? MailBounceStatus.HardBounce : MailBounceStatus.SoftBounce;
        mailLog.BounceCode = bounceInfo.StatusCode;
        mailLog.BounceReason = bounceInfo.DiagnosticCode;
        mailLog.BounceAtUtc = bounceInfo.ArrivalDate ?? DateTime.UtcNow;
        mailLog.RemoteMta = bounceInfo.RemoteMta;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("已記錄退信: MailLogId={Id}, Recipient={Recipient}, Code={Code}",
            mailLog.Id, bounceInfo.FinalRecipient, bounceInfo.StatusCode);

        return true;
    }

    private BounceInfo? ParseBounceMessage(MimeMessage message)
    {
        var info = new BounceInfo { ArrivalDate = message.Date.UtcDateTime };

        foreach (var part in message.BodyParts)
        {
            if (part is MessageDeliveryStatus deliveryStatus)
            {
                foreach (var group in deliveryStatus.StatusGroups)
                {
                    foreach (var header in group)
                    {
                        switch (header.Field.ToLower())
                        {
                            case "final-recipient":
                                var recipientValue = header.Value;
                                if (recipientValue.StartsWith("rfc822;", StringComparison.OrdinalIgnoreCase))
                                    recipientValue = recipientValue.Substring(7).Trim();
                                info.FinalRecipient = recipientValue;
                                break;
                            case "status":
                                info.StatusCode = header.Value.Trim();
                                break;
                            case "remote-mta":
                                var mtaValue = header.Value;
                                if (mtaValue.StartsWith("dns;", StringComparison.OrdinalIgnoreCase))
                                    mtaValue = mtaValue.Substring(4).Trim();
                                info.RemoteMta = mtaValue;
                                break;
                            case "diagnostic-code":
                                info.DiagnosticCode = header.Value.Trim();
                                break;
                            case "original-message-id":
                                info.OriginalMessageId = header.Value.Trim();
                                break;
                        }
                    }
                }
            }
            else if (part is MessagePart messagePart)
            {
                var originalMessage = messagePart.Message;
                if (originalMessage != null && string.IsNullOrEmpty(info.OriginalMessageId))
                {
                    info.OriginalMessageId = originalMessage.MessageId;
                    if (!string.IsNullOrEmpty(originalMessage.MessageId) && !originalMessage.MessageId.StartsWith("<"))
                    {
                        info.OriginalMessageId = $"<{originalMessage.MessageId}>";
                    }
                }
            }
        }

        if (string.IsNullOrEmpty(info.FinalRecipient))
        {
            var textBody = message.TextBody ?? message.HtmlBody ?? "";
            info = ParseFromTextContent(textBody, info);
        }

        info.IsHardBounce = info.StatusCode?.StartsWith("5") ??
                           info.DiagnosticCode?.Contains("5.") ?? false;

        if (string.IsNullOrEmpty(info.FinalRecipient))
            return null;

        return info;
    }

    private BounceInfo ParseFromTextContent(string content, BounceInfo info)
    {
        if (string.IsNullOrEmpty(info.FinalRecipient))
        {
            var recipientMatch = Regex.Match(content,
                @"(?:Final-Recipient|To|Recipient):\s*(?:RFC822;|rfc822;)?\s*<?([^\s<>\r\n]+@[^\s<>\r\n]+)>?",
                RegexOptions.IgnoreCase);
            if (recipientMatch.Success)
                info.FinalRecipient = recipientMatch.Groups[1].Value.Trim();
        }

        if (string.IsNullOrEmpty(info.StatusCode))
        {
            var statusMatch = Regex.Match(content, @"Status:\s*(\d+\.\d+\.\d+)", RegexOptions.IgnoreCase);
            if (statusMatch.Success)
                info.StatusCode = statusMatch.Groups[1].Value;
        }

        if (string.IsNullOrEmpty(info.RemoteMta))
        {
            var mtaMatch = Regex.Match(content,
                @"Remote-MTA:\s*(?:DNS;|dns;)?\s*([^\s\r\n]+)",
                RegexOptions.IgnoreCase);
            if (mtaMatch.Success)
                info.RemoteMta = mtaMatch.Groups[1].Value.Trim();
        }

        if (string.IsNullOrEmpty(info.DiagnosticCode))
        {
            var diagMatch = Regex.Match(content,
                @"Diagnostic-Code:\s*(?:SMTP;)?\s*(.+?)(?=\r?\n[A-Z]|\r?\n\r?\n|$)",
                RegexOptions.IgnoreCase | RegexOptions.Singleline);
            if (diagMatch.Success)
                info.DiagnosticCode = diagMatch.Groups[1].Value.Trim()
                    .Replace("\r\n", " ").Replace("\n", " ");
        }

        if (string.IsNullOrEmpty(info.OriginalMessageId))
        {
            var msgIdMatch = Regex.Match(content,
                @"(?:Original-)?Message-ID:\s*(<[^>]+\.kpi@[^>]+>)",
                RegexOptions.IgnoreCase);
            if (msgIdMatch.Success)
                info.OriginalMessageId = msgIdMatch.Groups[1].Value;
        }

        return info;
    }

    private bool IsFromOurSystem(string? messageId)
    {
        if (string.IsNullOrEmpty(messageId))
            return false;

        return messageId.Contains(".kpi@", StringComparison.OrdinalIgnoreCase);
    }

    private class BounceInfo
    {
        public string? FinalRecipient { get; set; }
        public string? StatusCode { get; set; }
        public string? RemoteMta { get; set; }
        public string? DiagnosticCode { get; set; }
        public string? OriginalMessageId { get; set; }
        public DateTime? ArrivalDate { get; set; }
        public bool IsHardBounce { get; set; }
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Entities;
using WebAPI1.Services;

namespace WebAPI1.Controllers;

/// <summary>
/// 郵件系統管理：測試寄信、查詢寄信紀錄、測試退信監控（IMAP）連線。
/// 只回報「跟自家 mail relay 對話」這段的即時結果／已知的退信通知，看不到 relay 收下信
/// 之後、送到收件人信箱這段路的即時進度（沒收到退信不代表已送達，只是還沒偵測到失敗）。
/// </summary>
[Authorize]
[Route("[controller]")]
public class MailAdminController : ControllerBase
{
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ISHAuditDbcontext _db;
    private readonly BounceProcessingService _bounceService;

    public MailAdminController(
        IEmailService emailService,
        IConfiguration configuration,
        ISHAuditDbcontext db,
        BounceProcessingService bounceService)
    {
        _emailService = emailService;
        _configuration = configuration;
        _db = db;
        _bounceService = bounceService;
    }

    public record TestSendRequest(string ToEmail);

    /// <summary>寄一封測試信，立即回報這次寄送的結果（成功／失敗與原因）</summary>
    [HttpPost("test-send")]
    public async Task<IActionResult> TestSend([FromBody] TestSendRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ToEmail))
            return BadRequest(new { error = "收件人信箱為必填" });

        try
        {
            await _emailService.SendEmailAsync(new EmailOption
            {
                To = request.ToEmail,
                Subject = "[測試信] 郵件系統連線測試",
                Body = $"<p>這是一封測試信，確認寄信功能可以正常連線、驗證、寄出。</p><p>寄送時間：{tool.GetTaiwanNow():yyyy-MM-dd HH:mm:ss}</p>",
                MailType = "Test",
            });

            var mailLog = await _db.MailLogs
                .Where(m => m.Receivers != null && m.Receivers.Contains(request.ToEmail))
                .OrderByDescending(m => m.SentAtUtc)
                .FirstOrDefaultAsync(ct);

            return Ok(new
            {
                success = true,
                message = "測試信已成功交給 mail relay，relay 收下不代表已送達收件人信箱，請至收件匣確認",
                mailLogId = mailLog?.Id,
            });
        }
        catch (EmailServiceException ex)
        {
            var mailLog = await _db.MailLogs
                .Where(m => m.Receivers != null && m.Receivers.Contains(request.ToEmail))
                .OrderByDescending(m => m.SentAtUtc)
                .FirstOrDefaultAsync(ct);

            return Ok(new
            {
                success = false,
                message = ex.InnerException?.Message ?? ex.Message,
                mailLogId = mailLog?.Id,
            });
        }
    }

    public class MailLogQueryParameters
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? Search { get; set; }
        public string? MailType { get; set; }
        public bool? IsSuccess { get; set; }
        public int? BounceStatus { get; set; }
        public bool? BouncedOnly { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }

    /// <summary>分頁查詢寄信紀錄</summary>
    [HttpGet("logs")]
    public async Task<IActionResult> GetMailLogs([FromQuery] MailLogQueryParameters parameters, CancellationToken ct)
    {
        var query = _db.MailLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(parameters.Search))
            query = query.Where(l =>
                (l.Receivers != null && l.Receivers.Contains(parameters.Search)) ||
                (l.Subject != null && l.Subject.Contains(parameters.Search)));

        if (!string.IsNullOrWhiteSpace(parameters.MailType))
            query = query.Where(l => l.MailType == parameters.MailType);

        if (parameters.IsSuccess.HasValue)
            query = query.Where(l => l.IsSuccess == parameters.IsSuccess.Value);

        if (parameters.BounceStatus.HasValue)
            query = query.Where(l => (int)l.BounceStatus == parameters.BounceStatus.Value);
        else if (parameters.BouncedOnly == true)
            query = query.Where(l => l.BounceStatus != MailBounceStatus.None);

        if (parameters.DateFrom.HasValue)
            query = query.Where(l => l.SentAtUtc >= parameters.DateFrom.Value);

        if (parameters.DateTo.HasValue)
            query = query.Where(l => l.SentAtUtc <= parameters.DateTo.Value);

        var totalCount = await query.CountAsync(ct);

        var page = Math.Max(1, parameters.Page);
        var pageSize = Math.Clamp(parameters.PageSize, 1, 200);

        var items = await query
            .OrderByDescending(l => l.SentAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(l => new
            {
                l.Id,
                l.Subject,
                l.Receivers,
                l.ReceiverCount,
                l.MailType,
                l.IsSuccess,
                l.ErrorMessage,
                l.SentAtUtc,
                l.MessageId,
                BounceStatus = (int)l.BounceStatus,
                BounceStatusText = l.BounceStatus == MailBounceStatus.None ? null :
                    l.BounceStatus == MailBounceStatus.HardBounce ? "硬退信" : "軟退信",
                l.BounceCode,
                l.BounceReason,
                l.BounceAtUtc,
            })
            .ToListAsync(ct);

        return Ok(new { items, totalCount, page, pageSize });
    }

    /// <summary>查詢單筆寄信紀錄詳情（含完整內容）</summary>
    [HttpGet("logs/{id:long}")]
    public async Task<IActionResult> GetMailLogById(long id, CancellationToken ct)
    {
        var log = await _db.MailLogs
            .Where(l => l.Id == id)
            .Select(l => new
            {
                l.Id,
                l.Subject,
                l.Receivers,
                l.ReceiverCount,
                l.Content,
                l.MailType,
                l.IsSuccess,
                l.ErrorMessage,
                l.SentAtUtc,
                l.MessageId,
                BounceStatus = (int)l.BounceStatus,
                BounceStatusText = l.BounceStatus == MailBounceStatus.None ? null :
                    l.BounceStatus == MailBounceStatus.HardBounce ? "硬退信" : "軟退信",
                l.BounceCode,
                l.BounceReason,
                l.BounceAtUtc,
                l.RemoteMta,
            })
            .FirstOrDefaultAsync(ct);

        if (log == null) return NotFound(new { error = "找不到這筆寄信紀錄" });
        return Ok(log);
    }

    /// <summary>測試目前設定的退信監控 IMAP 連線是否正常（不影響 BounceMail_Setting:Enabled 的實際狀態）</summary>
    [HttpPost("bounce-settings/test-connection")]
    public async Task<IActionResult> TestImapConnection(CancellationToken ct)
    {
        var settings = BounceMailSettings.FromConfiguration(_configuration);

        try
        {
            using var client = new MailKit.Net.Imap.ImapClient();
            await client.ConnectAsync(settings.ImapServer, settings.ImapPort, settings.UseSsl, ct);
            await client.AuthenticateAsync(settings.Username, settings.Password, ct);

            var inbox = client.Inbox;
            await inbox.OpenAsync(MailKit.FolderAccess.ReadOnly, ct);
            var messageCount = inbox.Count;

            await client.DisconnectAsync(true, ct);

            return Ok(new { success = true, message = "IMAP 連線成功", messageCount });
        }
        catch (Exception ex)
        {
            return Ok(new { success = false, message = $"IMAP 連線失敗：{ex.Message}" });
        }
    }

    /// <summary>手動立即跑一次退信檢查（不用等背景排程的間隔）</summary>
    [HttpPost("bounce-settings/run-now")]
    public async Task<IActionResult> RunBounceCheckNow(CancellationToken ct)
    {
        var settings = BounceMailSettings.FromConfiguration(_configuration);
        if (!settings.Enabled)
            return BadRequest(new { error = "退信監控目前未啟用（BounceMail_Setting:Enabled=false）" });

        var result = await _bounceService.ProcessBouncesAsync(settings, ct);
        return Ok(new
        {
            success = result.Success,
            error = result.Error,
            totalFound = result.TotalFound,
            processedCount = result.ProcessedCount,
            skippedCount = result.SkippedCount,
            errorCount = result.ErrorCount,
        });
    }
}

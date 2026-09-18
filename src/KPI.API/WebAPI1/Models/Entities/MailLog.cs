using WebAPI1.Services;

namespace WebAPI1.Entities;

/// <summary>
/// 郵件發送紀錄。每次呼叫 EmailService 寄信都會寫一筆，先記錄「有沒有交出去給 SMTP
/// relay」的即時結果；退信狀態則是由 BounceProcessingBackgroundService 定期輪詢 IMAP
/// 信箱、比對 Message-ID 之後才回填的，兩者是不同時間點更新的。
/// </summary>
public class MailLog
{
    public long Id { get; set; }
    public DateTime SentAtUtc { get; set; } = tool.GetTaiwanNow();

    /// <summary>收件人（逗號分隔，含 CC/BCC）</summary>
    public string? Receivers { get; set; }
    public int ReceiverCount { get; set; }
    public string? Subject { get; set; }
    public string? Content { get; set; }

    /// <summary>郵件類型（e.g. VerificationCode, PasswordReset, Reminder, Test）</summary>
    public string? MailType { get; set; }

    /// <summary>SMTP relay 是否接受這封信（不代表送達收件人信箱）</summary>
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }

    /// <summary>寄信時產生的 Message-ID，用來比對退信通知（DSN）是哪一封信的</summary>
    public string? MessageId { get; set; }

    public MailBounceStatus BounceStatus { get; set; } = MailBounceStatus.None;
    public string? BounceReason { get; set; }
    public DateTime? BounceAtUtc { get; set; }
    public string? BounceCode { get; set; }
    public string? RemoteMta { get; set; }
}

/// <summary>退信狀態</summary>
public enum MailBounceStatus
{
    /// <summary>目前沒有收到退信通知（不代表已送達，只是還沒偵測到失敗）</summary>
    None = 0,

    /// <summary>硬退信：永久性失敗（如信箱不存在）</summary>
    HardBounce = 1,

    /// <summary>軟退信：暫時性失敗（如信箱已滿）</summary>
    SoftBounce = 2,
}

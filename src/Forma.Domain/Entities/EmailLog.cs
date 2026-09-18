namespace Forma.Domain.Entities;

/// <summary>
/// 郵件發送日誌
/// </summary>
public class EmailLog
{
    /// <summary>
    /// 主鍵
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// 收件者 Email
    /// </summary>
    public string RecipientEmail { get; set; } = string.Empty;

    /// <summary>
    /// 收件者名稱
    /// </summary>
    public string? RecipientName { get; set; }

    /// <summary>
    /// 郵件主旨
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// 使用的範本 Key
    /// </summary>
    public string? TemplateKey { get; set; }

    /// <summary>
    /// 是否成功
    /// </summary>
    public bool IsSuccess { get; set; }

    /// <summary>
    /// 錯誤訊息
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// 發送時間
    /// </summary>
    public DateTime SentAt { get; set; }

    /// <summary>
    /// 觸發使用者 ID
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// 觸發使用者名稱
    /// </summary>
    public string? UserName { get; set; }
}

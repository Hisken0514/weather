namespace Forma.Application.Features.Logs.DTOs;

/// <summary>
/// 郵件日誌 DTO
/// </summary>
public class EmailLogDto
{
    public long Id { get; set; }
    public string RecipientEmail { get; set; } = string.Empty;
    public string? RecipientName { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? TemplateKey { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime SentAt { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
}

/// <summary>
/// 郵件日誌查詢參數
/// </summary>
public class EmailLogQueryParameters
{
    /// <summary>
    /// 頁碼（從 1 開始）
    /// </summary>
    public int PageNumber { get; set; } = 1;

    /// <summary>
    /// 每頁筆數
    /// </summary>
    public int PageSize { get; set; } = 20;

    /// <summary>
    /// 搜尋關鍵字
    /// </summary>
    public string? SearchTerm { get; set; }

    /// <summary>
    /// 範本 Key 篩選
    /// </summary>
    public string? TemplateKey { get; set; }

    /// <summary>
    /// 是否成功篩選
    /// </summary>
    public bool? IsSuccess { get; set; }

    /// <summary>
    /// 開始日期
    /// </summary>
    public DateOnly? StartDate { get; set; }

    /// <summary>
    /// 結束日期
    /// </summary>
    public DateOnly? EndDate { get; set; }

    /// <summary>
    /// 排序欄位
    /// </summary>
    public string? SortBy { get; set; }

    /// <summary>
    /// 是否降序
    /// </summary>
    public bool SortDescending { get; set; } = true;
}

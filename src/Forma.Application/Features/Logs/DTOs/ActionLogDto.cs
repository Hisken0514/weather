namespace Forma.Application.Features.Logs.DTOs;

/// <summary>
/// 操作日誌 DTO
/// </summary>
public class ActionLogDto
{
    /// <summary>
    /// 主鍵
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// 動作類型 (Create, Update, Delete, Login, Logout 等)
    /// </summary>
    public string? ActionType { get; set; }

    /// <summary>
    /// 動作名稱（中文描述）
    /// </summary>
    public string? ActionName { get; set; }

    /// <summary>
    /// 使用者 ID
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string? UserName { get; set; }

    /// <summary>
    /// 實體類型
    /// </summary>
    public string? EntityType { get; set; }

    /// <summary>
    /// 實體 ID
    /// </summary>
    public string? EntityId { get; set; }

    /// <summary>
    /// 實體名稱
    /// </summary>
    public string? EntityName { get; set; }

    /// <summary>
    /// 描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// IP 位址
    /// </summary>
    public string? IpAddress { get; set; }

    /// <summary>
    /// User Agent
    /// </summary>
    public string? UserAgent { get; set; }

    /// <summary>
    /// 是否成功
    /// </summary>
    public bool IsSuccess { get; set; }

    /// <summary>
    /// 錯誤訊息
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// 執行時間（毫秒）
    /// </summary>
    public long? ExecutionDuration { get; set; }

    /// <summary>
    /// 建立時間
    /// </summary>
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// 操作日誌查詢參數
/// </summary>
public class ActionLogQueryParameters
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
    public string? Search { get; set; }

    /// <summary>
    /// 使用者 ID 篩選
    /// </summary>
    public string? UserId { get; set; }

    /// <summary>
    /// 動作類型篩選
    /// </summary>
    public string? ActionType { get; set; }

    /// <summary>
    /// 開始日期
    /// </summary>
    public DateOnly? StartDate { get; set; }

    /// <summary>
    /// 結束日期
    /// </summary>
    public DateOnly? EndDate { get; set; }

    /// <summary>
    /// 是否降序排列（預設 true）
    /// </summary>
    public bool Descending { get; set; } = true;
}

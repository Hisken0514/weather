namespace Forma.Application.Features.Logs.DTOs;

/// <summary>
/// 操作日誌統計資料
/// </summary>
public class ActionLogStatisticsDto
{
    /// <summary>
    /// 總操作數
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// 成功操作數
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// 失敗操作數
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// 平均執行時間（毫秒）
    /// </summary>
    public double AvgExecutionDuration { get; set; }

    /// <summary>
    /// 操作類型分佈 (Create, Update, Delete, Login 等)
    /// </summary>
    public Dictionary<string, int> ActionTypeDistribution { get; set; } = new();

    /// <summary>
    /// 實體類型分佈 (Form, Project, User 等)
    /// </summary>
    public Dictionary<string, int> EntityTypeDistribution { get; set; } = new();

    /// <summary>
    /// 每日趨勢資料
    /// </summary>
    public List<ActionLogDailyTrendItem> DailyTrend { get; set; } = new();
}

/// <summary>
/// 操作日誌每日趨勢項目
/// </summary>
public class ActionLogDailyTrendItem
{
    /// <summary>
    /// 日期
    /// </summary>
    public DateOnly Date { get; set; }

    /// <summary>
    /// 總操作數
    /// </summary>
    public int Total { get; set; }

    /// <summary>
    /// 成功數
    /// </summary>
    public int Success { get; set; }

    /// <summary>
    /// 失敗數
    /// </summary>
    public int Failure { get; set; }
}

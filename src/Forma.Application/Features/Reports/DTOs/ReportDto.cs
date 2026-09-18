namespace Forma.Application.Features.Reports.DTOs;

/// <summary>
/// 報告 DTO
/// </summary>
public class ReportDto
{
    public Guid FormId { get; set; }
    public string FormName { get; set; } = string.Empty;
    public int TotalSubmissions { get; set; }
    public int SubmittedCount { get; set; }
    public int DraftCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public DateTime? FirstSubmissionAt { get; set; }
    public DateTime? LastSubmissionAt { get; set; }
    public List<DailySubmissionStat> DailyStats { get; set; } = new();
    public List<FieldSummary> FieldSummaries { get; set; } = new();
}

/// <summary>
/// 每日提交統計
/// </summary>
public class DailySubmissionStat
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
}

/// <summary>
/// 欄位摘要
/// </summary>
public class FieldSummary
{
    public string FieldName { get; set; } = string.Empty;
    public string FieldType { get; set; } = string.Empty;
    public int ResponseCount { get; set; }
    public Dictionary<string, int>? ValueDistribution { get; set; }
}

namespace Forma.Application.Features.Supervision.DTOs;

public class CampaignMapFactoryDto
{
    public Guid SupervisedFactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public string? County { get; set; }
    public string? Address { get; set; }
    public string? IndustrialPark { get; set; }
    public double? Lat { get; set; }
    public double? Lng { get; set; }
    public int? RiskRank { get; set; }
    /// <summary>0–100，由 RiskRank 正規化而來；無排名者預設 50</summary>
    public int RiskScore { get; set; }
    /// <summary>套用評分標準算出來的原始風險分數（hazardSeverityScore × managementRiskScore），未正規化；無排名資料時為 null</summary>
    public decimal? RawRiskScore { get; set; }
}

public class CampaignDto
{
    public Guid Id { get; set; }
    public int Year { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int FactoryCount { get; set; }
    public int TaskCount { get; set; }
    public int CompletedTaskCount { get; set; }
    /// <summary>此督導計畫自動建立的 Forma 表單計畫 ID（用於直接管理表單）</summary>
    public Guid? FormProjectId { get; set; }
}

public record TaskResetPreviewItem(
    Guid TaskId,
    string FactoryName,
    string? FactoryRegistrationNo,
    string FormTypeName,
    string AgencyName,
    string Status,
    string? SubmittedByUsername,
    DateTime? SubmittedAt
);

public class SupervisionTaskDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;

    // 業者資訊
    public Guid FactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public string? IndustrialPark { get; set; }
    public string? Region { get; set; }
    public string? County { get; set; }
    public int? RiskRank { get; set; }

    // 表單資訊
    public string FormTypeName { get; set; } = string.Empty;
    public Guid? FormId { get; set; }
    public Guid? SubmissionId { get; set; }

    // 機關資訊
    public Guid AgencyId { get; set; }
    public string AgencyName { get; set; } = string.Empty;

    public DateTime? CompletedAt { get; set; }

    // 填寫人資訊（來自 FormSubmission）
    public string? SubmittedByUsername { get; set; }
    public DateTime? SubmittedAt { get; set; }

    // 所屬計畫
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public int CampaignYear { get; set; }
}

public class CampaignProgressDto
{
    public Guid CampaignId { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    public int Year { get; set; }
    public int TotalFactories { get; set; }
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int PendingTasks { get; set; }
    public double CompletionRate { get; set; }
    public List<AgencyProgressDto> ByAgency { get; set; } = new();
}

public class AgencyProgressDto
{
    public Guid AgencyId { get; set; }
    public string AgencyName { get; set; } = string.Empty;
    public int TotalTasks { get; set; }
    public int CompletedTasks { get; set; }
    public double CompletionRate { get; set; }
}

/// <summary>計畫內有督導任務的機關（distinct，不受分頁筆數限制，給下拉選單用）</summary>
public record SupervisionAgencyOptionDto(Guid Id, string Name);

public class ImportResult
{
    public bool Success { get; set; }
    public int FactoriesImported { get; set; }
    public int TasksCreated { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class SupervisionResponseDto
{
    public Guid TaskId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public string AgencyName { get; set; } = string.Empty;
    public string? Region { get; set; }
    public string? County { get; set; }
    public string? IndustrialPark { get; set; }
    public string FormTypeName { get; set; } = string.Empty;
    public Guid? FormId { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public string? SubmittedByUsername { get; set; }
    /// <summary>欄位名稱 → 填寫值（已從 SubmissionData.data 解包）</summary>
    public Dictionary<string, object?> Data { get; set; } = new();
}

// ─── Campaign Factory Summary（依工廠為主體，彙整各表單的督導結果）────────

public class FactorySupervisionSummaryDto
{
    public Guid FactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryRegistrationNo { get; set; }
    public string? Region { get; set; }
    public string? County { get; set; }
    public string? IndustrialPark { get; set; }
    /// <summary>表單類型名稱 → 督導結果（該表單「督導結果」欄位的選項文字；未指派/未填寫時是固定文案）</summary>
    public Dictionary<string, string> Results { get; set; } = new();
}

public class CampaignFactorySummaryDto
{
    /// <summary>此計畫內實際用到的表單類型名稱清單（依出現順序），對應每個工廠 Results 的 key</summary>
    public List<string> FormTypeNames { get; set; } = new();
    public List<FactorySupervisionSummaryDto> Items { get; set; } = new();
}

// ─── Paged My-Tasks Response ──────────────────────────────

public class PagedMyTasksResponse
{
    public List<SupervisionTaskDto> Items { get; set; } = new();
    public int Total { get; set; }
    public int Pending { get; set; }
    public int InProgress { get; set; }
    public int Completed { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

// ─── Factory DTOs ─────────────────────────────────────────

public class SupervisedFactoryDto
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public int? RiskRank { get; set; }
    public string? FactoryRegistrationNo { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryAddress { get; set; }
    public string? IndustryCategory { get; set; }
    public string? IndustrialPark { get; set; }
    public string? Region { get; set; }
    public string? County { get; set; }
    public int TaskCount { get; set; }
    public int CompletedTaskCount { get; set; }
}

public class CreateFactoryRequest
{
    public int? RiskRank { get; set; }
    public string? FactoryRegistrationNo { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryAddress { get; set; }
    public string? IndustryCategory { get; set; }
    public string? IndustrialPark { get; set; }
    public string? Region { get; set; }
    public string? County { get; set; }
}

public class UpdateFactoryRequest
{
    public int? RiskRank { get; set; }
    public string? FactoryRegistrationNo { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryAddress { get; set; }
    public string? IndustryCategory { get; set; }
    public string? IndustrialPark { get; set; }
    public string? Region { get; set; }
    public string? County { get; set; }
}

/// <summary>一筆缺登記編號的工廠管理資料，以及依名稱在 FactoryMaster（全台工廠主資料）比對到的候選項</summary>
public class FactoryRegistrationNoSuggestionDto
{
    public Guid FactoryId { get; set; }
    public string FactoryName { get; set; } = string.Empty;
    public string? FactoryAddress { get; set; }
    public int CampaignYear { get; set; }
    public string CampaignName { get; set; } = string.Empty;
    /// <summary>依名稱完全比對到的候選項，可能 0 筆（找不到）、1 筆（高信心）、或多筆（需要人工挑選）</summary>
    public List<FactoryMasterCandidateDto> Candidates { get; set; } = new();
}

public class FactoryMasterCandidateDto
{
    public string FactoryRegistrationNo { get; set; } = string.Empty;
    public string FactoryName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? County { get; set; }
}

public class ApplyRegistrationNoRequest
{
    public string RegistrationNo { get; set; } = string.Empty;
}

public class BindFactoryResult
{
    public int TasksCreated { get; set; }
}

public class UnbindFactoryResult
{
    public int TasksRemoved { get; set; }
}

// Request DTOs
public class CreateCampaignRequest
{
    public int Year { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateCampaignRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
}

    

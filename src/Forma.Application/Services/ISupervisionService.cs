using Forma.Application.Features.Supervision.DTOs;

namespace Forma.Application.Services;

public interface ISupervisionService
{
    // 年度督導計畫
    Task<List<CampaignDto>> GetCampaignsAsync(CancellationToken ct = default);
    Task<CampaignDto> GetCampaignByIdAsync(Guid id, CancellationToken ct = default);
    Task<Guid> CreateCampaignAsync(CreateCampaignRequest request, Guid createdById, CancellationToken ct = default);
    Task<CampaignDto> UpdateCampaignAsync(Guid id, UpdateCampaignRequest request, CancellationToken ct = default);
    Task DeleteCampaignAsync(Guid id, CancellationToken ct = default);

    // Excel 匯入
    Task<ImportResult> ImportFactoriesFromExcelAsync(Guid campaignId, Stream excelStream, CancellationToken ct = default);

    // 督導任務查詢（機關使用者用；isAdmin = true 時傳回全部任務）
    Task<List<SupervisionTaskDto>> GetMyTasksAsync(Guid userId, Guid? campaignId, bool isAdmin = false, CancellationToken ct = default);

    // 督導任務查詢（分頁版本）
    Task<PagedMyTasksResponse> GetMyTasksPagedAsync(
        Guid userId, Guid? campaignId, bool isAdmin,
        int page, int pageSize,
        string? status, string? search, Guid? agencyId,
        CancellationToken ct = default);

    // 督導任務查詢（Admin 用，可看全部）
    Task<CampaignProgressDto> GetCampaignProgressAsync(Guid campaignId, CancellationToken ct = default);

    // 更新督導任務狀態（連結 Submission）
    Task LinkSubmissionAsync(Guid taskId, Guid submissionId, CancellationToken ct = default);

    // 退回督導任務（Admin），重置為待填寫
    Task RejectTaskAsync(Guid taskId, CancellationToken ct = default);

    // 預覽將被重置的任務清單（依計畫 + 選填條件）
    Task<List<TaskResetPreviewItem>> GetResetTasksPreviewAsync(Guid campaignId, Guid? formId, string? factorySearch, string? status, CancellationToken ct = default);

    // 批次重置任務為初始未填寫狀態（依計畫/表單，或精準指定任務 ID）
    Task<int> ResetTasksAsync(Guid? campaignId, Guid? formId, Guid[]? taskIds, CancellationToken ct = default);

    // 取得計畫內所有已完成任務的填寫數據
    Task<List<SupervisionResponseDto>> GetCampaignResponsesAsync(Guid campaignId, Guid? formId, CancellationToken ct = default);

    /// <summary>
    /// 依工廠為主體彙整此計畫的督導結果：每家工廠一列，欄位是計畫內每張表單各自的
    /// 「督導結果」（從表單 schema 裡找 label 為「督導結果」的欄位，再從填寫資料解析選項文字）。
    /// </summary>
    Task<CampaignFactorySummaryDto> GetCampaignFactorySummaryAsync(Guid campaignId, CancellationToken ct = default);

    /// <summary>取得計畫內有督導任務的機關清單（distinct，不受分頁筆數限制）</summary>
    Task<List<SupervisionAgencyOptionDto>> GetCampaignAgenciesAsync(Guid campaignId, CancellationToken ct = default);

    // 同步督導任務的 FormId（將 AgencyFormType 的綁定補回歷史任務）
    Task<int> SyncTaskFormIdsAsync(Guid campaignId, CancellationToken ct = default);

    // ─── 產業園區管理 ───

    /// <summary>取得所有督導計畫中已出現的產業園區名稱（distinct）</summary>
    Task<List<string>> GetDistinctIndustrialParksAsync(CancellationToken ct = default);

    /// <summary>設定使用者綁定的產業園區（替換整組）</summary>
    Task SetUserIndustrialParksAsync(Guid userId, List<string> parkNames, CancellationToken ct = default);

    /// <summary>取得使用者目前綁定的產業園區名稱清單</summary>
    Task<List<string>> GetUserIndustrialParksAsync(Guid userId, CancellationToken ct = default);

    // ─── 地圖資料 ───
    /// <param name="campaignId">督導計畫 ID，只回傳該計畫內的工廠</param>
    /// <param name="userId">當前使用者 ID；若使用者有綁定產業園區，則自動過濾只回傳其園區的工廠</param>
    /// <param name="schemeId">風險評分標準 ID；null 表示使用 active scheme</param>
    /// <param name="dataYear">指定風險資料年度；null 表示使用最新年度</param>
    Task<List<CampaignMapFactoryDto>> GetMapFactoriesAsync(Guid campaignId, Guid userId, Guid? schemeId = null, int? dataYear = null, CancellationToken ct = default);

    /// <summary>不限督導計畫，回傳全台所有有風險資料的工廠（FactoryRiskInputs）</summary>
    Task<List<CampaignMapFactoryDto>> GetAllRiskMapFactoriesAsync(int? dataYear = null, Guid? schemeId = null, CancellationToken ct = default);

    // ─── 工廠管理 ───
    Task<List<SupervisedFactoryDto>> GetFactoriesAsync(Guid campaignId, CancellationToken ct = default);
    Task<SupervisedFactoryDto> GetFactoryByIdAsync(Guid factoryId, CancellationToken ct = default);
    Task<Guid> CreateFactoryAsync(Guid campaignId, CreateFactoryRequest request, CancellationToken ct = default);
    Task<SupervisedFactoryDto> UpdateFactoryAsync(Guid factoryId, UpdateFactoryRequest request, CancellationToken ct = default);
    Task DeleteFactoryAsync(Guid factoryId, CancellationToken ct = default);

    /// <summary>找出所有缺登記編號的工廠管理資料，依名稱在 FactoryMaster 比對可能的候選項，給人工確認補登記編號用</summary>
    Task<List<FactoryRegistrationNoSuggestionDto>> GetRegistrationNoSuggestionsAsync(CancellationToken ct = default);

    /// <summary>人工確認後補上登記編號，並觸發全資料庫工廠名稱同步</summary>
    Task ApplyRegistrationNoAsync(Guid factoryId, string registrationNo, CancellationToken ct = default);

    // ─── 機關綁定工廠 ───
    Task<List<SupervisedFactoryDto>> GetAgencyFactoriesAsync(Guid agencyId, Guid campaignId, CancellationToken ct = default);
    Task<BindFactoryResult> BindFactoryToAgencyAsync(Guid agencyId, Guid factoryId, CancellationToken ct = default);
    Task<UnbindFactoryResult> UnbindFactoryFromAgencyAsync(Guid agencyId, Guid factoryId, CancellationToken ct = default);
    
    // ─── 風險工廠排行資料 ───
    Task<List<CampaignMapFactoryDto>> GetRiskRanks(Guid campaignId, Guid schemeId, CancellationToken ct = default);

    /// <summary>取得計畫內所有工廠的登記編號集合（供外部過濾排名用）</summary>
    Task<HashSet<string>> GetCampaignFactoryRegNosAsync(Guid campaignId, CancellationToken ct = default);
}

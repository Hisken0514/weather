using Forma.Application.Features.Supervision.DTOs;

namespace Forma.Application.Services;

/// <summary>
/// 督導第二輪：工廠改善回覆與機關複查登打（含公開連結與登入雙軌）
/// </summary>
public interface ISupervisionReplyService
{
    // ── Admin：連結管理 ──
    Task<GenerateTokensResult> GenerateFactoryTokensAsync(Guid campaignId, CancellationToken ct = default);
    Task<GenerateTokensResult> GenerateAgencyTokensAsync(Guid campaignId, CancellationToken ct = default);
    Task<PagedFactoryTokenLinksResponse> GetFactoryTokenLinksAsync(
        Guid campaignId, int page, int pageSize, string? search, CancellationToken ct = default);
    Task<PagedAgencyTokenLinksResponse> GetAgencyTokenLinksAsync(
        Guid campaignId, int page, int pageSize, string? search, CancellationToken ct = default);
    Task RevokeFactoryTokenAsync(Guid factoryId, CancellationToken ct = default);
    Task<RegenerateTokenResult> RegenerateFactoryTokenAsync(Guid factoryId, CancellationToken ct = default);
    Task RevokeAgencyTokenAsync(Guid campaignId, Guid agencyId, CancellationToken ct = default);
    Task<RegenerateTokenResult> RegenerateAgencyTokenAsync(Guid campaignId, Guid agencyId, CancellationToken ct = default);
    Task<RevokeAllTokensResult> RevokeAllFactoryTokensAsync(Guid campaignId, CancellationToken ct = default);
    Task<RevokeAllTokensResult> RevokeAllAgencyTokensAsync(Guid campaignId, CancellationToken ct = default);

    // ── Public（token 範圍限定）──
    Task<FactoryReplyPortalDto> GetFactoryPortalAsync(string token, CancellationToken ct = default);
    Task UpsertFactoryReplyAsync(string token, Guid taskId, UpsertFactoryReplyRequest request, CancellationToken ct = default);
    Task<AgencyReviewPortalDto> GetAgencyPortalAsync(string token, CancellationToken ct = default);
    Task UpsertAgencyReviewByTokenAsync(string token, Guid taskId, UpsertAgencyReviewRequest request, CancellationToken ct = default);

    // ── 登入雙軌（機關使用者/Admin）──
    Task<PagedAgencyReviewTasksResponse> GetMyAgencyReviewTasksAsync(
        Guid userId, bool isAdmin, Guid campaignId,
        int page, int pageSize, string? search,
        bool? factoryReplied, bool? agencyReviewed,
        Guid? factoryId = null,
        CancellationToken ct = default);
    /// <summary>依工廠分組的複查進度清單，分頁 + 搜尋（工廠名稱/登記編號）+ 完成狀態篩選</summary>
    Task<PagedAgencyReviewFactorySummaryResponse> GetMyAgencyReviewFactoriesAsync(
        Guid userId, bool isAdmin, Guid campaignId,
        int page, int pageSize, string? search,
        bool? factoryReplyCompleted = null, bool? agencyReviewCompleted = null, bool? needsReReview = null,
        CancellationToken ct = default);
    Task<AgencyReviewTaskDto> GetMyAgencyReviewForTaskAsync(Guid userId, bool isAdmin, Guid taskId, CancellationToken ct = default);
    Task UpsertAgencyReviewByUserAsync(Guid userId, bool isAdmin, Guid taskId, UpsertAgencyReviewRequest request, CancellationToken ct = default);

    // ── Admin：工廠回覆項目管理 ──
    Task<PagedAdminReplyTaskListResponse> GetAdminReplyTaskListAsync(
        Guid campaignId, int page, int pageSize, string? search, CancellationToken ct = default);
    Task<List<FactoryReplyItemDto>> GetFactoryReplyItemsAsync(Guid taskId, CancellationToken ct = default);
    Task<Guid> CreateFactoryReplyItemAsync(Guid taskId, CreateFactoryReplyItemRequest request, CancellationToken ct = default);
    Task UpdateFactoryReplyItemAsync(Guid itemId, UpdateFactoryReplyItemRequest request, CancellationToken ct = default);
    Task DeleteFactoryReplyItemAsync(Guid itemId, CancellationToken ct = default);
    Task MoveFactoryReplyItemAsync(Guid itemId, bool moveUp, CancellationToken ct = default);
    /// <summary>標記/取消標記任務為「無需改善回覆」。標記為 true 時該任務必須沒有任何改善項目</summary>
    Task SetTaskNoImprovementNeededAsync(Guid taskId, bool value, CancellationToken ct = default);
}

using Forma.Application.Common;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Security;
using Forma.Application.Features.Supervision.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public class SupervisionReplyService : ISupervisionReplyService
{
    private readonly IApplicationDbContext _context;

    public SupervisionReplyService(IApplicationDbContext context)
    {
        _context = context;
    }

    // ─── Admin：連結管理 ──────────────────────────────────────

    public async Task<GenerateTokensResult> GenerateFactoryTokensAsync(Guid campaignId, CancellationToken ct = default)
    {
        _ = await _context.SupervisionCampaigns.FindAsync([campaignId], ct)
            ?? throw new KeyNotFoundException($"督導計畫 {campaignId} 不存在");

        var factoryIds = await _context.SupervisionTasks
            .Where(t => t.Factory.CampaignId == campaignId && t.Status == SupervisionTaskStatus.Completed)
            .Select(t => t.SupervisedFactoryId)
            .Distinct()
            .ToListAsync(ct);

        if (factoryIds.Count == 0) return new GenerateTokensResult { Created = 0 };

        var existingTokens = await _context.FactoryReplyTokens
            .Where(t => factoryIds.Contains(t.SupervisedFactoryId))
            .ToListAsync(ct);
        var existingFactoryIds = existingTokens.Select(t => t.SupervisedFactoryId).ToHashSet();

        var toCreate = factoryIds.Except(existingFactoryIds).ToList();
        var reserved = new HashSet<string>();
        int created = 0;
        foreach (var factoryId in toCreate)
        {
            _context.FactoryReplyTokens.Add(new FactoryReplyToken
            {
                Id = Guid.NewGuid(),
                SupervisedFactoryId = factoryId,
                Token = await GenerateUniqueTokenAsync(reserved, ct),
            });
            created++;
        }

        // 已停用但連結還在的工廠重新啟用（沿用原連結），而不是留著停用狀態不動
        var reactivated = 0;
        foreach (var token in existingTokens.Where(t => t.IsRevoked))
        {
            token.IsRevoked = false;
            token.RevokedAt = null;
            reactivated++;
        }

        if (created > 0 || reactivated > 0) await _context.SaveChangesAsync(ct);
        return new GenerateTokensResult { Created = created, Reactivated = reactivated };
    }

    public async Task<GenerateTokensResult> GenerateAgencyTokensAsync(Guid campaignId, CancellationToken ct = default)
    {
        _ = await _context.SupervisionCampaigns.FindAsync([campaignId], ct)
            ?? throw new KeyNotFoundException($"督導計畫 {campaignId} 不存在");

        var agencyIds = await _context.SupervisionTasks
            .Where(t => t.Factory.CampaignId == campaignId && t.Status == SupervisionTaskStatus.Completed)
            .Select(t => t.AgencyId)
            .Distinct()
            .ToListAsync(ct);

        if (agencyIds.Count == 0) return new GenerateTokensResult { Created = 0 };

        var existingTokens = await _context.AgencyReviewTokens
            .Where(t => t.SupervisionCampaignId == campaignId && agencyIds.Contains(t.AgencyId))
            .ToListAsync(ct);
        var existingAgencyIds = existingTokens.Select(t => t.AgencyId).ToHashSet();

        var toCreate = agencyIds.Except(existingAgencyIds).ToList();
        var reserved = new HashSet<string>();
        int created = 0;
        foreach (var agencyId in toCreate)
        {
            _context.AgencyReviewTokens.Add(new AgencyReviewToken
            {
                Id = Guid.NewGuid(),
                SupervisionCampaignId = campaignId,
                AgencyId = agencyId,
                Token = await GenerateUniqueTokenAsync(reserved, ct),
            });
            created++;
        }

        // 已停用但連結還在的機關重新啟用（沿用原連結），而不是留著停用狀態不動
        var reactivated = 0;
        foreach (var token in existingTokens.Where(t => t.IsRevoked))
        {
            token.IsRevoked = false;
            token.RevokedAt = null;
            reactivated++;
        }

        if (created > 0 || reactivated > 0) await _context.SaveChangesAsync(ct);
        return new GenerateTokensResult { Created = created, Reactivated = reactivated };
    }

    public async Task<PagedFactoryTokenLinksResponse> GetFactoryTokenLinksAsync(
        Guid campaignId, int page, int pageSize, string? search, CancellationToken ct = default)
    {
        var query = _context.FactoryReplyTokens
            .Include(t => t.Factory)
            .Where(t => t.Factory.CampaignId == campaignId)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(t =>
                t.Factory.FactoryName.ToLower().Contains(kw) ||
                (t.Factory.FactoryRegistrationNo != null && t.Factory.FactoryRegistrationNo.ToLower().Contains(kw)));
        }

        var total = await query.CountAsync(ct);

        var tokens = await query
            .OrderBy(t => t.Factory.FactoryName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var factoryIds = tokens.Select(t => t.SupervisedFactoryId).ToList();
        var taskStats = await _context.SupervisionTasks
            .Where(t => factoryIds.Contains(t.SupervisedFactoryId) && t.Status == SupervisionTaskStatus.Completed)
            .Select(t => new { t.SupervisedFactoryId, HasReply = t.FactoryReply != null && t.FactoryReply.SubmittedAt != null })
            .ToListAsync(ct);

        var items = tokens
            .Select(t =>
            {
                var stats = taskStats.Where(s => s.SupervisedFactoryId == t.SupervisedFactoryId).ToList();
                return new FactoryTokenLinkDto
                {
                    FactoryId = t.Factory.Id,
                    FactoryName = t.Factory.FactoryName,
                    FactoryRegistrationNo = t.Factory.FactoryRegistrationNo,
                    Token = t.Token,
                    IsRevoked = t.IsRevoked,
                    TotalCompletedTasks = stats.Count,
                    RepliedTasks = stats.Count(s => s.HasReply),
                    LastAccessedAt = t.LastAccessedAt,
                };
            })
            .ToList();

        return new PagedFactoryTokenLinksResponse { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task<PagedAgencyTokenLinksResponse> GetAgencyTokenLinksAsync(
        Guid campaignId, int page, int pageSize, string? search, CancellationToken ct = default)
    {
        var query = _context.AgencyReviewTokens
            .Include(t => t.Agency)
            .Where(t => t.SupervisionCampaignId == campaignId)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(t => t.Agency.Name.ToLower().Contains(kw));
        }

        var total = await query.CountAsync(ct);

        var tokens = await query
            .OrderBy(t => t.Agency.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var agencyIds = tokens.Select(t => t.AgencyId).ToList();
        var taskStats = await _context.SupervisionTasks
            .Where(t => t.Factory.CampaignId == campaignId && agencyIds.Contains(t.AgencyId) && t.Status == SupervisionTaskStatus.Completed)
            .Select(t => new { t.AgencyId, HasReview = t.AgencyReview != null && t.AgencyReview.SubmittedAt != null })
            .ToListAsync(ct);

        var items = tokens
            .Select(t =>
            {
                var stats = taskStats.Where(s => s.AgencyId == t.AgencyId).ToList();
                return new AgencyTokenLinkDto
                {
                    AgencyId = t.AgencyId,
                    AgencyName = t.Agency.Name,
                    Token = t.Token,
                    IsRevoked = t.IsRevoked,
                    TotalCompletedTasks = stats.Count,
                    ReviewedTasks = stats.Count(s => s.HasReview),
                    LastAccessedAt = t.LastAccessedAt,
                };
            })
            .ToList();

        return new PagedAgencyTokenLinksResponse { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    public async Task RevokeFactoryTokenAsync(Guid factoryId, CancellationToken ct = default)
    {
        var token = await _context.FactoryReplyTokens.FirstOrDefaultAsync(t => t.SupervisedFactoryId == factoryId, ct)
            ?? throw new KeyNotFoundException($"工廠 {factoryId} 尚未產生連結");

        token.IsRevoked = true;
        token.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<RegenerateTokenResult> RegenerateFactoryTokenAsync(Guid factoryId, CancellationToken ct = default)
    {
        var token = await _context.FactoryReplyTokens.FirstOrDefaultAsync(t => t.SupervisedFactoryId == factoryId, ct)
            ?? throw new KeyNotFoundException($"工廠 {factoryId} 尚未產生連結");

        token.Token = await GenerateUniqueTokenAsync(new HashSet<string>(), ct);
        token.IsRevoked = false;
        token.RevokedAt = null;
        await _context.SaveChangesAsync(ct);
        return new RegenerateTokenResult { Token = token.Token };
    }

    public async Task RevokeAgencyTokenAsync(Guid campaignId, Guid agencyId, CancellationToken ct = default)
    {
        var token = await _context.AgencyReviewTokens
            .FirstOrDefaultAsync(t => t.SupervisionCampaignId == campaignId && t.AgencyId == agencyId, ct)
            ?? throw new KeyNotFoundException("尚未產生此機關的連結");

        token.IsRevoked = true;
        token.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<RevokeAllTokensResult> RevokeAllFactoryTokensAsync(Guid campaignId, CancellationToken ct = default)
    {
        var tokens = await _context.FactoryReplyTokens
            .Include(t => t.Factory)
            .Where(t => t.Factory.CampaignId == campaignId && !t.IsRevoked)
            .ToListAsync(ct);

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        if (tokens.Count > 0) await _context.SaveChangesAsync(ct);
        return new RevokeAllTokensResult { Revoked = tokens.Count };
    }

    public async Task<RevokeAllTokensResult> RevokeAllAgencyTokensAsync(Guid campaignId, CancellationToken ct = default)
    {
        var tokens = await _context.AgencyReviewTokens
            .Where(t => t.SupervisionCampaignId == campaignId && !t.IsRevoked)
            .ToListAsync(ct);

        foreach (var token in tokens)
        {
            token.IsRevoked = true;
            token.RevokedAt = DateTime.UtcNow;
        }

        if (tokens.Count > 0) await _context.SaveChangesAsync(ct);
        return new RevokeAllTokensResult { Revoked = tokens.Count };
    }

    public async Task<RegenerateTokenResult> RegenerateAgencyTokenAsync(Guid campaignId, Guid agencyId, CancellationToken ct = default)
    {
        var token = await _context.AgencyReviewTokens
            .FirstOrDefaultAsync(t => t.SupervisionCampaignId == campaignId && t.AgencyId == agencyId, ct)
            ?? throw new KeyNotFoundException("尚未產生此機關的連結");

        token.Token = await GenerateUniqueTokenAsync(new HashSet<string>(), ct);
        token.IsRevoked = false;
        token.RevokedAt = null;
        await _context.SaveChangesAsync(ct);
        return new RegenerateTokenResult { Token = token.Token };
    }

    // ─── Public（token 範圍限定）────────────────────────────────

    public async Task<FactoryReplyPortalDto> GetFactoryPortalAsync(string token, CancellationToken ct = default)
    {
        var tokenEntity = await _context.FactoryReplyTokens
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsRevoked, ct)
            ?? throw new KeyNotFoundException("找不到此連結");

        var factory = await _context.SupervisedFactories
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == tokenEntity.SupervisedFactoryId, ct)
            ?? throw new KeyNotFoundException("找不到此連結");

        var tasks = await _context.SupervisionTasks
            .Include(t => t.Agency)
            .Include(t => t.Form)
            .Include(t => t.Submission)
            .Include(t => t.FactoryReply)
            .Include(t => t.FactoryReplyItems)
            .Where(t => t.SupervisedFactoryId == factory.Id && t.Status == SupervisionTaskStatus.Completed && !t.NoImprovementNeeded)
            .AsNoTracking()
            .OrderBy(t => t.Agency.Name)
            .ToListAsync(ct);

        tokenEntity.LastAccessedAt = DateTime.UtcNow;
        tokenEntity.AccessCount++;
        await _context.SaveChangesAsync(ct);

        return new FactoryReplyPortalDto
        {
            FactoryId = factory.Id,
            FactoryName = factory.FactoryName,
            FactoryRegistrationNo = factory.FactoryRegistrationNo,
            Tasks = tasks.Select(t => new FactoryReplyTaskDto
            {
                TaskId = t.Id,
                AgencyName = t.Agency.Name,
                FormTypeName = t.FormTypeName,
                CompletedAt = t.CompletedAt,
                Reply = ToFactoryReplyDataDto(t.FactoryReply, t.FactoryReplyItems),
                Findings = ToFindingDtos(t),
            }).ToList(),
        };
    }

    public async Task UpsertFactoryReplyAsync(string token, Guid taskId, UpsertFactoryReplyRequest request, CancellationToken ct = default)
    {
        var tokenEntity = await _context.FactoryReplyTokens
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsRevoked, ct)
            ?? throw new KeyNotFoundException("找不到此連結");

        var task = await _context.SupervisionTasks
            .Include(t => t.FactoryReply)
            .Include(t => t.FactoryReplyItems)
            .FirstOrDefaultAsync(t =>
                t.Id == taskId &&
                t.SupervisedFactoryId == tokenEntity.SupervisedFactoryId &&
                t.Status == SupervisionTaskStatus.Completed &&
                !t.NoImprovementNeeded, ct)
            ?? throw new KeyNotFoundException("找不到此督導任務");

        await UpsertFactoryReplyCoreAsync(task, request, ct);
    }

    public async Task<AgencyReviewPortalDto> GetAgencyPortalAsync(string token, CancellationToken ct = default)
    {
        var tokenEntity = await _context.AgencyReviewTokens
            .Include(t => t.Agency)
            .Include(t => t.Campaign)
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsRevoked, ct)
            ?? throw new KeyNotFoundException("找不到此連結");

        var tasks = await _context.SupervisionTasks
            .Include(t => t.Factory)
            .Include(t => t.Agency)
            .Include(t => t.Form)
            .Include(t => t.Submission)
            .Include(t => t.FactoryReply)
            .Include(t => t.FactoryReplyItems)
            .Include(t => t.AgencyReview)
            .Where(t =>
                t.AgencyId == tokenEntity.AgencyId &&
                t.Factory.CampaignId == tokenEntity.SupervisionCampaignId &&
                t.Status == SupervisionTaskStatus.Completed &&
                !t.NoImprovementNeeded)
            .AsNoTracking()
            .OrderBy(t => t.Factory.FactoryName)
            .ToListAsync(ct);

        tokenEntity.LastAccessedAt = DateTime.UtcNow;
        tokenEntity.AccessCount++;
        await _context.SaveChangesAsync(ct);

        return new AgencyReviewPortalDto
        {
            AgencyId = tokenEntity.AgencyId,
            AgencyName = tokenEntity.Agency.Name,
            CampaignId = tokenEntity.SupervisionCampaignId,
            CampaignName = tokenEntity.Campaign.Name,
            Tasks = tasks.Select(ToAgencyReviewTaskDto).ToList(),
        };
    }

    public async Task UpsertAgencyReviewByTokenAsync(string token, Guid taskId, UpsertAgencyReviewRequest request, CancellationToken ct = default)
    {
        var tokenEntity = await _context.AgencyReviewTokens
            .FirstOrDefaultAsync(t => t.Token == token && !t.IsRevoked, ct)
            ?? throw new KeyNotFoundException("找不到此連結");

        var task = await _context.SupervisionTasks
            .Include(t => t.AgencyReview)
            .Include(t => t.FactoryReplyItems)
            .FirstOrDefaultAsync(t =>
                t.Id == taskId &&
                t.AgencyId == tokenEntity.AgencyId &&
                t.Factory.CampaignId == tokenEntity.SupervisionCampaignId &&
                t.Status == SupervisionTaskStatus.Completed &&
                !t.NoImprovementNeeded, ct)
            ?? throw new KeyNotFoundException("找不到此督導任務");

        await UpsertAgencyReviewCoreAsync(task, request, submittedByUserId: null, ct);
    }

    // ─── 登入雙軌（機關使用者/Admin）───────────────────────────

    public async Task<PagedAgencyReviewTasksResponse> GetMyAgencyReviewTasksAsync(
        Guid userId, bool isAdmin, Guid campaignId,
        int page, int pageSize, string? search,
        bool? factoryReplied, bool? agencyReviewed,
        Guid? factoryId = null,
        CancellationToken ct = default)
    {
        var campaign = await _context.SupervisionCampaigns
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct)
            ?? throw new KeyNotFoundException($"督導計畫 {campaignId} 不存在");

        // 基礎範圍：計畫 + 已完成任務 + 登入身分可見範圍 + 搜尋（工廠名稱/登記編號/機關名稱）。
        // 這組條件同時用來算統計數字（不含回覆/複查篩選）跟實際分頁清單（含回覆/複查篩選），分開建立避免互相污染。
        async Task<IQueryable<SupervisionTask>> BuildScopedQueryAsync()
        {
            var q = _context.SupervisionTasks
                .Where(t => t.Factory.CampaignId == campaignId && t.Status == SupervisionTaskStatus.Completed && !t.NoImprovementNeeded)
                .AsNoTracking();

            q = await ApplyAgencyVisibilityFilterAsync(q, userId, isAdmin, ct);

            if (factoryId.HasValue)
                q = q.Where(t => t.SupervisedFactoryId == factoryId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var kw = search.Trim().ToLower();
                q = q.Where(t =>
                    t.Factory.FactoryName.ToLower().Contains(kw) ||
                    (t.Factory.FactoryRegistrationNo != null && t.Factory.FactoryRegistrationNo.ToLower().Contains(kw)) ||
                    t.Agency.Name.ToLower().Contains(kw));
            }

            return q;
        }

        var statsQuery = await BuildScopedQueryAsync();
        var flags = await statsQuery
            .Select(t => new
            {
                FactoryReplied = t.FactoryReply != null && t.FactoryReply.SubmittedAt != null,
                AgencyReviewed = t.AgencyReview != null && t.AgencyReview.SubmittedAt != null,
            })
            .ToListAsync(ct);

        var listQuery = await BuildScopedQueryAsync();
        if (factoryReplied.HasValue)
        {
            listQuery = factoryReplied.Value
                ? listQuery.Where(t => t.FactoryReply != null && t.FactoryReply.SubmittedAt != null)
                : listQuery.Where(t => t.FactoryReply == null || t.FactoryReply.SubmittedAt == null);
        }
        if (agencyReviewed.HasValue)
        {
            listQuery = agencyReviewed.Value
                ? listQuery.Where(t => t.AgencyReview != null && t.AgencyReview.SubmittedAt != null)
                : listQuery.Where(t => t.AgencyReview == null || t.AgencyReview.SubmittedAt == null);
        }

        var total = await listQuery.CountAsync(ct);

        var tasks = await listQuery
            .Include(t => t.Factory)
            .Include(t => t.Agency)
            .Include(t => t.Form)
            .Include(t => t.Submission)
            .Include(t => t.FactoryReply)
            .Include(t => t.FactoryReplyItems)
            .Include(t => t.AgencyReview)
            .OrderBy(t => t.Agency.Name).ThenBy(t => t.Factory.FactoryName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedAgencyReviewTasksResponse
        {
            CampaignId = campaign.Id,
            CampaignName = campaign.Name,
            Items = tasks.Select(ToAgencyReviewTaskDto).ToList(),
            Total = total,
            FactoryRepliedCount = flags.Count(f => f.FactoryReplied),
            FactoryPendingCount = flags.Count(f => !f.FactoryReplied),
            AgencyReviewedCount = flags.Count(f => f.AgencyReviewed),
            AgencyPendingCount = flags.Count(f => !f.AgencyReviewed),
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<PagedAgencyReviewFactorySummaryResponse> GetMyAgencyReviewFactoriesAsync(
        Guid userId, bool isAdmin, Guid campaignId,
        int page, int pageSize, string? search,
        bool? factoryReplyCompleted = null, bool? agencyReviewCompleted = null, bool? needsReReview = null,
        CancellationToken ct = default)
    {
        var campaign = await _context.SupervisionCampaigns
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct)
            ?? throw new KeyNotFoundException($"督導計畫 {campaignId} 不存在");

        var query = _context.SupervisionTasks
            .Where(t => t.Factory.CampaignId == campaignId && t.Status == SupervisionTaskStatus.Completed && !t.NoImprovementNeeded)
            .AsNoTracking();

        query = await ApplyAgencyVisibilityFilterAsync(query, userId, isAdmin, ct);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(t =>
                t.Factory.FactoryName.ToLower().Contains(kw) ||
                (t.Factory.FactoryRegistrationNo != null && t.Factory.FactoryRegistrationNo.ToLower().Contains(kw)));
        }

        // 依工廠分組：進度三態（未填寫/填寫中/已完成）由前端拿 SubmittedCount/TaskCount 換算，
        // 這裡只需要算出每家工廠的任務總數跟已送出數量。
        var grouped = query
            .GroupBy(t => new { t.SupervisedFactoryId, t.Factory.FactoryName, t.Factory.FactoryRegistrationNo })
            .Select(g => new
            {
                g.Key.SupervisedFactoryId,
                g.Key.FactoryName,
                g.Key.FactoryRegistrationNo,
                TaskCount = g.Count(),
                FactoryReplySubmittedCount = g.Count(t => t.FactoryReply != null && t.FactoryReply.SubmittedAt != null),
                AgencyReviewSubmittedCount = g.Count(t => t.AgencyReview != null && t.AgencyReview.SubmittedAt != null),
                // 機關已複查後，工廠又更新過回覆內容（兩者皆為「最後一次送出時間」，可直接比較）
                NeedsReReviewCount = g.Count(t =>
                    t.FactoryReply != null && t.FactoryReply.SubmittedAt != null &&
                    t.AgencyReview != null && t.AgencyReview.SubmittedAt != null &&
                    t.FactoryReply.SubmittedAt > t.AgencyReview.SubmittedAt),
            });

        // 統計卡片的數字反映「搜尋條件下」的全部工廠，不受下面的分類篩選影響，
        // 這樣使用者點卡片篩選時，卡片上的數字不會跟著變動，才有篩選前後可以對照的意義。
        var totalBeforeFilter = await grouped.CountAsync(ct);
        var factoryReplyCompletedCount = await grouped.CountAsync(g => g.FactoryReplySubmittedCount == g.TaskCount, ct);
        var agencyReviewCompletedCount = await grouped.CountAsync(g => g.AgencyReviewSubmittedCount == g.TaskCount, ct);
        var needsReReviewFactoryCount = await grouped.CountAsync(g => g.NeedsReReviewCount > 0, ct);

        var filtered = grouped;
        if (factoryReplyCompleted == true)
            filtered = filtered.Where(g => g.FactoryReplySubmittedCount == g.TaskCount);
        if (agencyReviewCompleted == true)
            filtered = filtered.Where(g => g.AgencyReviewSubmittedCount == g.TaskCount);
        if (needsReReview == true)
            filtered = filtered.Where(g => g.NeedsReReviewCount > 0);

        var total = await filtered.CountAsync(ct);

        var items = await filtered
            .OrderBy(g => g.FactoryName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedAgencyReviewFactorySummaryResponse
        {
            CampaignId = campaign.Id,
            CampaignName = campaign.Name,
            Items = items.Select(i => new AgencyReviewFactorySummaryDto
            {
                FactoryId = i.SupervisedFactoryId,
                FactoryName = i.FactoryName,
                FactoryRegistrationNo = i.FactoryRegistrationNo,
                TaskCount = i.TaskCount,
                FactoryReplySubmittedCount = i.FactoryReplySubmittedCount,
                AgencyReviewSubmittedCount = i.AgencyReviewSubmittedCount,
                NeedsReReviewCount = i.NeedsReReviewCount,
            }).ToList(),
            TotalBeforeFilter = totalBeforeFilter,
            Total = total,
            FactoryReplyCompletedCount = factoryReplyCompletedCount,
            AgencyReviewCompletedCount = agencyReviewCompletedCount,
            NeedsReReviewFactoryCount = needsReReviewFactoryCount,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<AgencyReviewTaskDto> GetMyAgencyReviewForTaskAsync(Guid userId, bool isAdmin, Guid taskId, CancellationToken ct = default)
    {
        var query = _context.SupervisionTasks
            .Include(t => t.Factory)
            .Include(t => t.Agency)
            .Include(t => t.Form)
            .Include(t => t.Submission)
            .Include(t => t.FactoryReply)
            .Include(t => t.FactoryReplyItems)
            .Include(t => t.AgencyReview)
            .Where(t => t.Id == taskId && t.Status == SupervisionTaskStatus.Completed && !t.NoImprovementNeeded)
            .AsNoTracking();

        query = await ApplyAgencyVisibilityFilterAsync(query, userId, isAdmin, ct);

        var task = await query.FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"督導任務 {taskId} 不存在或無權限查看");

        return ToAgencyReviewTaskDto(task);
    }

    public async Task UpsertAgencyReviewByUserAsync(Guid userId, bool isAdmin, Guid taskId, UpsertAgencyReviewRequest request, CancellationToken ct = default)
    {
        var query = _context.SupervisionTasks
            .Include(t => t.AgencyReview)
            .Include(t => t.FactoryReplyItems)
            .Where(t => t.Id == taskId && t.Status == SupervisionTaskStatus.Completed && !t.NoImprovementNeeded);

        query = await ApplyAgencyVisibilityFilterAsync(query, userId, isAdmin, ct);

        var task = await query.FirstOrDefaultAsync(ct)
            ?? throw new KeyNotFoundException($"督導任務 {taskId} 不存在或無權限查看");

        // 登入版：填表人資訊直接帶登入帳號的資料，不用手動填寫，帳號欄位沒填的話就留空
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
        var reviewerOverride = (
            AgencyName: user?.Department,
            Name: user?.Username,
            Contact: user?.PhoneNumber ?? user?.Email);

        await UpsertAgencyReviewCoreAsync(task, request, submittedByUserId: userId, ct, reviewerOverride);
    }

    // ─── Admin：工廠回覆項目管理 ─────────────────────────────

    public async Task<PagedAdminReplyTaskListResponse> GetAdminReplyTaskListAsync(
        Guid campaignId, int page, int pageSize, string? search, CancellationToken ct = default)
    {
        var query = _context.SupervisionTasks
            .Where(t => t.Factory.CampaignId == campaignId && t.Status == SupervisionTaskStatus.Completed)
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.Trim().ToLower();
            query = query.Where(t =>
                t.Factory.FactoryName.ToLower().Contains(kw) ||
                (t.Factory.FactoryRegistrationNo != null && t.Factory.FactoryRegistrationNo.ToLower().Contains(kw)) ||
                t.Agency.Name.ToLower().Contains(kw));
        }

        var total = await query.CountAsync(ct);

        var tasks = await query
            .Include(t => t.Factory)
            .Include(t => t.Agency)
            .Include(t => t.Form)
            .Include(t => t.Submission)
            .Include(t => t.FactoryReply)
            .Include(t => t.FactoryReplyItems)
            .OrderBy(t => t.Factory.FactoryName).ThenBy(t => t.Agency.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedAdminReplyTaskListResponse
        {
            Items = tasks.Select(t => new AdminReplyTaskListItemDto
            {
                TaskId = t.Id,
                FactoryName = t.Factory.FactoryName,
                FactoryRegistrationNo = t.Factory.FactoryRegistrationNo,
                AgencyName = t.Agency.Name,
                FormTypeName = t.FormTypeName,
                CompletedAt = t.CompletedAt,
                ItemCount = t.FactoryReplyItems.Count,
                RepliedItemCount = t.FactoryReplyItems.Count(i => !string.IsNullOrWhiteSpace(i.ReplyText)),
                FactoryReplySubmitted = t.FactoryReply != null && t.FactoryReply.SubmittedAt != null,
                NoImprovementNeeded = t.NoImprovementNeeded,
                Findings = ToFindingDtos(t),
            }).ToList(),
            Total = total,
            Page = page,
            PageSize = pageSize,
        };
    }

    public async Task<List<FactoryReplyItemDto>> GetFactoryReplyItemsAsync(Guid taskId, CancellationToken ct = default)
    {
        _ = await _context.SupervisionTasks.FindAsync([taskId], ct)
            ?? throw new KeyNotFoundException($"督導任務 {taskId} 不存在");

        var items = await _context.FactoryReplyItems
            .Where(i => i.SupervisionTaskId == taskId)
            .OrderBy(i => i.SortOrder)
            .AsNoTracking()
            .ToListAsync(ct);

        return items.Select(ToFactoryReplyItemDto).ToList();
    }

    public async Task<Guid> CreateFactoryReplyItemAsync(Guid taskId, CreateFactoryReplyItemRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            throw new InvalidOperationException("說明不能是空的");

        var task = await _context.SupervisionTasks.FindAsync([taskId], ct)
            ?? throw new KeyNotFoundException($"督導任務 {taskId} 不存在");

        if (task.NoImprovementNeeded)
            throw new InvalidOperationException("此任務已標記為「無需改善回覆」，請先取消標記後再新增項目");

        var maxOrder = await _context.FactoryReplyItems
            .Where(i => i.SupervisionTaskId == taskId)
            .Select(i => (int?)i.SortOrder)
            .MaxAsync(ct) ?? 0;

        var item = new FactoryReplyItem
        {
            Id = Guid.NewGuid(),
            SupervisionTaskId = taskId,
            SortOrder = maxOrder + 1,
            Description = request.Description.Trim(),
        };
        _context.FactoryReplyItems.Add(item);
        await _context.SaveChangesAsync(ct);
        return item.Id;
    }

    public async Task UpdateFactoryReplyItemAsync(Guid itemId, UpdateFactoryReplyItemRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
            throw new InvalidOperationException("說明不能是空的");

        var item = await _context.FactoryReplyItems.FirstOrDefaultAsync(i => i.Id == itemId, ct)
            ?? throw new KeyNotFoundException($"項目 {itemId} 不存在");

        item.Description = request.Description.Trim();
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteFactoryReplyItemAsync(Guid itemId, CancellationToken ct = default)
    {
        var item = await _context.FactoryReplyItems.FirstOrDefaultAsync(i => i.Id == itemId, ct)
            ?? throw new KeyNotFoundException($"項目 {itemId} 不存在");

        _context.FactoryReplyItems.Remove(item);
        await _context.SaveChangesAsync(ct);
    }

    public async Task MoveFactoryReplyItemAsync(Guid itemId, bool moveUp, CancellationToken ct = default)
    {
        var item = await _context.FactoryReplyItems.FirstOrDefaultAsync(i => i.Id == itemId, ct)
            ?? throw new KeyNotFoundException($"項目 {itemId} 不存在");

        var siblings = await _context.FactoryReplyItems
            .Where(i => i.SupervisionTaskId == item.SupervisionTaskId)
            .OrderBy(i => i.SortOrder)
            .ToListAsync(ct);

        var index = siblings.FindIndex(i => i.Id == itemId);
        var swapIndex = moveUp ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= siblings.Count) return;

        var neighbor = siblings[swapIndex];
        (item.SortOrder, neighbor.SortOrder) = (neighbor.SortOrder, item.SortOrder);

        await _context.SaveChangesAsync(ct);
    }

    public async Task SetTaskNoImprovementNeededAsync(Guid taskId, bool value, CancellationToken ct = default)
    {
        var task = await _context.SupervisionTasks
            .Include(t => t.FactoryReplyItems)
            .FirstOrDefaultAsync(t => t.Id == taskId, ct)
            ?? throw new KeyNotFoundException($"督導任務 {taskId} 不存在");

        if (value && task.FactoryReplyItems.Count > 0)
            throw new InvalidOperationException("此任務已設定改善項目，請先清空項目後再標記為「無」");

        task.NoImprovementNeeded = value;
        await _context.SaveChangesAsync(ct);
    }

    /// <summary>
    /// 比照 SupervisionService.GetMyTasksPagedAsync 既有的過濾邏輯：
    /// 非 admin 時，有綁定產業園區者依園區過濾，否則依 AgencyUser 綁定的機關過濾。
    /// </summary>
    private async Task<IQueryable<SupervisionTask>> ApplyAgencyVisibilityFilterAsync(
        IQueryable<SupervisionTask> query, Guid userId, bool isAdmin, CancellationToken ct)
    {
        if (isAdmin) return query;

        var parkNames = await _context.UserIndustrialParks
            .Where(p => p.UserId == userId)
            .Select(p => p.IndustrialParkName)
            .ToListAsync(ct);

        if (parkNames.Count > 0)
            return query.Where(t => t.Factory.IndustrialPark != null && parkNames.Contains(t.Factory.IndustrialPark));

        var agencyIds = await _context.AgencyUsers
            .Where(au => au.UserId == userId)
            .Select(au => au.AgencyId)
            .ToListAsync(ct);
        return query.Where(t => agencyIds.Contains(t.AgencyId));
    }

    // ─── 共用私有方法 ──────────────────────────────────────────

    private async Task<string> GenerateUniqueTokenAsync(HashSet<string> reserved, CancellationToken ct)
    {
        for (int i = 0; i < 5; i++)
        {
            var candidate = SecureTokenGenerator.NewToken();
            if (reserved.Contains(candidate)) continue;

            var exists = await _context.FactoryReplyTokens.AnyAsync(t => t.Token == candidate, ct)
                || await _context.AgencyReviewTokens.AnyAsync(t => t.Token == candidate, ct);
            if (!exists)
            {
                reserved.Add(candidate);
                return candidate;
            }
        }
        throw new InvalidOperationException("無法產生唯一的連結 token，請重試");
    }

    /// <summary>
    /// 公開連結傳入的日期（無時區資訊，反序列化後 Kind=Unspecified）標記為 UTC，
    /// 否則 Npgsql 寫入 timestamp with time zone 欄位時會丟出例外。這幾個欄位只在意
    /// 年月日，不涉及時區換算，所以用 SpecifyKind 而非 ToUniversalTime。
    /// </summary>
    private static DateTime? AsUtc(DateTime? value) =>
        value.HasValue ? DateTime.SpecifyKind(value.Value, DateTimeKind.Utc) : null;

    private async Task UpsertFactoryReplyCoreAsync(SupervisionTask task, UpsertFactoryReplyRequest request, CancellationToken ct)
    {
        if (task.FactoryReplyItems.Count == 0)
            throw new InvalidOperationException("尚未設定改善項目，請聯絡管理人員");

        if (string.IsNullOrWhiteSpace(request.FillerUnitName))
            throw new InvalidOperationException("請填寫填表人單位");

        if (string.IsNullOrWhiteSpace(request.FillerName))
            throw new InvalidOperationException("請填寫填表人姓名");

        if (string.IsNullOrWhiteSpace(request.FillerContact))
            throw new InvalidOperationException("請填寫填表人聯絡方式");

        // 驗證：每一個項目都要有各自完整的回覆（改善對策/是否完成改善/完成日期），備註選填
        var requestByItemId = request.Items
            .Where(i => i.ItemId != Guid.Empty)
            .ToDictionary(i => i.ItemId);

        foreach (var item in task.FactoryReplyItems)
        {
            if (!requestByItemId.TryGetValue(item.Id, out var itemRequest) || string.IsNullOrWhiteSpace(itemRequest.ReplyText))
                throw new InvalidOperationException($"「{item.Description}」尚未填寫改善對策，請填寫完整後再送出");

            if (itemRequest.IsImprovementCompleted == null)
                throw new InvalidOperationException($"「{item.Description}」請填寫是否完成改善/辦理");

            if (itemRequest.IsImprovementCompleted == false &&
                (string.IsNullOrWhiteSpace(itemRequest.ImprovementStatus) ||
                 !Enum.TryParse(itemRequest.ImprovementStatus, true, out ImprovementStatus _)))
                throw new InvalidOperationException($"「{item.Description}」請填寫改善辦理狀態");

            if (itemRequest.CompletionDate == null)
                throw new InvalidOperationException($"「{item.Description}」請填寫完成/預計完成日期");
        }

        foreach (var item in task.FactoryReplyItems)
        {
            var itemRequest = requestByItemId[item.Id];
            item.ReplyText = itemRequest.ReplyText.Trim();
            item.IsImprovementCompleted = itemRequest.IsImprovementCompleted;
            item.ImprovementStatus = itemRequest.IsImprovementCompleted == false
                ? Enum.Parse<ImprovementStatus>(itemRequest.ImprovementStatus!, true)
                : null;
            item.CompletionDate = AsUtc(itemRequest.CompletionDate);
            item.Remarks = itemRequest.Remarks;
        }

        var reply = task.FactoryReply;
        if (reply == null)
        {
            reply = new FactoryReply { Id = Guid.NewGuid(), SupervisionTaskId = task.Id };
            _context.FactoryReplies.Add(reply);
        }

        reply.FillerUnitName = request.FillerUnitName;
        reply.FillerName = request.FillerName;
        reply.FillerContact = request.FillerContact;
        reply.SubmittedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
    }

    private async Task UpsertAgencyReviewCoreAsync(
        SupervisionTask task, UpsertAgencyReviewRequest request, Guid? submittedByUserId, CancellationToken ct,
        (string? AgencyName, string? Name, string? Contact)? reviewerOverride = null)
    {
        if (task.FactoryReplyItems.Count == 0)
            throw new InvalidOperationException("尚未設定改善項目，請聯絡管理人員");

        string? reviewerAgencyName;
        string? reviewerName;
        string? reviewerContact;

        if (reviewerOverride.HasValue)
        {
            // 登入版：填表人資訊直接帶登入帳號的資料，不強制必填
            reviewerAgencyName = reviewerOverride.Value.AgencyName;
            reviewerName = reviewerOverride.Value.Name;
            reviewerContact = reviewerOverride.Value.Contact;
        }
        else
        {
            // 公開連結：沒有帳號可以帶，維持手動填寫必填
            if (string.IsNullOrWhiteSpace(request.ReviewerAgencyName))
                throw new InvalidOperationException("請填寫機關單位");

            if (string.IsNullOrWhiteSpace(request.ReviewerName))
                throw new InvalidOperationException("請填寫填表人姓名");

            if (string.IsNullOrWhiteSpace(request.ReviewerContact))
                throw new InvalidOperationException("請填寫聯絡方式");

            reviewerAgencyName = request.ReviewerAgencyName;
            reviewerName = request.ReviewerName;
            reviewerContact = request.ReviewerContact;
        }

        // 驗證：每一個項目都要有各自完整的複查登打（是否複查/是否裁處必答，選「是」時對應欄位才必填）
        var requestByItemId = request.Items
            .Where(i => i.ItemId != Guid.Empty)
            .ToDictionary(i => i.ItemId);
        var resultByItemId = new Dictionary<Guid, ReinspectionResult?>();

        foreach (var item in task.FactoryReplyItems)
        {
            if (!requestByItemId.TryGetValue(item.Id, out var itemRequest))
                throw new InvalidOperationException($"「{item.Description}」尚未填寫複查登打，請填寫完整後再送出");

            if (itemRequest.WillReinspect == null)
                throw new InvalidOperationException($"「{item.Description}」請填寫是否複查");

            ReinspectionResult? resultEnum = null;
            if (itemRequest.WillReinspect == true)
            {
                if (itemRequest.ReinspectionDate == null)
                    throw new InvalidOperationException($"「{item.Description}」是否複查=是時，必須填寫(預計)複查日期");

                if (string.IsNullOrWhiteSpace(itemRequest.Result) || !Enum.TryParse(itemRequest.Result, true, out ReinspectionResult parsed))
                    throw new InvalidOperationException($"「{item.Description}」是否複查=是時，必須選擇複查結果");
                resultEnum = parsed;

                if (resultEnum == ReinspectionResult.Other && string.IsNullOrWhiteSpace(itemRequest.ResultOtherText))
                    throw new InvalidOperationException($"「{item.Description}」複查結果選擇「其他」時，必須填寫說明");
            }
            resultByItemId[item.Id] = resultEnum;

            if (itemRequest.WillPenalize == null)
                throw new InvalidOperationException($"「{item.Description}」請填寫是否裁處");

            if (itemRequest.WillPenalize == true)
            {
                if (string.IsNullOrWhiteSpace(itemRequest.ViolatedRegulation))
                    throw new InvalidOperationException($"「{item.Description}」是否裁處=是時，必須填寫違反法條");

                if (itemRequest.PenaltyAmount is null || itemRequest.PenaltyAmount <= 0)
                    throw new InvalidOperationException($"「{item.Description}」是否裁處=是時，必須填寫裁處金額");
            }
        }

        foreach (var item in task.FactoryReplyItems)
        {
            var itemRequest = requestByItemId[item.Id];
            var resultEnum = resultByItemId[item.Id];

            item.WillReinspect = itemRequest.WillReinspect;
            item.ReinspectionDate = itemRequest.WillReinspect == true ? AsUtc(itemRequest.ReinspectionDate) : null;
            item.Result = itemRequest.WillReinspect == true ? resultEnum : null;
            item.ResultOtherText = resultEnum == ReinspectionResult.Other ? itemRequest.ResultOtherText : null;
            item.WillPenalize = itemRequest.WillPenalize;
            item.ViolatedRegulation = itemRequest.WillPenalize == true ? itemRequest.ViolatedRegulation : null;
            item.PenaltyAmount = itemRequest.WillPenalize == true ? itemRequest.PenaltyAmount : null;
            item.AgencyRemarks = itemRequest.AgencyRemarks;
        }

        var review = task.AgencyReview;
        if (review == null)
        {
            review = new AgencyReview { Id = Guid.NewGuid(), SupervisionTaskId = task.Id };
            _context.AgencyReviews.Add(review);
        }

        review.ReviewerAgencyName = reviewerAgencyName;
        review.ReviewerName = reviewerName;
        review.ReviewerContact = reviewerContact;
        review.SubmittedAt = DateTime.UtcNow;
        review.SubmittedByUserId = submittedByUserId;

        await _context.SaveChangesAsync(ct);
    }

    private static FactoryReplyItemDto ToFactoryReplyItemDto(FactoryReplyItem i) => new()
    {
        Id = i.Id,
        SortOrder = i.SortOrder,
        Description = i.Description,
        ReplyText = i.ReplyText,
        IsImprovementCompleted = i.IsImprovementCompleted,
        ImprovementStatus = i.ImprovementStatus?.ToString(),
        CompletionDate = i.CompletionDate,
        Remarks = i.Remarks,
    };

    private static FactoryReplyDataDto ToFactoryReplyDataDto(FactoryReply? r, ICollection<FactoryReplyItem> items) => new()
    {
        Items = items
            .OrderBy(i => i.SortOrder)
            .Select(ToFactoryReplyItemDto)
            .ToList(),
        FillerUnitName = r?.FillerUnitName,
        FillerName = r?.FillerName,
        FillerContact = r?.FillerContact,
        SubmittedAt = r?.SubmittedAt,
    };

    private static AgencyReviewItemDto ToAgencyReviewItemDto(FactoryReplyItem i) => new()
    {
        Id = i.Id,
        SortOrder = i.SortOrder,
        Description = i.Description,
        FactoryReplyText = i.ReplyText,
        FactoryIsImprovementCompleted = i.IsImprovementCompleted,
        FactoryImprovementStatus = i.ImprovementStatus?.ToString(),
        FactoryCompletionDate = i.CompletionDate,
        FactoryRemarks = i.Remarks,
        WillReinspect = i.WillReinspect,
        ReinspectionDate = i.ReinspectionDate,
        Result = i.Result?.ToString(),
        ResultOtherText = i.ResultOtherText,
        WillPenalize = i.WillPenalize,
        ViolatedRegulation = i.ViolatedRegulation,
        PenaltyAmount = i.PenaltyAmount,
        AgencyRemarks = i.AgencyRemarks,
    };

    private static AgencyReviewTaskDto ToAgencyReviewTaskDto(SupervisionTask t) => new()
    {
        TaskId = t.Id,
        FactoryId = t.SupervisedFactoryId,
        FactoryName = t.Factory.FactoryName,
        FactoryRegistrationNo = t.Factory.FactoryRegistrationNo,
        AgencyName = t.Agency.Name,
        FormTypeName = t.FormTypeName,
        CompletedAt = t.CompletedAt,
        Items = t.FactoryReplyItems.OrderBy(i => i.SortOrder).Select(ToAgencyReviewItemDto).ToList(),
        FactoryReplySubmittedAt = t.FactoryReply?.SubmittedAt,
        ReviewerAgencyName = t.AgencyReview?.ReviewerAgencyName,
        ReviewerName = t.AgencyReview?.ReviewerName,
        ReviewerContact = t.AgencyReview?.ReviewerContact,
        SubmittedAt = t.AgencyReview?.SubmittedAt,
        NeedsReReview = t.FactoryReply?.SubmittedAt != null && t.AgencyReview?.SubmittedAt != null
            && t.FactoryReply.SubmittedAt > t.AgencyReview.SubmittedAt,
        Findings = ToFindingDtos(t),
    };

    private static List<SupervisionFindingDto> ToFindingDtos(SupervisionTask t) =>
        FormFindingExtractor.Extract(t.Form?.Schema, t.Submission?.SubmissionData)
            .Select(f => new SupervisionFindingDto { Label = f.Label, Value = f.Value })
            .ToList();
}

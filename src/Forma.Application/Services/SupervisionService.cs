using System.Text.Json;
using Forma.Application.Common;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Supervision.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Project = Forma.Domain.Entities.Project;

namespace Forma.Application.Services;

public class SupervisionService : ISupervisionService
{
    private readonly IApplicationDbContext _context;
    private readonly IExcelImportService _excelImportService;
    private readonly IFactoryIdentitySyncService _identitySyncService;
    private readonly IFactoryRiskRankingService _rankingService;

    public SupervisionService(
        IApplicationDbContext context,
        IExcelImportService excelImportService,
        IFactoryIdentitySyncService identitySyncService,
        IFactoryRiskRankingService rankingService)
    {
        _context = context;
        _excelImportService = excelImportService;
        _identitySyncService = identitySyncService;
        _rankingService = rankingService;
    }

    public async Task<List<CampaignDto>> GetCampaignsAsync(CancellationToken ct = default)
    {
        return await _context.SupervisionCampaigns
            .Include(c => c.Factories)
                .ThenInclude(f => f.Tasks)
            .AsNoTracking()
            .OrderByDescending(c => c.Year)
            .Select(c => ToCampaignDto(c))
            .ToListAsync(ct);
    }

    public async Task<CampaignDto> GetCampaignByIdAsync(Guid id, CancellationToken ct = default)
    {
        var campaign = await _context.SupervisionCampaigns
            .Include(c => c.Factories)
                .ThenInclude(f => f.Tasks)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"督導計畫 {id} 不存在");

        return ToCampaignDto(campaign);
    }

    public async Task<Guid> CreateCampaignAsync(CreateCampaignRequest request, Guid createdById, CancellationToken ct = default)
    {
        // 自動建立此督導計畫專屬的 Forma 表單計畫
        var systemOrgId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var formProject = new Project
        {
            Id = Guid.NewGuid(),
            OrganizationId = systemOrgId,
            Name = $"{request.Year} 年度督導表單",
            Code = $"SUPER-{request.Year}-{DateTime.UtcNow:yyyyMMddHHmm}",
            Description = $"督導計畫「{request.Name}」的專屬表單庫",
            Year = request.Year,
            Status = Domain.Enums.ProjectStatus.Active,
            CreatedById = createdById
        };
        _context.Projects.Add(formProject);

        var campaign = new SupervisionCampaign
        {
            Id = Guid.NewGuid(),
            Year = request.Year,
            Name = request.Name,
            Description = request.Description,
            Status = SupervisionCampaignStatus.Draft,
            CreatedById = createdById,
            FormProjectId = formProject.Id
        };

        _context.SupervisionCampaigns.Add(campaign);
        await _context.SaveChangesAsync(ct);
        return campaign.Id;
    }

    public async Task<CampaignDto> UpdateCampaignAsync(Guid id, UpdateCampaignRequest request, CancellationToken ct = default)
    {
        var campaign = await _context.SupervisionCampaigns
            .Include(c => c.Factories).ThenInclude(f => f.Tasks)
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new KeyNotFoundException($"督導計畫 {id} 不存在");

        campaign.Name = request.Name;
        campaign.Description = request.Description;

        if (Enum.TryParse<SupervisionCampaignStatus>(request.Status, true, out var status))
            campaign.Status = status;

        await _context.SaveChangesAsync(ct);
        return ToCampaignDto(campaign);
    }

    public async Task DeleteCampaignAsync(Guid id, CancellationToken ct = default)
    {
        var campaign = await _context.SupervisionCampaigns.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"督導計畫 {id} 不存在");

        _context.SupervisionCampaigns.Remove(campaign);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<ImportResult> ImportFactoriesFromExcelAsync(Guid campaignId, Stream excelStream, CancellationToken ct = default)
    {
        var campaign = await _context.SupervisionCampaigns.FindAsync([campaignId], ct)
            ?? throw new KeyNotFoundException($"督導計畫 {campaignId} 不存在");

        return await _excelImportService.ImportAsync(campaignId, excelStream, ct);
    }

    public async Task<List<SupervisionTaskDto>> GetMyTasksAsync(Guid userId, Guid? campaignId, bool isAdmin = false, CancellationToken ct = default)
    {
        var query = _context.SupervisionTasks
            .Include(t => t.Factory).ThenInclude(f => f.Campaign)
            .Include(t => t.Agency)
            .Include(t => t.Submission).ThenInclude(s => s!.SubmittedBy)
            .AsNoTracking();

        // 非 admin：依園區綁定或機關成員身分篩選
        if (!isAdmin)
        {
            var parkNames = await _context.UserIndustrialParks
                .Where(p => p.UserId == userId)
                .Select(p => p.IndustrialParkName)
                .ToListAsync(ct);

            if (parkNames.Count > 0)
            {
                // 有綁定園區：顯示該園區所有工廠的任務
                query = query.Where(t => t.Factory.IndustrialPark != null && parkNames.Contains(t.Factory.IndustrialPark));
            }
            else
            {
                // 無園區綁定：只看自己所屬機關的任務
                var agencyIds = await _context.AgencyUsers
                    .Where(au => au.UserId == userId)
                    .Select(au => au.AgencyId)
                    .ToListAsync(ct);
                query = query.Where(t => agencyIds.Contains(t.AgencyId));
            }
        }

        if (campaignId.HasValue)
            query = query.Where(t => t.Factory.CampaignId == campaignId.Value);

        return await query
            .OrderBy(t => t.Agency.Name)
            .ThenBy(t => t.Factory.RiskRank)
            .ThenBy(t => t.Factory.FactoryName)
            .Select(t => ToTaskDto(t))
            .ToListAsync(ct);
    }

    public async Task<PagedMyTasksResponse> GetMyTasksPagedAsync(
        Guid userId, Guid? campaignId, bool isAdmin,
        int page, int pageSize,
        string? status, string? search, Guid? agencyId,
        CancellationToken ct = default)
    {
        var query = _context.SupervisionTasks
            .Include(t => t.Factory).ThenInclude(f => f.Campaign)
            .Include(t => t.Agency)
            .Include(t => t.Submission).ThenInclude(s => s!.SubmittedBy)
            .AsNoTracking();

        if (!isAdmin)
        {
            var parkNames = await _context.UserIndustrialParks
                .Where(p => p.UserId == userId)
                .Select(p => p.IndustrialParkName)
                .ToListAsync(ct);

            if (parkNames.Count > 0)
            {
                query = query.Where(t => t.Factory.IndustrialPark != null && parkNames.Contains(t.Factory.IndustrialPark));
            }
            else
            {
                var agencyIds = await _context.AgencyUsers
                    .Where(au => au.UserId == userId)
                    .Select(au => au.AgencyId)
                    .ToListAsync(ct);
                query = query.Where(t => agencyIds.Contains(t.AgencyId));
            }
        }

        if (campaignId.HasValue)
            query = query.Where(t => t.Factory.CampaignId == campaignId.Value);

        if (!string.IsNullOrWhiteSpace(status) && status != "all")
        {
            var statusEnum = status switch
            {
                "Pending"    => SupervisionTaskStatus.Pending,
                "InProgress" => SupervisionTaskStatus.InProgress,
                "Completed"  => SupervisionTaskStatus.Completed,
                _ => (SupervisionTaskStatus?)null
            };
            if (statusEnum.HasValue)
                query = query.Where(t => t.Status == statusEnum.Value);
        }

        if (agencyId.HasValue)
            query = query.Where(t => t.AgencyId == agencyId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.ToLower();
            query = query.Where(t =>
                t.Factory.FactoryName.ToLower().Contains(kw) ||
                (t.Factory.IndustrialPark != null && t.Factory.IndustrialPark.ToLower().Contains(kw)) ||
                (t.Factory.County != null && t.Factory.County.ToLower().Contains(kw)) ||
                t.Agency.Name.ToLower().Contains(kw));
        }

        var ordered = query
            .OrderBy(t => t.Agency.Name)
            .ThenBy(t => t.Factory.RiskRank)
            .ThenBy(t => t.Factory.FactoryName);

        // 統計（在套用 status 篩選前算 pending/inProgress/completed，需要 base query without status filter）
        // 但為簡化，統計從當前完整 query（含 status filter 以外所有 filter）重新計算
        var statsQuery = _context.SupervisionTasks
            .Include(t => t.Factory).ThenInclude(f => f.Campaign)
            .Include(t => t.Agency)
            .AsNoTracking();

        if (!isAdmin)
        {
            var parkNames = await _context.UserIndustrialParks
                .Where(p => p.UserId == userId)
                .Select(p => p.IndustrialParkName)
                .ToListAsync(ct);

            if (parkNames.Count > 0)
            {
                statsQuery = statsQuery.Where(t => t.Factory.IndustrialPark != null && parkNames.Contains(t.Factory.IndustrialPark));
            }
            else
            {
                var agencyIds = await _context.AgencyUsers
                    .Where(au => au.UserId == userId)
                    .Select(au => au.AgencyId)
                    .ToListAsync(ct);
                statsQuery = statsQuery.Where(t => agencyIds.Contains(t.AgencyId));
            }
        }
        if (campaignId.HasValue)
            statsQuery = statsQuery.Where(t => t.Factory.CampaignId == campaignId.Value);
        if (agencyId.HasValue)
            statsQuery = statsQuery.Where(t => t.AgencyId == agencyId.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var kw = search.ToLower();
            statsQuery = statsQuery.Where(t =>
                t.Factory.FactoryName.ToLower().Contains(kw) ||
                (t.Factory.IndustrialPark != null && t.Factory.IndustrialPark.ToLower().Contains(kw)) ||
                (t.Factory.County != null && t.Factory.County.ToLower().Contains(kw)) ||
                t.Agency.Name.ToLower().Contains(kw));
        }

        var statuses = await statsQuery.Select(t => t.Status).ToListAsync(ct);
        var total    = statuses.Count;
        var pending  = statuses.Count(s => s == SupervisionTaskStatus.Pending);
        var inProg   = statuses.Count(s => s == SupervisionTaskStatus.InProgress);
        var completed = statuses.Count(s => s == SupervisionTaskStatus.Completed);

        var filteredTotal = await ordered.CountAsync(ct);
        var items = await ordered
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => ToTaskDto(t))
            .ToListAsync(ct);

        return new PagedMyTasksResponse
        {
            Items     = items,
            Total     = filteredTotal,
            Pending   = pending,
            InProgress = inProg,
            Completed = completed,
            Page      = page,
            PageSize  = pageSize,
        };
    }

    public async Task<CampaignProgressDto> GetCampaignProgressAsync(Guid campaignId, CancellationToken ct = default)
    {
        var campaign = await _context.SupervisionCampaigns
            .Include(c => c.Factories).ThenInclude(f => f.Tasks).ThenInclude(t => t.Agency)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == campaignId, ct)
            ?? throw new KeyNotFoundException($"督導計畫 {campaignId} 不存在");

        var allTasks = campaign.Factories.SelectMany(f => f.Tasks).ToList();

        var byAgency = allTasks
            .GroupBy(t => new { t.AgencyId, AgencyName = t.Agency.Name })
            .Select(g => new AgencyProgressDto
            {
                AgencyId = g.Key.AgencyId,
                AgencyName = g.Key.AgencyName,
                TotalTasks = g.Count(),
                CompletedTasks = g.Count(t => t.Status == SupervisionTaskStatus.Completed),
                CompletionRate = g.Count() == 0 ? 0 : Math.Round((double)g.Count(t => t.Status == SupervisionTaskStatus.Completed) / g.Count() * 100, 1)
            })
            .OrderBy(a => a.AgencyName)
            .ToList();

        return new CampaignProgressDto
        {
            CampaignId = campaign.Id,
            CampaignName = campaign.Name,
            Year = campaign.Year,
            TotalFactories = campaign.Factories.Count,
            TotalTasks = allTasks.Count,
            CompletedTasks = allTasks.Count(t => t.Status == SupervisionTaskStatus.Completed),
            InProgressTasks = allTasks.Count(t => t.Status == SupervisionTaskStatus.InProgress),
            PendingTasks = allTasks.Count(t => t.Status == SupervisionTaskStatus.Pending),
            CompletionRate = allTasks.Count == 0 ? 0 : Math.Round((double)allTasks.Count(t => t.Status == SupervisionTaskStatus.Completed) / allTasks.Count * 100, 1),
            ByAgency = byAgency
        };
    }

    public async Task<int> SyncTaskFormIdsAsync(Guid campaignId, CancellationToken ct = default)
    {
        // 載入此計畫下所有 FormId 為 null 的任務
        var tasks = await _context.SupervisionTasks
            .Include(t => t.Factory)
            .Where(t => t.Factory.CampaignId == campaignId && t.FormId == null)
            .ToListAsync(ct);

        if (tasks.Count == 0) return 0;

        // 載入相關機關的表單綁定
        var agencyIds = tasks.Select(t => t.AgencyId).Distinct().ToList();
        var formTypes = await _context.AgencyFormTypes
            .Where(ft => agencyIds.Contains(ft.AgencyId) && ft.FormId != null)
            .ToListAsync(ct);

        int updated = 0;
        foreach (var task in tasks)
        {
            // 先嘗試 FormTypeName 精確比對
            var match = formTypes.FirstOrDefault(ft =>
                ft.AgencyId == task.AgencyId &&
                ft.FormTypeName == task.FormTypeName);

            // 若無精確比對，且該機關只有一個綁定，直接使用
            if (match == null)
            {
                var agencyBindings = formTypes.Where(ft => ft.AgencyId == task.AgencyId).ToList();
                if (agencyBindings.Count == 1)
                    match = agencyBindings[0];
            }

            if (match?.FormId != null)
            {
                task.FormId = match.FormId;
                updated++;
            }
        }

        if (updated > 0)
            await _context.SaveChangesAsync(ct);

        return updated;
    }

    public async Task LinkSubmissionAsync(Guid taskId, Guid submissionId, CancellationToken ct = default)
    {
        var task = await _context.SupervisionTasks.FindAsync([taskId], ct)
            ?? throw new KeyNotFoundException($"督導任務 {taskId} 不存在");

        var submission = await _context.FormSubmissions.FindAsync([submissionId], ct);
        var isDraft = submission?.Status == SubmissionStatus.Draft;

        task.SubmissionId = submissionId;
        if (isDraft)
        {
            task.Status = SupervisionTaskStatus.InProgress;
            task.CompletedAt = null;
        }
        else
        {
            task.Status = SupervisionTaskStatus.Completed;
            task.CompletedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(ct);
    }

    public async Task RejectTaskAsync(Guid taskId, CancellationToken ct = default)
    {
        var task = await _context.SupervisionTasks
            .Include(t => t.Submission)
            .FirstOrDefaultAsync(t => t.Id == taskId, ct)
            ?? throw new KeyNotFoundException($"督導任務 {taskId} 不存在");

        // 保留 SubmissionId，將 Submission 改為草稿狀態
        if (task.Submission != null)
        {
            task.Submission.Status = SubmissionStatus.Draft;
        }

        task.Status = SupervisionTaskStatus.InProgress;
        task.CompletedAt = null;

        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<TaskResetPreviewItem>> GetResetTasksPreviewAsync(
        Guid campaignId, Guid? formId, string? factorySearch, string? status, CancellationToken ct = default)
    {
        var query = _context.SupervisionTasks
            .Include(t => t.Factory)
            .Include(t => t.Agency)
            .Include(t => t.Submission).ThenInclude(s => s!.SubmittedBy)
            .Where(t => t.Factory.CampaignId == campaignId)
            .AsNoTracking();

        if (formId.HasValue)
            query = query.Where(t => t.FormId == formId.Value);

        if (!string.IsNullOrWhiteSpace(factorySearch))
            query = query.Where(t => t.Factory.FactoryName.Contains(factorySearch) ||
                                     (t.Factory.FactoryRegistrationNo != null && t.Factory.FactoryRegistrationNo.Contains(factorySearch)));

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<SupervisionTaskStatus>(status, out var parsedStatus))
            query = query.Where(t => t.Status == parsedStatus);

        return await query
            .OrderBy(t => t.Factory.FactoryName).ThenBy(t => t.FormTypeName)
            .Select(t => new TaskResetPreviewItem(
                t.Id,
                t.Factory.FactoryName,
                t.Factory.FactoryRegistrationNo,
                t.FormTypeName,
                t.Agency.Name,
                t.Status.ToString(),
                t.Submission != null ? t.Submission.SubmittedBy!.Username : null,
                t.Submission != null ? t.Submission.SubmittedAt : null
            ))
            .ToListAsync(ct);
    }

    public async Task<int> ResetTasksAsync(Guid? campaignId, Guid? formId, Guid[]? taskIds, CancellationToken ct = default)
    {
        if (taskIds is { Length: > 0 })
        {
            var tasks = await _context.SupervisionTasks
                .Where(t => taskIds.Contains(t.Id))
                .ToListAsync(ct);
            foreach (var task in tasks)
            {
                task.Status = SupervisionTaskStatus.Pending;
                task.SubmissionId = null;
                task.CompletedAt = null;
            }
            await _context.SaveChangesAsync(ct);
            return tasks.Count;
        }

        if (campaignId == null && formId == null)
            throw new ArgumentException("必須提供 campaignId、formId 或 taskIds 其中之一");

        var query = _context.SupervisionTasks.AsQueryable();

        if (campaignId.HasValue)
            query = query.Where(t => t.Factory.CampaignId == campaignId.Value);

        if (formId.HasValue)
            query = query.Where(t => t.FormId == formId.Value);

        var bulkTasks = await query.ToListAsync(ct);
        foreach (var task in bulkTasks)
        {
            task.Status = SupervisionTaskStatus.Pending;
            task.SubmissionId = null;
            task.CompletedAt = null;
        }
        await _context.SaveChangesAsync(ct);
        return bulkTasks.Count;
    }

    public async Task<List<SupervisionResponseDto>> GetCampaignResponsesAsync(Guid campaignId, Guid? formId, CancellationToken ct = default)
    {
        var query = _context.SupervisionTasks
            .Include(t => t.Factory)
            .Include(t => t.Agency)
            .Include(t => t.Submission).ThenInclude(s => s!.SubmittedBy)
            .Where(t => t.Factory.CampaignId == campaignId && t.SubmissionId != null)
            .AsNoTracking();

        if (formId.HasValue)
            query = query.Where(t => t.FormId == formId.Value);

        var tasks = await query
            .OrderBy(t => t.Agency.Name)
            .ThenBy(t => t.Factory.RiskRank)
            .ThenBy(t => t.Factory.FactoryName)
            .ToListAsync(ct);

        var result = new List<SupervisionResponseDto>();
        foreach (var task in tasks)
        {
            if (task.Submission == null) continue;

            var data = FormSubmissionDataHelper.ParseSubmissionData(task.Submission.SubmissionData);

            result.Add(new SupervisionResponseDto
            {
                TaskId = task.Id,
                FactoryName = task.Factory.FactoryName,
                FactoryRegistrationNo = task.Factory.FactoryRegistrationNo,
                AgencyName = task.Agency.Name,
                Region = task.Factory.Region,
                County = task.Factory.County,
                IndustrialPark = task.Factory.IndustrialPark,
                FormTypeName = task.FormTypeName,
                FormId = task.FormId,
                SubmittedAt = task.Submission.SubmittedAt,
                SubmittedByUsername = task.Submission.SubmittedBy?.Username,
                Data = data
            });
        }

        return result;
    }

    public async Task<List<SupervisionAgencyOptionDto>> GetCampaignAgenciesAsync(Guid campaignId, CancellationToken ct = default)
    {
        return await _context.SupervisionTasks
            .AsNoTracking()
            .Where(t => t.Factory.CampaignId == campaignId)
            .Select(t => new { t.AgencyId, t.Agency.Name })
            .Distinct()
            .OrderBy(a => a.Name)
            .Select(a => new SupervisionAgencyOptionDto(a.AgencyId, a.Name))
            .ToListAsync(ct);
    }

    public async Task<CampaignFactorySummaryDto> GetCampaignFactorySummaryAsync(Guid campaignId, CancellationToken ct = default)
    {
        var tasks = await _context.SupervisionTasks
            .Include(t => t.Factory)
            .Include(t => t.Submission)
            .Where(t => t.Factory.CampaignId == campaignId)
            .AsNoTracking()
            .ToListAsync(ct);

        // 此計畫實際用到的表單，依第一次出現的順序去重（同一張表單在不同機關/工廠底下
        // FormTypeName 應該一致，用第一筆代表）
        var formsInCampaign = tasks
            .Where(t => t.FormId.HasValue)
            .GroupBy(t => t.FormId!.Value)
            .Select(g => (FormId: g.Key, FormTypeName: g.First().FormTypeName))
            .ToList();

        var formIds = formsInCampaign.Select(f => f.FormId).ToList();
        var formSchemaById = await _context.Forms
            .Where(f => formIds.Contains(f.Id))
            .Select(f => new { f.Id, f.Schema })
            .AsNoTracking()
            .ToDictionaryAsync(f => f.Id, f => f.Schema, ct);

        // 每張表單各自的「督導結果」欄位（欄位 name + 選項 value→文字），解析一次快取起來
        var resultFieldByFormId = formsInCampaign.ToDictionary(
            f => f.FormId,
            f => formSchemaById.TryGetValue(f.FormId, out var schemaJson) ? FindSupervisionResultField(schemaJson) : null);

        var items = tasks
            .GroupBy(t => t.SupervisedFactoryId)
            .Select(group =>
            {
                var factory = group.First().Factory;
                var dto = new FactorySupervisionSummaryDto
                {
                    FactoryId = factory.Id,
                    FactoryName = factory.FactoryName,
                    FactoryRegistrationNo = factory.FactoryRegistrationNo,
                    Region = factory.Region,
                    County = factory.County,
                    IndustrialPark = factory.IndustrialPark,
                };

                foreach (var f in formsInCampaign)
                {
                    var task = group.FirstOrDefault(t => t.FormId == f.FormId);
                    dto.Results[f.FormTypeName] = ResolveSupervisionResultText(task, resultFieldByFormId[f.FormId]);
                }

                return dto;
            })
            .OrderBy(i => i.FactoryName)
            .ToList();

        return new CampaignFactorySummaryDto
        {
            FormTypeNames = formsInCampaign.Select(f => f.FormTypeName).ToList(),
            Items = items,
        };
    }

    private static string ResolveSupervisionResultText(
        SupervisionTask? task, (string FieldName, Dictionary<string, string> OptionLabels)? resultField)
    {
        if (task == null) return "未指派";
        if (task.Status != SupervisionTaskStatus.Completed || task.Submission == null) return "未填寫";
        if (resultField == null) return "（表單無督導結果欄位）";

        try
        {
            using var doc = JsonDocument.Parse(task.Submission.SubmissionData);
            var root = doc.RootElement;
            var dataEl = root.TryGetProperty("data", out var d) ? d : root;

            if (!dataEl.TryGetProperty(resultField.Value.FieldName, out var valueEl))
                return "未填寫";

            var rawValue = valueEl.ValueKind == JsonValueKind.String ? valueEl.GetString() : valueEl.ToString();
            if (string.IsNullOrWhiteSpace(rawValue)) return "未填寫";

            return resultField.Value.OptionLabels.TryGetValue(rawValue, out var label) ? label : rawValue;
        }
        catch
        {
            return "（無法解析）";
        }
    }

    /// <summary>
    /// 在表單 schema 裡遞迴找 label（去除 HTML 標籤後）為「督導結果」的欄位，
    /// 回傳欄位 name 以及選項 value→文字 的對照（給 <see cref="ResolveSupervisionResultText"/> 解析填寫值用）。
    /// </summary>
    private static (string FieldName, Dictionary<string, string> OptionLabels)? FindSupervisionResultField(string schemaJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(schemaJson);
            if (!doc.RootElement.TryGetProperty("pages", out var pages))
                return null;

            foreach (var page in pages.EnumerateArray())
            {
                if (page.TryGetProperty("fields", out var fields))
                {
                    var found = FindSupervisionResultFieldRecursive(fields);
                    if (found != null) return found;
                }
            }
        }
        catch
        {
            // schema 格式不符預期就當作找不到，讓呼叫端顯示對應的預設文案
        }
        return null;
    }

    private static (string FieldName, Dictionary<string, string> OptionLabels)? FindSupervisionResultFieldRecursive(JsonElement fields)
    {
        foreach (var field in fields.EnumerateArray())
        {
            var rawLabel = field.TryGetProperty("label", out var l) ? l.GetString() ?? "" : "";
            var cleanLabel = System.Text.RegularExpressions.Regex.Replace(rawLabel, "<[^>]*>", "").Trim();

            if (cleanLabel == "督導結果" && field.TryGetProperty("name", out var nameEl))
            {
                var optionLabels = new Dictionary<string, string>();
                if (field.TryGetProperty("properties", out var props) &&
                    props.TryGetProperty("options", out var options) &&
                    options.ValueKind == JsonValueKind.Array)
                {
                    foreach (var opt in options.EnumerateArray())
                    {
                        var value = opt.TryGetProperty("value", out var v) ? v.GetString() : null;
                        var optLabel = opt.TryGetProperty("label", out var ol) ? ol.GetString() : null;
                        if (value != null && optLabel != null)
                            optionLabels[value] = optLabel;
                    }
                }
                return (nameEl.GetString() ?? "", optionLabels);
            }

            // 遞迴找 panel/paneldynamic 裡巢狀的欄位
            if (field.TryGetProperty("properties", out var nestedProps) &&
                nestedProps.TryGetProperty("fields", out var nestedFields) &&
                nestedFields.ValueKind == JsonValueKind.Array)
            {
                var nested = FindSupervisionResultFieldRecursive(nestedFields);
                if (nested != null) return nested;
            }
        }
        return null;
    }


    private static CampaignDto ToCampaignDto(SupervisionCampaign c)
    {
        var allTasks = c.Factories.SelectMany(f => f.Tasks).ToList();
        return new CampaignDto
        {
            Id = c.Id,
            Year = c.Year,
            Name = c.Name,
            Description = c.Description,
            Status = c.Status.ToString(),
            CreatedAt = c.CreatedAt,
            FactoryCount = c.Factories.Count,
            TaskCount = allTasks.Count,
            CompletedTaskCount = allTasks.Count(t => t.Status == SupervisionTaskStatus.Completed),
            FormProjectId = c.FormProjectId
        };
    }

    private static SupervisionTaskDto ToTaskDto(SupervisionTask t) => new()
    {
        Id = t.Id,
        Status = t.Status.ToString(),
        FactoryId = t.SupervisedFactoryId,
        FactoryName = t.Factory.FactoryName,
        FactoryRegistrationNo = t.Factory.FactoryRegistrationNo,
        IndustrialPark = t.Factory.IndustrialPark,
        Region = t.Factory.Region,
        County = t.Factory.County,
        RiskRank = t.Factory.RiskRank,
        FormTypeName = t.FormTypeName,
        FormId = t.FormId,
        SubmissionId = t.SubmissionId,
        AgencyId = t.AgencyId,
        AgencyName = t.Agency.Name,
        CompletedAt = t.CompletedAt,
        SubmittedByUsername = t.Submission?.SubmittedBy?.Username,
        SubmittedAt = t.Submission?.SubmittedAt,
        CampaignId = t.Factory.CampaignId,
        CampaignName = t.Factory.Campaign.Name,
        CampaignYear = t.Factory.Campaign.Year
    };

    private static SupervisedFactoryDto ToFactoryDto(SupervisedFactory f) => new()
    {
        Id = f.Id,
        CampaignId = f.CampaignId,
        RiskRank = f.RiskRank,
        FactoryRegistrationNo = f.FactoryRegistrationNo,
        FactoryName = f.FactoryName,
        FactoryAddress = f.FactoryAddress,
        IndustryCategory = f.IndustryCategory,
        IndustrialPark = f.IndustrialPark,
        Region = f.Region,
        County = f.County,
        TaskCount = f.Tasks.Count,
        CompletedTaskCount = f.Tasks.Count(t => t.Status == SupervisionTaskStatus.Completed),
    };

    // ─── 地圖資料 ───

    public async Task<List<CampaignMapFactoryDto>> GetMapFactoriesAsync(Guid campaignId, Guid userId, Guid? schemeId = null, int? dataYear = null, CancellationToken ct = default)
    {
        // 優先使用傳入的 schemeId，否則取 active 或最新年度標準
        var resolvedSchemeId = schemeId
            ?? await _context.RiskScoringSchemes
                .Where(s => s.IsActive)
                .OrderByDescending(s => s.Year)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync(ct)
            ?? await _context.RiskScoringSchemes
                .OrderByDescending(s => s.Year)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync(ct);

        Features.FactoryRisk.DTOs.FactoryRiskRankingResultDto? ranking = null;
        if (resolvedSchemeId.HasValue)
        {
            try { ranking = await _rankingService.GetRankingAsync(resolvedSchemeId.Value, dataYear, ct); }
            catch { }
        }

        var rankByRegNo = ranking?.Items
            .Where(i => i.FactoryRegistrationNo != null)
            .ToDictionary(i => i.FactoryRegistrationNo!, i => i)
            ?? new Dictionary<string, Features.FactoryRisk.DTOs.FactoryRiskRankingItemDto>();

        decimal minScore = ranking?.Items.Count > 0 ? ranking.Items.Min(i => i.RiskScore) : 0;
        decimal maxScore = ranking?.Items.Count > 0 ? ranking.Items.Max(i => i.RiskScore) : 1;
        decimal scoreRange = maxScore - minScore;

        var resolvedYear = dataYear
            ?? await _context.FactoryRiskInputs.MaxAsync(i => (int?)i.DataYear, ct);

        if (resolvedYear == null) return [];

        // 督導計畫內的工廠（用於過濾與取得補充資訊）
        var supervisionByRegNo = await _context.SupervisedFactories
            .Where(f => f.CampaignId == campaignId && f.FactoryRegistrationNo != null)
            .AsNoTracking()
            .ToDictionaryAsync(f => f.FactoryRegistrationNo!, ct);

        if (supervisionByRegNo.Count == 0) return [];

        // 從 FactoryRiskInputs 取該年度有風險資料且在計畫內的工廠
        var riskFactories = await _context.FactoryRiskInputs
            .Where(i => i.DataYear == resolvedYear && supervisionByRegNo.Keys.Contains(i.Factory.FactoryRegistrationNo!))
            .Include(i => i.Factory)
            .AsNoTracking()
            .OrderBy(i => i.Factory.FactoryName)
            .ToListAsync(ct);

        var regNos = riskFactories
            .Select(i => i.Factory.FactoryRegistrationNo)
            .Where(r => r != null)
            .Distinct()
            .ToList();

        var mastersByRegNo = regNos.Count > 0
            ? await _context.FactoryMasters
                .Where(m => regNos.Contains(m.FactoryRegistrationNo))
                .AsNoTracking()
                .ToDictionaryAsync(m => m.FactoryRegistrationNo, ct)
            : new Dictionary<string, FactoryMaster>();

        return riskFactories.Select(ri =>
        {
            var regNo = ri.Factory.FactoryRegistrationNo;
            mastersByRegNo.TryGetValue(regNo, out var master);
            supervisionByRegNo.TryGetValue(regNo, out var supervised);
            rankByRegNo.TryGetValue(regNo, out var rankItem);

            int normalizedScore = rankItem == null ? 0
                : scoreRange == 0 ? 50
                : (int)Math.Round(100m * (rankItem.RiskScore - minScore) / scoreRange);

            return new CampaignMapFactoryDto
            {
                SupervisedFactoryId   = supervised?.Id ?? ri.FactoryId,
                FactoryName           = ri.Factory.FactoryName,
                FactoryRegistrationNo = regNo,
                County                = master?.County ?? supervised?.County,
                Address               = master?.Address ?? supervised?.FactoryAddress,
                IndustrialPark        = supervised?.IndustrialPark,
                Lat                   = master?.Lat,
                Lng                   = master?.Lng,
                RiskRank              = rankItem?.Rank,
                RiskScore             = normalizedScore,
                RawRiskScore          = rankItem?.RiskScore,
            };
        }).ToList();
    }

    public async Task<List<CampaignMapFactoryDto>> GetAllRiskMapFactoriesAsync(int? dataYear = null, Guid? schemeId = null, CancellationToken ct = default)
    {
        // 優先使用傳入的 schemeId，否則取 active 或最新年度標準
        var resolvedSchemeId = schemeId
            ?? await _context.RiskScoringSchemes
                .Where(s => s.IsActive)
                .OrderByDescending(s => s.Year)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync(ct)
            ?? await _context.RiskScoringSchemes
                .OrderByDescending(s => s.Year)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync(ct);

        Features.FactoryRisk.DTOs.FactoryRiskRankingResultDto? ranking = null;
        if (resolvedSchemeId.HasValue)
        {
            try { ranking = await _rankingService.GetRankingAsync(resolvedSchemeId.Value, dataYear, ct); }
            catch { }
        }

        var rankByRegNo = ranking?.Items
            .Where(i => i.FactoryRegistrationNo != null)
            .ToDictionary(i => i.FactoryRegistrationNo!, i => i)
            ?? new Dictionary<string, Features.FactoryRisk.DTOs.FactoryRiskRankingItemDto>();

        decimal minScore = ranking?.Items.Count > 0 ? ranking.Items.Min(i => i.RiskScore) : 0;
        decimal maxScore = ranking?.Items.Count > 0 ? ranking.Items.Max(i => i.RiskScore) : 1;
        decimal scoreRange = maxScore - minScore;

        var resolvedYear = dataYear
            ?? await _context.FactoryRiskInputs.MaxAsync(i => (int?)i.DataYear, ct);

        if (resolvedYear == null) return [];

        var riskFactories = await _context.FactoryRiskInputs
            .Where(i => i.DataYear == resolvedYear)
            .Include(i => i.Factory)
            .AsNoTracking()
            .OrderBy(i => i.Factory.FactoryName)
            .ToListAsync(ct);

        var regNos = riskFactories
            .Select(i => i.Factory.FactoryRegistrationNo)
            .Where(r => r != null)
            .Distinct()
            .ToList();

        var mastersByRegNo = regNos.Count > 0
            ? await _context.FactoryMasters
                .Where(m => regNos.Contains(m.FactoryRegistrationNo))
                .AsNoTracking()
                .ToDictionaryAsync(m => m.FactoryRegistrationNo, ct)
            : new Dictionary<string, FactoryMaster>();

        return riskFactories.Select(ri =>
        {
            var regNo = ri.Factory.FactoryRegistrationNo;
            mastersByRegNo.TryGetValue(regNo, out var master);
            rankByRegNo.TryGetValue(regNo, out var rankItem);

            int normalizedScore = rankItem == null ? 0
                : scoreRange == 0 ? 50
                : (int)Math.Round(100m * (rankItem.RiskScore - minScore) / scoreRange);

            return new CampaignMapFactoryDto
            {
                SupervisedFactoryId   = ri.FactoryId,
                FactoryName           = ri.Factory.FactoryName,
                FactoryRegistrationNo = regNo,
                County                = master?.County,
                Address               = master?.Address,
                IndustrialPark        = ri.Factory.IndustrialPark,
                Lat                   = master?.Lat,
                Lng                   = master?.Lng,
                RiskRank              = rankItem?.Rank,
                RiskScore             = normalizedScore,
                RawRiskScore          = rankItem?.RiskScore,
            };
        }).ToList();
    }

    // ─── 工廠 CRUD ───

    public async Task<List<SupervisedFactoryDto>> GetFactoriesAsync(Guid campaignId, CancellationToken ct = default)
    {
        return await _context.SupervisedFactories
            .Include(f => f.Tasks)
            .Where(f => f.CampaignId == campaignId)
            .AsNoTracking()
            .OrderBy(f => f.RiskRank)
            .ThenBy(f => f.FactoryName)
            .Select(f => ToFactoryDto(f))
            .ToListAsync(ct);
    }

    public async Task<SupervisedFactoryDto> GetFactoryByIdAsync(Guid factoryId, CancellationToken ct = default)
    {
        var factory = await _context.SupervisedFactories
            .Include(f => f.Tasks)
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == factoryId, ct)
            ?? throw new KeyNotFoundException($"工廠 {factoryId} 不存在");

        return ToFactoryDto(factory);
    }

    public async Task<Guid> CreateFactoryAsync(Guid campaignId, CreateFactoryRequest request, CancellationToken ct = default)
    {
        _ = await _context.SupervisionCampaigns.FindAsync([campaignId], ct)
            ?? throw new KeyNotFoundException($"督導計畫 {campaignId} 不存在");

        var factory = new SupervisedFactory
        {
            Id = Guid.NewGuid(),
            CampaignId = campaignId,
            RiskRank = request.RiskRank,
            FactoryRegistrationNo = request.FactoryRegistrationNo,
            FactoryName = request.FactoryName,
            FactoryAddress = request.FactoryAddress,
            IndustryCategory = request.IndustryCategory,
            IndustrialPark = request.IndustrialPark,
            Region = request.Region,
            County = request.County,
        };

        _context.SupervisedFactories.Add(factory);
        await _context.SaveChangesAsync(ct);

        // 有登記編號的話，把這個名稱同步到全資料庫其他掛同一個登記編號的工廠身分
        await _identitySyncService.SyncFactoryNameAsync(factory.FactoryRegistrationNo, factory.FactoryName, ct);

        return factory.Id;
    }

    public async Task<SupervisedFactoryDto> UpdateFactoryAsync(Guid factoryId, UpdateFactoryRequest request, CancellationToken ct = default)
    {
        var factory = await _context.SupervisedFactories
            .Include(f => f.Tasks)
            .FirstOrDefaultAsync(f => f.Id == factoryId, ct)
            ?? throw new KeyNotFoundException($"工廠 {factoryId} 不存在");

        factory.RiskRank = request.RiskRank;
        factory.FactoryRegistrationNo = request.FactoryRegistrationNo;
        factory.FactoryName = request.FactoryName;
        factory.FactoryAddress = request.FactoryAddress;
        factory.IndustryCategory = request.IndustryCategory;
        factory.IndustrialPark = request.IndustrialPark;
        factory.Region = request.Region;
        factory.County = request.County;

        await _context.SaveChangesAsync(ct);

        await _identitySyncService.SyncFactoryNameAsync(factory.FactoryRegistrationNo, factory.FactoryName, ct);

        return ToFactoryDto(factory);
    }

    public async Task<List<FactoryRegistrationNoSuggestionDto>> GetRegistrationNoSuggestionsAsync(CancellationToken ct = default)
    {
        var missingFactories = await _context.SupervisedFactories
            .Include(f => f.Campaign)
            .Where(f => f.FactoryRegistrationNo == null || f.FactoryRegistrationNo == "")
            .AsNoTracking()
            .ToListAsync(ct);

        if (missingFactories.Count == 0) return new List<FactoryRegistrationNoSuggestionDto>();

        // 依名稱完全比對 FactoryMaster（全台工廠主資料），一次查完再分組，避免每筆工廠都各打一次 DB
        var names = missingFactories.Select(f => f.FactoryName).Distinct().ToList();
        var candidatesByName = await _context.FactoryMasters
            .Where(m => names.Contains(m.FactoryName))
            .AsNoTracking()
            .ToListAsync(ct);
        var candidatesLookup = candidatesByName
            .GroupBy(m => m.FactoryName)
            .ToDictionary(g => g.Key, g => g.Select(m => new FactoryMasterCandidateDto
            {
                FactoryRegistrationNo = m.FactoryRegistrationNo,
                FactoryName = m.FactoryName,
                Address = m.Address,
                County = m.County,
            }).ToList());

        return missingFactories
            .OrderBy(f => f.Campaign.Year).ThenBy(f => f.FactoryName)
            .Select(f => new FactoryRegistrationNoSuggestionDto
            {
                FactoryId = f.Id,
                FactoryName = f.FactoryName,
                FactoryAddress = f.FactoryAddress,
                CampaignYear = f.Campaign.Year,
                CampaignName = f.Campaign.Name,
                Candidates = candidatesLookup.GetValueOrDefault(f.FactoryName, new List<FactoryMasterCandidateDto>()),
            })
            .ToList();
    }

    public async Task ApplyRegistrationNoAsync(Guid factoryId, string registrationNo, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(registrationNo))
            throw new InvalidOperationException("登記編號不能是空的");

        var factory = await _context.SupervisedFactories.FirstOrDefaultAsync(f => f.Id == factoryId, ct)
            ?? throw new KeyNotFoundException($"工廠 {factoryId} 不存在");

        factory.FactoryRegistrationNo = registrationNo.Trim();
        await _context.SaveChangesAsync(ct);

        // 補上登記編號後，順便把名稱同步一次——理論上是依名稱比對出來的候選項，名稱應該已經
        // 一致，但如果使用者手動改過候選建議的登記編號，這裡可以順便把 FactoryMaster／
        // 原始資料維護的名稱拉齊
        await _identitySyncService.SyncFactoryNameAsync(factory.FactoryRegistrationNo, factory.FactoryName, ct);
    }

    public async Task DeleteFactoryAsync(Guid factoryId, CancellationToken ct = default)
    {
        var factory = await _context.SupervisedFactories
            .Include(f => f.Tasks)
            .FirstOrDefaultAsync(f => f.Id == factoryId, ct)
            ?? throw new KeyNotFoundException($"工廠 {factoryId} 不存在");

        // 刪除相關任務
        _context.SupervisionTasks.RemoveRange(factory.Tasks);
        _context.SupervisedFactories.Remove(factory);
        await _context.SaveChangesAsync(ct);
    }

    // ─── 機關綁定工廠 ───

    public async Task<List<SupervisedFactoryDto>> GetAgencyFactoriesAsync(Guid agencyId, Guid campaignId, CancellationToken ct = default)
    {
        // 找出此機關在該計畫中有任務的所有工廠
        var factoryIds = await _context.SupervisionTasks
            .Include(t => t.Factory)
            .Where(t => t.AgencyId == agencyId && t.Factory.CampaignId == campaignId)
            .Select(t => t.SupervisedFactoryId)
            .Distinct()
            .ToListAsync(ct);

        return await _context.SupervisedFactories
            .Include(f => f.Tasks)
            .Where(f => factoryIds.Contains(f.Id))
            .AsNoTracking()
            .OrderBy(f => f.RiskRank)
            .ThenBy(f => f.FactoryName)
            .Select(f => ToFactoryDto(f))
            .ToListAsync(ct);
    }

    public async Task<BindFactoryResult> BindFactoryToAgencyAsync(Guid agencyId, Guid factoryId, CancellationToken ct = default)
    {
        var agency = await _context.Agencies
            .Include(a => a.FormTypes)
            .FirstOrDefaultAsync(a => a.Id == agencyId, ct)
            ?? throw new KeyNotFoundException($"機關 {agencyId} 不存在");

        var factory = await _context.SupervisedFactories.FindAsync([factoryId], ct)
            ?? throw new KeyNotFoundException($"工廠 {factoryId} 不存在");

        // 檢查是否已有任務（避免重複綁定）
        var existingTaskCount = await _context.SupervisionTasks
            .CountAsync(t => t.AgencyId == agencyId && t.SupervisedFactoryId == factoryId, ct);

        if (existingTaskCount > 0)
            return new BindFactoryResult { TasksCreated = 0 };

        // 為機關的每個 AgencyFormType 建立 SupervisionTask
        int created = 0;
        foreach (var ft in agency.FormTypes)
        {
            _context.SupervisionTasks.Add(new SupervisionTask
            {
                Id = Guid.NewGuid(),
                SupervisedFactoryId = factoryId,
                AgencyId = agencyId,
                FormTypeName = ft.FormTypeName,
                FormId = ft.FormId,
                Status = SupervisionTaskStatus.Pending,
            });
            created++;
        }

        // 若機關沒有 FormType，至少建立一筆空白任務
        if (agency.FormTypes.Count == 0)
        {
            _context.SupervisionTasks.Add(new SupervisionTask
            {
                Id = Guid.NewGuid(),
                SupervisedFactoryId = factoryId,
                AgencyId = agencyId,
                FormTypeName = "(未設定)",
                Status = SupervisionTaskStatus.Pending,
            });
            created++;
        }

        await _context.SaveChangesAsync(ct);
        return new BindFactoryResult { TasksCreated = created };
    }

    public async Task<UnbindFactoryResult> UnbindFactoryFromAgencyAsync(Guid agencyId, Guid factoryId, CancellationToken ct = default)
    {
        var tasks = await _context.SupervisionTasks
            .Where(t => t.AgencyId == agencyId && t.SupervisedFactoryId == factoryId)
            .ToListAsync(ct);

        _context.SupervisionTasks.RemoveRange(tasks);
        await _context.SaveChangesAsync(ct);
        return new UnbindFactoryResult { TasksRemoved = tasks.Count };
    }

    // ─── 產業園區管理 ───

    public async Task<List<string>> GetDistinctIndustrialParksAsync(CancellationToken ct = default)
    {
        return await _context.SupervisedFactories
            .Where(f => f.IndustrialPark != null && f.IndustrialPark != string.Empty)
            .Select(f => f.IndustrialPark!)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync(ct);
    }

    public async Task SetUserIndustrialParksAsync(Guid userId, List<string> parkNames, CancellationToken ct = default)
    {
        // 移除舊的綁定
        var existing = await _context.UserIndustrialParks
            .Where(p => p.UserId == userId)
            .ToListAsync(ct);
        _context.UserIndustrialParks.RemoveRange(existing);

        // 新增新的綁定
        foreach (var name in parkNames.Where(n => !string.IsNullOrWhiteSpace(n)).Distinct())
        {
            _context.UserIndustrialParks.Add(new Domain.Entities.UserIndustrialPark
            {
                UserId = userId,
                IndustrialParkName = name.Trim()
            });
        }

        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<string>> GetUserIndustrialParksAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.UserIndustrialParks
            .Where(p => p.UserId == userId)
            .Select(p => p.IndustrialParkName)
            .OrderBy(p => p)
            .ToListAsync(ct);
    }

    // ─── 風險工廠排行資料 ───

    public async Task<HashSet<string>> GetCampaignFactoryRegNosAsync(Guid campaignId, CancellationToken ct = default)
    {
        var regNos = await _context.SupervisedFactories
            .Where(f => f.CampaignId == campaignId && f.FactoryRegistrationNo != null)
            .Select(f => f.FactoryRegistrationNo!)
            .ToListAsync(ct);
        return [.. regNos];
    }

    public async Task<List<CampaignMapFactoryDto>> GetRiskRanks(Guid campaignId, Guid schemeId, CancellationToken ct = default)
    {
        // 取得此評分標準的排名（現場計算）
        Features.FactoryRisk.DTOs.FactoryRiskRankingResultDto ranking;
        try
        {
            ranking = await _rankingService.GetRankingAsync(schemeId, null, ct);
        }
        catch (KeyNotFoundException)
        {
            ranking = new Features.FactoryRisk.DTOs.FactoryRiskRankingResultDto([], [], null);
        }

        var rankByRegNo = ranking.Items
            .Where(i => !string.IsNullOrEmpty(i.FactoryRegistrationNo))
            .ToDictionary(i => i.FactoryRegistrationNo!, i => i);
        var rankByName = ranking.Items
            .GroupBy(i => i.FactoryName)
            .ToDictionary(g => g.Key, g => g.First());

        // 取得此督導計畫的工廠清單
        var factories = await _context.SupervisedFactories
            .Where(f => f.CampaignId == campaignId)
            .AsNoTracking()
            .OrderBy(f => f.FactoryName)
            .ToListAsync(ct);

        // 從 FactoryMaster 取得座標
        var regNos = factories
            .Where(f => !string.IsNullOrEmpty(f.FactoryRegistrationNo))
            .Select(f => f.FactoryRegistrationNo!)
            .Distinct().ToList();
        var names = factories
            .Where(f => string.IsNullOrEmpty(f.FactoryRegistrationNo))
            .Select(f => f.FactoryName)
            .Distinct().ToList();

        var mastersByRegNo = regNos.Count > 0
            ? await _context.FactoryMasters
                .Where(m => regNos.Contains(m.FactoryRegistrationNo))
                .AsNoTracking()
                .ToDictionaryAsync(m => m.FactoryRegistrationNo, ct)
            : new Dictionary<string, FactoryMaster>();

        var mastersByName = names.Count > 0
            ? await _context.FactoryMasters
                .Where(m => names.Contains(m.FactoryName))
                .AsNoTracking()
                .GroupBy(m => m.FactoryName)
                .ToDictionaryAsync(g => g.Key, g => g.First(), ct)
            : new Dictionary<string, FactoryMaster>();

        int total = ranking.Items.Count;

        return factories.Select(f =>
        {
            FactoryMaster? master = null;
            if (!string.IsNullOrEmpty(f.FactoryRegistrationNo))
                mastersByRegNo.TryGetValue(f.FactoryRegistrationNo, out master);
            else
                mastersByName.TryGetValue(f.FactoryName, out master);

            Features.FactoryRisk.DTOs.FactoryRiskRankingItemDto? rankItem = null;
            if (!string.IsNullOrEmpty(f.FactoryRegistrationNo))
                rankByRegNo.TryGetValue(f.FactoryRegistrationNo, out rankItem);
            if (rankItem == null)
                rankByName.TryGetValue(f.FactoryName, out rankItem);

            var effectiveRank = rankItem?.Rank ?? f.RiskRank;
            int score = effectiveRank.HasValue && total > 1
                ? Math.Max(0, 100 - (int)Math.Round(100.0 * (effectiveRank.Value - 1) / (total - 1)))
                : 50;

            return new CampaignMapFactoryDto
            {
                SupervisedFactoryId   = f.Id,
                FactoryName           = f.FactoryName,
                FactoryRegistrationNo = f.FactoryRegistrationNo ?? master?.FactoryRegistrationNo,
                County                = f.County ?? master?.County,
                Address               = master?.Address ?? f.FactoryAddress,
                IndustrialPark        = f.IndustrialPark,
                Lat                   = master?.Lat,
                Lng                   = master?.Lng,
                RiskRank              = effectiveRank,
                RiskScore             = score,
                RawRiskScore          = rankItem?.RiskScore,
            };
        }).ToList();
    }
}

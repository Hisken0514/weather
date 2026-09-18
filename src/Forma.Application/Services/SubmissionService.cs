using System.Text.Json;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Submissions.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 表單提交服務實作
/// </summary>
public class SubmissionService : ISubmissionService
{
    private readonly IApplicationDbContext _context;

    public SubmissionService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<PagedResult<SubmissionListDto>> GetFormSubmissionsAsync(
        GetFormSubmissionsRequest request,
        CancellationToken cancellationToken = default)
    {
        // 驗證表單存在並檢查權限
        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .FirstOrDefaultAsync(f => f.Id == request.FormId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 權限檢查：專案成員或系統管理員
        var isMember = form.Project.Members.Any(m => m.UserId == request.CurrentUserId);
        if (!request.IsSystemAdmin && !isMember)
        {
            throw new UnauthorizedAccessException();
        }

        var query = _context.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.SubmittedBy)
            .AsNoTracking()
            .Where(s => s.FormId == request.FormId);

        // 狀態篩選
        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<SubmissionStatus>(request.Status, true, out var status))
        {
            query = query.Where(s => s.Status == status);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = request.SortBy?.ToLower() switch
        {
            "status" => request.SortDescending
                ? query.OrderByDescending(s => s.Status)
                : query.OrderBy(s => s.Status),
            "submittedby" => request.SortDescending
                ? query.OrderByDescending(s => s.SubmittedBy != null ? s.SubmittedBy.Username : "")
                : query.OrderBy(s => s.SubmittedBy != null ? s.SubmittedBy.Username : ""),
            _ => request.SortDescending
                ? query.OrderByDescending(s => s.SubmittedAt)
                : query.OrderBy(s => s.SubmittedAt)
        };

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var submissions = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new SubmissionListDto
            {
                Id = s.Id,
                FormId = s.FormId,
                FormName = s.Form.Name,
                SubmittedById = s.SubmittedById,
                SubmittedByUsername = s.SubmittedBy != null ? s.SubmittedBy.Username : null,
                SubmittedAt = s.SubmittedAt,
                Status = s.Status.ToString(),
                ReviewedAt = s.ReviewedAt,
                ReportDownloadedAt = s.ReportDownloadedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<SubmissionListDto>
        {
            Items = submissions,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<SubmissionDto> GetSubmissionByIdAsync(
        Guid submissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var submission = await _context.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(s => s.SubmittedBy)
            .Include(s => s.ReviewedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken);

        if (submission == null)
        {
            throw new KeyNotFoundException("找不到提交記錄");
        }

        // 權限檢查：提交者本人、專案成員或系統管理員
        var isOwner = submission.SubmittedById == currentUserId;
        var isMember = submission.Project.Members.Any(m => m.UserId == currentUserId);

        if (!isSystemAdmin && !isOwner && !isMember)
        {
            // 後備：透過督導任務被指派此 submission 的機關使用者，允許讀取
            var userAgencyIds = await _context.AgencyUsers
                .Where(au => au.UserId == currentUserId)
                .Select(au => au.AgencyId)
                .ToListAsync(cancellationToken);

            var hasSupervisionAccess = userAgencyIds.Count > 0 &&
                await _context.SupervisionTasks
                    .AnyAsync(t => t.SubmissionId == submissionId &&
                                   userAgencyIds.Contains(t.AgencyId),
                               cancellationToken);

            // 後備：以產業園區身分判斷
            if (!hasSupervisionAccess)
            {
                var parkNames = await _context.UserIndustrialParks
                    .Where(p => p.UserId == currentUserId)
                    .Select(p => p.IndustrialParkName)
                    .ToListAsync(cancellationToken);

                hasSupervisionAccess = parkNames.Count > 0 &&
                    await _context.SupervisionTasks
                        .AnyAsync(t => t.SubmissionId == submissionId &&
                                       t.Factory.IndustrialPark != null &&
                                       parkNames.Contains(t.Factory.IndustrialPark),
                                   cancellationToken);
            }

            if (!hasSupervisionAccess)
                throw new UnauthorizedAccessException();
        }

        var isManager = submission.Project.Members.Any(m =>
            m.UserId == currentUserId &&
            (m.Role == ProjectRole.Owner || m.Role == ProjectRole.Manager));

        return new SubmissionDto
        {
            Id = submission.Id,
            FormId = submission.FormId,
            FormName = submission.Form.Name,
            ProjectId = submission.ProjectId,
            ProjectName = submission.Project.Name,
            SubmittedById = submission.SubmittedById,
            SubmittedByUsername = submission.SubmittedBy?.Username,
            SubmissionData = submission.SubmissionData,
            FormVersion = submission.FormVersion,
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt,
            Status = submission.Status.ToString(),
            ReviewedById = submission.ReviewedById,
            ReviewedByUsername = submission.ReviewedBy?.Username,
            ReviewedAt = submission.ReviewedAt,
            IpAddress = submission.IpAddress,
            ReportDownloadedAt = submission.ReportDownloadedAt,
            CanEdit = isOwner || isSystemAdmin,
            CanDelete = (isOwner && submission.Status == SubmissionStatus.Draft) || isSystemAdmin
        };
    }

    /// <inheritdoc />
    public async Task<Guid> CreateSubmissionAsync(
        CreateSubmissionRequest request,
        CancellationToken cancellationToken = default)
    {
        // 取得表單
        var form = await _context.Forms
            .Include(f => f.Project)
            .FirstOrDefaultAsync(f => f.Id == request.FormId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 檢查表單是否已發布
        if (form.PublishedAt == null)
        {
            throw new InvalidOperationException("表單尚未發布，無法提交");
        }

        // 檢查表單是否啟用
        if (!form.IsActive)
        {
            throw new InvalidOperationException("表單已停用，無法提交");
        }

        // Extract __reportDownloadedAt from submission data
        DateTime? reportDownloadedAt = null;
        try
        {
            using var doc = JsonDocument.Parse(request.SubmissionData);
            if (doc.RootElement.TryGetProperty("__reportDownloadedAt", out var rdProp) &&
                rdProp.ValueKind == JsonValueKind.String &&
                DateTime.TryParse(rdProp.GetString(), out var rdVal))
            {
                reportDownloadedAt = rdVal.ToUniversalTime();
            }
        }
        catch { /* ignore parse errors */ }

        var submission = new FormSubmission
        {
            Id = Guid.CreateVersion7(),
            FormId = form.Id,
            ProjectId = form.ProjectId,
            SubmittedById = request.CurrentUserId,
            SubmissionData = request.SubmissionData,
            FormVersion = form.Version,
            SubmittedAt = DateTime.UtcNow,
            Status = request.IsDraft ? SubmissionStatus.Draft : SubmissionStatus.Submitted,
            IpAddress = request.IpAddress,
            ReportDownloadedAt = reportDownloadedAt
        };

        _context.FormSubmissions.Add(submission);
        await _context.SaveChangesAsync(cancellationToken);

        return submission.Id;
    }

    /// <inheritdoc />
    public async Task<SubmissionDto> UpdateSubmissionAsync(
        UpdateSubmissionRequest request,
        CancellationToken cancellationToken = default)
    {
        var submission = await _context.FormSubmissions
            .Include(s => s.Form)
            .Include(s => s.Project)
            .Include(s => s.SubmittedBy)
            .Include(s => s.ReviewedBy)
            .FirstOrDefaultAsync(s => s.Id == request.SubmissionId, cancellationToken);

        if (submission == null)
        {
            throw new KeyNotFoundException("找不到提交記錄");
        }

        // 權限檢查：提交者本人或系統管理員
        var isOwner = submission.SubmittedById == request.CurrentUserId;
        if (!request.IsSystemAdmin && !isOwner)
        {
            throw new UnauthorizedAccessException();
        }

        // 只有草稿或已提交狀態可以更新資料
        if (submission.Status != SubmissionStatus.Draft && submission.Status != SubmissionStatus.Submitted)
        {
            if (!request.IsSystemAdmin)
            {
                throw new InvalidOperationException("此提交記錄已審核，無法修改");
            }
        }

        submission.SubmissionData = request.SubmissionData;
        submission.UpdatedAt = DateTime.UtcNow;

        // Extract __reportDownloadedAt from submission data
        try
        {
            using var doc = JsonDocument.Parse(request.SubmissionData);
            if (doc.RootElement.TryGetProperty("__reportDownloadedAt", out var rdProp) &&
                rdProp.ValueKind == JsonValueKind.String &&
                DateTime.TryParse(rdProp.GetString(), out var rdVal))
            {
                submission.ReportDownloadedAt = rdVal.ToUniversalTime();
            }
        }
        catch { /* ignore parse errors */ }

        // 更新狀態
        if (!string.IsNullOrEmpty(request.Status) &&
            Enum.TryParse<SubmissionStatus>(request.Status, true, out var status))
        {
            // 審核操作
            if (status == SubmissionStatus.Approved || status == SubmissionStatus.Rejected)
            {
                submission.ReviewedById = request.CurrentUserId;
                submission.ReviewedAt = DateTime.UtcNow;
            }
            submission.Status = status;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new SubmissionDto
        {
            Id = submission.Id,
            FormId = submission.FormId,
            FormName = submission.Form.Name,
            ProjectId = submission.ProjectId,
            ProjectName = submission.Project.Name,
            SubmittedById = submission.SubmittedById,
            SubmittedByUsername = submission.SubmittedBy?.Username,
            SubmissionData = submission.SubmissionData,
            FormVersion = submission.FormVersion,
            SubmittedAt = submission.SubmittedAt,
            UpdatedAt = submission.UpdatedAt,
            Status = submission.Status.ToString(),
            ReviewedById = submission.ReviewedById,
            ReviewedByUsername = submission.ReviewedBy?.Username,
            ReviewedAt = submission.ReviewedAt,
            IpAddress = submission.IpAddress,
            ReportDownloadedAt = submission.ReportDownloadedAt,
            CanEdit = isOwner || request.IsSystemAdmin,
            CanDelete = isOwner || request.IsSystemAdmin
        };
    }

    /// <inheritdoc />
    public async Task RecordReportDownloadedAsync(
        Guid submissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var submission = await _context.FormSubmissions
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken);

        if (submission == null)
        {
            throw new KeyNotFoundException("找不到提交記錄");
        }

        // 權限檢查：提交者本人或系統管理員
        var isOwner = submission.SubmittedById == currentUserId;
        if (!isSystemAdmin && !isOwner)
        {
            throw new UnauthorizedAccessException();
        }

        submission.ReportDownloadedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task DeleteSubmissionAsync(
        Guid submissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var submission = await _context.FormSubmissions
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken);

        if (submission == null)
        {
            throw new KeyNotFoundException("找不到提交記錄");
        }

        // 權限檢查：提交者本人或系統管理員
        var isOwner = submission.SubmittedById == currentUserId;
        if (!isSystemAdmin && !isOwner)
        {
            throw new UnauthorizedAccessException();
        }

        // 只有草稿狀態可以刪除（除非是系統管理員）
        if (!isSystemAdmin && submission.Status != SubmissionStatus.Draft)
        {
            throw new InvalidOperationException("只能刪除草稿狀態的提交記錄");
        }

        _context.FormSubmissions.Remove(submission);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

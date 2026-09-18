using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Exports.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 匯出服務實作
/// </summary>
public class ExportService : IExportService
{
    private readonly IApplicationDbContext _context;

    public ExportService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<ExportDto> CreateExportAsync(
        CreateExportRequest request,
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

        // 權限檢查
        if (!request.IsSystemAdmin)
        {
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm =>
                    pm.ProjectId == form.ProjectId &&
                    pm.UserId == request.CurrentUserId &&
                    pm.RemovedAt == null,
                    cancellationToken);

            if (membership == null || membership.Role < ProjectRole.Analyst)
            {
                throw new UnauthorizedAccessException();
            }
        }

        // 取得使用者資訊
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.CurrentUserId, cancellationToken);

        // 建立匯出任務
        var export = new Export
        {
            Id = Guid.CreateVersion7(),
            FormId = request.FormId,
            Format = request.Format.ToUpperInvariant(),
            Filters = request.Filters,
            Status = "Pending",
            CreatedById = request.CurrentUserId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24) // 匯出檔案 24 小時後過期
        };

        _context.Exports.Add(export);
        await _context.SaveChangesAsync(cancellationToken);

        return new ExportDto
        {
            Id = export.Id,
            FormId = export.FormId,
            FormName = form.Name,
            Format = export.Format,
            Filters = export.Filters,
            Status = export.Status,
            FileName = export.FileName,
            FileSize = export.FileSize,
            RecordCount = export.RecordCount,
            ErrorMessage = export.ErrorMessage,
            CreatedById = export.CreatedById,
            CreatedByUsername = user?.Username ?? string.Empty,
            CreatedAt = export.CreatedAt,
            CompletedAt = export.CompletedAt,
            ExpiresAt = export.ExpiresAt
        };
    }

    /// <inheritdoc />
    public async Task<ExportDto> GetExportByIdAsync(
        Guid exportId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var export = await _context.Exports
            .Include(e => e.Form)
            .Include(e => e.CreatedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == exportId, cancellationToken);

        if (export == null)
        {
            throw new KeyNotFoundException("找不到匯出任務");
        }

        // 權限檢查
        if (!isSystemAdmin && export.CreatedById != currentUserId)
        {
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm =>
                    pm.ProjectId == export.Form.ProjectId &&
                    pm.UserId == currentUserId &&
                    pm.RemovedAt == null,
                    cancellationToken);

            if (membership == null || membership.Role < ProjectRole.Analyst)
            {
                throw new UnauthorizedAccessException();
            }
        }

        return new ExportDto
        {
            Id = export.Id,
            FormId = export.FormId,
            FormName = export.Form.Name,
            Format = export.Format,
            Filters = export.Filters,
            Status = export.Status,
            FileName = export.FileName,
            FileSize = export.FileSize,
            RecordCount = export.RecordCount,
            ErrorMessage = export.ErrorMessage,
            CreatedById = export.CreatedById,
            CreatedByUsername = export.CreatedBy.Username,
            CreatedAt = export.CreatedAt,
            CompletedAt = export.CompletedAt,
            ExpiresAt = export.ExpiresAt,
            DownloadUrl = export.Status == "Completed" ? $"/api/exports/{export.Id}/download" : null
        };
    }
}

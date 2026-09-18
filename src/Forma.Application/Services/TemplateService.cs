using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Templates.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 範本服務實作
/// </summary>
public class TemplateService : ITemplateService
{
    private readonly IApplicationDbContext _context;

    public TemplateService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<PagedResult<TemplateListDto>> GetTemplatesAsync(
        GetTemplatesRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.FormTemplates
            .Include(t => t.CreatedBy)
            .AsNoTracking();

        // 篩選：公開範本或自己建立的
        if (!request.IsSystemAdmin)
        {
            if (request.OnlyMine)
            {
                query = query.Where(t => t.CreatedById == request.CurrentUserId);
            }
            else
            {
                query = query.Where(t => t.IsPublic || t.CreatedById == request.CurrentUserId);
            }
        }

        // 公開篩選
        if (request.IsPublic.HasValue)
        {
            query = query.Where(t => t.IsPublic == request.IsPublic.Value);
        }

        // 搜尋
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.ToLower();
            query = query.Where(t =>
                t.Name.ToLower().Contains(term) ||
                (t.Description != null && t.Description.ToLower().Contains(term)));
        }

        // 分類篩選
        if (!string.IsNullOrWhiteSpace(request.Category))
        {
            query = query.Where(t => t.Category == request.Category);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = request.SortBy?.ToLower() switch
        {
            "name" => request.SortDescending
                ? query.OrderByDescending(t => t.Name)
                : query.OrderBy(t => t.Name),
            "usagecount" => request.SortDescending
                ? query.OrderByDescending(t => t.UsageCount)
                : query.OrderBy(t => t.UsageCount),
            "category" => request.SortDescending
                ? query.OrderByDescending(t => t.Category)
                : query.OrderBy(t => t.Category),
            _ => query.OrderByDescending(t => t.CreatedAt)
        };

        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var templates = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TemplateListDto
            {
                Id = t.Id,
                Name = t.Name,
                Description = t.Description,
                Category = t.Category,
                ThumbnailUrl = t.ThumbnailUrl,
                IsPublic = t.IsPublic,
                CreatedByUsername = t.CreatedBy.Username,
                CreatedAt = t.CreatedAt,
                UsageCount = t.UsageCount
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<TemplateListDto>
        {
            Items = templates,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<TemplateDto> GetTemplateByIdAsync(
        Guid templateId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var template = await _context.FormTemplates
            .Include(t => t.CreatedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == templateId, cancellationToken);

        if (template == null)
        {
            throw new KeyNotFoundException("找不到範本");
        }

        // 權限檢查：公開範本、建立者或系統管理員
        var isOwner = template.CreatedById == currentUserId;
        if (!template.IsPublic && !isOwner && !isSystemAdmin)
        {
            throw new UnauthorizedAccessException();
        }

        return new TemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Category = template.Category,
            Schema = template.Schema,
            ThumbnailUrl = template.ThumbnailUrl,
            IsPublic = template.IsPublic,
            CreatedById = template.CreatedById,
            CreatedByUsername = template.CreatedBy.Username,
            CreatedAt = template.CreatedAt,
            UpdatedAt = template.UpdatedAt,
            UsageCount = template.UsageCount,
            CanEdit = isOwner || isSystemAdmin,
            CanDelete = isOwner || isSystemAdmin
        };
    }

    /// <inheritdoc />
    public async Task<Guid> CreateTemplateAsync(
        CreateTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var template = new FormTemplate
        {
            Id = Guid.CreateVersion7(),
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Schema = request.Schema,
            ThumbnailUrl = request.ThumbnailUrl,
            IsPublic = request.IsPublic,
            CreatedById = request.CurrentUserId,
            UsageCount = 0
        };

        _context.FormTemplates.Add(template);
        await _context.SaveChangesAsync(cancellationToken);

        return template.Id;
    }

    /// <inheritdoc />
    public async Task<TemplateDto> UpdateTemplateAsync(
        Guid templateId,
        UpdateTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var template = await _context.FormTemplates
            .Include(t => t.CreatedBy)
            .FirstOrDefaultAsync(t => t.Id == templateId, cancellationToken);

        if (template == null)
        {
            throw new KeyNotFoundException("找不到範本");
        }

        // 權限檢查：建立者或系統管理員
        if (!request.IsSystemAdmin && template.CreatedById != request.CurrentUserId)
        {
            throw new UnauthorizedAccessException();
        }

        template.Name = request.Name;
        template.Description = request.Description;
        template.Category = request.Category;
        template.Schema = request.Schema;
        template.ThumbnailUrl = request.ThumbnailUrl;

        if (request.IsPublic.HasValue)
        {
            template.IsPublic = request.IsPublic.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new TemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Category = template.Category,
            Schema = template.Schema,
            ThumbnailUrl = template.ThumbnailUrl,
            IsPublic = template.IsPublic,
            CreatedById = template.CreatedById,
            CreatedByUsername = template.CreatedBy.Username,
            CreatedAt = template.CreatedAt,
            UpdatedAt = template.UpdatedAt,
            UsageCount = template.UsageCount,
            CanEdit = true,
            CanDelete = true
        };
    }

    /// <inheritdoc />
    public async Task DeleteTemplateAsync(
        Guid templateId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var template = await _context.FormTemplates
            .Include(t => t.Forms)
            .FirstOrDefaultAsync(t => t.Id == templateId, cancellationToken);

        if (template == null)
        {
            throw new KeyNotFoundException("找不到範本");
        }

        // 權限檢查：建立者或系統管理員
        if (!isSystemAdmin && template.CreatedById != currentUserId)
        {
            throw new UnauthorizedAccessException();
        }

        // 檢查是否有表單使用此範本
        if (template.Forms.Any())
        {
            throw new InvalidOperationException("此範本已被表單使用，無法刪除");
        }

        _context.FormTemplates.Remove(template);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

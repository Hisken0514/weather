using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Organizations.DTOs;
using Forma.Application.Features.Projects.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 組織服務實作
/// </summary>
public class OrganizationService : IOrganizationService
{
    private readonly IApplicationDbContext _context;

    public OrganizationService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<PagedResult<OrganizationListDto>> GetOrganizationsAsync(
        GetOrganizationsRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Organizations
            .Include(o => o.Projects)
            .AsNoTracking();

        // 搜尋
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.ToLower();
            query = query.Where(o =>
                o.Name.ToLower().Contains(term) ||
                o.Code.ToLower().Contains(term) ||
                (o.Description != null && o.Description.ToLower().Contains(term)));
        }

        // 類型篩選
        if (!string.IsNullOrWhiteSpace(request.Type) &&
            Enum.TryParse<OrganizationType>(request.Type, true, out var type))
        {
            query = query.Where(o => o.Type == type);
        }

        // 計算總數
        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = request.SortBy?.ToLower() switch
        {
            "name" => request.SortDescending
                ? query.OrderByDescending(o => o.Name)
                : query.OrderBy(o => o.Name),
            "code" => request.SortDescending
                ? query.OrderByDescending(o => o.Code)
                : query.OrderBy(o => o.Code),
            "type" => request.SortDescending
                ? query.OrderByDescending(o => o.Type)
                : query.OrderBy(o => o.Type),
            "projectcount" => request.SortDescending
                ? query.OrderByDescending(o => o.Projects.Count)
                : query.OrderBy(o => o.Projects.Count),
            _ => query.OrderBy(o => o.Name)
        };

        // 分頁
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var organizations = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new OrganizationListDto
            {
                Id = o.Id,
                Name = o.Name,
                Code = o.Code,
                Type = o.Type.ToString(),
                ProjectCount = o.Projects.Count,
                CreatedAt = o.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<OrganizationListDto>
        {
            Items = organizations,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<OrganizationDto> GetOrganizationByIdAsync(
        Guid organizationId,
        CancellationToken cancellationToken = default)
    {
        var organization = await _context.Organizations
            .Include(o => o.Projects)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

        if (organization == null)
        {
            throw new KeyNotFoundException("找不到組織");
        }

        return new OrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Code = organization.Code,
            Description = organization.Description,
            Type = organization.Type.ToString(),
            CreatedAt = organization.CreatedAt,
            UpdatedAt = organization.UpdatedAt,
            ProjectCount = organization.Projects.Count
        };
    }

    /// <inheritdoc />
    public async Task<PagedResult<ProjectListDto>> GetOrganizationProjectsAsync(
        GetOrganizationProjectsRequest request,
        CancellationToken cancellationToken = default)
    {
        // 檢查組織是否存在
        var organizationExists = await _context.Organizations
            .AnyAsync(o => o.Id == request.OrganizationId, cancellationToken);

        if (!organizationExists)
        {
            throw new KeyNotFoundException("找不到組織");
        }

        var query = _context.Projects
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(p => p.Forms)
            .Where(p => p.OrganizationId == request.OrganizationId)
            .AsNoTracking();

        // 非系統管理員只能看到自己參與的專案
        if (!request.IsSystemAdmin)
        {
            query = query.Where(p => p.Members.Any(m =>
                m.UserId == request.CurrentUserId && m.RemovedAt == null));
        }

        // 搜尋
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(term) ||
                p.Code.ToLower().Contains(term) ||
                (p.Description != null && p.Description.ToLower().Contains(term)));
        }

        // 年度篩選
        if (request.Year.HasValue)
        {
            query = query.Where(p => p.Year == request.Year.Value);
        }

        // 狀態篩選
        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<ProjectStatus>(request.Status, true, out var status))
        {
            query = query.Where(p => p.Status == status);
        }

        // 計算總數
        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = request.SortBy?.ToLower() switch
        {
            "name" => request.SortDescending
                ? query.OrderByDescending(p => p.Name)
                : query.OrderBy(p => p.Name),
            "code" => request.SortDescending
                ? query.OrderByDescending(p => p.Code)
                : query.OrderBy(p => p.Code),
            "year" => request.SortDescending
                ? query.OrderByDescending(p => p.Year)
                : query.OrderBy(p => p.Year),
            "status" => request.SortDescending
                ? query.OrderByDescending(p => p.Status)
                : query.OrderBy(p => p.Status),
            "startdate" => request.SortDescending
                ? query.OrderByDescending(p => p.StartDate)
                : query.OrderBy(p => p.StartDate),
            _ => query.OrderByDescending(p => p.CreatedAt)
        };

        // 分頁
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var projects = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProjectListDto
            {
                Id = p.Id,
                Name = p.Name,
                Code = p.Code,
                Description = p.Description,
                Year = p.Year,
                Status = p.Status.ToString(),
                StartDate = p.StartDate,
                EndDate = p.EndDate,
                MemberCount = p.Members.Count(m => m.RemovedAt == null),
                FormCount = p.Forms.Count,
                CurrentUserRole = p.Members
                    .Where(m => m.UserId == request.CurrentUserId && m.RemovedAt == null)
                    .Select(m => m.Role.ToString())
                    .FirstOrDefault(),
                CreatedAt = p.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<ProjectListDto>
        {
            Items = projects,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<Guid> CreateOrganizationAsync(
        CreateOrganizationRequest request,
        CancellationToken cancellationToken = default)
    {
        // 檢查組織代碼是否已存在
        var codeExists = await _context.Organizations
            .AnyAsync(o => o.Code == request.Code, cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("組織代碼已存在");
        }

        var type = Enum.Parse<OrganizationType>(request.Type, true);

        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            Type = type,
            CreatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(organization);
        await _context.SaveChangesAsync(cancellationToken);

        return organization.Id;
    }

    /// <inheritdoc />
    public async Task<OrganizationDto> UpdateOrganizationAsync(
        Guid organizationId,
        UpdateOrganizationRequest request,
        CancellationToken cancellationToken = default)
    {
        var organization = await _context.Organizations
            .Include(o => o.Projects)
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

        if (organization == null)
        {
            throw new KeyNotFoundException("找不到組織");
        }

        organization.Name = request.Name;
        organization.Description = request.Description;
        organization.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(request.Type) &&
            Enum.TryParse<OrganizationType>(request.Type, true, out var type))
        {
            organization.Type = type;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new OrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            Code = organization.Code,
            Description = organization.Description,
            Type = organization.Type.ToString(),
            CreatedAt = organization.CreatedAt,
            UpdatedAt = organization.UpdatedAt,
            ProjectCount = organization.Projects.Count
        };
    }

    /// <inheritdoc />
    public async Task DeleteOrganizationAsync(
        Guid organizationId,
        CancellationToken cancellationToken = default)
    {
        var organization = await _context.Organizations
            .Include(o => o.Projects)
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

        if (organization == null)
        {
            throw new KeyNotFoundException("找不到組織");
        }

        // 檢查是否有專案
        if (organization.Projects.Any())
        {
            throw new InvalidOperationException("無法刪除含有專案的組織，請先刪除所有專案");
        }

        _context.Organizations.Remove(organization);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Projects.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 專案服務實作
/// </summary>
public class ProjectService : IProjectService
{
    private readonly IApplicationDbContext _context;

    public ProjectService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<PagedResult<ProjectListDto>> GetProjectsAsync(
        GetProjectsRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var query = _context.Projects
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(p => p.Forms)
            .AsNoTracking();

        // 非系統管理員只能看到自己參與的專案
        if (!isSystemAdmin || request.OnlyMyProjects)
        {
            query = query.Where(p => p.Members.Any(m =>
                m.UserId == currentUserId && m.RemovedAt == null));
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
                    .Where(m => m.UserId == currentUserId && m.RemovedAt == null)
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
    public async Task<ProjectDto> GetProjectByIdAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var project = await _context.Projects
            .Include(p => p.Organization)
            .Include(p => p.CreatedBy)
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(p => p.Forms)
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 檢查權限：必須是專案成員或系統管理員
        var isMember = project.Members.Any(m => m.UserId == currentUserId);
        if (!isMember && !isSystemAdmin)
        {
            throw new UnauthorizedAccessException("您沒有權限查看此專案");
        }

        var currentUserRole = project.Members
            .FirstOrDefault(m => m.UserId == currentUserId)?
            .Role.ToString();

        return new ProjectDto
        {
            Id = project.Id,
            OrganizationId = project.OrganizationId,
            OrganizationName = project.Organization?.Name ?? string.Empty,
            Name = project.Name,
            Code = project.Code,
            Description = project.Description,
            Year = project.Year,
            Budget = project.Budget,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            Status = project.Status.ToString(),
            CreatedById = project.CreatedById,
            CreatedByUsername = project.CreatedBy.Username,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            MemberCount = project.Members.Count,
            FormCount = project.Forms.Count,
            CurrentUserRole = currentUserRole,
            Settings = project.Settings
        };
    }

    /// <inheritdoc />
    public async Task<Guid> CreateProjectAsync(
        CreateProjectRequest request,
        Guid currentUserId,
        CancellationToken cancellationToken = default)
    {
        // 檢查專案代碼是否已存在
        var codeExists = await _context.Projects
            .AnyAsync(p => p.Code == request.Code, cancellationToken);

        if (codeExists)
        {
            throw new InvalidOperationException("專案代碼已存在");
        }

        // 建立專案
        var project = new Project
        {
            Id = Guid.NewGuid(),
            OrganizationId = request.OrganizationId,
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            Year = request.Year,
            Budget = request.Budget,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = ProjectStatus.Draft,
            CreatedById = currentUserId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Projects.Add(project);

        // 將建立者加入為專案擁有者
        var projectMember = new ProjectMember
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            UserId = currentUserId,
            Role = ProjectRole.Owner,
            AddedById = currentUserId,
            AddedAt = DateTime.UtcNow
        };

        _context.ProjectMembers.Add(projectMember);

        await _context.SaveChangesAsync(cancellationToken);

        return project.Id;
    }

    /// <inheritdoc />
    public async Task<ProjectDto> UpdateProjectAsync(
        Guid projectId,
        UpdateProjectRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var project = await _context.Projects
            .Include(p => p.Organization)
            .Include(p => p.CreatedBy)
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(p => p.Forms)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 檢查權限：必須是專案 Manager/Owner 或系統管理員
        var userMember = project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var canEdit = isSystemAdmin ||
                     (userMember != null &&
                      (userMember.Role == ProjectRole.Owner || userMember.Role == ProjectRole.Manager));

        if (!canEdit)
        {
            throw new UnauthorizedAccessException("您沒有權限編輯此專案");
        }

        // 更新專案資料
        project.Name = request.Name;
        project.Description = request.Description;
        project.Year = request.Year;
        project.Budget = request.Budget;
        project.StartDate = request.StartDate;
        project.EndDate = request.EndDate;
        project.Settings = request.Settings;
        project.UpdatedAt = DateTime.UtcNow;

        // 更新狀態（如果有提供）
        if (!string.IsNullOrEmpty(request.Status) &&
            Enum.TryParse<ProjectStatus>(request.Status, true, out var status))
        {
            project.Status = status;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new ProjectDto
        {
            Id = project.Id,
            OrganizationId = project.OrganizationId,
            OrganizationName = project.Organization?.Name ?? string.Empty,
            Name = project.Name,
            Code = project.Code,
            Description = project.Description,
            Year = project.Year,
            Budget = project.Budget,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            Status = project.Status.ToString(),
            CreatedById = project.CreatedById,
            CreatedByUsername = project.CreatedBy.Username,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            MemberCount = project.Members.Count,
            FormCount = project.Forms.Count,
            CurrentUserRole = userMember?.Role.ToString(),
            Settings = project.Settings
        };
    }

    /// <inheritdoc />
    public async Task DeleteProjectAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var project = await _context.Projects
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(p => p.Forms)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 檢查權限：必須是專案 Owner 或系統管理員
        var userMember = project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var canDelete = isSystemAdmin ||
                       (userMember != null && userMember.Role == ProjectRole.Owner);

        if (!canDelete)
        {
            throw new UnauthorizedAccessException("您沒有權限刪除此專案");
        }

        // 檢查專案是否有表單
        if (project.Forms.Any())
        {
            throw new InvalidOperationException("無法刪除含有表單的專案，請先刪除所有表單");
        }

        // 軟刪除所有成員關聯
        foreach (var member in project.Members)
        {
            member.RemovedAt = DateTime.UtcNow;
            member.RemovedById = currentUserId;
        }

        // 刪除專案
        _context.Projects.Remove(project);

        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<ProjectDto> ArchiveProjectAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var project = await _context.Projects
            .Include(p => p.Organization)
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(p => p.Forms)
            .Include(p => p.CreatedBy)
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 權限檢查：必須是專案擁有者或系統管理員
        var currentMember = project.Members.FirstOrDefault(m => m.UserId == currentUserId);
        var isOwner = currentMember?.Role == ProjectRole.Owner;

        if (!isSystemAdmin && !isOwner)
        {
            throw new UnauthorizedAccessException("只有專案擁有者或系統管理員可以封存專案");
        }

        // 檢查專案狀態
        if (project.Status == ProjectStatus.Archived)
        {
            throw new InvalidOperationException("專案已經封存");
        }

        // 封存專案
        project.Status = ProjectStatus.Archived;
        project.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new ProjectDto
        {
            Id = project.Id,
            OrganizationId = project.OrganizationId,
            OrganizationName = project.Organization?.Name ?? string.Empty,
            Name = project.Name,
            Code = project.Code,
            Description = project.Description,
            Year = project.Year,
            Budget = project.Budget,
            StartDate = project.StartDate,
            EndDate = project.EndDate,
            Status = project.Status.ToString(),
            CreatedById = project.CreatedById,
            CreatedByUsername = project.CreatedBy.Username,
            CreatedAt = project.CreatedAt,
            UpdatedAt = project.UpdatedAt,
            MemberCount = project.Members.Count,
            FormCount = project.Forms.Count,
            CurrentUserRole = currentMember?.Role.ToString(),
            Settings = project.Settings
        };
    }

    /// <inheritdoc />
    public async Task<List<ProjectMemberDto>> GetProjectMembersAsync(
        Guid projectId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 檢查專案是否存在
        var projectExists = await _context.Projects
            .AnyAsync(p => p.Id == projectId, cancellationToken);

        if (!projectExists)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 檢查權限：必須是專案成員或系統管理員
        var isMember = await _context.ProjectMembers
            .AnyAsync(m => m.ProjectId == projectId &&
                          m.UserId == currentUserId &&
                          m.RemovedAt == null, cancellationToken);

        if (!isMember && !isSystemAdmin)
        {
            throw new UnauthorizedAccessException("您沒有權限查看此專案的成員");
        }

        var members = await _context.ProjectMembers
            .Include(m => m.User)
            .Include(m => m.AddedBy)
            .Where(m => m.ProjectId == projectId && m.RemovedAt == null)
            .OrderByDescending(m => m.Role)
            .ThenBy(m => m.AddedAt)
            .Select(m => new ProjectMemberDto
            {
                UserId = m.UserId,
                Username = m.User.Username,
                Email = m.User.Email,
                Department = m.User.Department,
                JobTitle = m.User.JobTitle,
                Role = m.Role.ToString(),
                AddedAt = m.AddedAt,
                AddedById = m.AddedById,
                AddedByUsername = m.AddedBy.Username
            })
            .ToListAsync(cancellationToken);

        return members;
    }

    /// <inheritdoc />
    public async Task<ProjectMemberDto> AddProjectMemberAsync(
        Guid projectId,
        AddProjectMemberRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 檢查專案是否存在
        var project = await _context.Projects
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 檢查權限：必須是專案 Manager/Owner 或系統管理員
        var currentUserMember = project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var canManageMembers = isSystemAdmin ||
                              (currentUserMember != null &&
                               (currentUserMember.Role == ProjectRole.Owner ||
                                currentUserMember.Role == ProjectRole.Manager));

        if (!canManageMembers)
        {
            throw new UnauthorizedAccessException("您沒有權限管理此專案的成員");
        }

        // 檢查要新增的使用者是否存在
        var userToAdd = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (userToAdd == null)
        {
            throw new KeyNotFoundException("找不到使用者");
        }

        // 檢查使用者是否已是專案成員
        var existingMember = project.Members
            .FirstOrDefault(m => m.UserId == request.UserId);

        if (existingMember != null)
        {
            throw new InvalidOperationException("該使用者已是專案成員");
        }

        // 解析角色
        var role = Enum.Parse<ProjectRole>(request.Role, true);

        // 只有 Owner 或系統管理員可以新增 Owner/Manager
        if (role == ProjectRole.Owner || role == ProjectRole.Manager)
        {
            var isOwnerOrAdmin = isSystemAdmin ||
                                (currentUserMember != null && currentUserMember.Role == ProjectRole.Owner);

            if (!isOwnerOrAdmin)
            {
                throw new UnauthorizedAccessException("只有專案擁有者或系統管理員可以新增管理者角色");
            }
        }

        // 建立專案成員
        var projectMember = new ProjectMember
        {
            Id = Guid.NewGuid(),
            ProjectId = projectId,
            UserId = request.UserId,
            Role = role,
            AddedById = currentUserId,
            AddedAt = DateTime.UtcNow
        };

        _context.ProjectMembers.Add(projectMember);
        await _context.SaveChangesAsync(cancellationToken);

        // 載入關聯資料
        var addedBy = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        return new ProjectMemberDto
        {
            UserId = userToAdd.Id,
            Username = userToAdd.Username,
            Email = userToAdd.Email,
            Department = userToAdd.Department,
            JobTitle = userToAdd.JobTitle,
            Role = projectMember.Role.ToString(),
            AddedAt = projectMember.AddedAt,
            AddedById = projectMember.AddedById,
            AddedByUsername = addedBy?.Username ?? string.Empty
        };
    }

    /// <inheritdoc />
    public async Task<ProjectMemberDto> UpdateProjectMemberAsync(
        Guid projectId,
        Guid userId,
        UpdateProjectMemberRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 查詢專案成員
        var projectMember = await _context.ProjectMembers
            .Include(m => m.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(m => m.User)
            .Include(m => m.AddedBy)
            .FirstOrDefaultAsync(m =>
                m.ProjectId == projectId &&
                m.UserId == userId &&
                m.RemovedAt == null,
                cancellationToken);

        if (projectMember == null)
        {
            throw new KeyNotFoundException("找不到專案成員");
        }

        // 檢查權限：必須是專案 Owner 或系統管理員
        var currentUserMember = projectMember.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var isOwnerOrAdmin = isSystemAdmin ||
                            (currentUserMember != null && currentUserMember.Role == ProjectRole.Owner);

        if (!isOwnerOrAdmin)
        {
            throw new UnauthorizedAccessException("只有專案擁有者或系統管理員可以變更成員角色");
        }

        // 不能修改自己的角色
        if (userId == currentUserId)
        {
            throw new InvalidOperationException("無法修改自己的角色");
        }

        // 解析新角色
        var newRole = Enum.Parse<ProjectRole>(request.Role, true);

        // 如果將現有 Owner 降級，需要確保至少還有一個 Owner
        if (projectMember.Role == ProjectRole.Owner && newRole != ProjectRole.Owner)
        {
            var ownerCount = projectMember.Project.Members
                .Count(m => m.Role == ProjectRole.Owner);

            if (ownerCount <= 1)
            {
                throw new InvalidOperationException("專案至少需要一個擁有者");
            }
        }

        // 更新角色
        projectMember.Role = newRole;

        await _context.SaveChangesAsync(cancellationToken);

        return new ProjectMemberDto
        {
            UserId = projectMember.UserId,
            Username = projectMember.User.Username,
            Email = projectMember.User.Email,
            Department = projectMember.User.Department,
            JobTitle = projectMember.User.JobTitle,
            Role = projectMember.Role.ToString(),
            AddedAt = projectMember.AddedAt,
            AddedById = projectMember.AddedById,
            AddedByUsername = projectMember.AddedBy.Username
        };
    }

    /// <inheritdoc />
    public async Task RemoveProjectMemberAsync(
        Guid projectId,
        Guid userId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 查詢專案成員
        var projectMember = await _context.ProjectMembers
            .Include(m => m.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .FirstOrDefaultAsync(m =>
                m.ProjectId == projectId &&
                m.UserId == userId &&
                m.RemovedAt == null,
                cancellationToken);

        if (projectMember == null)
        {
            throw new KeyNotFoundException("找不到專案成員");
        }

        // 檢查權限
        var currentUserMember = projectMember.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        // 成員可以自行退出專案
        var isSelfRemoval = userId == currentUserId;

        // Manager/Owner 或系統管理員可以移除成員
        var canRemoveOthers = isSystemAdmin ||
                             (currentUserMember != null &&
                              (currentUserMember.Role == ProjectRole.Owner ||
                               currentUserMember.Role == ProjectRole.Manager));

        if (!isSelfRemoval && !canRemoveOthers)
        {
            throw new UnauthorizedAccessException("您沒有權限移除此成員");
        }

        // Manager 不能移除 Owner 或其他 Manager
        if (!isSystemAdmin &&
            currentUserMember != null &&
            currentUserMember.Role == ProjectRole.Manager &&
            projectMember.Role != ProjectRole.Member)
        {
            throw new UnauthorizedAccessException("管理者無法移除其他管理者或擁有者");
        }

        // 如果移除的是 Owner，需要確保至少還有一個 Owner
        if (projectMember.Role == ProjectRole.Owner)
        {
            var ownerCount = projectMember.Project.Members
                .Count(m => m.Role == ProjectRole.Owner);

            if (ownerCount <= 1)
            {
                throw new InvalidOperationException("專案至少需要一個擁有者，請先指派其他擁有者");
            }
        }

        // 軟刪除成員
        projectMember.RemovedAt = DateTime.UtcNow;
        projectMember.RemovedById = currentUserId;

        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<List<AvailableMemberDto>> GetAvailableMembersAsync(
        Guid projectId,
        GetAvailableMembersRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 驗證專案存在並檢查權限
        var project = await _context.Projects
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .FirstOrDefaultAsync(p => p.Id == projectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 權限檢查：必須是專案管理者或系統管理員
        var currentMember = project.Members.FirstOrDefault(m => m.UserId == currentUserId);
        var isManager = currentMember != null &&
            (currentMember.Role == ProjectRole.Owner || currentMember.Role == ProjectRole.Manager);

        if (!isSystemAdmin && !isManager)
        {
            throw new UnauthorizedAccessException("您沒有權限查看可新增的成員");
        }

        // 取得已在專案中的使用者 ID
        var existingMemberIds = project.Members.Select(m => m.UserId).ToList();

        // 查詢可新增的使用者
        var query = _context.Users
            .AsNoTracking()
            .Where(u => u.IsActive && !existingMemberIds.Contains(u.Id));

        // 搜尋
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.ToLower();
            query = query.Where(u =>
                u.Username.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term) ||
                (u.Department != null && u.Department.ToLower().Contains(term)) ||
                (u.JobTitle != null && u.JobTitle.ToLower().Contains(term)));
        }

        var limit = Math.Clamp(request.Limit, 1, 100);

        var users = await query
            .OrderBy(u => u.Username)
            .Take(limit)
            .Select(u => new AvailableMemberDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Department = u.Department,
                JobTitle = u.JobTitle
            })
            .ToListAsync(cancellationToken);

        return users;
    }
}

using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Permissions.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 權限服務實作
/// </summary>
public class PermissionService : IPermissionService
{
    private readonly IApplicationDbContext _context;

    public PermissionService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<FormPermissionSummaryDto> GetFormPermissionsAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .Include(f => f.Project)
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 權限檢查：專案成員（Manager以上）或系統管理員
        if (!isSystemAdmin)
        {
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm =>
                    pm.ProjectId == form.ProjectId &&
                    pm.UserId == currentUserId &&
                    pm.RemovedAt == null,
                    cancellationToken);

            if (membership == null || membership.Role < ProjectRole.Manager)
            {
                throw new UnauthorizedAccessException();
            }
        }

        var permissions = await _context.FormPermissions
            .Include(p => p.User)
            .Include(p => p.GrantedBy)
            .Where(p => p.FormId == formId)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return new FormPermissionSummaryDto
        {
            FormId = form.Id,
            FormName = form.Name,
            Permissions = permissions.Select(p => new PermissionDto
            {
                Id = p.Id,
                FormId = p.FormId,
                UserId = p.UserId,
                Username = p.User?.Username,
                UserEmail = p.User?.Email,
                ProjectMemberRole = p.ProjectMemberRole?.ToString(),
                PermissionType = p.PermissionType.ToString(),
                GrantedById = p.GrantedById,
                GrantedByUsername = p.GrantedBy.Username,
                GrantedAt = p.GrantedAt
            }).ToList()
        };
    }

    /// <inheritdoc />
    public async Task<Guid> GrantPermissionAsync(
        GrantPermissionRequest request,
        CancellationToken cancellationToken = default)
    {
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

            if (membership == null || membership.Role < ProjectRole.Manager)
            {
                throw new UnauthorizedAccessException();
            }
        }

        // 驗證權限類型
        if (!Enum.TryParse<PermissionType>(request.PermissionType, true, out var permissionType))
        {
            throw new InvalidOperationException($"無效的權限類型: {request.PermissionType}");
        }

        // 驗證角色（如果有指定）
        ProjectRole? projectRole = null;
        if (!string.IsNullOrEmpty(request.ProjectMemberRole))
        {
            if (!Enum.TryParse<ProjectRole>(request.ProjectMemberRole, true, out var role))
            {
                throw new InvalidOperationException($"無效的專案角色: {request.ProjectMemberRole}");
            }
            projectRole = role;
        }

        // 必須指定使用者或角色
        if (request.UserId == null && projectRole == null)
        {
            throw new InvalidOperationException("必須指定使用者或專案角色");
        }

        // 檢查是否已存在相同權限
        var existingPermission = await _context.FormPermissions
            .FirstOrDefaultAsync(p =>
                p.FormId == request.FormId &&
                p.UserId == request.UserId &&
                p.ProjectMemberRole == projectRole &&
                p.PermissionType == permissionType,
                cancellationToken);

        if (existingPermission != null)
        {
            throw new InvalidOperationException("此權限已存在");
        }

        // 如果指定使用者，驗證使用者存在
        if (request.UserId.HasValue)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == request.UserId.Value, cancellationToken);
            if (!userExists)
            {
                throw new KeyNotFoundException("找不到使用者");
            }
        }

        var permission = new FormPermission
        {
            Id = Guid.CreateVersion7(),
            FormId = request.FormId,
            UserId = request.UserId,
            ProjectMemberRole = projectRole,
            PermissionType = permissionType,
            GrantedById = request.CurrentUserId,
            GrantedAt = DateTime.UtcNow
        };

        _context.FormPermissions.Add(permission);
        await _context.SaveChangesAsync(cancellationToken);

        return permission.Id;
    }

    /// <inheritdoc />
    public async Task RevokePermissionAsync(
        Guid permissionId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var permission = await _context.FormPermissions
            .Include(p => p.Form)
            .FirstOrDefaultAsync(p => p.Id == permissionId, cancellationToken);

        if (permission == null)
        {
            throw new KeyNotFoundException("找不到權限記錄");
        }

        // 權限檢查
        if (!isSystemAdmin)
        {
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm =>
                    pm.ProjectId == permission.Form.ProjectId &&
                    pm.UserId == currentUserId &&
                    pm.RemovedAt == null,
                    cancellationToken);

            if (membership == null || membership.Role < ProjectRole.Manager)
            {
                throw new UnauthorizedAccessException();
            }
        }

        _context.FormPermissions.Remove(permission);
        await _context.SaveChangesAsync(cancellationToken);
    }
}

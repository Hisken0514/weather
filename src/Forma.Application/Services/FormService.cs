using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Forms.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

/// <summary>
/// 表單服務實作
/// </summary>
public class FormService : IFormService
{
    private readonly IApplicationDbContext _context;

    public FormService(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<PagedResult<FormListDto>> GetFormsAsync(
        GetFormsRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 檢查專案是否存在且使用者有權限存取
        var project = await _context.Projects
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 檢查權限：必須是專案成員或系統管理員
        var isMember = project.Members.Any(m => m.UserId == currentUserId);
        if (!isMember && !isSystemAdmin)
        {
            throw new UnauthorizedAccessException("您沒有權限存取此專案的表單");
        }

        var query = _context.Forms
            .Include(f => f.CreatedBy)
            .Include(f => f.LockedBy)
            .Include(f => f.Submissions)
            .Where(f => f.ProjectId == request.ProjectId)
            .AsNoTracking();

        // 搜尋
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var term = request.SearchTerm.ToLower();
            query = query.Where(f =>
                f.Name.ToLower().Contains(term) ||
                (f.Description != null && f.Description.ToLower().Contains(term)));
        }

        // 發布狀態篩選
        if (request.IsPublished.HasValue)
        {
            query = request.IsPublished.Value
                ? query.Where(f => f.PublishedAt != null)
                : query.Where(f => f.PublishedAt == null);
        }

        // 啟用狀態篩選
        if (request.IsActive.HasValue)
        {
            query = query.Where(f => f.IsActive == request.IsActive.Value);
        }

        // 計算總數
        var totalCount = await query.CountAsync(cancellationToken);

        // 排序
        query = request.SortBy?.ToLower() switch
        {
            "name" => request.SortDescending
                ? query.OrderByDescending(f => f.Name)
                : query.OrderBy(f => f.Name),
            "version" => request.SortDescending
                ? query.OrderByDescending(f => f.Version)
                : query.OrderBy(f => f.Version),
            "publishedat" => request.SortDescending
                ? query.OrderByDescending(f => f.PublishedAt)
                : query.OrderBy(f => f.PublishedAt),
            "submissioncount" => request.SortDescending
                ? query.OrderByDescending(f => f.Submissions.Count)
                : query.OrderBy(f => f.Submissions.Count),
            _ => query.OrderByDescending(f => f.CreatedAt)
        };

        // 分頁
        var pageNumber = Math.Max(1, request.PageNumber);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var forms = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new FormListDto
            {
                Id = f.Id,
                Name = f.Name,
                Description = f.Description,
                Version = f.Version,
                AccessControl = f.AccessControl.ToString(),
                IsActive = f.IsActive,
                IsPublished = f.PublishedAt != null,
                PublishedAt = f.PublishedAt,
                CreatedAt = f.CreatedAt,
                CreatedByUsername = f.CreatedBy.Username,
                SubmissionCount = f.Submissions.Count,
                IsLocked = f.IsLocked,
                LockedByUsername = f.LockedBy != null ? f.LockedBy.Username : null,
                LockedAt = f.LockedAt
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<FormListDto>
        {
            Items = forms,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize
        };
    }

    /// <inheritdoc />
    public async Task<FormDto> GetFormByIdAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(f => f.CreatedBy)
            .Include(f => f.LockedBy)
            .Include(f => f.Template)
            .Include(f => f.Submissions)
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 檢查權限
        var userMember = form.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);
        var isMember = userMember != null;

        // 後備：透過督導任務被指派此表單的機關使用者，允許讀取
        if (!isMember && !isSystemAdmin)
        {
            var userAgencyIds = await _context.AgencyUsers
                .Where(au => au.UserId == currentUserId)
                .Select(au => au.AgencyId)
                .ToListAsync(cancellationToken);

            var hasSupervisionAccess = userAgencyIds.Count > 0 &&
                await _context.SupervisionTasks
                    .AnyAsync(t => t.FormId == formId &&
                                   userAgencyIds.Contains(t.AgencyId),
                               cancellationToken);

            // 若透過機關身分沒有權限，再以產業園區綁定身分判斷
            // （與 GetMyTasksPagedAsync 的任務清單篩選邏輯一致）
            if (!hasSupervisionAccess)
            {
                var parkNames = await _context.UserIndustrialParks
                    .Where(p => p.UserId == currentUserId)
                    .Select(p => p.IndustrialParkName)
                    .ToListAsync(cancellationToken);

                hasSupervisionAccess = parkNames.Count > 0 &&
                    await _context.SupervisionTasks
                        .AnyAsync(t => t.FormId == formId &&
                                       t.Factory.IndustrialPark != null &&
                                       parkNames.Contains(t.Factory.IndustrialPark),
                                   cancellationToken);
            }

            if (!hasSupervisionAccess)
                throw new UnauthorizedAccessException("您沒有權限存取此表單");
        }

        // 判斷編輯和刪除權限
        var canEdit = isSystemAdmin ||
                     (userMember != null &&
                      (userMember.Role == ProjectRole.Owner ||
                       userMember.Role == ProjectRole.Manager ||
                       form.CreatedById == currentUserId));

        var canDelete = isSystemAdmin ||
                       (userMember != null &&
                        (userMember.Role == ProjectRole.Owner ||
                         userMember.Role == ProjectRole.Manager));

        return new FormDto
        {
            Id = form.Id,
            ProjectId = form.ProjectId,
            ProjectName = form.Project.Name,
            Name = form.Name,
            Description = form.Description,
            Schema = form.Schema,
            TemplateId = form.TemplateId,
            TemplateName = form.Template?.Name,
            CreatedById = form.CreatedById,
            CreatedByUsername = form.CreatedBy.Username,
            CreatedAt = form.CreatedAt,
            UpdatedAt = form.UpdatedAt,
            PublishedAt = form.PublishedAt,
            IsActive = form.IsActive,
            Version = form.Version,
            AccessControl = form.AccessControl.ToString(),
            SubmissionCount = form.Submissions.Count,
            ProjectSettings = form.Project.Settings,
            CanEdit = canEdit,
            CanDelete = canDelete,
            IsLocked = form.IsLocked,
            LockedByUsername = form.LockedBy?.Username,
            LockedAt = form.LockedAt
        };
    }

    /// <inheritdoc />
    public async Task<Guid> CreateFormAsync(
        CreateFormRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 檢查專案是否存在
        var project = await _context.Projects
            .Include(p => p.Members.Where(m => m.RemovedAt == null))
            .FirstOrDefaultAsync(p => p.Id == request.ProjectId, cancellationToken);

        if (project == null)
        {
            throw new KeyNotFoundException("找不到專案");
        }

        // 檢查權限：必須是專案成員
        var userMember = project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        if (userMember == null && !isSystemAdmin)
        {
            throw new UnauthorizedAccessException("您沒有權限在此專案建立表單");
        }

        // 如果有指定範本，驗證範本是否存在
        if (request.TemplateId.HasValue)
        {
            var templateExists = await _context.FormTemplates
                .AnyAsync(t => t.Id == request.TemplateId.Value, cancellationToken);

            if (!templateExists)
            {
                throw new KeyNotFoundException("找不到表單範本");
            }
        }

        // 解析存取控制
        var accessControl = Enum.Parse<FormAccessControl>(request.AccessControl, true);

        // 建立表單
        var form = new Form
        {
            Id = Guid.NewGuid(),
            ProjectId = request.ProjectId,
            Name = request.Name,
            Description = request.Description,
            Schema = request.Schema,
            TemplateId = request.TemplateId,
            AccessControl = accessControl,
            CreatedById = currentUserId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true,
            Version = "1.0"
        };

        _context.Forms.Add(form);
        await _context.SaveChangesAsync(cancellationToken);

        return form.Id;
    }

    /// <inheritdoc />
    public async Task<FormDto> UpdateFormAsync(
        Guid formId,
        UpdateFormRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(f => f.CreatedBy)
            .Include(f => f.LockedBy)
            .Include(f => f.Template)
            .Include(f => f.Submissions)
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 鎖定檢查
        if (form.IsLocked && !hasLockPermission)
        {
            throw new InvalidOperationException("表單已鎖定，無法編輯");
        }

        // 檢查權限：必須是 Owner/Manager 或表單建立者或系統管理員
        var userMember = form.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var canEdit = isSystemAdmin ||
                     (userMember != null &&
                      (userMember.Role == ProjectRole.Owner ||
                       userMember.Role == ProjectRole.Manager ||
                       form.CreatedById == currentUserId));

        if (!canEdit)
        {
            throw new UnauthorizedAccessException("您沒有權限編輯此表單");
        }

        // 檢查是否需要遞增版本（已發布的表單被編輯時）
        var wasPublished = form.PublishedAt != null;
        var schemaChanged = form.Schema != request.Schema;

        // 如果表單已發布且 schema 有變更，變成新版本的草稿
        if (wasPublished && schemaChanged)
        {
            // 遞增主版本號 (1.0 -> 2.0)
            var versionParts = form.Version.Split('.');
            if (versionParts.Length >= 1 && int.TryParse(versionParts[0], out var major))
            {
                form.Version = $"{major + 1}.0";
            }
            // 重設為草稿狀態
            form.PublishedAt = null;
        }

        // 更新表單資料
        form.Name = request.Name;
        form.Description = request.Description;
        form.Schema = request.Schema;
        form.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrEmpty(request.AccessControl) &&
            Enum.TryParse<FormAccessControl>(request.AccessControl, true, out var accessControl))
        {
            form.AccessControl = accessControl;
        }

        if (request.IsActive.HasValue)
        {
            form.IsActive = request.IsActive.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new FormDto
        {
            Id = form.Id,
            ProjectId = form.ProjectId,
            ProjectName = form.Project.Name,
            Name = form.Name,
            Description = form.Description,
            Schema = form.Schema,
            TemplateId = form.TemplateId,
            TemplateName = form.Template?.Name,
            CreatedById = form.CreatedById,
            CreatedByUsername = form.CreatedBy.Username,
            CreatedAt = form.CreatedAt,
            UpdatedAt = form.UpdatedAt,
            PublishedAt = form.PublishedAt,
            IsActive = form.IsActive,
            Version = form.Version,
            AccessControl = form.AccessControl.ToString(),
            SubmissionCount = form.Submissions.Count,
            CanEdit = true,
            CanDelete = userMember?.Role == ProjectRole.Owner ||
                       userMember?.Role == ProjectRole.Manager ||
                       isSystemAdmin,
            IsLocked = form.IsLocked,
            LockedByUsername = form.LockedBy?.Username,
            LockedAt = form.LockedAt
        };
    }

    /// <inheritdoc />
    public async Task DeleteFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(f => f.Submissions)
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 鎖定檢查
        if (form.IsLocked && !hasLockPermission)
        {
            throw new InvalidOperationException("表單已鎖定，無法刪除");
        }

        // 檢查權限：必須是 Owner/Manager 或系統管理員
        var userMember = form.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var canDelete = isSystemAdmin ||
                       (userMember != null &&
                        (userMember.Role == ProjectRole.Owner ||
                         userMember.Role == ProjectRole.Manager));

        if (!canDelete)
        {
            throw new UnauthorizedAccessException("您沒有權限刪除此表單");
        }

        // 檢查是否有提交資料
        if (form.Submissions.Any())
        {
            throw new InvalidOperationException("無法刪除已有提交資料的表單，請先刪除所有提交資料或改為停用表單");
        }

        _context.Forms.Remove(form);
        await _context.SaveChangesAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<FormDto> PublishFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(f => f.CreatedBy)
            .Include(f => f.LockedBy)
            .Include(f => f.Template)
            .Include(f => f.Submissions)
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 鎖定檢查
        if (form.IsLocked && !hasLockPermission)
        {
            throw new InvalidOperationException("表單已鎖定，無法發布");
        }

        // 檢查權限：必須是 Owner/Manager 或表單建立者或系統管理員
        var userMember = form.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var canPublish = isSystemAdmin ||
                        (userMember != null &&
                         (userMember.Role == ProjectRole.Owner ||
                          userMember.Role == ProjectRole.Manager ||
                          form.CreatedById == currentUserId));

        if (!canPublish)
        {
            throw new UnauthorizedAccessException("您沒有權限發布此表單");
        }

        // 檢查表單是否已發布
        if (form.PublishedAt != null)
        {
            throw new InvalidOperationException("表單已經發布");
        }

        // 發布表單
        form.PublishedAt = DateTime.UtcNow;
        form.UpdatedAt = DateTime.UtcNow;

        // 建立版本記錄（若已存在相同版本則更新）
        var existingVersion = await _context.FormVersions
            .FirstOrDefaultAsync(fv => fv.FormId == form.Id && fv.Version == form.Version, cancellationToken);

        if (existingVersion != null)
        {
            existingVersion.Schema = form.Schema;
            existingVersion.ChangeNote = $"發布版本 {form.Version}";
            existingVersion.IsPublished = true;
            existingVersion.CreatedById = currentUserId;
            existingVersion.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            var formVersion = new FormVersion
            {
                Id = Guid.NewGuid(),
                FormId = form.Id,
                Version = form.Version,
                Schema = form.Schema,
                ChangeNote = $"發布版本 {form.Version}",
                CreatedById = currentUserId,
                CreatedAt = DateTime.UtcNow,
                IsPublished = true
            };
            _context.FormVersions.Add(formVersion);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new FormDto
        {
            Id = form.Id,
            ProjectId = form.ProjectId,
            ProjectName = form.Project.Name,
            Name = form.Name,
            Description = form.Description,
            Schema = form.Schema,
            TemplateId = form.TemplateId,
            TemplateName = form.Template?.Name,
            CreatedById = form.CreatedById,
            CreatedByUsername = form.CreatedBy.Username,
            CreatedAt = form.CreatedAt,
            UpdatedAt = form.UpdatedAt,
            PublishedAt = form.PublishedAt,
            IsActive = form.IsActive,
            Version = form.Version,
            AccessControl = form.AccessControl.ToString(),
            SubmissionCount = form.Submissions.Count,
            CanEdit = true,
            CanDelete = userMember?.Role == ProjectRole.Owner ||
                       userMember?.Role == ProjectRole.Manager ||
                       isSystemAdmin,
            IsLocked = form.IsLocked,
            LockedByUsername = form.LockedBy?.Username,
            LockedAt = form.LockedAt
        };
    }

    /// <inheritdoc />
    public async Task<FormDto> UnpublishFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission = false,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(f => f.CreatedBy)
            .Include(f => f.LockedBy)
            .Include(f => f.Template)
            .Include(f => f.Submissions)
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 鎖定檢查
        if (form.IsLocked && !hasLockPermission)
        {
            throw new InvalidOperationException("表單已鎖定，無法下架");
        }

        // 檢查權限：必須是 Owner/Manager 或系統管理員
        var userMember = form.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        var canUnpublish = isSystemAdmin ||
                          (userMember != null &&
                           (userMember.Role == ProjectRole.Owner ||
                            userMember.Role == ProjectRole.Manager));

        if (!canUnpublish)
        {
            throw new UnauthorizedAccessException("您沒有權限下架此表單");
        }

        // 檢查表單是否已發布
        if (form.PublishedAt == null)
        {
            throw new InvalidOperationException("表單尚未發布");
        }

        // 下架表單
        form.PublishedAt = null;
        form.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return new FormDto
        {
            Id = form.Id,
            ProjectId = form.ProjectId,
            ProjectName = form.Project.Name,
            Name = form.Name,
            Description = form.Description,
            Schema = form.Schema,
            TemplateId = form.TemplateId,
            TemplateName = form.Template?.Name,
            CreatedById = form.CreatedById,
            CreatedByUsername = form.CreatedBy.Username,
            CreatedAt = form.CreatedAt,
            UpdatedAt = form.UpdatedAt,
            PublishedAt = form.PublishedAt,
            IsActive = form.IsActive,
            Version = form.Version,
            AccessControl = form.AccessControl.ToString(),
            SubmissionCount = form.Submissions.Count,
            CanEdit = true,
            CanDelete = userMember?.Role == ProjectRole.Owner ||
                       userMember?.Role == ProjectRole.Manager ||
                       isSystemAdmin,
            IsLocked = form.IsLocked,
            LockedByUsername = form.LockedBy?.Username,
            LockedAt = form.LockedAt
        };
    }

    /// <inheritdoc />
    public async Task<Guid> CloneFormAsync(
        CloneFormRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 取得來源表單
        var sourceForm = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(f => f.Id == request.FormId, cancellationToken);

        if (sourceForm == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 權限檢查：必須是來源專案成員或系統管理員
        var isMember = sourceForm.Project.Members.Any(m =>
            m.UserId == currentUserId && m.RemovedAt == null);

        if (!isSystemAdmin && !isMember)
        {
            throw new UnauthorizedAccessException("您沒有權限複製此表單");
        }

        // 確定目標專案
        var targetProjectId = request.TargetProjectId ?? sourceForm.ProjectId;

        // 如果目標專案不同，檢查目標專案權限
        if (targetProjectId != sourceForm.ProjectId)
        {
            var targetProject = await _context.Projects
                .Include(p => p.Members)
                .FirstOrDefaultAsync(p => p.Id == targetProjectId, cancellationToken);

            if (targetProject == null)
            {
                throw new KeyNotFoundException("找不到目標專案");
            }

            var isTargetMember = targetProject.Members.Any(m =>
                m.UserId == currentUserId && m.RemovedAt == null);

            if (!isSystemAdmin && !isTargetMember)
            {
                throw new UnauthorizedAccessException("無權在目標專案建立表單");
            }
        }

        // 產生新表單名稱
        var newName = request.NewName;
        if (string.IsNullOrEmpty(newName))
        {
            newName = $"{sourceForm.Name} (複製)";
        }

        // 建立新表單
        var newForm = new Form
        {
            Id = Guid.CreateVersion7(),
            ProjectId = targetProjectId,
            Name = newName,
            Description = sourceForm.Description,
            Schema = sourceForm.Schema,
            TemplateId = sourceForm.TemplateId,
            CreatedById = currentUserId,
            IsActive = true,
            Version = "1.0",
            AccessControl = sourceForm.AccessControl,
            PublishedAt = null // 複製的表單預設未發布
        };

        _context.Forms.Add(newForm);
        await _context.SaveChangesAsync(cancellationToken);

        return newForm.Id;
    }

    /// <inheritdoc />
    public async Task<List<FormVersionDto>> GetFormVersionsAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        // 取得表單及專案成員資訊
        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members)
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        // 權限檢查
        var isMember = form.Project.Members.Any(m =>
            m.UserId == currentUserId && m.RemovedAt == null);

        if (!isSystemAdmin && !isMember)
        {
            throw new UnauthorizedAccessException("您沒有權限存取此表單的版本歷史");
        }

        // 取得版本歷史
        var versions = await _context.FormVersions
            .Include(fv => fv.CreatedBy)
            .Where(fv => fv.FormId == formId)
            .OrderByDescending(fv => fv.CreatedAt)
            .Select(fv => new FormVersionDto
            {
                Id = fv.Id,
                FormId = fv.FormId,
                Version = fv.Version,
                Schema = fv.Schema,
                ChangeNote = fv.ChangeNote,
                CreatedById = fv.CreatedById,
                CreatedByUsername = fv.CreatedBy.Username,
                CreatedAt = fv.CreatedAt,
                IsPublished = fv.IsPublished
            })
            .ToListAsync(cancellationToken);

        return versions;
    }

    /// <inheritdoc />
    public async Task<FormDto> GetPublicFormAsync(
        Guid formId,
        CancellationToken cancellationToken = default)
    {
        var form = await _context.Forms
            .Include(f => f.Project)
            .Include(f => f.CreatedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null ||
            form.AccessControl != FormAccessControl.Public ||
            form.PublishedAt == null ||
            !form.IsActive)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        return new FormDto
        {
            Id = form.Id,
            ProjectId = form.ProjectId,
            ProjectName = form.Project.Name,
            Name = form.Name,
            Description = form.Description,
            Schema = form.Schema,
            CreatedById = form.CreatedById,
            CreatedByUsername = form.CreatedBy.Username,
            CreatedAt = form.CreatedAt,
            UpdatedAt = form.UpdatedAt,
            PublishedAt = form.PublishedAt,
            IsActive = form.IsActive,
            Version = form.Version,
            AccessControl = form.AccessControl.ToString(),
            ProjectSettings = form.Project.Settings,
            CanEdit = false,
            CanDelete = false
        };
    }

    /// <inheritdoc />
    public async Task<FormDto> LockFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission,
        CancellationToken cancellationToken = default)
    {
        if (!hasLockPermission)
        {
            throw new UnauthorizedAccessException("您沒有鎖定/解鎖表單的權限");
        }

        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(f => f.CreatedBy)
            .Include(f => f.LockedBy)
            .Include(f => f.Template)
            .Include(f => f.Submissions)
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        if (form.IsLocked)
        {
            throw new InvalidOperationException("表單已經鎖定");
        }

        form.IsLocked = true;
        form.LockedById = currentUserId;
        form.LockedAt = DateTime.UtcNow;
        form.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var lockedByUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == currentUserId, cancellationToken);

        var userMember = form.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        return new FormDto
        {
            Id = form.Id,
            ProjectId = form.ProjectId,
            ProjectName = form.Project.Name,
            Name = form.Name,
            Description = form.Description,
            Schema = form.Schema,
            TemplateId = form.TemplateId,
            TemplateName = form.Template?.Name,
            CreatedById = form.CreatedById,
            CreatedByUsername = form.CreatedBy.Username,
            CreatedAt = form.CreatedAt,
            UpdatedAt = form.UpdatedAt,
            PublishedAt = form.PublishedAt,
            IsActive = form.IsActive,
            Version = form.Version,
            AccessControl = form.AccessControl.ToString(),
            SubmissionCount = form.Submissions.Count,
            CanEdit = true,
            CanDelete = userMember?.Role == ProjectRole.Owner ||
                       userMember?.Role == ProjectRole.Manager ||
                       isSystemAdmin,
            IsLocked = form.IsLocked,
            LockedByUsername = lockedByUser?.Username,
            LockedAt = form.LockedAt
        };
    }

    /// <inheritdoc />
    public async Task<FormDto> UnlockFormAsync(
        Guid formId,
        Guid currentUserId,
        bool isSystemAdmin,
        bool hasLockPermission,
        CancellationToken cancellationToken = default)
    {
        if (!hasLockPermission)
        {
            throw new UnauthorizedAccessException("您沒有鎖定/解鎖表單的權限");
        }

        var form = await _context.Forms
            .Include(f => f.Project)
                .ThenInclude(p => p.Members.Where(m => m.RemovedAt == null))
            .Include(f => f.CreatedBy)
            .Include(f => f.Template)
            .Include(f => f.Submissions)
            .FirstOrDefaultAsync(f => f.Id == formId, cancellationToken);

        if (form == null)
        {
            throw new KeyNotFoundException("找不到表單");
        }

        if (!form.IsLocked)
        {
            throw new InvalidOperationException("表單尚未鎖定");
        }

        form.IsLocked = false;
        form.LockedById = null;
        form.LockedAt = null;
        form.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var userMember = form.Project.Members
            .FirstOrDefault(m => m.UserId == currentUserId);

        return new FormDto
        {
            Id = form.Id,
            ProjectId = form.ProjectId,
            ProjectName = form.Project.Name,
            Name = form.Name,
            Description = form.Description,
            Schema = form.Schema,
            TemplateId = form.TemplateId,
            TemplateName = form.Template?.Name,
            CreatedById = form.CreatedById,
            CreatedByUsername = form.CreatedBy.Username,
            CreatedAt = form.CreatedAt,
            UpdatedAt = form.UpdatedAt,
            PublishedAt = form.PublishedAt,
            IsActive = form.IsActive,
            Version = form.Version,
            AccessControl = form.AccessControl.ToString(),
            SubmissionCount = form.Submissions.Count,
            CanEdit = true,
            CanDelete = userMember?.Role == ProjectRole.Owner ||
                       userMember?.Role == ProjectRole.Manager ||
                       isSystemAdmin,
            IsLocked = false,
            LockedByUsername = null,
            LockedAt = null
        };
    }
}

using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Agencies.DTOs;
using Forma.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Forma.Application.Services;

public class AgencyService : IAgencyService
{
    private readonly IApplicationDbContext _context;

    public AgencyService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AgencyDto>> GetAllAgenciesAsync(CancellationToken ct = default)
    {
        return await _context.Agencies
            .Include(a => a.FormTypes).ThenInclude(ft => ft.Form)
            .Include(a => a.AgencyUsers)
            .AsNoTracking()
            .OrderBy(a => a.Name)
            .Select(a => MapToDto(a))
            .ToListAsync(ct);
    }

    public async Task<AgencyDto> GetAgencyByIdAsync(Guid id, CancellationToken ct = default)
    {
        var agency = await _context.Agencies
            .Include(a => a.FormTypes).ThenInclude(ft => ft.Form)
            .Include(a => a.AgencyUsers)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new KeyNotFoundException($"機關 {id} 不存在");

        return MapToDto(agency);
    }

    public async Task<Guid> CreateAgencyAsync(CreateAgencyRequest request, CancellationToken ct = default)
    {
        if (await _context.Agencies.AnyAsync(a => a.Name == request.Name, ct))
            throw new InvalidOperationException($"機關名稱「{request.Name}」已存在");

        var agency = new Agency
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Region = request.Region,
            IsActive = true
        };

        _context.Agencies.Add(agency);
        await _context.SaveChangesAsync(ct);
        return agency.Id;
    }

    public async Task<AgencyDto> UpdateAgencyAsync(Guid id, UpdateAgencyRequest request, CancellationToken ct = default)
    {
        var agency = await _context.Agencies
            .Include(a => a.FormTypes).ThenInclude(ft => ft.Form)
            .Include(a => a.AgencyUsers)
            .FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new KeyNotFoundException($"機關 {id} 不存在");

        agency.Name = request.Name;
        agency.Region = request.Region;
        agency.IsActive = request.IsActive;

        await _context.SaveChangesAsync(ct);
        return MapToDto(agency);
    }

    public async Task DeleteAgencyAsync(Guid id, CancellationToken ct = default)
    {
        var agency = await _context.Agencies.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"機關 {id} 不存在");

        _context.Agencies.Remove(agency);
        await _context.SaveChangesAsync(ct);
    }

    public async Task AddFormTypeAsync(Guid agencyId, AddAgencyFormTypeRequest request, CancellationToken ct = default)
    {
        if (!await _context.Agencies.AnyAsync(a => a.Id == agencyId, ct))
            throw new KeyNotFoundException($"機關 {agencyId} 不存在");

        var formType = new AgencyFormType
        {
            Id = Guid.NewGuid(),
            AgencyId = agencyId,
            FormTypeName = request.FormTypeName,
            FormId = request.FormId
        };

        _context.AgencyFormTypes.Add(formType);

        // 若同時帶入 FormId，同步更新此機關下 FormTypeName 相符且 FormId 尚為 null 的督導任務
        if (request.FormId.HasValue)
        {
            var tasksToUpdate = await _context.SupervisionTasks
                .Where(t => t.AgencyId == agencyId
                         && t.FormId == null
                         && t.FormTypeName == request.FormTypeName)
                .ToListAsync(ct);

            foreach (var task in tasksToUpdate)
                task.FormId = request.FormId;
        }

        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveFormTypeAsync(Guid agencyFormTypeId, CancellationToken ct = default)
    {
        var formType = await _context.AgencyFormTypes.FindAsync([agencyFormTypeId], ct)
            ?? throw new KeyNotFoundException($"AgencyFormType {agencyFormTypeId} 不存在");

        _context.AgencyFormTypes.Remove(formType);
        await _context.SaveChangesAsync(ct);
    }

    public async Task BindFormAsync(Guid agencyFormTypeId, Guid formId, CancellationToken ct = default)
    {
        var formType = await _context.AgencyFormTypes.FindAsync([agencyFormTypeId], ct)
            ?? throw new KeyNotFoundException($"AgencyFormType {agencyFormTypeId} 不存在");

        if (!await _context.Forms.AnyAsync(f => f.Id == formId, ct))
            throw new KeyNotFoundException($"表單 {formId} 不存在");

        formType.FormId = formId;
        await _context.SaveChangesAsync(ct);
    }

    public async Task AddUserAsync(Guid agencyId, Guid userId, CancellationToken ct = default)
    {
        if (!await _context.Agencies.AnyAsync(a => a.Id == agencyId, ct))
            throw new KeyNotFoundException($"機關 {agencyId} 不存在");

        if (!await _context.Users.AnyAsync(u => u.Id == userId, ct))
            throw new KeyNotFoundException($"使用者 {userId} 不存在");

        if (await _context.AgencyUsers.AnyAsync(au => au.AgencyId == agencyId && au.UserId == userId, ct))
            throw new InvalidOperationException("此使用者已綁定至該機關");

        _context.AgencyUsers.Add(new AgencyUser
        {
            Id = Guid.NewGuid(),
            AgencyId = agencyId,
            UserId = userId,
            AssignedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(ct);
    }

    public async Task RemoveUserAsync(Guid agencyId, Guid userId, CancellationToken ct = default)
    {
        var binding = await _context.AgencyUsers
            .FirstOrDefaultAsync(au => au.AgencyId == agencyId && au.UserId == userId, ct)
            ?? throw new KeyNotFoundException("找不到此綁定關係");

        _context.AgencyUsers.Remove(binding);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<List<AgencyUserDto>> GetAgencyUsersAsync(Guid agencyId, CancellationToken ct = default)
    {
        return await _context.AgencyUsers
            .Include(au => au.User)
            .Where(au => au.AgencyId == agencyId)
            .AsNoTracking()
            .Select(au => new AgencyUserDto
            {
                UserId = au.UserId,
                Username = au.User.Username,
                Email = au.User.Email,
                AssignedAt = au.AssignedAt
            })
            .ToListAsync(ct);
    }

    public async Task<List<AgencyDto>> GetMyAgenciesAsync(Guid userId, CancellationToken ct = default)
    {
        var agencyIds = await _context.AgencyUsers
            .Where(au => au.UserId == userId)
            .Select(au => au.AgencyId)
            .ToListAsync(ct);

        return await _context.Agencies
            .Include(a => a.FormTypes).ThenInclude(ft => ft.Form)
            .Include(a => a.AgencyUsers)
            .Where(a => agencyIds.Contains(a.Id) && a.IsActive)
            .AsNoTracking()
            .Select(a => MapToDto(a))
            .ToListAsync(ct);
    }

    private static AgencyDto MapToDto(Agency a) => new()
    {
        Id = a.Id,
        Name = a.Name,
        Region = a.Region,
        IsActive = a.IsActive,
        CreatedAt = a.CreatedAt,
        UserCount = a.AgencyUsers.Count,
        FormTypes = a.FormTypes.Select(ft => new AgencyFormTypeDto
        {
            Id = ft.Id,
            FormTypeName = ft.FormTypeName,
            FormId = ft.FormId,
            FormName = ft.Form?.Name
        }).ToList()
    };
}

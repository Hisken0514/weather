using Forma.Application.Features.Agencies.DTOs;

namespace Forma.Application.Services;

public interface IAgencyService
{
    Task<List<AgencyDto>> GetAllAgenciesAsync(CancellationToken ct = default);
    Task<AgencyDto> GetAgencyByIdAsync(Guid id, CancellationToken ct = default);
    Task<Guid> CreateAgencyAsync(CreateAgencyRequest request, CancellationToken ct = default);
    Task<AgencyDto> UpdateAgencyAsync(Guid id, UpdateAgencyRequest request, CancellationToken ct = default);
    Task DeleteAgencyAsync(Guid id, CancellationToken ct = default);

    // 表單類型綁定
    Task AddFormTypeAsync(Guid agencyId, AddAgencyFormTypeRequest request, CancellationToken ct = default);
    Task RemoveFormTypeAsync(Guid agencyFormTypeId, CancellationToken ct = default);
    Task BindFormAsync(Guid agencyFormTypeId, Guid formId, CancellationToken ct = default);

    // 使用者綁定
    Task AddUserAsync(Guid agencyId, Guid userId, CancellationToken ct = default);
    Task RemoveUserAsync(Guid agencyId, Guid userId, CancellationToken ct = default);
    Task<List<AgencyUserDto>> GetAgencyUsersAsync(Guid agencyId, CancellationToken ct = default);

    // 取得目前登入使用者所屬機關
    Task<List<AgencyDto>> GetMyAgenciesAsync(Guid userId, CancellationToken ct = default);
}

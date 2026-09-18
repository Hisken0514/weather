using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Agencies.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 督導機關管理 API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.RequireUser)]
public class AgenciesController : ControllerBase
{
    private readonly IAgencyService _agencyService;
    private readonly ICurrentUserService _currentUser;

    public AgenciesController(IAgencyService agencyService, ICurrentUserService currentUser)
    {
        _agencyService = agencyService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得所有機關列表（Admin）
    /// </summary>
    [HttpGet]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<AgencyDto>>> GetAll(CancellationToken ct)
    {
        return Ok(await _agencyService.GetAllAgenciesAsync(ct));
    }

    /// <summary>
    /// 取得目前使用者所屬機關
    /// </summary>
    [HttpGet("mine")]
    public async Task<ActionResult<List<AgencyDto>>> GetMine(CancellationToken ct)
    {
        var userId = _currentUser.UserId!.Value;
        return Ok(await _agencyService.GetMyAgenciesAsync(userId, ct));
    }

    /// <summary>
    /// 取得機關詳情
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AgencyDto>> GetById(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await _agencyService.GetAgencyByIdAsync(id, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 建立機關（Admin）
    /// </summary>
    [HttpPost]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<Guid>> Create([FromBody] CreateAgencyRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _agencyService.CreateAgencyAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id }, new { id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 更新機關（Admin）
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<AgencyDto>> Update(Guid id, [FromBody] UpdateAgencyRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _agencyService.UpdateAgencyAsync(id, request, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 刪除機關（Admin）
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> Delete(Guid id, CancellationToken ct)
    {
        try
        {
            await _agencyService.DeleteAgencyAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── 表單類型綁定 ───

    /// <summary>
    /// 新增機關的表單類型
    /// </summary>
    [HttpPost("{id:guid}/form-types")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> AddFormType(Guid id, [FromBody] AddAgencyFormTypeRequest request, CancellationToken ct)
    {
        try
        {
            await _agencyService.AddFormTypeAsync(id, request, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 移除機關的表單類型
    /// </summary>
    [HttpDelete("form-types/{agencyFormTypeId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> RemoveFormType(Guid agencyFormTypeId, CancellationToken ct)
    {
        try
        {
            await _agencyService.RemoveFormTypeAsync(agencyFormTypeId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 綁定表單類型對應的 Forma 表單
    /// </summary>
    [HttpPut("form-types/{agencyFormTypeId:guid}/bind-form/{formId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> BindForm(Guid agencyFormTypeId, Guid formId, CancellationToken ct)
    {
        try
        {
            await _agencyService.BindFormAsync(agencyFormTypeId, formId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    // ─── 使用者綁定 ───

    /// <summary>
    /// 取得機關成員列表
    /// </summary>
    [HttpGet("{id:guid}/users")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<AgencyUserDto>>> GetUsers(Guid id, CancellationToken ct)
    {
        return Ok(await _agencyService.GetAgencyUsersAsync(id, ct));
    }

    /// <summary>
    /// 將使用者加入機關
    /// </summary>
    [HttpPost("{id:guid}/users/{userId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> AddUser(Guid id, Guid userId, CancellationToken ct)
    {
        try
        {
            await _agencyService.AddUserAsync(id, userId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 移除機關成員
    /// </summary>
    [HttpDelete("{id:guid}/users/{userId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> RemoveUser(Guid id, Guid userId, CancellationToken ct)
    {
        try
        {
            await _agencyService.RemoveUserAsync(id, userId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

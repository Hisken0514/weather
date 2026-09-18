using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Organizations.DTOs;
using Forma.Application.Features.Projects.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CreateOrganizationServiceRequest = Forma.Application.Services.CreateOrganizationRequest;
using UpdateOrganizationServiceRequest = Forma.Application.Services.UpdateOrganizationRequest;
using GetOrganizationsServiceRequest = Forma.Application.Services.GetOrganizationsRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 組織管理 API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.RequireUser)]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _organizationService;
    private readonly ICurrentUserService _currentUser;

    public OrganizationsController(IOrganizationService organizationService, ICurrentUserService currentUser)
    {
        _organizationService = organizationService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得組織列表
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<OrganizationListDto>>> GetOrganizations(
        [FromQuery] string? searchTerm = null,
        [FromQuery] string? type = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var request = new GetOrganizationsServiceRequest
        {
            SearchTerm = searchTerm,
            Type = type,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _organizationService.GetOrganizationsAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 取得組織詳情
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrganizationDto>> GetOrganization(Guid id)
    {
        try
        {
            var result = await _organizationService.GetOrganizationByIdAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得組織下的專案
    /// </summary>
    [HttpGet("{id:guid}/projects")]
    public async Task<ActionResult<PagedResult<ProjectListDto>>> GetOrganizationProjects(
        Guid id,
        [FromQuery] string? searchTerm = null,
        [FromQuery] int? year = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var request = new GetOrganizationProjectsRequest
        {
            OrganizationId = id,
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin,
            SearchTerm = searchTerm,
            Year = year,
            Status = status,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        try
        {
            var result = await _organizationService.GetOrganizationProjectsAsync(request);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 建立組織 (僅系統管理員)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<Guid>> CreateOrganization([FromBody] CreateOrganizationRequest request)
    {
        var serviceRequest = new CreateOrganizationServiceRequest
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            Type = request.Type ?? "Central"
        };

        try
        {
            var organizationId = await _organizationService.CreateOrganizationAsync(serviceRequest);
            return CreatedAtAction(nameof(GetOrganization), new { id = organizationId }, new { id = organizationId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 更新組織 (僅系統管理員)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<OrganizationDto>> UpdateOrganization(Guid id, [FromBody] UpdateOrganizationRequest request)
    {
        var serviceRequest = new UpdateOrganizationServiceRequest
        {
            Name = request.Name,
            Description = request.Description,
            Type = request.Type
        };

        try
        {
            var result = await _organizationService.UpdateOrganizationAsync(id, serviceRequest);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 刪除組織 (僅系統管理員)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> DeleteOrganization(Guid id)
    {
        try
        {
            await _organizationService.DeleteOrganizationAsync(id);
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
}

#region Request DTOs

public class CreateOrganizationRequest
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Type { get; set; }
}

public class UpdateOrganizationRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Type { get; set; }
}

#endregion

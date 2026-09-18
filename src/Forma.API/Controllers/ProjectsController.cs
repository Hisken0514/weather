using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Projects.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ServiceCreateProjectRequest = Forma.Application.Services.CreateProjectRequest;
using ServiceUpdateProjectRequest = Forma.Application.Services.UpdateProjectRequest;
using ServiceAddProjectMemberRequest = Forma.Application.Services.AddProjectMemberRequest;
using ServiceUpdateProjectMemberRequest = Forma.Application.Services.UpdateProjectMemberRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 專案管理 API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.RequireUser)]
public class ProjectsController : ControllerBase
{
    private readonly IProjectService _projectService;
    private readonly ICurrentUserService _currentUser;

    public ProjectsController(IProjectService projectService, ICurrentUserService currentUser)
    {
        _projectService = projectService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得專案列表
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<ProjectListDto>>> GetProjects(
        [FromQuery] string? searchTerm = null,
        [FromQuery] int? year = null,
        [FromQuery] string? status = null,
        [FromQuery] bool onlyMyProjects = false,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var request = new GetProjectsRequest
        {
            SearchTerm = searchTerm,
            Year = year,
            Status = status,
            OnlyMyProjects = onlyMyProjects,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _projectService.GetProjectsAsync(
            request,
            _currentUser.UserId!.Value,
            _currentUser.IsSystemAdmin);
        return Ok(result);
    }

    /// <summary>
    /// 取得我參與的專案
    /// </summary>
    [HttpGet("participated")]
    public async Task<ActionResult<PagedResult<ProjectListDto>>> GetParticipatedProjects(
        [FromQuery] string? searchTerm = null,
        [FromQuery] int? year = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var request = new GetProjectsRequest
        {
            SearchTerm = searchTerm,
            Year = year,
            Status = status,
            OnlyMyProjects = true,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _projectService.GetProjectsAsync(
            request,
            _currentUser.UserId!.Value,
            _currentUser.IsSystemAdmin);
        return Ok(result);
    }

    /// <summary>
    /// 取得我管理的專案 (Owner + Manager)
    /// </summary>
    [HttpGet("managed")]
    public async Task<ActionResult<PagedResult<ProjectListDto>>> GetManagedProjects(
        [FromQuery] string? searchTerm = null,
        [FromQuery] int? year = null,
        [FromQuery] string? status = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var request = new GetProjectsRequest
        {
            SearchTerm = searchTerm,
            Year = year,
            Status = status,
            OnlyMyProjects = true,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _projectService.GetProjectsAsync(
            request,
            _currentUser.UserId!.Value,
            _currentUser.IsSystemAdmin);
        return Ok(result);
    }

    /// <summary>
    /// 取得專案詳情
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> GetProject(Guid id)
    {
        try
        {
            var result = await _projectService.GetProjectByIdAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
    }

    /// <summary>
    /// 建立專案
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateProject([FromBody] CreateProjectRequest request)
    {
        var serviceRequest = new ServiceCreateProjectRequest
        {
            OrganizationId = request.OrganizationId,
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            Year = request.Year,
            Budget = request.Budget,
            StartDate = request.StartDate,
            EndDate = request.EndDate
        };

        try
        {
            var projectId = await _projectService.CreateProjectAsync(
                serviceRequest,
                _currentUser.UserId!.Value);
            return CreatedAtAction(nameof(GetProject), new { id = projectId }, new { id = projectId });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 更新專案
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> UpdateProject(Guid id, [FromBody] UpdateProjectRequest request)
    {
        var serviceRequest = new ServiceUpdateProjectRequest
        {
            Name = request.Name,
            Description = request.Description,
            Year = request.Year,
            Budget = request.Budget,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Status = request.Status,
            Settings = request.Settings
        };

        try
        {
            var result = await _projectService.UpdateProjectAsync(
                id,
                serviceRequest,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
    }

    /// <summary>
    /// 刪除專案
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteProject(Guid id)
    {
        try
        {
            await _projectService.DeleteProjectAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得專案成員列表
    /// </summary>
    [HttpGet("{id:guid}/members")]
    public async Task<ActionResult<List<ProjectMemberDto>>> GetProjectMembers(Guid id)
    {
        try
        {
            var result = await _projectService.GetProjectMembersAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
    }

    /// <summary>
    /// 新增專案成員
    /// </summary>
    [HttpPost("{id:guid}/members")]
    public async Task<ActionResult<ProjectMemberDto>> AddProjectMember(Guid id, [FromBody] AddProjectMemberRequest request)
    {
        var serviceRequest = new ServiceAddProjectMemberRequest
        {
            UserId = request.UserId,
            Role = request.Role
        };

        try
        {
            var result = await _projectService.AddProjectMemberAsync(
                id,
                serviceRequest,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return CreatedAtAction(nameof(GetProjectMembers), new { id = id }, result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 更新專案成員角色
    /// </summary>
    [HttpPut("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult<ProjectMemberDto>> UpdateProjectMember(Guid id, Guid userId, [FromBody] UpdateProjectMemberRequest request)
    {
        var serviceRequest = new ServiceUpdateProjectMemberRequest
        {
            Role = request.Role
        };

        try
        {
            var result = await _projectService.UpdateProjectMemberAsync(
                id,
                userId,
                serviceRequest,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 移除專案成員
    /// </summary>
    [HttpDelete("{id:guid}/members/{userId:guid}")]
    public async Task<ActionResult> RemoveProjectMember(Guid id, Guid userId)
    {
        try
        {
            await _projectService.RemoveProjectMemberAsync(
                id,
                userId,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 離開專案 (成員自己退出)
    /// </summary>
    [HttpPost("{id:guid}/leave")]
    public async Task<ActionResult> LeaveProject(Guid id)
    {
        try
        {
            await _projectService.RemoveProjectMemberAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
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
    /// 封存專案
    /// </summary>
    [HttpPost("{id:guid}/archive")]
    public async Task<ActionResult<ProjectDto>> ArchiveProject(Guid id)
    {
        try
        {
            var result = await _projectService.ArchiveProjectAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得可新增的使用者列表
    /// </summary>
    [HttpGet("{id:guid}/members/available")]
    public async Task<ActionResult<List<AvailableMemberDto>>> GetAvailableMembers(
        Guid id,
        [FromQuery] string? searchTerm = null,
        [FromQuery] int limit = 20)
    {
        var request = new GetAvailableMembersRequest
        {
            SearchTerm = searchTerm,
            Limit = limit
        };

        try
        {
            var result = await _projectService.GetAvailableMembersAsync(
                id,
                request,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}

#region Request DTOs

public class CreateProjectRequest
{
    public Guid OrganizationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Year { get; set; }
    public decimal? Budget { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
}

public class UpdateProjectRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Year { get; set; }
    public decimal? Budget { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? Status { get; set; }
    public string? Settings { get; set; }
}

public class AddProjectMemberRequest
{
    public Guid UserId { get; set; }
    public string Role { get; set; } = string.Empty;
}

public class UpdateProjectMemberRequest
{
    public string Role { get; set; } = string.Empty;
}

#endregion

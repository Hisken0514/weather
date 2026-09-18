using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Forms.DTOs;
using Forma.Application.Services;
using Forma.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 表單管理 API
/// </summary>
[ApiController]
[Route("api")]
[Authorize(Policy = Policies.RequireUser)]
public class FormsController : ControllerBase
{
    private readonly IFormService _formService;
    private readonly ICurrentUserService _currentUser;

    public FormsController(IFormService formService, ICurrentUserService currentUser)
    {
        _formService = formService;
        _currentUser = currentUser;
    }

    private bool HasLockPermission =>
        (_currentUser.Permissions & (long)UserPermission.LockUnlockForms) == (long)UserPermission.LockUnlockForms;

    /// <summary>
    /// 取得專案的表單列表
    /// </summary>
    [HttpGet("projects/{projectId:guid}/forms")]
    public async Task<ActionResult<PagedResult<FormListDto>>> GetForms(
        Guid projectId,
        [FromQuery] string? searchTerm = null,
        [FromQuery] bool? isPublished = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var request = new GetFormsRequest
        {
            ProjectId = projectId,
            SearchTerm = searchTerm,
            IsPublished = isPublished,
            IsActive = isActive,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        try
        {
            var result = await _formService.GetFormsAsync(
                request,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                cancellationToken);
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

    /// <summary>
    /// 取得表單詳情
    /// </summary>
    [HttpGet("forms/{id:guid}")]
    public async Task<ActionResult<FormDto>> GetForm(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _formService.GetFormByIdAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                cancellationToken);
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

    /// <summary>
    /// 建立表單
    /// </summary>
    [HttpPost("projects/{projectId:guid}/forms")]
    public async Task<ActionResult<Guid>> CreateForm(
        Guid projectId,
        [FromBody] CreateFormApiRequest request,
        CancellationToken cancellationToken = default)
    {
        var serviceRequest = new CreateFormRequest
        {
            ProjectId = projectId,
            Name = request.Name,
            Description = request.Description,
            Schema = request.Schema,
            TemplateId = request.TemplateId,
            AccessControl = request.AccessControl ?? "Private"
        };

        try
        {
            var formId = await _formService.CreateFormAsync(
                serviceRequest,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                cancellationToken);
            return CreatedAtAction(nameof(GetForm), new { id = formId }, new { id = formId });
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

    /// <summary>
    /// 更新表單
    /// </summary>
    [HttpPut("forms/{id:guid}")]
    public async Task<ActionResult<FormDto>> UpdateForm(
        Guid id,
        [FromBody] UpdateFormApiRequest request,
        CancellationToken cancellationToken = default)
    {
        var serviceRequest = new UpdateFormRequest
        {
            Name = request.Name,
            Description = request.Description,
            Schema = request.Schema,
            AccessControl = request.AccessControl,
            IsActive = request.IsActive
        };

        try
        {
            var result = await _formService.UpdateFormAsync(
                id,
                serviceRequest,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                HasLockPermission,
                cancellationToken);
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

    /// <summary>
    /// 刪除表單
    /// </summary>
    [HttpDelete("forms/{id:guid}")]
    public async Task<ActionResult> DeleteForm(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            await _formService.DeleteFormAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                HasLockPermission,
                cancellationToken);
            return NoContent();
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
    /// 發布表單
    /// </summary>
    [HttpPost("forms/{id:guid}/publish")]
    public async Task<ActionResult<FormDto>> PublishForm(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _formService.PublishFormAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                HasLockPermission,
                cancellationToken);
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
    /// 下架表單
    /// </summary>
    [HttpPost("forms/{id:guid}/unpublish")]
    public async Task<ActionResult<FormDto>> UnpublishForm(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _formService.UnpublishFormAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                HasLockPermission,
                cancellationToken);
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
    /// 複製表單
    /// </summary>
    [HttpPost("forms/{id:guid}/clone")]
    public async Task<ActionResult<Guid>> CloneForm(
        Guid id,
        [FromBody] CloneFormApiRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var serviceRequest = new CloneFormRequest
        {
            FormId = id,
            TargetProjectId = request?.TargetProjectId,
            NewName = request?.NewName
        };

        try
        {
            var newFormId = await _formService.CloneFormAsync(
                serviceRequest,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                cancellationToken);
            return CreatedAtAction(nameof(GetForm), new { id = newFormId }, new { id = newFormId });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    /// <summary>
    /// 取得表單版本歷史
    /// </summary>
    [HttpGet("forms/{id:guid}/versions")]
    public async Task<ActionResult<List<FormVersionDto>>> GetFormVersions(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _formService.GetFormVersionsAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                cancellationToken);
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
    /// <summary>
    /// 鎖定表單
    /// </summary>
    [HttpPost("forms/{id:guid}/lock")]
    public async Task<ActionResult<FormDto>> LockForm(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _formService.LockFormAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                HasLockPermission,
                cancellationToken);
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
    /// 解鎖表單
    /// </summary>
    [HttpPost("forms/{id:guid}/unlock")]
    public async Task<ActionResult<FormDto>> UnlockForm(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _formService.UnlockFormAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin,
                HasLockPermission,
                cancellationToken);
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
}

#region Request DTOs

public class CreateFormApiRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Schema { get; set; } = "{}";
    public Guid? TemplateId { get; set; }
    public string? AccessControl { get; set; }
}

public class UpdateFormApiRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Schema { get; set; } = "{}";
    public string? AccessControl { get; set; }
    public bool? IsActive { get; set; }
}

public class CloneFormApiRequest
{
    public Guid? TargetProjectId { get; set; }
    public string? NewName { get; set; }
}

#endregion

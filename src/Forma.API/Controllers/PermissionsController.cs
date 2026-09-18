using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Permissions.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GrantPermissionServiceRequest = Forma.Application.Services.GrantPermissionRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 權限管理 API
/// </summary>
[ApiController]
[Route("api/permissions")]
[Authorize(Policy = Policies.RequireUser)]
public class PermissionsController : ControllerBase
{
    private readonly IPermissionService _permissionService;
    private readonly ICurrentUserService _currentUser;

    public PermissionsController(IPermissionService permissionService, ICurrentUserService currentUser)
    {
        _permissionService = permissionService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得表單權限
    /// </summary>
    [HttpGet("form/{formId:guid}")]
    public async Task<ActionResult<FormPermissionSummaryDto>> GetFormPermissions(Guid formId)
    {
        try
        {
            var result = await _permissionService.GetFormPermissionsAsync(
                formId,
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

    /// <summary>
    /// 授予權限
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> GrantPermission([FromBody] GrantPermissionRequest request)
    {
        var serviceRequest = new GrantPermissionServiceRequest
        {
            FormId = request.FormId,
            UserId = request.UserId,
            ProjectMemberRole = request.ProjectMemberRole,
            PermissionType = request.PermissionType,
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin
        };

        try
        {
            var permissionId = await _permissionService.GrantPermissionAsync(serviceRequest);
            return CreatedAtAction(nameof(GetFormPermissions), new { formId = request.FormId }, new { id = permissionId });
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
    /// 移除權限
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> RevokePermission(Guid id)
    {
        try
        {
            await _permissionService.RevokePermissionAsync(
                id,
                _currentUser.UserId!.Value,
                _currentUser.IsSystemAdmin);
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
    }
}

#region Request DTOs

public class GrantPermissionRequest
{
    public Guid FormId { get; set; }
    public Guid? UserId { get; set; }
    public string? ProjectMemberRole { get; set; }
    public string PermissionType { get; set; } = string.Empty;
}

#endregion

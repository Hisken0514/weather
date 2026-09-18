using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Templates.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CreateTemplateServiceRequest = Forma.Application.Services.CreateTemplateRequest;
using UpdateTemplateServiceRequest = Forma.Application.Services.UpdateTemplateRequest;
using GetTemplatesServiceRequest = Forma.Application.Services.GetTemplatesRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 範本管理 API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Policies.RequireUser)]
public class TemplatesController : ControllerBase
{
    private readonly ITemplateService _templateService;
    private readonly ICurrentUserService _currentUser;

    public TemplatesController(ITemplateService templateService, ICurrentUserService currentUser)
    {
        _templateService = templateService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得範本列表
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<TemplateListDto>>> GetTemplates(
        [FromQuery] string? searchTerm = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? isPublic = null,
        [FromQuery] bool onlyMine = false,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = false,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var request = new GetTemplatesServiceRequest
        {
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin,
            SearchTerm = searchTerm,
            Category = category,
            IsPublic = isPublic,
            OnlyMine = onlyMine,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _templateService.GetTemplatesAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 取得範本詳情
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TemplateDto>> GetTemplate(Guid id)
    {
        try
        {
            var result = await _templateService.GetTemplateByIdAsync(
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
    }

    /// <summary>
    /// 建立範本
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateTemplate([FromBody] CreateTemplateRequest request)
    {
        var serviceRequest = new CreateTemplateServiceRequest
        {
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Schema = request.Schema,
            ThumbnailUrl = request.ThumbnailUrl,
            IsPublic = request.IsPublic,
            CurrentUserId = _currentUser.UserId!.Value
        };

        var templateId = await _templateService.CreateTemplateAsync(serviceRequest);
        return CreatedAtAction(nameof(GetTemplate), new { id = templateId }, new { id = templateId });
    }

    /// <summary>
    /// 更新範本
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TemplateDto>> UpdateTemplate(Guid id, [FromBody] UpdateTemplateRequest request)
    {
        var serviceRequest = new UpdateTemplateServiceRequest
        {
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Schema = request.Schema,
            ThumbnailUrl = request.ThumbnailUrl,
            IsPublic = request.IsPublic,
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin
        };

        try
        {
            var result = await _templateService.UpdateTemplateAsync(id, serviceRequest);
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
    /// 刪除範本
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> DeleteTemplate(Guid id)
    {
        try
        {
            await _templateService.DeleteTemplateAsync(
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

#region Request DTOs

public class CreateTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string Schema { get; set; } = "{}";
    public string? ThumbnailUrl { get; set; }
    public bool IsPublic { get; set; }
}

public class UpdateTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string Schema { get; set; } = "{}";
    public string? ThumbnailUrl { get; set; }
    public bool? IsPublic { get; set; }
}

#endregion

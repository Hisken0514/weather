using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Submissions.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CreateSubmissionServiceRequest = Forma.Application.Services.CreateSubmissionRequest;
using UpdateSubmissionServiceRequest = Forma.Application.Services.UpdateSubmissionRequest;
using GetFormSubmissionsServiceRequest = Forma.Application.Services.GetFormSubmissionsRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 表單提交 API
/// </summary>
[ApiController]
[Route("api")]
[Authorize(Policy = Policies.RequireUser)]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;
    private readonly ICurrentUserService _currentUser;

    public SubmissionsController(ISubmissionService submissionService, ICurrentUserService currentUser)
    {
        _submissionService = submissionService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 提交表單
    /// </summary>
    [HttpPost("submissions")]
    public async Task<ActionResult<Guid>> CreateSubmission([FromBody] CreateSubmissionRequest request)
    {
        var serviceRequest = new CreateSubmissionServiceRequest
        {
            FormId = request.FormId,
            SubmissionData = request.SubmissionData,
            IsDraft = request.IsDraft,
            CurrentUserId = _currentUser.UserId,
            IpAddress = GetIpAddress()
        };

        try
        {
            var submissionId = await _submissionService.CreateSubmissionAsync(serviceRequest);
            return CreatedAtAction(nameof(GetSubmission), new { id = submissionId }, new { id = submissionId });
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
    /// 取得提交詳情
    /// </summary>
    [HttpGet("submissions/{id:guid}")]
    public async Task<ActionResult<SubmissionDto>> GetSubmission(Guid id)
    {
        try
        {
            var result = await _submissionService.GetSubmissionByIdAsync(
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
    /// 取得表單的所有提交
    /// </summary>
    [HttpGet("forms/{formId:guid}/submissions")]
    public async Task<ActionResult<PagedResult<SubmissionListDto>>> GetFormSubmissions(
        Guid formId,
        [FromQuery] string? status = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool sortDescending = true,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 20)
    {
        var serviceRequest = new GetFormSubmissionsServiceRequest
        {
            FormId = formId,
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin,
            Status = status,
            SortBy = sortBy,
            SortDescending = sortDescending,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        try
        {
            var result = await _submissionService.GetFormSubmissionsAsync(serviceRequest);
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
    /// 更新提交
    /// </summary>
    [HttpPut("submissions/{id:guid}")]
    public async Task<ActionResult<SubmissionDto>> UpdateSubmission(Guid id, [FromBody] UpdateSubmissionRequest request)
    {
        var serviceRequest = new UpdateSubmissionServiceRequest
        {
            SubmissionId = id,
            SubmissionData = request.SubmissionData,
            Status = request.Status,
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin
        };

        try
        {
            var result = await _submissionService.UpdateSubmissionAsync(serviceRequest);
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
    /// 記錄報告下載時間
    /// </summary>
    [HttpPatch("submissions/{id:guid}/report-downloaded")]
    public async Task<ActionResult> RecordReportDownloaded(Guid id)
    {
        try
        {
            await _submissionService.RecordReportDownloadedAsync(
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

    /// <summary>
    /// 刪除提交
    /// </summary>
    [HttpDelete("submissions/{id:guid}")]
    public async Task<ActionResult> DeleteSubmission(Guid id)
    {
        try
        {
            await _submissionService.DeleteSubmissionAsync(
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

    private string? GetIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            // X-Forwarded-For 格式為 "client, proxy1, proxy2"，取第一段即真實來源 IP
            var ip = forwardedFor.FirstOrDefault()?.Split(',')[0].Trim();
            if (!string.IsNullOrEmpty(ip))
                return ip.Length > 45 ? ip[..45] : ip;
        }

        return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString();
    }
}

#region Request DTOs

public class CreateSubmissionRequest
{
    public Guid FormId { get; set; }
    public string SubmissionData { get; set; } = "{}";
    public bool IsDraft { get; set; }
}

public class UpdateSubmissionRequest
{
    public string SubmissionData { get; set; } = "{}";
    public string? Status { get; set; }
}

#endregion

using Forma.Application.Features.Forms.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CreateSubmissionServiceRequest = Forma.Application.Services.CreateSubmissionRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 公開表單 API（不需登入）
/// </summary>
[ApiController]
[Route("api/public/forms")]
[AllowAnonymous]
public class PublicFormsController : ControllerBase
{
    private readonly IFormService _formService;
    private readonly ISubmissionService _submissionService;

    public PublicFormsController(IFormService formService, ISubmissionService submissionService)
    {
        _formService = formService;
        _submissionService = submissionService;
    }

    /// <summary>
    /// 取得公開表單（需已發布、公開、啟用中）
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FormDto>> GetPublicForm(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _formService.GetPublicFormAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "找不到表單" });
        }
    }

    /// <summary>
    /// 匿名提交公開表單
    /// </summary>
    [HttpPost("{id:guid}/submissions")]
    public async Task<ActionResult<Guid>> CreatePublicSubmission(
        Guid id,
        [FromBody] PublicSubmissionRequest request,
        CancellationToken cancellationToken = default)
    {
        // 先驗證表單是公開的
        try
        {
            await _formService.GetPublicFormAsync(id, cancellationToken);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "找不到表單" });
        }

        var serviceRequest = new CreateSubmissionServiceRequest
        {
            FormId = id,
            SubmissionData = request.SubmissionData,
            IsDraft = false,
            CurrentUserId = null,
            IpAddress = GetIpAddress()
        };

        try
        {
            var submissionId = await _submissionService.CreateSubmissionAsync(serviceRequest, cancellationToken);
            return Created(string.Empty, new { id = submissionId });
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

    private string? GetIpAddress()
    {
        if (Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            var ip = forwardedFor.FirstOrDefault()?.Split(',')[0].Trim();
            if (!string.IsNullOrEmpty(ip))
                return ip.Length > 45 ? ip[..45] : ip;
        }

        return HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString();
    }
}

public class PublicSubmissionRequest
{
    public string SubmissionData { get; set; } = "{}";
}

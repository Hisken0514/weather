using Forma.Application.Features.Supervision.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 督導第二輪：改善回覆與複查登打——公開連結端點（不需登入）
/// </summary>
[ApiController]
[Route("api/public/supervision-reply")]
[AllowAnonymous]
public class PublicSupervisionReplyController : ControllerBase
{
    private readonly ISupervisionReplyService _service;

    private static readonly object NotFoundPayload = new { message = "找不到此連結，請確認網址正確" };

    public PublicSupervisionReplyController(ISupervisionReplyService service)
    {
        _service = service;
    }

    [HttpGet("factory/{token}")]
    public async Task<ActionResult<FactoryReplyPortalDto>> GetFactoryPortal(string token, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GetFactoryPortalAsync(token, ct));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(NotFoundPayload);
        }
    }

    [HttpPut("factory/{token}/tasks/{taskId:guid}")]
    public async Task<ActionResult> UpsertFactoryReply(string token, Guid taskId, [FromBody] UpsertFactoryReplyRequest request, CancellationToken ct)
    {
        try
        {
            await _service.UpsertFactoryReplyAsync(token, taskId, request, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(NotFoundPayload);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("agency/{token}")]
    public async Task<ActionResult<AgencyReviewPortalDto>> GetAgencyPortal(string token, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GetAgencyPortalAsync(token, ct));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(NotFoundPayload);
        }
    }

    [HttpPut("agency/{token}/tasks/{taskId:guid}")]
    public async Task<ActionResult> UpsertAgencyReview(string token, Guid taskId, [FromBody] UpsertAgencyReviewRequest request, CancellationToken ct)
    {
        try
        {
            await _service.UpsertAgencyReviewByTokenAsync(token, taskId, request, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(NotFoundPayload);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}

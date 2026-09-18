using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Supervision.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 督導第二輪：改善回覆與複查登打——連結管理（Admin）與登入雙軌（機關使用者）
/// </summary>
[ApiController]
[Route("api/supervision-reply")]
[Authorize(Policy = Policies.RequireUser)]
public class SupervisionReplyController : ControllerBase
{
    private readonly ISupervisionReplyService _service;
    private readonly ICurrentUserService _currentUser;

    public SupervisionReplyController(ISupervisionReplyService service, ICurrentUserService currentUser)
    {
        _service = service;
        _currentUser = currentUser;
    }

    // ─── Admin：工廠連結管理 ────────────────────────────────

    /// <summary>幫此計畫內已完成任務、尚未產生連結的工廠補建連結（可重複執行）</summary>
    [HttpPost("campaigns/{campaignId:guid}/factory-tokens/generate")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<GenerateTokensResult>> GenerateFactoryTokens(Guid campaignId, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GenerateFactoryTokensAsync(campaignId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("campaigns/{campaignId:guid}/factory-tokens")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<PagedFactoryTokenLinksResponse>> GetFactoryTokenLinks(
        Guid campaignId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        return Ok(await _service.GetFactoryTokenLinksAsync(campaignId, page, pageSize, search, ct));
    }

    [HttpPost("factories/{factoryId:guid}/factory-token/revoke")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> RevokeFactoryToken(Guid factoryId, CancellationToken ct)
    {
        try
        {
            await _service.RevokeFactoryTokenAsync(factoryId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("factories/{factoryId:guid}/factory-token/regenerate")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<RegenerateTokenResult>> RegenerateFactoryToken(Guid factoryId, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.RegenerateFactoryTokenAsync(factoryId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>停用此計畫下所有目前啟用中的工廠改善回覆連結</summary>
    [HttpPost("campaigns/{campaignId:guid}/factory-tokens/revoke-all")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<RevokeAllTokensResult>> RevokeAllFactoryTokens(Guid campaignId, CancellationToken ct)
    {
        return Ok(await _service.RevokeAllFactoryTokensAsync(campaignId, ct));
    }

    // ─── Admin：機關連結管理 ────────────────────────────────

    /// <summary>幫此計畫內已完成任務、尚未產生連結的機關補建連結（可重複執行）</summary>
    [HttpPost("campaigns/{campaignId:guid}/agency-tokens/generate")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<GenerateTokensResult>> GenerateAgencyTokens(Guid campaignId, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GenerateAgencyTokensAsync(campaignId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("campaigns/{campaignId:guid}/agency-tokens")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<PagedAgencyTokenLinksResponse>> GetAgencyTokenLinks(
        Guid campaignId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        return Ok(await _service.GetAgencyTokenLinksAsync(campaignId, page, pageSize, search, ct));
    }

    [HttpPost("campaigns/{campaignId:guid}/agencies/{agencyId:guid}/agency-token/revoke")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> RevokeAgencyToken(Guid campaignId, Guid agencyId, CancellationToken ct)
    {
        try
        {
            await _service.RevokeAgencyTokenAsync(campaignId, agencyId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("campaigns/{campaignId:guid}/agencies/{agencyId:guid}/agency-token/regenerate")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<RegenerateTokenResult>> RegenerateAgencyToken(Guid campaignId, Guid agencyId, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.RegenerateAgencyTokenAsync(campaignId, agencyId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>停用此計畫下所有目前啟用中的機關複查登打連結</summary>
    [HttpPost("campaigns/{campaignId:guid}/agency-tokens/revoke-all")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<RevokeAllTokensResult>> RevokeAllAgencyTokens(Guid campaignId, CancellationToken ct)
    {
        return Ok(await _service.RevokeAllAgencyTokensAsync(campaignId, ct));
    }

    // ─── 登入雙軌（機關使用者/Admin）─────────────────────────

    /// <summary>
    /// 取得目前登入使用者在此計畫下可複查登打的督導任務（依產業園區綁定或機關身分過濾，admin 不過濾）。
    /// 分頁 + 搜尋（工廠名稱/登記編號/機關名稱）+ 工廠回覆狀態/機關複查狀態篩選。
    /// </summary>
    [HttpGet("campaigns/{campaignId:guid}/my-agency-review-tasks")]
    public async Task<ActionResult<PagedAgencyReviewTasksResponse>> GetMyAgencyReviewTasks(
        Guid campaignId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] bool? factoryReplied = null,
        [FromQuery] bool? agencyReviewed = null,
        [FromQuery] Guid? factoryId = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        try
        {
            var userId = _currentUser.UserId!.Value;
            return Ok(await _service.GetMyAgencyReviewTasksAsync(
                userId, _currentUser.IsSystemAdmin, campaignId,
                page, pageSize, search, factoryReplied, agencyReviewed, factoryId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>依工廠分組的複查進度清單，分頁 + 搜尋（工廠名稱/登記編號）</summary>
    [HttpGet("campaigns/{campaignId:guid}/my-agency-review-factories")]
    public async Task<ActionResult<PagedAgencyReviewFactorySummaryResponse>> GetMyAgencyReviewFactories(
        Guid campaignId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] bool? factoryReplyCompleted = null,
        [FromQuery] bool? agencyReviewCompleted = null,
        [FromQuery] bool? needsReReview = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        try
        {
            var userId = _currentUser.UserId!.Value;
            return Ok(await _service.GetMyAgencyReviewFactoriesAsync(
                userId, _currentUser.IsSystemAdmin, campaignId, page, pageSize, search,
                factoryReplyCompleted, agencyReviewCompleted, needsReReview, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("tasks/{taskId:guid}/agency-review")]
    public async Task<ActionResult<AgencyReviewTaskDto>> GetMyAgencyReviewForTask(Guid taskId, CancellationToken ct)
    {
        try
        {
            var userId = _currentUser.UserId!.Value;
            return Ok(await _service.GetMyAgencyReviewForTaskAsync(userId, _currentUser.IsSystemAdmin, taskId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPut("tasks/{taskId:guid}/agency-review")]
    public async Task<ActionResult> UpsertMyAgencyReview(Guid taskId, [FromBody] UpsertAgencyReviewRequest request, CancellationToken ct)
    {
        try
        {
            var userId = _currentUser.UserId!.Value;
            await _service.UpsertAgencyReviewByUserAsync(userId, _currentUser.IsSystemAdmin, taskId, request, ct);
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

    // ─── Admin：工廠回覆項目管理 ─────────────────────────────

    /// <summary>Admin 瀏覽計畫內已完成的督導任務，挑選要管理回覆項目的任務。分頁 + 搜尋（工廠名稱/登記編號/機關名稱）</summary>
    [HttpGet("campaigns/{campaignId:guid}/admin-reply-tasks")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<PagedAdminReplyTaskListResponse>> GetAdminReplyTaskList(
        Guid campaignId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);
        return Ok(await _service.GetAdminReplyTaskListAsync(campaignId, page, pageSize, search, ct));
    }

    [HttpGet("tasks/{taskId:guid}/factory-reply-items")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<List<FactoryReplyItemDto>>> GetFactoryReplyItems(Guid taskId, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GetFactoryReplyItemsAsync(taskId, ct));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("tasks/{taskId:guid}/factory-reply-items")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult<Guid>> CreateFactoryReplyItem(Guid taskId, [FromBody] CreateFactoryReplyItemRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _service.CreateFactoryReplyItemAsync(taskId, request, ct);
            return Ok(new { id });
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

    [HttpPut("factory-reply-items/{itemId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> UpdateFactoryReplyItem(Guid itemId, [FromBody] UpdateFactoryReplyItemRequest request, CancellationToken ct)
    {
        try
        {
            await _service.UpdateFactoryReplyItemAsync(itemId, request, ct);
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

    [HttpDelete("factory-reply-items/{itemId:guid}")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> DeleteFactoryReplyItem(Guid itemId, CancellationToken ct)
    {
        try
        {
            await _service.DeleteFactoryReplyItemAsync(itemId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("factory-reply-items/{itemId:guid}/move")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> MoveFactoryReplyItem(Guid itemId, [FromQuery] bool up, CancellationToken ct)
    {
        try
        {
            await _service.MoveFactoryReplyItemAsync(itemId, up, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>標記/取消標記任務為「無需改善回覆」（機關督導時沒有發現任何需要改善的項目）</summary>
    [HttpPut("tasks/{taskId:guid}/no-improvement-needed")]
    [Authorize(Policy = Policies.RequireSystemAdmin)]
    public async Task<ActionResult> SetTaskNoImprovementNeeded(Guid taskId, [FromBody] SetTaskNoImprovementNeededRequest request, CancellationToken ct)
    {
        try
        {
            await _service.SetTaskNoImprovementNeededAsync(taskId, request.Value, ct);
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

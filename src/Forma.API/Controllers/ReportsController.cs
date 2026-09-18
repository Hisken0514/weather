using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Reports.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 報告 API
/// </summary>
[ApiController]
[Route("api/reports")]
[Authorize(Policy = Policies.RequireUser)]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;
    private readonly ICurrentUserService _currentUser;

    public ReportsController(IReportService reportService, ICurrentUserService currentUser)
    {
        _reportService = reportService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 取得表單報告
    /// </summary>
    [HttpGet("{formId:guid}")]
    public async Task<ActionResult<ReportDto>> GetFormReport(
        Guid formId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var request = new GetFormReportRequest
        {
            FormId = formId,
            StartDate = startDate,
            EndDate = endDate,
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin
        };

        try
        {
            var result = await _reportService.GetFormReportAsync(request);
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

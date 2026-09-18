using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Features.Exports.DTOs;
using Forma.Application.Services;
using Forma.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CreateExportServiceRequest = Forma.Application.Services.CreateExportRequest;

namespace Forma.API.Controllers;

/// <summary>
/// 匯出 API
/// </summary>
[ApiController]
[Route("api/exports")]
[Authorize(Policy = Policies.RequireUser)]
public class ExportsController : ControllerBase
{
    private readonly IExportService _exportService;
    private readonly ICurrentUserService _currentUser;
    private readonly IApplicationDbContext _context;

    public ExportsController(IExportService exportService, ICurrentUserService currentUser, IApplicationDbContext context)
    {
        _exportService = exportService;
        _currentUser = currentUser;
        _context = context;
    }

    /// <summary>
    /// 建立匯出任務
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ExportDto>> CreateExport([FromBody] CreateExportRequest request)
    {
        var serviceRequest = new CreateExportServiceRequest
        {
            FormId = request.FormId,
            Format = request.Format ?? "CSV",
            Filters = request.Filters,
            CurrentUserId = _currentUser.UserId!.Value,
            IsSystemAdmin = _currentUser.IsSystemAdmin
        };

        try
        {
            var result = await _exportService.CreateExportAsync(serviceRequest);
            return CreatedAtAction(nameof(GetExport), new { id = result.Id }, result);
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
    /// 取得匯出任務狀態
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExportDto>> GetExport(Guid id)
    {
        try
        {
            var result = await _exportService.GetExportByIdAsync(
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
    /// 下載匯出檔案
    /// </summary>
    [HttpGet("{id:guid}/download")]
    public async Task<ActionResult> DownloadExport(Guid id)
    {
        var export = await _context.Exports
            .Include(e => e.Form)
            .FirstOrDefaultAsync(e => e.Id == id);

        if (export == null)
        {
            return NotFound(new { message = "找不到匯出任務" });
        }

        // 權限檢查
        if (!_currentUser.IsSystemAdmin && export.CreatedById != _currentUser.UserId)
        {
            var membership = await _context.ProjectMembers
                .FirstOrDefaultAsync(pm =>
                    pm.ProjectId == export.Form.ProjectId &&
                    pm.UserId == _currentUser.UserId &&
                    pm.RemovedAt == null);

            if (membership == null || membership.Role < ProjectRole.Analyst)
            {
                return Forbid();
            }
        }

        if (export.Status != "Completed")
        {
            return BadRequest(new { message = "匯出任務尚未完成" });
        }

        if (string.IsNullOrEmpty(export.FilePath) || !System.IO.File.Exists(export.FilePath))
        {
            return NotFound(new { message = "匯出檔案不存在或已過期" });
        }

        if (DateTime.UtcNow > export.ExpiresAt)
        {
            return BadRequest(new { message = "匯出檔案已過期" });
        }

        var contentType = export.Format.ToUpperInvariant() switch
        {
            "CSV" => "text/csv",
            "JSON" => "application/json",
            _ => "application/octet-stream"
        };

        var fileBytes = await System.IO.File.ReadAllBytesAsync(export.FilePath);
        return File(fileBytes, contentType, export.FileName);
    }
}

#region Request DTOs

public class CreateExportRequest
{
    public Guid FormId { get; set; }
    public string? Format { get; set; }
    public string? Filters { get; set; }
}

#endregion

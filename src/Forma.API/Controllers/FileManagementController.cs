using Forma.Application.Common.Authorization;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Files.DTOs;
using Forma.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Forma.API.Controllers;

/// <summary>
/// 檔案管理 API
/// </summary>
[ApiController]
[Route("api/files")]
[Authorize(Policy = Policies.RequireUser)]
public class FileManagementController : ControllerBase
{
    private readonly IFileManagementService _fileService;
    private readonly ICurrentUserService _currentUser;

    public FileManagementController(
        IFileManagementService fileService,
        ICurrentUserService currentUser)
    {
        _fileService = fileService;
        _currentUser = currentUser;
    }

    /// <summary>
    /// 上傳單一檔案
    /// </summary>
    /// <param name="file">要上傳的檔案</param>
    /// <param name="description">檔案描述</param>
    /// <param name="entityType">關聯實體類型</param>
    /// <param name="entityId">關聯實體 ID</param>
    /// <param name="isPublic">是否公開</param>
    /// <param name="expiresInHours">過期時間 (小時)</param>
    /// <returns>上傳結果</returns>
    [HttpPost]
    [ProducesResponseType(typeof(FileUploadResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB
    public async Task<ActionResult<FileUploadResponse>> Upload(
        IFormFile file,
        [FromForm] string? description = null,
        [FromForm] string? entityType = null,
        [FromForm] Guid? entityId = null,
        [FromForm] bool isPublic = false,
        [FromForm] int? expiresInHours = null)
    {
        var request = new FileUploadRequest
        {
            Description = description,
            EntityType = entityType,
            EntityId = entityId,
            IsPublic = isPublic,
            ExpiresInHours = expiresInHours
        };

        try
        {
            var result = await _fileService.UploadAsync(
                file,
                request,
                _currentUser.UserId!.Value);

            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 批次上傳檔案
    /// </summary>
    /// <param name="files">要上傳的檔案列表</param>
    /// <param name="description">檔案描述</param>
    /// <param name="entityType">關聯實體類型</param>
    /// <param name="entityId">關聯實體 ID</param>
    /// <param name="isPublic">是否公開</param>
    /// <param name="expiresInHours">過期時間 (小時)</param>
    /// <returns>上傳結果列表</returns>
    [HttpPost("batch")]
    [ProducesResponseType(typeof(IEnumerable<FileUploadResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [RequestSizeLimit(200 * 1024 * 1024)] // 200MB
    public async Task<ActionResult<IEnumerable<FileUploadResponse>>> UploadMultiple(
        IEnumerable<IFormFile> files,
        [FromForm] string? description = null,
        [FromForm] string? entityType = null,
        [FromForm] Guid? entityId = null,
        [FromForm] bool isPublic = false,
        [FromForm] int? expiresInHours = null)
    {
        var request = new FileUploadRequest
        {
            Description = description,
            EntityType = entityType,
            EntityId = entityId,
            IsPublic = isPublic,
            ExpiresInHours = expiresInHours
        };

        try
        {
            var results = await _fileService.UploadMultipleAsync(
                files,
                request,
                _currentUser.UserId!.Value);

            return CreatedAtAction(nameof(Query), results);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 下載檔案
    /// </summary>
    /// <param name="id">檔案 ID</param>
    /// <returns>檔案內容</returns>
    [HttpGet("{id:guid}/download")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [AllowAnonymous] // 允許匿名下載公開檔案
    public async Task<IActionResult> Download(Guid id)
    {
        try
        {
            var userId = _currentUser.UserId ?? Guid.Empty;
            var isAdmin = _currentUser.IsSystemAdmin;

            var (stream, contentType, fileName) = await _fileService.DownloadAsync(
                id,
                userId,
                isAdmin);

            return File(stream, contentType, fileName);
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
        catch (FileNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// 取得檔案資訊
    /// </summary>
    /// <param name="id">檔案 ID</param>
    /// <returns>檔案資訊</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FileInfoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FileInfoResponse>> GetById(Guid id)
    {
        try
        {
            var result = await _fileService.GetByIdAsync(
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
    /// 查詢檔案列表
    /// </summary>
    /// <param name="request">查詢條件</param>
    /// <returns>分頁檔案列表</returns>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<FileListItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<FileListItemResponse>>> Query(
        [FromQuery] FileQueryRequest request)
    {
        var result = await _fileService.QueryAsync(
            request,
            _currentUser.UserId!.Value,
            _currentUser.IsSystemAdmin);

        return Ok(result);
    }

    /// <summary>
    /// 刪除檔案
    /// </summary>
    /// <param name="id">檔案 ID</param>
    /// <returns>刪除結果</returns>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            await _fileService.DeleteAsync(
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
    /// 更新檔案資訊
    /// </summary>
    /// <param name="id">檔案 ID</param>
    /// <param name="request">更新請求</param>
    /// <returns>更新後的檔案資訊</returns>
    [HttpPatch("{id:guid}")]
    [ProducesResponseType(typeof(FileInfoResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<FileInfoResponse>> Update(
        Guid id,
        [FromBody] UpdateFileRequest request)
    {
        try
        {
            var result = await _fileService.UpdateAsync(
                id,
                request.Description,
                request.IsPublic,
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
    /// 取得檔案統計
    /// </summary>
    /// <returns>統計資料</returns>
    [HttpGet("statistics")]
    [ProducesResponseType(typeof(FileStatisticsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<FileStatisticsResponse>> GetStatistics()
    {
        var result = await _fileService.GetStatisticsAsync(
            _currentUser.UserId!.Value,
            _currentUser.IsSystemAdmin);

        return Ok(result);
    }
}

#region Request DTOs

/// <summary>
/// 更新檔案請求
/// </summary>
public class UpdateFileRequest
{
    /// <summary>
    /// 檔案描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 是否公開
    /// </summary>
    public bool? IsPublic { get; set; }
}

#endregion

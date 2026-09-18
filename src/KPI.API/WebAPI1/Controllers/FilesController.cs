using System.Security.Claims;
using System.Text;
using ISHAuditAPI.Services;
using ISHAuditAPI.Services.檔案;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebAPI1.Controllers;

/// <summary>
///     FilesManager 檔案管理相關 API
/// </summary>
[ApiController]
[Route("Files")]

public class FilesController : ControllerBase
{
    private readonly IFileService _fileService; // ✅ 使用介面

    private readonly ILogger<UserController> _logger;

    public FilesController(IFileService fileService, ILogger<UserController> logger)
    {
        _fileService = fileService;
        _logger = logger;
    }

    /// <summary>
    ///     取得伺服器磁碟空間資訊。
    /// </summary>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含磁碟空間資訊（如：總容量、可用空間、使用率等）；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "成功取得磁碟空間資訊",
    ///   "data": {
    ///     "driveName": "/",
    ///     "driveFormat": "apfs",
    ///     "driveType": "Fixed",
    ///     "totalSize": 994662584320,
    ///     "totalFreeSpace": 201998491648,
    ///     "availableFreeSpace": 201998491648,
    ///     "usagePercentage": 0
    ///   }
    /// }
    /// </code>
    /// </remarks>
    [HttpGet("GetSpaceInfo")]

    public IActionResult GetSpaceInfo()
    {
        var result = _fileService.GetSpaceInfo().Result;
        if (result.Success) return Ok(new { success = true, message = result.Message, result.Data });
        return BadRequest(new { success = false, message = result.Message, result.Data });
    }

    /// <summary>
    ///     列出目錄內容
    /// </summary>
    /// <param name="path">目錄路徑</param>
    /// <param name="options">列表選項</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含檔案和目錄列表；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "成功取得目錄內容",
    ///   "data": [
    ///     {
    ///       "name": "example.txt",
    ///       "path": "/path/to/example.txt",
    ///       "isDirectory": false,
    ///       "size": 1024,
    ///       "createdTime": "2024-01-01T00:00:00Z",
    ///       "modifiedTime": "2024-01-01T00:00:00Z"
    ///     }
    ///   ]
    /// }
    /// </code>
    /// </remarks>
    [HttpGet("ListDirectory")]

    public async Task<IActionResult> ListDirectory([FromQuery] string path, [FromQuery] FileListOptions options = null)
    {
        var result = await _fileService.ListDirectory(path, options);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     取得檔案或目錄資訊
    /// </summary>
    /// <param name="path">檔案路徑</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含檔案資訊；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "成功取得檔案資訊",
    ///   "data": {
    ///     "name": "example.txt",
    ///     "path": "/path/to/example.txt",
    ///     "isDirectory": false,
    ///     "size": 1024,
    ///     "createdTime": "2024-01-01T00:00:00Z",
    ///     "modifiedTime": "2024-01-01T00:00:00Z"
    ///   }
    /// }
    /// </code>
    /// </remarks>
    [HttpGet("GetFileInfo")]
    public async Task<IActionResult> GetFileInfo([FromQuery] string path)
    {
        var result = await _fileService.GetFileInfo(path);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     建立目錄
    /// </summary>
    /// <param name="path">目錄路徑</param>
    /// <param name="createParents">是否建立父目錄</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，建立結果為 true；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "目錄建立成功",
    ///   "data": true
    /// }
    /// </code>
    /// </remarks>
    [HttpPost("CreateDirectory")]
    public async Task<IActionResult> CreateDirectory([FromBody] CreateDirectoryRequest request)
    {
        var result = await _fileService.CreateDirectory(request.Path, request.CreateParents);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     刪除檔案或目錄
    /// </summary>
    /// <param name="request">刪除請求參數</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，刪除結果為 true；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "檔案刪除成功",
    ///   "data": true
    /// }
    /// </code>
    /// </remarks>
    [HttpDelete("DeleteItem")]
    public async Task<IActionResult> DeleteItem([FromBody] DeleteItemRequest request)
    {
        var result = await _fileService.DeleteItem(request.Path, request.Recursive);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     移動檔案或目錄
    /// </summary>
    /// <param name="request">移動請求參數</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，移動結果為 true；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "檔案移動成功",
    ///   "data": true
    /// }
    /// </code>
    /// </remarks>
    [HttpPut("MoveItem")]
    public async Task<IActionResult> MoveItem([FromBody] MoveItemRequest request)
    {
        var result = await _fileService.MoveItem(request.SourcePath, request.DestinationPath, request.Overwrite);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     複製檔案或目錄
    /// </summary>
    /// <param name="request">複製請求參數</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，複製結果為 true；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "檔案複製成功",
    ///   "data": true
    /// }
    /// </code>
    /// </remarks>
    [HttpPost("CopyItem")]
    public async Task<IActionResult> CopyItem([FromBody] CopyItemRequest request)
    {
        var result = await _fileService.CopyItem(request.SourcePath, request.DestinationPath, request.Overwrite);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }



    /// <summary>
    ///     上傳檔案
    /// </summary>
    /// <param name="file">上傳的檔案</param>
    /// <param name="targetPath">目標路徑</param>
    /// <param name="options">上傳選項</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含上傳結果；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "檔案上傳成功",
    ///   "data": {
    ///     "fileName": "example.txt",
    ///     "filePath": "/upload/example.txt",
    ///     "fileSize": 1024
    ///   }
    /// }
    /// </code>
    /// </remarks>
    [HttpPost("UploadFile")]
    [Consumes("multipart/form-data")]
    [Authorize]
    public async Task<IActionResult> UploadFile([FromForm] UploadFileRequest request)
    {
        // 從 JWT Claims 中取得使用者 ID（通常是 Guid 格式）
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new PublicDto.ApiResponse<dynamic>
            {
                Success = false,
                Message = "無效的使用者身份",
                Data = null
            });
        var result = await _fileService.UploadFile(request.File, request.TargetPath, request.Options, userId);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     批次上傳檔案
    /// </summary>
    /// <param name="files">檔案列表</param>
    /// <param name="targetDirectory">目標目錄</param>
    /// <param name="options">上傳選項</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含批次上傳結果；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "批次上傳完成",
    ///   "data": {
    ///     "totalFiles": 3,
    ///     "successCount": 2,
    ///     "failCount": 1,
    ///     "results": [...]
    ///   }
    /// }
    /// </code>
    ///     注意：此功能尚未實做完畢
    /// </remarks>
    [HttpPost("UploadFiles")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadFiles([FromForm] UploadFilesRequest request)
    {
        var result = await _fileService.UploadFiles(request.Files, request.TargetDirectory, request.Options);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     下載檔案
    /// </summary>
    /// <param name="path">檔案路徑</param>
    /// <returns>
    ///     成功時回傳檔案串流；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     成功時直接回傳檔案內容供下載
    /// </remarks>
    [HttpGet("DownloadFile")]
    public async Task<IActionResult> DownloadFile([FromQuery] string path)
    {
        var result = await _fileService.DownloadFile(path);
        if (result.Success)
        {
            var downloadResult = result.Data;
            return File(downloadResult.FileStream, downloadResult.MimeType, downloadResult.FileName);
        }

        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     讀取文字檔案內容
    /// </summary>
    /// <param name="path">檔案路徑</param>
    /// <param name="encoding">編碼格式</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含檔案內容；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "成功讀取檔案內容",
    ///   "data": "文字檔案的內容..."
    /// }
    /// </code>
    /// </remarks>
    [HttpGet("ReadTextFile")]
    public async Task<IActionResult> ReadTextFile([FromQuery] string path, [FromQuery] string encoding = null)
    {
        Encoding fileEncoding = null;
        if (!string.IsNullOrEmpty(encoding))
            try
            {
                fileEncoding = Encoding.GetEncoding(encoding);
            }
            catch
            {
                return BadRequest(new { success = false, message = "不支援的編碼格式", data = (string)null });
            }

        var result = await _fileService.ReadTextFile(path, fileEncoding);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     寫入文字檔案
    /// </summary>
    /// <param name="request">寫入請求參數</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，寫入結果為 true；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "檔案寫入成功",
    ///   "data": true
    /// }
    /// </code>
    /// </remarks>
    [HttpPost("WriteTextFile")]
    public async Task<IActionResult> WriteTextFile([FromBody] WriteTextFileRequest request)
    {
        Encoding fileEncoding = null;
        if (!string.IsNullOrEmpty(request.Encoding))
            try
            {
                fileEncoding = Encoding.GetEncoding(request.Encoding);
            }
            catch
            {
                return BadRequest(new { success = false, message = "不支援的編碼格式", data = false });
            }

        var result = await _fileService.WriteTextFile(request.Path, request.Content, fileEncoding, request.Overwrite);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     搜尋檔案
    /// </summary>
    /// <param name="searchPath">搜尋路徑</param>
    /// <param name="pattern">搜尋模式</param>
    /// <param name="options">搜尋選項</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含搜尋結果；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "搜尋完成",
    ///   "data": [
    ///     {
    ///       "name": "example.txt",
    ///       "path": "/path/to/example.txt",
    ///       "isDirectory": false,
    ///       "size": 1024,
    ///       "createdTime": "2024-01-01T00:00:00Z",
    ///       "modifiedTime": "2024-01-01T00:00:00Z"
    ///     }
    ///   ]
    /// }
    /// </code>
    /// </remarks>
    [HttpGet("SearchFiles")]
    public async Task<IActionResult> SearchFiles([FromQuery] string searchPath, [FromQuery] string pattern,
        [FromQuery] SearchOptions options = null)
    {
        var result = await _fileService.SearchFiles(searchPath, pattern, options);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     批次操作
    /// </summary>
    /// <param name="operation">批次操作請求</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含批次操作結果；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "批次操作完成",
    ///   "data": {
    ///     "totalOperations": 5,
    ///     "successCount": 4,
    ///     "failCount": 1,
    ///     "results": [...]
    ///   }
    /// }
    /// </code>
    /// </remarks>
    [HttpPost("ExecuteBatchOperation")]
    public async Task<IActionResult> ExecuteBatchOperation([FromBody] BatchOperationRequest operation)
    {
        var result = await _fileService.ExecuteBatchOperation(operation);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }

    /// <summary>
    ///     計算目錄大小
    /// </summary>
    /// <param name="path">目錄路徑</param>
    /// <param name="includeSubdirectories">是否包含子目錄</param>
    /// <returns>
    ///     成功時回傳 HTTP 200 OK，包含目錄大小資訊；
    ///     失敗時回傳 HTTP 400 Bad Request，並附帶錯誤訊息。
    /// </returns>
    /// <remarks>
    ///     回傳資料格式範例如下：
    ///     <code>
    /// {
    ///   "success": true,
    ///   "message": "成功計算目錄大小",
    ///   "data": {
    ///     "path": "/path/to/directory",
    ///     "totalSize": 1048576,
    ///     "fileCount": 10,
    ///     "directoryCount": 3
    ///   }
    /// }
    /// </code>
    /// </remarks>
    [HttpGet("CalculateDirectorySize")]
    public async Task<IActionResult> CalculateDirectorySize([FromQuery] string path,
        [FromQuery] bool includeSubdirectories = true)
    {
        var result = await _fileService.CalculateDirectorySize(path, includeSubdirectories);
        if (result.Success) return Ok(new { success = true, message = result.Message, data = result.Data });
        return BadRequest(new { success = false, message = result.Message, data = result.Data });
    }
}

public class CreateDirectoryRequest
{
    public string Path { get; set; }
    public bool CreateParents { get; set; } = true;
}

public class DeleteItemRequest
{
    public string Path { get; set; }
    public bool Recursive { get; set; } = false;
}

public class MoveItemRequest
{
    public string SourcePath { get; set; }
    public string DestinationPath { get; set; }
    public bool Overwrite { get; set; } = false;
}

public class CopyItemRequest
{
    public string SourcePath { get; set; }
    public string DestinationPath { get; set; }
    public bool Overwrite { get; set; } = false;
}

public class RenameItemRequest
{
    public string Path { get; set; }
    public string NewName { get; set; }
}

public class WriteTextFileRequest
{
    public string Path { get; set; }
    public string Content { get; set; }
    public string Encoding { get; set; }
    public bool Overwrite { get; set; } = false;
}

public class UploadFileRequest
{
    /// <summary>
    ///     上傳的檔案
    /// </summary>
    [FromForm(Name = "file")]
    public IFormFile File { get; set; }

    /// <summary>
    ///     目標路徑
    /// </summary>
    [FromForm(Name = "targetPath")]
    public string TargetPath { get; set; }

    /// <summary>
    ///     上傳選項
    /// </summary>
    [FromForm(Name = "options")]
    public UploadOptions Options { get; set; }
}

public class UploadFilesRequest
{
    /// <summary>
    ///     上傳的多個檔案
    /// </summary>
    [FromForm(Name = "files")]
    public List<IFormFile> Files { get; set; }

    /// <summary>
    ///     目標資料夾路徑
    /// </summary>
    [FromForm(Name = "targetDirectory")]
    public string TargetDirectory { get; set; }

    /// <summary>
    ///     上傳選項
    /// </summary>
    [FromForm(Name = "options")]
    public UploadOptions Options { get; set; }
}
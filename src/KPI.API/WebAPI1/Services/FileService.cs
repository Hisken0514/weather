using System.Xml.Linq;
using ISHAuditAPI.Services;
using ISHAuditAPI.Services.檔案;
using Microsoft.EntityFrameworkCore;
using WebAPI1.Context;
using WebAPI1.Services;

using Path = System.IO.Path;



/// <summary>
/// 檔案管理核心服務接口
/// </summary>
public interface IFileService
{
        /// <summary>
        /// 列出目錄內容
        /// </summary>
        /// <param name="path">目錄路徑</param>
        /// <param name="options">列表選項</param>
        /// <returns>檔案和目錄列表</returns>
        Task<PublicDto.ApiResponse<IEnumerable<FileItemDto>>> ListDirectory(string path, FileListOptions options = null);

        /// <summary>
        /// 取得檔案或目錄資訊
        /// </summary>
        /// <param name="path">檔案路徑</param>
        /// <returns>檔案資訊</returns>
        Task<PublicDto.ApiResponse<FileItemDto>> GetFileInfo(string path);

        /// <summary>
        /// 建立目錄
        /// </summary>
        /// <param name="path">目錄路徑</param>
        /// <param name="createParents">是否建立父目錄</param>
        /// <returns>建立結果</returns>
        Task<PublicDto.ApiResponse<bool>> CreateDirectory(string path, bool createParents = true);

        /// <summary>
        /// 刪除檔案或目錄
        /// </summary>
        /// <param name="path">路徑</param>
        /// <param name="recursive">是否遞迴刪除</param>
        /// <returns>刪除結果</returns>
        Task<PublicDto.ApiResponse<bool>> DeleteItem(string path, bool recursive = false);

        /// <summary>
        /// 移動檔案或目錄
        /// </summary>
        /// <param name="sourcePath">來源路徑</param>
        /// <param name="destinationPath">目標路徑</param>
        /// <param name="overwrite">是否覆蓋</param>
        /// <returns>移動結果</returns>
        Task<PublicDto.ApiResponse<bool>> MoveItem(string sourcePath, string destinationPath, bool overwrite = false);

        /// <summary>
        /// 複製檔案或目錄
        /// </summary>
        /// <param name="sourcePath">來源路徑</param>
        /// <param name="destinationPath">目標路徑</param>
        /// <param name="overwrite">是否覆蓋</param>
        /// <returns>複製結果</returns>
        Task<PublicDto.ApiResponse<bool>> CopyItem(string sourcePath, string destinationPath, bool overwrite = false);

        // /// <summary>
        // /// 重新命名檔案或目錄
        // /// </summary>
        // /// <param name="path">檔案路徑</param>
        // /// <param name="newName">新名稱</param>
        // /// <returns>重新命名結果</returns>
        // Task<PublicDto.ApiResponse<bool>> RenameItem(string path, string newName);

        /// <summary>
        /// 上傳檔案
        /// </summary>
        /// <param name="file">上傳的檔案</param>
        /// <param name="targetPath">目標路徑</param>
        /// <param name="options">上傳選項</param>
        /// <returns>上傳結果</returns>
        Task<PublicDto.ApiResponse<UploadResult>> UploadFile(IFormFile file,
            string targetPath,
            UploadOptions options ,
              Guid  userId
        );

        /// <summary>
        /// 批次上傳檔案
        /// </summary>
        /// <param name="files">檔案列表</param>
        /// <param name="targetDirectory">目標目錄</param>
        /// <param name="options">上傳選項</param>
        /// <returns>批次上傳結果</returns>
        /// <remarks>尚未實做完畢</remarks>
        Task<PublicDto.ApiResponse<BatchUploadResult>> UploadFiles(IEnumerable<IFormFile> files, string targetDirectory, UploadOptions options = null);

        /// <summary>
        /// 下載檔案
        /// </summary>
        /// <param name="path">檔案路徑</param>
        /// <returns>檔案串流</returns>
        Task<PublicDto.ApiResponse<FileDownloadResult>> DownloadFile(string path);

        /// <summary>
        /// 讀取文字檔案內容
        /// </summary>
        /// <param name="path">檔案路徑</param>
        /// <param name="encoding">編碼格式</param>
        /// <returns>檔案內容</returns>
        Task<PublicDto.ApiResponse<string>> ReadTextFile(string path, System.Text.Encoding encoding = null);

        /// <summary>
        /// 寫入文字檔案
        /// </summary>
        /// <param name="path">檔案路徑</param>
        /// <param name="content">檔案內容</param>
        /// <param name="encoding">編碼格式</param>
        /// <param name="overwrite">是否覆蓋</param>
        /// <returns>寫入結果</returns>
        Task<PublicDto.ApiResponse<bool>> WriteTextFile(string path, string content, System.Text.Encoding encoding = null, bool overwrite = false);

        /// <summary>
        /// 搜尋檔案
        /// </summary>
        /// <param name="searchPath">搜尋路徑</param>
        /// <param name="pattern">搜尋模式</param>
        /// <param name="options">搜尋選項</param>
        /// <returns>搜尋結果</returns>
        Task<PublicDto.ApiResponse<IEnumerable<FileItemDto>>> SearchFiles(string searchPath, string pattern, SearchOptions options = null);

        /// <summary>
        /// 批次操作
        /// </summary>
        /// <param name="operation">批次操作</param>
        /// <returns>批次操作結果</returns>
        Task<PublicDto.ApiResponse<BatchOperationResult>> ExecuteBatchOperation(BatchOperationRequest operation);

        /// <summary>
        /// 取得磁碟空間資訊
        /// </summary>
        /// <param name="path">路徑</param>
        /// <returns>磁碟空間資訊</returns>
        Task<PublicDto.ApiResponse<FileDto.DriveSpaceInfoDto>> GetSpaceInfo(string path = null);

        /// <summary>
        /// 計算目錄大小
        /// </summary>
        /// <param name="path">目錄路徑</param>
        /// <param name="includeSubdirectories">是否包含子目錄</param>
        /// <returns>目錄大小資訊</returns>
        Task<PublicDto.ApiResponse<DirectorySizeInfo>> CalculateDirectorySize(string path, bool includeSubdirectories = true);

        string GetWorkingDirectory();

}

public class FileService:IFileService
{
    private readonly ISHAuditDbcontext _context;
    private readonly ILogger<UserService> _logger;
    private readonly IConfiguration _configuration;
    private readonly Guid _systemUserId;
    private readonly IServiceProvider _serviceProvider;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string _workingDirectory;
    private readonly IWebHostEnvironment _env;

    
    public FileService(ISHAuditDbcontext context,
        ILogger<UserService> logger,
        IConfiguration configuration,
        IServiceProvider serviceProvider,
        IHttpContextAccessor httpContextAccessor,
        IWebHostEnvironment env

        )
    {
        _context = context;
        _logger = logger;
        _env = env;
        _configuration = configuration;
        _systemUserId = Guid.NewGuid();
        _serviceProvider = serviceProvider;
        _httpContextAccessor = httpContextAccessor;
        _workingDirectory = _env.WebRootPath;
    }
    
    /// <summary>
    /// 列出目錄內容（混合檔案系統和資料庫資訊）
    /// </summary>
    /// <param name="path">目錄路徑</param>
    /// <param name="options">列表選項</param>
    /// <returns>檔案和目錄列表</returns>

    public async Task<PublicDto.ApiResponse<IEnumerable<FileItemDto>>> ListDirectory(string path, FileListOptions options = null)
    {
        try
        {

            var fullPath = GetFullPath(path);
            if (!Directory.Exists(fullPath))
            {
                await LogFileOperationAsync("ListDirectory", "目錄列表失敗 - 目錄不存在", "Directory", path,
                    new { FullPath = fullPath });
                
                return new PublicDto.ApiResponse<IEnumerable<FileItemDto>>(false,"目錄不存在");
            }

            options ??= new FileListOptions();
            var startTime = tool.GetTaiwanNow();
            var items = new List<FileItemDto>();

            // === 1. 處理目錄 ===
            var directories = Directory.GetDirectories(fullPath);
            foreach (var dir in directories)
            {
                var dirInfo = new DirectoryInfo(dir);
                
                // 檢查隱藏檔案
                if (!options.IncludeHidden && dirInfo.Attributes.HasFlag(FileAttributes.Hidden))
                    continue;

                var item = await CreateFileItemFromDirectory(dirInfo, path);
                items.Add(item);
            }

            // === 2. 處理檔案（混合模式） ===
            var files = Directory.GetFiles(fullPath);
            
            // 批次獲取資料庫中的檔案資訊
            var filePaths = files.Select(f => GetRelativePath(f)).ToArray();
            var fileEntities = await _context.Files
                .Include(f => f.UploadedBy)
                .Where(f => filePaths.Contains(f.FilePath) && f.IsActive)
                .ToListAsync();

            // 建立路徑到實體的映射
            var fileEntityMap = fileEntities.ToDictionary(f => f.FilePath, f => f);

            foreach (var file in files)
            {
                var fileInfo = new FileInfo(file);
                
                // 檢查隱藏檔案
                if (!options.IncludeHidden && fileInfo.Attributes.HasFlag(FileAttributes.Hidden))
                    continue;

                // 檔案類型篩選
                if (options.FileExtensions?.Any() == true)
                {
                    var extension = fileInfo.Extension.ToLowerInvariant();
                    if (!options.FileExtensions.Contains(extension))
                        continue;
                }

                // 大小篩選
                if (options.MinSize.HasValue && fileInfo.Length < options.MinSize.Value)
                    continue;
                if (options.MaxSize.HasValue && fileInfo.Length > options.MaxSize.Value)
                    continue;

                // 時間篩選
                if (options.ModifiedAfter.HasValue && fileInfo.LastWriteTime < options.ModifiedAfter.Value)
                    continue;
                if (options.ModifiedBefore.HasValue && fileInfo.LastWriteTime > options.ModifiedBefore.Value)
                    continue;

                // 獲取對應的資料庫記錄
                var relativePath = GetRelativePath(file);
                var fileEntity = fileEntityMap.GetValueOrDefault(relativePath);

                // 建立檔案項目（包含資料庫資訊）
                var item = await CreateEnhancedFileItem(fileInfo, fileEntity, path, options);
                items.Add(item);
            }

            // === 3. 處理只存在於資料庫但檔案已遺失的情況 ===
            if (options.IncludeMissingFiles)
            {
                var missingFiles = fileEntities.Where(entity => 
                    !File.Exists(GetFullPath(entity.FilePath))).ToList();

                foreach (var missingEntity in missingFiles)
                {
                    var item = CreateMissingFileItem(missingEntity, path);
                    items.Add(item);
                }
            }

            // 排序
            items = SortItems(items, options.SortBy, options.SortDirection);

            // 分頁
            var totalCount = items.Count;
            if (options.PageSize > 0)
            {
                items = items.Skip(options.PageIndex * options.PageSize)
                    .Take(options.PageSize)
                    .ToList();
            }

            var duration = tool.GetTaiwanNow() - startTime;

            // 記錄成功操作
            await LogFileOperationAsync("ListDirectory", "目錄列表成功", "Directory", path,
                new 
                { 
                    ItemCount = totalCount,
                    ReturnedCount = items.Count,
                    DatabaseMatches = fileEntities.Count,
                    Duration = duration.TotalMilliseconds,
                    Options = new
                    {
                        options.IncludeHidden,
                        options.IncludeMissingFiles,
                        options.PageSize,
                        options.PageIndex,
                        options.SortBy,
                        options.SortDirection
                    }
                });

            return new PublicDto.ApiResponse<IEnumerable<FileItemDto>>(true, $"找到 {totalCount} 個項目", items);
        }
        catch (Exception ex)
        {
            await LogFileOperationAsync("ListDirectory", "目錄列表異常", "Directory", path ?? "",
                new { Error = ex.Message, ExceptionType = ex.GetType().Name });

            _logger.LogError(ex, "列出目錄內容時發生錯誤: {Path}", path);
            return new PublicDto.ApiResponse<IEnumerable<FileItemDto>>(false, $"操作失敗: {ex.Message}");
        }
    }
    /// <summary>
    /// 取得檔案或目錄資訊
    /// </summary>
    /// <param name="path">檔案路徑</param>
    /// <returns>檔案資訊</returns>
    public async Task<PublicDto.ApiResponse<FileItemDto>> GetFileInfo(string path)
    {
        try
        {

            var fullPath = GetFullPath(path);
            FileItemDto item;

            if (File.Exists(fullPath))
            {
                var fileInfo = new FileInfo(fullPath);
                item = await CreateFileItemFromFile(fileInfo, Path.GetDirectoryName(path), new FileListOptions { CalculateHash = true });
            }
            else if (Directory.Exists(fullPath))
            {
                var dirInfo = new DirectoryInfo(fullPath);
                item = await CreateFileItemFromDirectory(dirInfo, Path.GetDirectoryName(path));
            }
            else
            {
                await LogFileOperationAsync("GetFileInfo", "取得檔案資訊失敗 - 檔案不存在", "File", path,
                    new { FullPath = fullPath });
                
                return new PublicDto.ApiResponse<FileItemDto>(false,$"檔案或目錄不存在");
            }

            await LogFileOperationAsync("GetFileInfo", "取得檔案資訊成功", item.IsDirectory ? "Directory" : "File", path,
                new { FileSize = item.Size, IsDirectory = item.IsDirectory, MimeType = item.MimeType });

            return new PublicDto.ApiResponse<FileItemDto>(true,"取得成功",item);
        }
        catch (Exception ex)
        {
            await LogFileOperationAsync("GetFileInfo", "取得檔案資訊異常", "File", path ?? "",
                new { Error = ex.Message });

            _logger.LogError(ex, "取得檔案資訊時發生錯誤: {Path}", path);
            return new PublicDto.ApiResponse<FileItemDto>(false,$"操作失敗: {ex.Message}");
        }
    }
    /// <summary>
    /// 建立目錄
    /// </summary>
    /// <param name="path">目錄路徑</param>
    /// <param name="createParents">是否建立父目錄</param>
    /// <returns>建立結果</returns>
    public async Task<PublicDto.ApiResponse<bool>> CreateDirectory(string path, bool createParents = true)
    {
        try
        {

            var fullPath = GetFullPath(path);

            if (Directory.Exists(fullPath))
            {
                await LogFileOperationAsync("CreateDirectory", "建立目錄失敗 - 目錄已存在", "Directory", path,
                    new { FullPath = fullPath });
                
                return new PublicDto.ApiResponse<bool>(false,$"目錄已存在: {fullPath}");

            }

            if (createParents)
            {
                Directory.CreateDirectory(fullPath);
            }
            else
            {
                var parentDir = Path.GetDirectoryName(fullPath);
                if (!Directory.Exists(parentDir))
                {
                    await LogFileOperationAsync("CreateDirectory", "建立目錄失敗 - 父目錄不存在", "Directory", path,
                        new { ParentDirectory = parentDir, CreateParents = false });
                    return new PublicDto.ApiResponse<bool>(false,$"父目錄不存在: {parentDir}");
                }
                Directory.CreateDirectory(fullPath);
            }

            await LogFileOperationAsync("CreateDirectory", "建立目錄成功", "Directory", path,
                new { FullPath = fullPath, CreateParents = createParents, CreatedAt = DateTime.UtcNow });

            _logger.LogInformation("目錄建立成功: {Path}", fullPath);
            return new PublicDto.ApiResponse<bool>(true,"目錄建立成功");
        }
        catch (Exception ex)
        {
            await LogFileOperationAsync("CreateDirectory", "建立目錄異常", "Directory", path ?? "",
                new { Error = ex.Message, CreateParents = createParents });

            _logger.LogError(ex, "建立目錄時發生錯誤: {Path}", path);
            return new PublicDto.ApiResponse<bool>(false,$"操作失敗: {ex.Message}");
        }
    }
    /// <summary>
    /// 刪除檔案或目錄
    /// </summary>
    /// <param name="path">路徑</param>
    /// <param name="recursive">是否遞迴刪除</param>
    /// <returns>刪除結果</returns>

    /// <summary>
    /// 硬刪除檔案（完全從資料庫移除記錄）
    /// </summary>
    public async Task<PublicDto.ApiResponse<bool>> DeleteItem(string path, bool recursive = false)
    {
        try
        {
            _logger.LogInformation("開始硬刪除項目: Path={Path}, Recursive={Recursive}", path, recursive);

            var fullPath = GetFullPath(path);
            var deletedFileIds = new List<int>();

            if (File.Exists(fullPath))
            {
                _logger.LogInformation("處理單個檔案硬刪除: {Path}", path);

                // === 方法 1：使用 ExecuteDelete (EF Core 7+) ===
                var deletedRows = await _context.Files
                    .Where(f => f.FilePath == path && f.IsActive)
                    .ExecuteDeleteAsync();

                _logger.LogInformation("硬刪除了 {Rows} 筆資料庫記錄", deletedRows);

                // 刪除實體檔案
                File.Delete(fullPath);
                _logger.LogInformation("實體檔案刪除成功: {FullPath}", fullPath);
            }
            else if (Directory.Exists(fullPath))
            {
                _logger.LogInformation("處理目錄硬刪除: {Path}", path);

                // 批次硬刪除目錄下的檔案記錄
                var deletedRows = await _context.Files
                    .Where(f => f.FilePath.StartsWith(path) && f.IsActive)
                    .ExecuteDeleteAsync();

                _logger.LogInformation("批次硬刪除了 {Rows} 筆資料庫記錄", deletedRows);

                // 刪除實體目錄
                Directory.Delete(fullPath, recursive);
                _logger.LogInformation("實體目錄刪除成功: {FullPath}", fullPath);
            }
            else
            {
                // 處理孤立記錄（只存在於資料庫）
                var deletedRows = await _context.Files
                    .Where(f => f.FilePath == path && f.IsActive)
                    .ExecuteDeleteAsync();

                if (deletedRows > 0)
                {
                    _logger.LogInformation("清理了 {Rows} 筆孤立資料庫記錄", deletedRows);
                    return new PublicDto.ApiResponse<bool>(true, "已清理孤立的資料庫記錄");
                }

                return new PublicDto.ApiResponse<bool>(false, "檔案或目錄不存在");
            }

            return new PublicDto.ApiResponse<bool>(true, "硬刪除成功");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "硬刪除項目時發生異常: {Path}", path);
            return new PublicDto.ApiResponse<bool>(false, $"操作失敗: {ex.Message}");
        }
    }

    /// <summary>
    /// 移動檔案或目錄
    /// </summary>
    /// <param name="sourcePath">來源路徑</param>
    /// <param name="destinationPath">目標路徑</param>
    /// <param name="overwrite">是否覆蓋</param>
    /// <returns>移動結果</returns>
    public async Task<PublicDto.ApiResponse<bool>> MoveItem(string sourcePath, string destinationPath, bool overwrite = false)
    {
        try
        {

            var sourceFullPath = GetFullPath(sourcePath);
            var destFullPath = GetFullPath(destinationPath);

            // 檢查來源是否存在
            bool isDirectory = false;
            if (File.Exists(sourceFullPath))
            {
                isDirectory = false;
            }
            else if (Directory.Exists(sourceFullPath))
            {
                isDirectory = true;
            }
            else
            {
                await LogFileOperationAsync("MoveItem", "移動項目失敗 - 來源項目不存在", "Item", sourcePath,
                    new { SourceFullPath = sourceFullPath, DestinationPath = destinationPath });
                
                return new PublicDto.ApiResponse<bool>(false,"來源檔案或目錄不存在來源檔案或目錄不存在");
            }

            // 檢查目標是否已存在
            if ((File.Exists(destFullPath) || Directory.Exists(destFullPath)) && !overwrite)
            {
                await LogFileOperationAsync("MoveItem", "移動項目失敗 - 目標已存在且不允許覆蓋", "Item", sourcePath,
                    new { DestinationPath = destinationPath, Overwrite = false });
                
                return new PublicDto.ApiResponse<bool>(false,"目標已存在");
            }

            // 確保目標目錄存在
            var targetDir = Path.GetDirectoryName(destFullPath);
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            // 執行移動
            if (isDirectory)
            {
                if (Directory.Exists(destFullPath) && overwrite)
                {
                    Directory.Delete(destFullPath, true);
                }
                Directory.Move(sourceFullPath, destFullPath);
            }
            else
            {
                if (File.Exists(destFullPath) && overwrite)
                {
                    File.Delete(destFullPath);
                }
                File.Move(sourceFullPath, destFullPath);
            }

            await LogFileOperationAsync("MoveItem", "移動項目成功", isDirectory ? "Directory" : "File", sourcePath,
                new 
                { 
                    SourcePath = sourcePath,
                    DestinationPath = destinationPath,
                    IsDirectory = isDirectory,
                    Overwrite = overwrite,
                    MovedAt = tool.GetTaiwanNow()
                });

            _logger.LogInformation("項目移動成功: {Source} -> {Destination}", sourceFullPath, destFullPath);
            return new PublicDto.ApiResponse<bool>(true,"移動成功");
        }
        catch (Exception ex)
        {
            await LogFileOperationAsync("MoveItem", "移動項目異常", "Item", sourcePath ?? "",
                new { Error = ex.Message, DestinationPath = destinationPath ?? "" });

            _logger.LogError(ex, "移動項目時發生錯誤: {Source} -> {Destination}", sourcePath, destinationPath);
            return new PublicDto.ApiResponse<bool>(false,$"移動失敗: {ex.Message}");
        }
    }
    
    /// <summary>
    /// 複製檔案或目錄
    /// </summary>
    /// <param name="sourcePath">來源路徑</param>
    /// <param name="destinationPath">目標路徑</param>
    /// <param name="overwrite">是否覆蓋</param>
    /// <returns>複製結果</returns>
    public async Task<PublicDto.ApiResponse<bool>> CopyItem(string sourcePath, string destinationPath, bool overwrite = false)
    {
        try
        {

            var sourceFullPath = GetFullPath(sourcePath);
            var destFullPath = GetFullPath(destinationPath);

            // 檢查來源是否存在
            bool isDirectory = false;
            long itemSize = 0;
            
            if (File.Exists(sourceFullPath))
            {
                isDirectory = false;
                itemSize = new FileInfo(sourceFullPath).Length;
            }
            else if (Directory.Exists(sourceFullPath))
            {
                isDirectory = true;
                var sizeInfo = await CalculateDirectorySizeInternal(sourceFullPath, true);
                itemSize = sizeInfo.TotalSize;
            }
            else
            {
                await LogFileOperationAsync("CopyItem", "複製項目失敗 - 來源項目不存在", "Item", sourcePath,
                    new { SourceFullPath = sourceFullPath, DestinationPath = destinationPath });
                
                return new PublicDto.ApiResponse<bool>(false,"來源檔案或目錄不存在");

            }

            // 檢查目標是否已存在
            if ((File.Exists(destFullPath) || Directory.Exists(destFullPath)) && !overwrite)
            {
                await LogFileOperationAsync("CopyItem", "複製項目失敗 - 目標已存在且不允許覆蓋", "Item", sourcePath,
                    new { DestinationPath = destinationPath, Overwrite = false });
                
                return new PublicDto.ApiResponse<bool>(false,"目標已存在");
            }

            // 確保目標目錄存在
            var targetDir = Path.GetDirectoryName(destFullPath);
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            // 執行複製
            if (isDirectory)
            {
                await CopyDirectoryRecursive(sourceFullPath, destFullPath, overwrite);
            }
            else
            {
                File.Copy(sourceFullPath, destFullPath, overwrite);
            }

            await LogFileOperationAsync("CopyItem", "複製項目成功", isDirectory ? "Directory" : "File", sourcePath,
                new 
                { 
                    SourcePath = sourcePath,
                    DestinationPath = destinationPath,
                    IsDirectory = isDirectory,
                    ItemSize = itemSize,
                    Overwrite = overwrite,
                    CopiedAt = tool.GetTaiwanNow()
                });

            _logger.LogInformation("項目複製成功: {Source} -> {Destination}", sourceFullPath, destFullPath);
            return new PublicDto.ApiResponse<bool>(true,"複製成功");
        }
        catch (Exception ex)
        {
            await LogFileOperationAsync("CopyItem", "複製項目異常", "Item", sourcePath ?? "",
                new { Error = ex.Message, DestinationPath = destinationPath ?? "" });

            _logger.LogError(ex, "複製項目時發生錯誤: {Source} -> {Destination}", sourcePath, destinationPath);
            
            return new PublicDto.ApiResponse<bool>(false,$"複製失敗: {ex.Message}");

        }
    }
    
    /// <summary>
    /// 上傳檔案
    /// </summary>
    /// <param name="file">上傳的檔案</param>
    /// <param name="targetPath">目標路徑</param>
    /// <param name="options">上傳選項</param>
    /// <returns>上傳結果</returns>
    public async Task<PublicDto.ApiResponse<UploadResult>> UploadFile(IFormFile file,
        string targetPath,
        UploadOptions options,
        Guid userId)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                await LogFileOperationAsync("UploadFile", "檔案上傳失敗 - 檔案為空", "File", targetPath ?? "",
                    new { FileName = file?.FileName ?? "Unknown" });
                return new PublicDto.ApiResponse<UploadResult>(false, "檔案不能為空");
            }

            options ??= new UploadOptions();
            var startTime = DateTime.Now;

            // 修正檔案名稱處理邏輯
            var customFileName = options.CustomFileName?.Trim();
            var fileExtension = Path.GetExtension(file.FileName);



            // 修正檔案名稱生成邏輯
            var finalFileName = !string.IsNullOrEmpty(customFileName)
                ? $"{customFileName}{fileExtension}"  // 使用自定義檔案名
                : $"{Guid.NewGuid()}{fileExtension}"; // 使用 GUID 檔案名

            // 確保 targetPath 不為空
            if (string.IsNullOrEmpty(targetPath))
            {
                targetPath = "uploads"; // 預設路徑
            }

            var finalPath = Path.Combine(targetPath, finalFileName);
            var fullPath = GetFullPath(finalPath);

            // 檢查目標目錄
            var directory = Path.GetDirectoryName(fullPath);
            if (!Directory.Exists(directory))
            {
                if (options.CreateDirectory)
                {
                    Directory.CreateDirectory(directory);
                    _logger.LogInformation("創建目錄: {Directory}", directory);
                }
                else
                {
                    await LogFileOperationAsync("UploadFile", "檔案上傳失敗 - 目標目錄不存在", "File", finalPath,
                        new { TargetDirectory = directory, CreateDirectory = false });
                    return new PublicDto.ApiResponse<UploadResult>(false, "目標目錄不存在");
                }
            }

            // 檢查檔案是否已存在
            if (File.Exists(fullPath) && !options.Overwrite)
            {
                await LogFileOperationAsync("UploadFile", "檔案上傳失敗 - 檔案已存在", "File", finalPath,
                    new { FileName = finalFileName, Overwrite = false });

                return new PublicDto.ApiResponse<UploadResult>(false, "檔案已存在");
            }

            // 開始上傳
            string fileHash = null;
            SecurityScanResult scanResult = null;

            _logger.LogInformation("開始上傳檔案到路徑: {FullPath}", fullPath);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var uploadTime = tool.GetTaiwanNow();
            var duration = uploadTime - startTime;

            var result = new UploadResult
            {
                FilePath = finalPath,
                OriginalFileName = file.FileName,
                SavedFileName = finalFileName,
                FileSize = file.Length,
                FileHash = fileHash,
                UploadTime = uploadTime,
                SecurityScanResult = scanResult,
                RequiresManualReview = scanResult?.RiskLevel >= RiskLevel.Medium
            };

            // 修正 FileType 設定
            var fileEntity = new WebAPI1.Entities.File
            {
                FileName = file.FileName,
                FileUuid = Guid.NewGuid().ToString(),
                FileType =GetExtensionFromMimeType(file.ContentType)  ,
                FilePath = finalPath,
                UploadedById = userId,
                UploadedAt = uploadTime,
                FileSize = file.Length,
                Description = options.Description ?? "",
                IsActive = true,
                CreatedAt = uploadTime,
                UpdatedAt = uploadTime
            };
            
            _context.Files.Add(fileEntity);
            await _context.SaveChangesAsync();
            
            await LogFileOperationAsync("UploadFile", "檔案上傳成功", "File", finalPath,
                new
                {
                    OriginalFileName = file.FileName,
                    SavedFileName = finalFileName,
                    FileSize = file.Length,
                    Duration = duration.TotalMilliseconds,
                    FileHash = fileHash,
                    SecurityScanPassed = scanResult?.IsSafe ?? true,
                    RequiresManualReview = result.RequiresManualReview
                });

            _logger.LogInformation("檔案上傳成功: {FileName} -> {Path}", file.FileName, fullPath);
            return new PublicDto.ApiResponse<UploadResult>(true, "檔案上傳成功", result);
        }
        catch (Exception ex)
        {
            await LogFileOperationAsync("UploadFile", "檔案上傳異常", "File", targetPath ?? "",
                new
                {
                    FileName = file?.FileName ?? "Unknown",
                    FileSize = file?.Length ?? 0,
                    Error = ex.Message
                });

            _logger.LogError(ex, "上傳檔案時發生錯誤: {FileName}", file?.FileName);
            return new PublicDto.ApiResponse<UploadResult>(false, $"上傳失敗: {ex.Message}");
        }
    }
    

    /// <summary>
    /// 批次上傳檔案
    /// </summary>
    /// <param name="files">檔案列表</param>
    /// <param name="targetDirectory">目標目錄</param>
    /// <param name="options">上傳選項</param>
    /// <returns>批次上傳結果</returns>
    /// <remarks>尚未實做完畢</remarks>
    public async Task<PublicDto.ApiResponse<BatchUploadResult>> UploadFiles(IEnumerable<IFormFile> files, string targetDirectory, UploadOptions options = null)
    {
        // TODO: 實作批次上傳
        throw new NotImplementedException("批次上傳功能尚未實作");
    }
    
    /// <summary>
    /// 下載檔案
    /// </summary>
    /// <param name="path">檔案路徑</param>
    /// <returns>檔案串流</returns>
    public async Task<PublicDto.ApiResponse<FileDownloadResult>> DownloadFile(string path)
        {
            try
            {

                var fullPath = GetFullPath(path);

                if (!File.Exists(fullPath))
                {
                    await LogFileOperationAsync("DownloadFile", "檔案下載失敗 - 檔案不存在", "File", path,
                        new { FullPath = fullPath });
                    
                    return new PublicDto.ApiResponse<FileDownloadResult>(false,$"檔案不存在");
                }

                var fileInfo = new FileInfo(fullPath);
                var fileName = Path.GetFileName(fullPath);
                var mimeType = GetMimeType(fileInfo.Extension);

                var fileStream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
                var etag = $"\"{fileInfo.LastWriteTime.Ticks:x}-{fileInfo.Length:x}\"";

                var result = new FileDownloadResult
                {
                    FileStream = fileStream,
                    FileName = fileName,
                    MimeType = mimeType,
                    FileSize = fileInfo.Length,
                    LastModified = fileInfo.LastWriteTime,
                    ETag = etag
                };

                await LogFileOperationAsync("DownloadFile", "檔案下載成功", "File", path,
                    new 
                    { 
                        FileName = fileName,
                        FileSize = fileInfo.Length,
                        MimeType = mimeType,
                        LastModified = fileInfo.LastWriteTime
                    });

                _logger.LogInformation("檔案下載: {Path}", fullPath);
                return new PublicDto.ApiResponse<FileDownloadResult>(true,"成功",result);

            }
            catch (Exception ex)
            {
                await LogFileOperationAsync("DownloadFile", "檔案下載異常", "File", path ?? "",
                    new { Error = ex.Message });

                _logger.LogError(ex, "下載檔案時發生錯誤: {Path}", path);
                return new PublicDto.ApiResponse<FileDownloadResult>(false,$"下載失敗: {ex.Message}");
            }
        }
    
    /// <summary>
    /// 讀取文字檔案內容
    /// </summary>
    /// <param name="path">檔案路徑</param>
    /// <param name="encoding">編碼格式</param>
    /// <returns>檔案內容</returns>
    public Task<PublicDto.ApiResponse<string>> ReadTextFile(string path, System.Text.Encoding encoding = null)
    {
        // TODO: 實作文字檔案讀取
        throw new NotImplementedException("文字檔案讀取功能尚未實作");
    }
    /// <summary>
    /// 寫入文字檔案
    /// </summary>
    /// <param name="path">檔案路徑</param>
    /// <param name="content">檔案內容</param>
    /// <param name="encoding">編碼格式</param>
    /// <param name="overwrite">是否覆蓋</param>
    /// <returns>寫入結果</returns>
    public Task<PublicDto.ApiResponse<bool>> WriteTextFile(string path, string content, System.Text.Encoding encoding = null, bool overwrite = false)
    {
        // TODO: 實作文字檔案寫入
        throw new NotImplementedException("文字檔案寫入功能尚未實作");
    }
    /// <summary>
    /// 搜尋檔案
    /// </summary>
    /// <param name="searchPath">搜尋路徑</param>
    /// <param name="pattern">搜尋模式</param>
    /// <param name="options">搜尋選項</param>
    /// <returns>搜尋結果</returns>
    public  Task<PublicDto.ApiResponse<IEnumerable<FileItemDto>>> SearchFiles(string searchPath, string pattern, SearchOptions options = null)
    {
        // TODO: 實作檔案搜尋
        throw new NotImplementedException("檔案搜尋功能尚未實作");
    }
    /// <summary>
    /// 批次操作
    /// </summary>
    /// <param name="operation">批次操作</param>
    /// <returns>批次操作結果</returns>
    public Task<PublicDto.ApiResponse<BatchOperationResult>> ExecuteBatchOperation(BatchOperationRequest operation)
    {
        // TODO: 實作批次操作
        throw new NotImplementedException("批次操作功能尚未實作");
    }
    

    /// <summary>
    /// 取得磁碟空間資訊
    /// </summary>
    /// <param name="path">路徑</param>
    /// <returns>磁碟空間資訊</returns>

    public async Task<PublicDto.ApiResponse<FileDto.DriveSpaceInfoDto>> GetSpaceInfo(string path = null)  
    {
        try
        {
            // 從環境變數取得工作目錄
            string? workingDirectory = Environment.GetEnvironmentVariable("FILE_WORKING_DIRECTORY");
            if (string.IsNullOrEmpty(workingDirectory))
            {
                // 如果環境變數不存在，嘗試從配置文件讀取
                workingDirectory = _configuration["FileSettings:WorkingDirectory"];
            }

            if (string.IsNullOrWhiteSpace(workingDirectory))
            {
                return new PublicDto.ApiResponse<FileDto.DriveSpaceInfoDto>
                {
                    Success = false,
                    Message = "未設定 FILE_WORKING_DIRECTORY 環境變數"
                };
            }

            // 取得磁碟機根路徑（例如 C:\）
            string rootPath = Path.GetPathRoot(workingDirectory);

            if (string.IsNullOrWhiteSpace(rootPath) || !Directory.Exists(rootPath))
            {
                return new PublicDto.ApiResponse<FileDto.DriveSpaceInfoDto>
                {
                    Success = false,
                    Message = $"無效的磁碟路徑: {rootPath}"
                };
            }

            DriveInfo drive = new DriveInfo(rootPath);

            var dto = new FileDto.DriveSpaceInfoDto
            {
                DriveName = drive.Name,  // 磁碟機名稱
                DriveFormat = drive.DriveFormat, // 檔案系統格式，例如 NTFS
                DriveType = drive.DriveType.ToString(), // 磁碟機類型
                TotalSize = drive.TotalSize, // 總容量（bytes）
                TotalFreeSpace = drive.TotalFreeSpace, // 總剩餘空間（bytes）
                AvailableFreeSpace = drive.AvailableFreeSpace // 當前使用者可用空間（bytes）
            };
            // 回傳剩餘可用空間（單位：位元組）
            return new PublicDto.ApiResponse<FileDto.DriveSpaceInfoDto>
            {
                Success = true,
                Data = dto,
                Message = "成功取得磁碟空間資訊"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "取得磁碟空間資訊時發生錯誤");
            return new PublicDto.ApiResponse<FileDto.DriveSpaceInfoDto>
            {
                Success = false,
                Message = $"取得磁碟空間資訊失敗：{ex.Message}"
            };
        }
    }
    /// <summary>
    /// 計算目錄大小
    /// </summary>
    /// <param name="path">目錄路徑</param>
    /// <param name="includeSubdirectories">是否包含子目錄</param>
    /// <returns>目錄大小資訊</returns>
    public async Task<PublicDto.ApiResponse<DirectorySizeInfo>> CalculateDirectorySize(string path, bool includeSubdirectories = true)
    {
        try
        {
            var fullPath = GetFullPath(path);
            if (!Directory.Exists(fullPath))
            {
                return new PublicDto.ApiResponse<DirectorySizeInfo>(false, $"目錄不存在: {fullPath}");
            }

            var sizeInfo = await CalculateDirectorySizeInternal(fullPath, includeSubdirectories);

            await LogFileOperationAsync("CalculateDirectorySize", "計算目錄大小成功", "Directory", path,
                new 
                { 
                    TotalSize = sizeInfo.TotalSize,
                    FileCount = sizeInfo.FileCount,
                    DirectoryCount = sizeInfo.DirectoryCount,
                    CalculationDuration = sizeInfo.CalculationDuration.TotalMilliseconds,
                    IncludeSubdirectories = includeSubdirectories
                });

            return new PublicDto.ApiResponse<DirectorySizeInfo>(true, "計算成功", sizeInfo);
        }
        catch (Exception ex)
        {
            await LogFileOperationAsync("CalculateDirectorySize", "計算目錄大小異常", "Directory", path ?? "",
                new { Error = ex.Message, IncludeSubdirectories = includeSubdirectories });

            _logger.LogError(ex, "計算目錄大小時發生錯誤: {Path}", path);
            return new PublicDto.ApiResponse<DirectorySizeInfo>(false, $"計算失敗: {ex.Message}");
        }
    }
    
    
    
    
    /// <summary>
    /// 私有功能
    /// </summary>
    private async Task<FileItemDto> CreateFileItemFromFile(FileInfo fileInfo, string basePath, FileListOptions options)
    {
        var relativePath = GetRelativePath(fileInfo.FullName);
        var item = new FileItemDto
        {
            Name = fileInfo.Name,
            Path = relativePath,
            FullPath = fileInfo.FullName,
            Extension = fileInfo.Extension,
            Size = fileInfo.Length,
            FormattedSize = FormatFileSize(fileInfo.Length),
            CreatedAt = fileInfo.CreationTime,
            ModifiedAt = fileInfo.LastWriteTime,
            AccessedAt = fileInfo.LastAccessTime,
            IsDirectory = false,
            IsReadOnly = fileInfo.IsReadOnly,
            IsHidden = fileInfo.Attributes.HasFlag(FileAttributes.Hidden),
            MimeType = GetMimeType(fileInfo.Extension),
            Attributes = fileInfo.Attributes,
            ParentPath = basePath,
            IconType = GetIconType(fileInfo.Extension),
            CanPreview = CanPreviewFile(fileInfo.Extension)
        };

        
        return item;
    }

    private async Task<FileItemDto> CreateFileItemFromDirectory(DirectoryInfo dirInfo, string basePath)
        {
            var relativePath = GetRelativePath(dirInfo.FullName);
            var childCount = 0;
            
            try
            {
                childCount = dirInfo.GetFiles().Length + dirInfo.GetDirectories().Length;
            }
            catch
            {
                // 權限不足時忽略
            }

            return new FileItemDto
            {
                Name = dirInfo.Name,
                Path = relativePath,
                FullPath = dirInfo.FullName,
                Extension = "",
                Size = 0,
                FormattedSize = "目錄",
                CreatedAt = dirInfo.CreationTime,
                ModifiedAt = dirInfo.LastWriteTime,
                AccessedAt = dirInfo.LastAccessTime,
                IsDirectory = true,
                IsReadOnly = dirInfo.Attributes.HasFlag(FileAttributes.ReadOnly),
                IsHidden = dirInfo.Attributes.HasFlag(FileAttributes.Hidden),
                MimeType = "inode/directory",
                Attributes = dirInfo.Attributes,
                ParentPath = basePath,
                IconType = "folder",
                CanPreview = false,
                ChildCount = childCount
            };
        }

    private List<FileItemDto> SortItems(List<FileItemDto> items, FileSortBy sortBy, SortDirection direction)
        {
            // 目錄永遠排在前面
            var directories = items.Where(x => x.IsDirectory);
            var files = items.Where(x => !x.IsDirectory);

            Func<FileItemDto, object> keySelector = sortBy switch
            {
                FileSortBy.Name => x => x.Name,
                FileSortBy.Size => x => x.Size,
                FileSortBy.ModifiedDate => x => x.ModifiedAt,
                FileSortBy.CreatedDate => x => x.CreatedAt,
                FileSortBy.Extension => x => x.Extension ?? "",
                FileSortBy.Type => x => x.MimeType,
                _ => x => x.Name
            };

            if (direction == SortDirection.Ascending)
            {
                directories = directories.OrderBy(keySelector);
                files = files.OrderBy(keySelector);
            }
            else
            {
                directories = directories.OrderByDescending(keySelector);
                files = files.OrderByDescending(keySelector);
            }

            return directories.Concat(files).ToList();
        }

    private async Task LogFileOperationAsync(string actionType, string reason, string entityName, string entityId, object additionalData = null)
        {
            try
            {
                var xmlDetails = new XElement("Audit",
                    new XElement("Summary", reason),
                    new XElement("Details",
                        additionalData?.GetType().GetProperties().Select(prop =>
                            new XElement(prop.Name, prop.GetValue(additionalData)?.ToString() ?? "")
                        ) ?? new XElement[0]
                    )
                );
                
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "記錄檔案操作日誌時發生錯誤");
            }
        }

    private Guid? GetCurrentUserId()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext?.User?.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = httpContext.User.FindFirst("UserId")?.Value;
                if (!string.IsNullOrEmpty(userIdClaim) && Guid.TryParse(userIdClaim, out var userId))
                {
                    return userId;
                }
            }
            return null;
        }
    
    public string GetWorkingDirectory()
        {
            return Environment.GetEnvironmentVariable("FILE_WORKING_DIRECTORY") 
                   ?? _configuration["FileSettings:WorkingDirectory"] 
                   ?? throw new InvalidOperationException("未設定工作目錄");
        }

    private string GetFullPath(string relativePath)
        {
            return Path.Combine(_workingDirectory, relativePath.TrimStart('/', '\\'));
        }

    private string GetRelativePath(string fullPath)
    {
        return Path.GetRelativePath(_workingDirectory, fullPath).Replace('\\', '/');
    }

    private string GetMimeType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".txt" => "text/plain",
            ".html" or ".htm" => "text/html",
            ".css" => "text/css",
            ".js" => "text/javascript",
            ".json" => "application/json",
            ".xml" => "application/xml",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".bmp" => "image/bmp",
            ".svg" => "image/svg+xml",
            ".ico" => "image/x-icon",
            ".webp" => "image/webp",
            ".mp3" => "audio/mpeg",
            ".wav" => "audio/wav",
            ".ogg" => "audio/ogg",
            ".mp4" => "video/mp4",
            ".avi" => "video/x-msvideo",
            ".mov" => "video/quicktime",
            ".wmv" => "video/x-ms-wmv",
            ".zip" => "application/zip",
            ".rar" => "application/vnd.rar",
            ".7z" => "application/x-7z-compressed",
            ".tar" => "application/x-tar",
            ".gz" => "application/gzip",
            _ => "application/octet-stream"
        };
    }

    private string GetIconType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".txt" or ".md" or ".log" => "text",
            ".doc" or ".docx" => "word",
            ".xls" or ".xlsx" => "excel",
            ".ppt" or ".pptx" => "powerpoint",
            ".pdf" => "pdf",
            ".jpg" or ".jpeg" or ".png" or ".gif" or ".bmp" or ".svg" or ".webp" => "image",
            ".mp3" or ".wav" or ".ogg" or ".flac" => "audio",
            ".mp4" or ".avi" or ".mov" or ".wmv" or ".mkv" => "video",
            ".zip" or ".rar" or ".7z" or ".tar" or ".gz" => "archive",
            ".html" or ".htm" or ".css" or ".js" or ".json" => "code",
            ".exe" or ".msi" or ".dmg" => "executable",
            _ => "file"
        };
    }

    private bool CanPreviewFile(string extension)
    {
        var previewableExtensions = new[]
        {
            ".txt", ".md", ".json", ".xml", ".html", ".htm", ".css", ".js",
            ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp",
            ".pdf"
        };
        
        return previewableExtensions.Contains(extension.ToLowerInvariant());
    }

    private string FormatFileSize(long bytes)
    {
        string[] suffixes = { "B", "KB", "MB", "GB", "TB" };
        int counter = 0;
        decimal number = bytes;
        
        while (Math.Round(number / 1024) >= 1)
        {
            number /= 1024;
            counter++;
        }
        
        return $"{number:n1} {suffixes[counter]}";
    }
    
    // 輔助方法：遞迴複製目錄
    private async Task CopyDirectoryRecursive(string sourceDir, string destDir, bool overwrite)
    {
        var dir = new DirectoryInfo(sourceDir);
            
        if (!dir.Exists)
            throw new DirectoryNotFoundException($"來源目錄不存在: {sourceDir}");

        // 建立目標目錄
        if (!Directory.Exists(destDir))
        {
            Directory.CreateDirectory(destDir);
        }

        // 複製檔案
        foreach (var file in dir.GetFiles())
        {
            var destFile = Path.Combine(destDir, file.Name);
            file.CopyTo(destFile, overwrite);
        }

        // 遞迴複製子目錄
        foreach (var subDir in dir.GetDirectories())
        {
            var destSubDir = Path.Combine(destDir, subDir.Name);
            await CopyDirectoryRecursive(subDir.FullName, destSubDir, overwrite);
        }
    }

    private async Task<DirectorySizeInfo> CalculateDirectorySizeInternal(string directoryPath, bool includeSubdirectories)
    {
        var startTime = DateTime.Now;
        var dirInfo = new DirectoryInfo(directoryPath);
        var sizeInfo = new DirectorySizeInfo
        {
            DirectoryPath = GetRelativePath(directoryPath),
            SizeByFileType = new Dictionary<string, FileSizeByType>()
        };

        var searchOption = includeSubdirectories ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly;
        
        try
        {
            var files = dirInfo.GetFiles("*", searchOption);
            var directories = dirInfo.GetDirectories("*", searchOption);

            sizeInfo.FileCount = files.Length;
            sizeInfo.DirectoryCount = directories.Length;

            FileInfo largestFile = null;
            long maxSize = 0;

            foreach (var file in files)
            {
                sizeInfo.TotalSize += file.Length;
                
                if (file.Length > maxSize)
                {
                    maxSize = file.Length;
                    largestFile = file;
                }

                // 按檔案類型統計
                var extension = file.Extension.ToLowerInvariant();
                if (string.IsNullOrEmpty(extension))
                    extension = "(無副檔名)";

                if (!sizeInfo.SizeByFileType.ContainsKey(extension))
                {
                    sizeInfo.SizeByFileType[extension] = new FileSizeByType
                    {
                        FileType = extension,
                        TotalSize = 0,
                        FileCount = 0
                    };
                }

                sizeInfo.SizeByFileType[extension].TotalSize += file.Length;
                sizeInfo.SizeByFileType[extension].FileCount++;
            }

            if (largestFile != null)
            {
                sizeInfo.LargestFile = await CreateFileItemFromFile(largestFile, 
                    Path.GetDirectoryName(GetRelativePath(largestFile.FullName)), 
                    new FileListOptions());
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "計算目錄大小時發生錯誤: {Directory}", directoryPath);
        }

        sizeInfo.FormattedSize = FormatFileSize(sizeInfo.TotalSize);
        sizeInfo.CalculatedAt = DateTime.Now;
        sizeInfo.CalculationDuration = sizeInfo.CalculatedAt - startTime;

        return sizeInfo;
    }
    
    /// <summary>
    /// 建立增強的檔案項目（包含資料庫資訊）
    /// </summary>
    private async Task<FileItemDto> CreateEnhancedFileItem(
        FileInfo fileInfo, 
        WebAPI1.Entities.File fileEntity, 
        string basePath, 
        FileListOptions options)
    {
        var relativePath = GetRelativePath(fileInfo.FullName);
    
        var item = new FileItemDto
        {
            // 基本檔案資訊
            Name = fileInfo.Name,
            Path = relativePath,
            Size = fileInfo.Length,
            IsDirectory = false,
            CreatedAt = fileInfo.CreationTime,

            Extension = fileInfo.Extension,

        };

        
        return item;
    }
    /// <summary>
    /// 建立遺失檔案項目
    /// </summary>
    private FileItemDto CreateMissingFileItem(WebAPI1.Entities.File fileEntity, string basePath)
    {
        return new FileItemDto
        {
            Name = fileEntity.FileName,
            Path = fileEntity.FilePath,
            Size = fileEntity.FileSize,
            IsDirectory = false,
            
        };
    }
    /// <summary>
    /// 根據 MIME 類型獲取對應的檔案副檔名
    /// </summary>
    /// <param name="mimeType">MIME 類型</param>
    /// <returns>檔案副檔名（包含點號），如果無法識別則回傳 null</returns>
    private string GetExtensionFromMimeType(string mimeType)
    {
        if (string.IsNullOrEmpty(mimeType))
            return null;

        // 轉為小寫並移除空白
        mimeType = mimeType.Trim().ToLowerInvariant();

        // MIME 類型對應副檔名的字典
        var mimeTypeExtensions = new Dictionary<string, string>
        {
            // 圖片類型
            { "image/jpeg", ".jpg" },
            { "image/jpg", ".jpg" },
            { "image/png", ".png" },
            { "image/gif", ".gif" },
            { "image/bmp", ".bmp" },
            { "image/webp", ".webp" },
            { "image/svg+xml", ".svg" },
            { "image/tiff", ".tiff" },
            { "image/x-icon", ".ico" },

            // 文件類型
            { "application/pdf", ".pdf" },
            { "application/msword", ".doc" },
            { "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx" },
            { "application/vnd.ms-excel", ".xls" },
            { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx" },
            { "application/vnd.ms-powerpoint", ".ppt" },
            { "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx" },
            { "application/vnd.oasis.opendocument.text", ".odt" },
            { "application/vnd.oasis.opendocument.spreadsheet", ".ods" },
            { "application/vnd.oasis.opendocument.presentation", ".odp" },

            // 文字類型
            { "text/plain", ".txt" },
            { "text/html", ".html" },
            { "text/css", ".css" },
            { "text/javascript", ".js" },
            { "text/csv", ".csv" },
            { "text/xml", ".xml" },
            { "text/markdown", ".md" },
            { "text/rtf", ".rtf" },

            // 音訊類型
            { "audio/mpeg", ".mp3" },
            { "audio/wav", ".wav" },
            { "audio/x-wav", ".wav" },
            { "audio/flac", ".flac" },
            { "audio/aac", ".aac" },
            { "audio/ogg", ".ogg" },
            { "audio/webm", ".weba" },

            // 視訊類型
            { "video/mp4", ".mp4" },
            { "video/mpeg", ".mpeg" },
            { "video/quicktime", ".mov" },
            { "video/x-msvideo", ".avi" },
            { "video/webm", ".webm" },
            { "video/3gpp", ".3gp" },
            { "video/x-flv", ".flv" },
            { "video/x-ms-wmv", ".wmv" },

            // 壓縮檔案
            { "application/zip", ".zip" },
            { "application/x-rar-compressed", ".rar" },
            { "application/x-7z-compressed", ".7z" },
            { "application/x-tar", ".tar" },
            { "application/gzip", ".gz" },

            // 程式碼類型
            { "application/json", ".json" },
            { "application/xml", ".xml" },
            { "application/javascript", ".js" },
            { "application/typescript", ".ts" },

            // 字型類型
            { "font/woff", ".woff" },
            { "font/woff2", ".woff2" },
            { "font/ttf", ".ttf" },
            { "font/otf", ".otf" },

            // 其他常見類型
            { "application/octet-stream", ".bin" },
            { "application/x-executable", ".exe" },
            { "application/x-msdownload", ".exe" },
            { "application/vnd.android.package-archive", ".apk" },
            { "application/x-debian-package", ".deb" },
            { "application/x-rpm", ".rpm" }
        };

        // 直接查找完整匹配
        if (mimeTypeExtensions.TryGetValue(mimeType, out var extension))
        {
            return extension;
        }

        // 如果沒有完整匹配，嘗試基於主要類型的通用匹配
        if (mimeType.StartsWith("image/"))
        {
            return ".jpg"; // 預設圖片格式
        }
        
        if (mimeType.StartsWith("audio/"))
        {
            return ".mp3"; // 預設音訊格式
        }
        
        if (mimeType.StartsWith("video/"))
        {
            return ".mp4"; // 預設視訊格式
        }
        
        if (mimeType.StartsWith("text/"))
        {
            return ".txt"; // 預設文字格式
        }

        // 無法識別的 MIME 類型
        return null;
    }
    /// <summary>
    /// 驗證和標準化檔案副檔名
    /// </summary>
    /// <param name="fileName">檔案名稱</param>
    /// <param name="mimeType">MIME 類型</param>
    /// <returns>驗證後的檔案名稱</returns>
    private string ValidateAndNormalizeFileName(string fileName, string mimeType)
    {
        if (string.IsNullOrEmpty(fileName))
            return null;

        var extension = Path.GetExtension(fileName);
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);

        // 如果檔名沒有副檔名，嘗試從 MIME 類型推斷
        if (string.IsNullOrEmpty(extension))
        {
            extension = GetExtensionFromMimeType(mimeType) ?? ".dat";
            return $"{nameWithoutExtension}{extension}";
        }

        // 驗證副檔名與 MIME 類型是否匹配
        var expectedExtension = GetExtensionFromMimeType(mimeType);
        if (!string.IsNullOrEmpty(expectedExtension) && 
            !extension.Equals(expectedExtension, StringComparison.OrdinalIgnoreCase))
        {
            // 記錄警告：副檔名與 MIME 類型不匹配
            _logger.LogWarning("檔案副檔名 {Extension} 與 MIME 類型 {MimeType} 不匹配，期望 {ExpectedExtension}", 
                extension, mimeType, expectedExtension);
        
            // 可以選擇：1) 使用原副檔名，2) 使用 MIME 推斷的副檔名，3) 兩者都保留
            // 這裡選擇保留原副檔名，但記錄警告
        }

        return fileName;
    }


}


using System.Security.Cryptography;
using Forma.Application.Common.Interfaces;
using Forma.Application.Common.Models;
using Forma.Application.Features.Files.DTOs;
using Forma.Domain.Entities;
using Forma.Domain.Enums;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Forma.Application.Services;

/// <summary>
/// 檔案管理服務實作
/// </summary>
public class FileManagementService : IFileManagementService
{
    private readonly IApplicationDbContext _context;
    private readonly string _uploadPath;
    private readonly long _maxFileSize;
    private readonly string[] _allowedExtensions;

    public FileManagementService(
        IApplicationDbContext context,
        IConfiguration configuration)
    {
        _context = context;
        _uploadPath = configuration["FileStorage:UploadPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        _maxFileSize = configuration.GetValue<long>("FileStorage:MaxFileSizeBytes", 50 * 1024 * 1024); // 預設 50MB
        _allowedExtensions = configuration.GetSection("FileStorage:AllowedExtensions").Get<string[]>()
            ?? new[] { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif", ".bmp", ".ico", ".txt", ".csv", ".zip", ".rar", ".7z" };

        // 確保上傳目錄存在
        if (!Directory.Exists(_uploadPath))
        {
            Directory.CreateDirectory(_uploadPath);
        }
    }

    /// <inheritdoc />
    public async Task<FileUploadResponse> UploadAsync(
        IFormFile file,
        FileUploadRequest request,
        Guid uploaderId,
        CancellationToken cancellationToken = default)
    {
        // 驗證檔案
        ValidateFile(file);

        // 產生唯一檔案名稱
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var storedFileName = $"{Guid.CreateVersion7()}{fileExtension}";
        var yearMonth = DateTime.UtcNow.ToString("yyyy/MM");
        var relativePath = Path.Combine(yearMonth, storedFileName);
        var fullPath = Path.Combine(_uploadPath, relativePath);

        // 確保目錄存在
        var directory = Path.GetDirectoryName(fullPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        // 儲存檔案並計算雜湊
        string fileHash;
        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        fileHash = await ComputeFileHashAsync(fullPath, cancellationToken);

        // 建立資料庫記錄
        var uploadedFile = new UploadedFile
        {
            Id = Guid.CreateVersion7(),
            OriginalFileName = file.FileName,
            StoredFileName = storedFileName,
            FilePath = relativePath,
            ContentType = file.ContentType ?? "application/octet-stream",
            FileSize = file.Length,
            FileHash = fileHash,
            Status = FileStatus.Completed,
            Description = request.Description,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            UploaderId = uploaderId,
            IsPublic = request.IsPublic,
            ExpiresAt = request.ExpiresInHours.HasValue
                ? DateTime.UtcNow.AddHours(request.ExpiresInHours.Value)
                : null,
            CreatedAt = DateTime.UtcNow
        };

        _context.UploadedFiles.Add(uploadedFile);
        await _context.SaveChangesAsync(cancellationToken);

        return new FileUploadResponse
        {
            Id = uploadedFile.Id,
            OriginalFileName = uploadedFile.OriginalFileName,
            FileSize = uploadedFile.FileSize,
            ContentType = uploadedFile.ContentType,
            UploadedAt = uploadedFile.CreatedAt,
            DownloadUrl = $"/api/files/{uploadedFile.Id}/download"
        };
    }

    /// <inheritdoc />
    public async Task<IEnumerable<FileUploadResponse>> UploadMultipleAsync(
        IEnumerable<IFormFile> files,
        FileUploadRequest request,
        Guid uploaderId,
        CancellationToken cancellationToken = default)
    {
        var results = new List<FileUploadResponse>();
        foreach (var file in files)
        {
            var result = await UploadAsync(file, request, uploaderId, cancellationToken);
            results.Add(result);
        }
        return results;
    }

    /// <inheritdoc />
    public async Task<(Stream Stream, string ContentType, string FileName)> DownloadAsync(
        Guid fileId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var file = await _context.UploadedFiles
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (file == null)
        {
            throw new KeyNotFoundException("找不到檔案");
        }

        // 權限檢查
        if (!file.IsPublic && !isSystemAdmin && file.UploaderId != currentUserId)
        {
            throw new UnauthorizedAccessException("無權存取此檔案");
        }

        // 檢查檔案狀態
        if (file.Status == FileStatus.Deleted)
        {
            throw new InvalidOperationException("檔案已被刪除");
        }

        // 檢查過期
        if (file.ExpiresAt.HasValue && DateTime.UtcNow > file.ExpiresAt.Value)
        {
            throw new InvalidOperationException("檔案已過期");
        }

        var fullPath = Path.Combine(_uploadPath, file.FilePath);
        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException("檔案不存在");
        }

        // 更新下載統計
        file.DownloadCount++;
        file.LastDownloadAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var stream = new FileStream(fullPath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return (stream, file.ContentType, file.OriginalFileName);
    }

    /// <inheritdoc />
    public async Task<FileInfoResponse> GetByIdAsync(
        Guid fileId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var file = await _context.UploadedFiles
            .Include(f => f.Uploader)
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (file == null)
        {
            throw new KeyNotFoundException("找不到檔案");
        }

        // 權限檢查
        if (!file.IsPublic && !isSystemAdmin && file.UploaderId != currentUserId)
        {
            throw new UnauthorizedAccessException("無權存取此檔案");
        }

        return MapToFileInfoResponse(file);
    }

    /// <inheritdoc />
    public async Task<PagedResult<FileListItemResponse>> QueryAsync(
        FileQueryRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var query = _context.UploadedFiles
            .Include(f => f.Uploader)
            .AsNoTracking()
            .AsQueryable();

        // 非系統管理員只能看自己上傳的或公開的檔案
        if (!isSystemAdmin)
        {
            query = query.Where(f => f.UploaderId == currentUserId || f.IsPublic);
        }

        // 篩選條件
        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            query = query.Where(f => f.OriginalFileName.Contains(request.SearchTerm));
        }

        if (request.Status.HasValue)
        {
            query = query.Where(f => f.Status == request.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.ContentType))
        {
            query = query.Where(f => f.ContentType.StartsWith(request.ContentType));
        }

        if (!string.IsNullOrWhiteSpace(request.EntityType))
        {
            query = query.Where(f => f.EntityType == request.EntityType);
        }

        if (request.EntityId.HasValue)
        {
            query = query.Where(f => f.EntityId == request.EntityId.Value);
        }

        if (request.UploaderId.HasValue)
        {
            query = query.Where(f => f.UploaderId == request.UploaderId.Value);
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(f => f.CreatedAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(f => f.CreatedAt <= request.ToDate.Value);
        }

        // 排序
        query = request.SortBy?.ToLowerInvariant() switch
        {
            "filename" => request.SortDescending
                ? query.OrderByDescending(f => f.OriginalFileName)
                : query.OrderBy(f => f.OriginalFileName),
            "filesize" => request.SortDescending
                ? query.OrderByDescending(f => f.FileSize)
                : query.OrderBy(f => f.FileSize),
            _ => request.SortDescending
                ? query.OrderByDescending(f => f.CreatedAt)
                : query.OrderBy(f => f.CreatedAt)
        };

        // 計算總數
        var totalCount = await query.CountAsync(cancellationToken);

        // 分頁
        var items = await query
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(f => new FileListItemResponse
            {
                Id = f.Id,
                OriginalFileName = f.OriginalFileName,
                ContentType = f.ContentType,
                FileSize = f.FileSize,
                Status = f.Status,
                UploaderName = f.Uploader.Username,
                DownloadCount = f.DownloadCount,
                CreatedAt = f.CreatedAt,
                DownloadUrl = $"/api/files/{f.Id}/download"
            })
            .ToListAsync(cancellationToken);

        return new PagedResult<FileListItemResponse>
        {
            Items = items,
            TotalCount = totalCount,
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    /// <inheritdoc />
    public async Task DeleteAsync(
        Guid fileId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var file = await _context.UploadedFiles
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (file == null)
        {
            throw new KeyNotFoundException("找不到檔案");
        }

        // 權限檢查
        if (!isSystemAdmin && file.UploaderId != currentUserId)
        {
            throw new UnauthorizedAccessException("無權刪除此檔案");
        }

        // 軟刪除 - 只標記狀態
        file.Status = FileStatus.Deleted;
        file.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // 可選: 實際刪除檔案 (建議使用背景任務延後處理)
        // var fullPath = Path.Combine(_uploadPath, file.FilePath);
        // if (File.Exists(fullPath))
        // {
        //     File.Delete(fullPath);
        // }
    }

    /// <inheritdoc />
    public async Task<FileStatisticsResponse> GetStatisticsAsync(
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var query = _context.UploadedFiles.AsNoTracking();

        // 非系統管理員只能看自己的統計
        if (!isSystemAdmin)
        {
            query = query.Where(f => f.UploaderId == currentUserId);
        }

        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var files = await query.ToListAsync(cancellationToken);

        var result = new FileStatisticsResponse
        {
            TotalFiles = files.Count(f => f.Status != FileStatus.Deleted),
            TotalSize = files.Where(f => f.Status != FileStatus.Deleted).Sum(f => f.FileSize),
            FilesByStatus = files
                .GroupBy(f => f.Status)
                .ToDictionary(g => g.Key, g => g.Count()),
            FilesByContentType = files
                .Where(f => f.Status != FileStatus.Deleted)
                .GroupBy(f => f.ContentType.Split('/')[0])
                .ToDictionary(g => g.Key, g => g.Count()),
            UploadedThisMonth = files.Count(f => f.CreatedAt >= monthStart),
            DownloadsThisMonth = files.Sum(f => f.DownloadCount) // 簡化: 實際應追蹤本月下載
        };

        return result;
    }

    /// <inheritdoc />
    public async Task<FileInfoResponse> UpdateAsync(
        Guid fileId,
        string? description,
        bool? isPublic,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default)
    {
        var file = await _context.UploadedFiles
            .Include(f => f.Uploader)
            .FirstOrDefaultAsync(f => f.Id == fileId, cancellationToken);

        if (file == null)
        {
            throw new KeyNotFoundException("找不到檔案");
        }

        // 權限檢查
        if (!isSystemAdmin && file.UploaderId != currentUserId)
        {
            throw new UnauthorizedAccessException("無權更新此檔案");
        }

        if (description != null)
        {
            file.Description = description;
        }

        if (isPublic.HasValue)
        {
            file.IsPublic = isPublic.Value;
        }

        file.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return MapToFileInfoResponse(file);
    }

    #region Private Methods

    private void ValidateFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("檔案不可為空");
        }

        if (file.Length > _maxFileSize)
        {
            throw new ArgumentException($"檔案大小超過限制 ({_maxFileSize / 1024 / 1024}MB)");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!_allowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"不支援的檔案類型: {extension}");
        }
    }

    private static async Task<string> ComputeFileHashAsync(string filePath, CancellationToken cancellationToken)
    {
        using var sha256 = SHA256.Create();
        await using var stream = File.OpenRead(filePath);
        var hashBytes = await sha256.ComputeHashAsync(stream, cancellationToken);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    private static FileInfoResponse MapToFileInfoResponse(UploadedFile file)
    {
        return new FileInfoResponse
        {
            Id = file.Id,
            OriginalFileName = file.OriginalFileName,
            ContentType = file.ContentType,
            FileSize = file.FileSize,
            FileHash = file.FileHash,
            Status = file.Status,
            Description = file.Description,
            EntityType = file.EntityType,
            EntityId = file.EntityId,
            UploaderId = file.UploaderId,
            UploaderName = file.Uploader?.Username ?? string.Empty,
            DownloadCount = file.DownloadCount,
            LastDownloadAt = file.LastDownloadAt,
            IsPublic = file.IsPublic,
            CreatedAt = file.CreatedAt,
            ExpiresAt = file.ExpiresAt,
            DownloadUrl = $"/api/files/{file.Id}/download"
        };
    }

    #endregion
}

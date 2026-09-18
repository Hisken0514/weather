using Forma.Application.Common.Models;
using Forma.Application.Features.Files.DTOs;
using Microsoft.AspNetCore.Http;

namespace Forma.Application.Services;

/// <summary>
/// 檔案管理服務介面
/// </summary>
public interface IFileManagementService
{
    /// <summary>
    /// 上傳檔案
    /// </summary>
    /// <param name="file">上傳的檔案</param>
    /// <param name="request">上傳請求參數</param>
    /// <param name="uploaderId">上傳者 ID</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>上傳回應</returns>
    Task<FileUploadResponse> UploadAsync(
        IFormFile file,
        FileUploadRequest request,
        Guid uploaderId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 批次上傳檔案
    /// </summary>
    /// <param name="files">上傳的檔案列表</param>
    /// <param name="request">上傳請求參數</param>
    /// <param name="uploaderId">上傳者 ID</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>上傳回應列表</returns>
    Task<IEnumerable<FileUploadResponse>> UploadMultipleAsync(
        IEnumerable<IFormFile> files,
        FileUploadRequest request,
        Guid uploaderId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 下載檔案
    /// </summary>
    /// <param name="fileId">檔案 ID</param>
    /// <param name="currentUserId">當前使用者 ID</param>
    /// <param name="isSystemAdmin">是否為系統管理員</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>檔案資料流、MIME 類型與檔案名稱</returns>
    Task<(Stream Stream, string ContentType, string FileName)> DownloadAsync(
        Guid fileId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得檔案資訊
    /// </summary>
    /// <param name="fileId">檔案 ID</param>
    /// <param name="currentUserId">當前使用者 ID</param>
    /// <param name="isSystemAdmin">是否為系統管理員</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>檔案資訊</returns>
    Task<FileInfoResponse> GetByIdAsync(
        Guid fileId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 查詢檔案列表
    /// </summary>
    /// <param name="request">查詢請求</param>
    /// <param name="currentUserId">當前使用者 ID</param>
    /// <param name="isSystemAdmin">是否為系統管理員</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>分頁檔案列表</returns>
    Task<PagedResult<FileListItemResponse>> QueryAsync(
        FileQueryRequest request,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 刪除檔案
    /// </summary>
    /// <param name="fileId">檔案 ID</param>
    /// <param name="currentUserId">當前使用者 ID</param>
    /// <param name="isSystemAdmin">是否為系統管理員</param>
    /// <param name="cancellationToken">取消令牌</param>
    Task DeleteAsync(
        Guid fileId,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 取得檔案統計
    /// </summary>
    /// <param name="currentUserId">當前使用者 ID</param>
    /// <param name="isSystemAdmin">是否為系統管理員</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>統計資料</returns>
    Task<FileStatisticsResponse> GetStatisticsAsync(
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// 更新檔案資訊
    /// </summary>
    /// <param name="fileId">檔案 ID</param>
    /// <param name="description">描述</param>
    /// <param name="isPublic">是否公開</param>
    /// <param name="currentUserId">當前使用者 ID</param>
    /// <param name="isSystemAdmin">是否為系統管理員</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>更新後的檔案資訊</returns>
    Task<FileInfoResponse> UpdateAsync(
        Guid fileId,
        string? description,
        bool? isPublic,
        Guid currentUserId,
        bool isSystemAdmin,
        CancellationToken cancellationToken = default);
}

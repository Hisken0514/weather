namespace Forma.Application.Services;

/// <summary>
/// 系統設定服務介面
/// </summary>
public interface ISystemSettingService
{
    /// <summary>
    /// 獲取指定分類的設定
    /// </summary>
    /// <typeparam name="T">設定類型</typeparam>
    /// <param name="category">分類名稱</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>設定物件</returns>
    Task<T> GetSettingAsync<T>(string category, CancellationToken cancellationToken = default) where T : class, new();

    /// <summary>
    /// 更新指定分類的設定
    /// </summary>
    /// <typeparam name="T">設定類型</typeparam>
    /// <param name="category">分類名稱</param>
    /// <param name="settings">設定物件</param>
    /// <param name="cancellationToken">取消令牌</param>
    Task UpdateSettingAsync<T>(string category, T settings, CancellationToken cancellationToken = default) where T : class;

    /// <summary>
    /// 獲取所有設定分類
    /// </summary>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>設定分類列表</returns>
    Task<List<Features.SystemSettings.DTOs.SystemSettingDto>> GetAllCategoriesAsync(CancellationToken cancellationToken = default);
}

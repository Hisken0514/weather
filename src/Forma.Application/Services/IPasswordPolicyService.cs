namespace Forma.Application.Services;

/// <summary>
/// 密碼策略驗證服務介面
/// </summary>
public interface IPasswordPolicyService
{
    /// <summary>
    /// 驗證密碼是否符合密碼策略
    /// </summary>
    /// <param name="password">密碼</param>
    /// <param name="cancellationToken">取消令牌</param>
    /// <returns>驗證結果 (是否有效, 錯誤訊息列表)</returns>
    Task<(bool IsValid, List<string> Errors)> ValidatePasswordAsync(string password, CancellationToken cancellationToken = default);
}

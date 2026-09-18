using Forma.Domain.Entities;

namespace Forma.Domain.Interfaces;

/// <summary>
/// JWT 服務介面
/// </summary>
public interface IJwtService
{
    /// <summary>
    /// 產生 Access Token
    /// </summary>
    /// <param name="user">使用者</param>
    /// <returns>Access Token</returns>
    string GenerateAccessToken(User user, int? expirationMinutes = null);

    /// <summary>
    /// 產生 Refresh Token
    /// </summary>
    /// <returns>Refresh Token 字串</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// 從 Token 中取得使用者 ID
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>使用者 ID，若無效則回傳 null</returns>
    Guid? GetUserIdFromToken(string token);

    /// <summary>
    /// 驗證 Token 是否有效
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>是否有效</returns>
    bool ValidateToken(string token);
}

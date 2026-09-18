namespace Forma.Application.Common.Interfaces;

/// <summary>
/// JWT 設定介面
/// </summary>
public interface IJwtSettings
{
    /// <summary>
    /// Access Token 有效期 (分鐘)
    /// </summary>
    int AccessTokenExpirationMinutes { get; }

    /// <summary>
    /// Refresh Token 有效期 (天)
    /// </summary>
    int RefreshTokenExpirationDays { get; }
}

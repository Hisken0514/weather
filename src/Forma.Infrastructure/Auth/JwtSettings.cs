using Forma.Application.Common.Interfaces;

namespace Forma.Infrastructure.Auth;

/// <summary>
/// JWT 設定
/// </summary>
public class JwtSettings : IJwtSettings
{
    /// <summary>
    /// 配置區段名稱
    /// </summary>
    public const string SectionName = "JwtSettings";

    /// <summary>
    /// 密鑰
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// 發行者
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// 接收者
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Access Token 有效期 (分鐘)
    /// </summary>
    public int AccessTokenExpirationMinutes { get; set; } = 15;

    /// <summary>
    /// Refresh Token 有效期 (天)
    /// </summary>
    public int RefreshTokenExpirationDays { get; set; } = 7;
}

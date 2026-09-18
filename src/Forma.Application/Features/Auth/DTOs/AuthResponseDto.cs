namespace Forma.Application.Features.Auth.DTOs;

/// <summary>
/// 認證回應 DTO
/// </summary>
public class AuthResponseDto
{
    /// <summary>
    /// Access Token
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Refresh Token
    /// </summary>
    public string RefreshToken { get; set; } = string.Empty;

    /// <summary>
    /// Token 類型
    /// </summary>
    public string TokenType { get; set; } = "Bearer";

    /// <summary>
    /// Access Token 過期時間 (秒)
    /// </summary>
    public int ExpiresIn { get; set; }

    /// <summary>
    /// 使用者資訊
    /// </summary>
    public UserDto User { get; set; } = null!;
}

using System.Security.Cryptography;

namespace Forma.Application.Common.Security;

/// <summary>
/// 產生高熵、URL 安全的隨機字串，供公開連結 Token 使用
/// </summary>
public static class SecureTokenGenerator
{
    /// <summary>256-bit 隨機值，Base64Url 編碼，約43字元</summary>
    public static string NewToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
}

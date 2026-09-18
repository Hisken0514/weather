using System.Security.Cryptography;
using System.Text;
using Forma.Domain.Interfaces;
using Konscious.Security.Cryptography;

namespace Forma.Infrastructure.Auth;

/// <summary>
/// Argon2 密碼雜湊服務實作
/// </summary>
public class PasswordHasher : IPasswordHasher
{
    // Argon2 參數設定
    private const int DegreeOfParallelism = 4;  // 平行處理數
    private const int MemorySize = 65536;       // 記憶體大小 (64 MB)
    private const int Iterations = 4;           // 迭代次數
    private const int SaltSize = 16;            // 鹽值大小 (bytes)
    private const int HashSize = 32;            // 雜湊大小 (bytes)

    /// <inheritdoc />
    public string HashPassword(string password)
    {
        // 產生隨機鹽值
        var salt = new byte[SaltSize];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(salt);
        }

        // 使用 Argon2id 進行雜湊
        var hash = HashPasswordWithSalt(password, salt);

        // 組合鹽值和雜湊值，以 Base64 編碼儲存
        var hashBytes = new byte[SaltSize + HashSize];
        Buffer.BlockCopy(salt, 0, hashBytes, 0, SaltSize);
        Buffer.BlockCopy(hash, 0, hashBytes, SaltSize, HashSize);

        return Convert.ToBase64String(hashBytes);
    }

    /// <inheritdoc />
    public bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            // 解碼儲存的雜湊
            var hashBytes = Convert.FromBase64String(passwordHash);

            if (hashBytes.Length != SaltSize + HashSize)
            {
                return false;
            }

            // 分離鹽值和雜湊值
            var salt = new byte[SaltSize];
            var storedHash = new byte[HashSize];
            Buffer.BlockCopy(hashBytes, 0, salt, 0, SaltSize);
            Buffer.BlockCopy(hashBytes, SaltSize, storedHash, 0, HashSize);

            // 使用相同的鹽值雜湊輸入的密碼
            var computedHash = HashPasswordWithSalt(password, salt);

            // 使用時間常數比較以防止計時攻擊
            return CryptographicOperations.FixedTimeEquals(storedHash, computedHash);
        }
        catch
        {
            return false;
        }
    }

    private static byte[] HashPasswordWithSalt(string password, byte[] salt)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = DegreeOfParallelism,
            MemorySize = MemorySize,
            Iterations = Iterations
        };

        return argon2.GetBytes(HashSize);
    }
}

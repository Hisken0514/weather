namespace Forma.Application.Common.Interfaces;

/// <summary>
/// 當前使用者服務介面
/// </summary>
public interface ICurrentUserService
{
    /// <summary>
    /// 當前使用者 ID
    /// </summary>
    Guid? UserId { get; }

    /// <summary>
    /// 當前使用者名稱
    /// </summary>
    string? Username { get; }

    /// <summary>
    /// 當前使用者電子郵件
    /// </summary>
    string? Email { get; }

    /// <summary>
    /// 是否已認證
    /// </summary>
    bool IsAuthenticated { get; }

    /// <summary>
    /// 當前使用者權限值
    /// </summary>
    long Permissions { get; }

    /// <summary>
    /// 是否為系統管理員
    /// </summary>
    bool IsSystemAdmin { get; }
}

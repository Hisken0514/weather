namespace Forma.Application.Features.Users.DTOs;

/// <summary>
/// 使用者列表 DTO
/// </summary>
public class UserListDto
{
    /// <summary>
    /// 使用者 ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// 使用者名稱
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 電子郵件
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// 自訂角色 ID
    /// </summary>
    public Guid? RoleId { get; set; }

    /// <summary>
    /// 自訂角色名稱
    /// </summary>
    public string? RoleName { get; set; }

    /// <summary>
    /// 部門
    /// </summary>
    public string? Department { get; set; }

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsActive { get; set; }

    /// <summary>
    /// 最後登入時間
    /// </summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>
    /// 綁定的產業園區名稱清單
    /// </summary>
    public List<string> IndustrialParks { get; set; } = new();
}

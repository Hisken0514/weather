namespace Forma.Domain.Enums;

/// <summary>
/// 表單存取控制
/// </summary>
public enum FormAccessControl
{
    /// <summary>
    /// 公開（任何人可填寫）
    /// </summary>
    Public = 0,

    /// <summary>
    /// 私有（僅計畫成員可填寫）
    /// </summary>
    Private = 1,

    /// <summary>
    /// 限制（依權限設定）
    /// </summary>
    Restricted = 2
}

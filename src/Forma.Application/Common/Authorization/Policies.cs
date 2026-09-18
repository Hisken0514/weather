namespace Forma.Application.Common.Authorization;

/// <summary>
/// 授權策略常數
/// </summary>
public static class Policies
{
    /// <summary>
    /// 需要一般使用者權限 (User, Auditor, SystemAdmin)
    /// </summary>
    public const string RequireUser = nameof(RequireUser);

    /// <summary>
    /// 需要審核員權限 (Auditor, SystemAdmin)
    /// </summary>
    public const string RequireAuditor = nameof(RequireAuditor);

    /// <summary>
    /// 需要系統管理員權限 (SystemAdmin)
    /// </summary>
    public const string RequireSystemAdmin = nameof(RequireSystemAdmin);
}

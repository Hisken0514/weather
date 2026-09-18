namespace Forma.Domain.Enums;

/// <summary>
/// 後台使用者權限
/// 前端使用 BigInt 處理 64-bit 位元運算
/// </summary>
[Flags]
public enum UserPermission : long
{
    None = 0,

    // ==================== 系統管理 ====================
    /// <summary>
    /// 使用者管理
    /// </summary>
    ManageUsers = 1L << 0,

    /// <summary>
    /// 角色管理
    /// </summary>
    ManageRoles = 1L << 1,

    /// <summary>
    /// 系統設定
    /// </summary>
    ManageSettings = 1L << 2,

    /// <summary>
    /// 查看操作日誌
    /// </summary>
    ViewActionLogs = 1L << 3,

    /// <summary>
    /// 查看郵件日誌
    /// </summary>
    ViewEmailLogs = 1L << 4,

    // ==================== 組織管理 ====================
    /// <summary>
    /// 組織管理
    /// </summary>
    ManageOrganizations = 1L << 10,

    // ==================== 計畫管理 ====================
    /// <summary>
    /// 建立計畫
    /// </summary>
    CreateProjects = 1L << 20,

    /// <summary>
    /// 管理所有計畫
    /// </summary>
    ManageAllProjects = 1L << 21,

    // ==================== 表單管理 ====================
    /// <summary>
    /// 建立表單
    /// </summary>
    CreateForms = 1L << 30,

    /// <summary>
    /// 管理所有表單
    /// </summary>
    ManageAllForms = 1L << 31,

    /// <summary>
    /// 管理表單範本
    /// </summary>
    ManageTemplates = 1L << 32,

    /// <summary>
    /// 鎖定/解鎖表單
    /// </summary>
    LockUnlockForms = 1L << 33,

    // ==================== 信件管理 ====================
    /// <summary>
    /// 管理信件範本
    /// </summary>
    ManageEmailTemplates = 1L << 40,

    // ==================== 資料與報表 ====================
    /// <summary>
    /// 查看所有提交資料
    /// </summary>
    ViewAllSubmissions = 1L << 50,

    /// <summary>
    /// 匯出資料
    /// </summary>
    ExportData = 1L << 51,

    /// <summary>
    /// 查看報表
    /// </summary>
    ViewReports = 1L << 52,

    // ==================== 系統管理員 ====================
    /// <summary>
    /// 所有權限（系統管理員）
    /// </summary>
    All = ManageUsers | ManageRoles | ManageSettings |
          ViewActionLogs | ViewEmailLogs |
          ManageOrganizations |
          CreateProjects | ManageAllProjects |
          CreateForms | ManageAllForms | ManageTemplates | LockUnlockForms |
          ManageEmailTemplates |
          ViewAllSubmissions | ExportData | ViewReports
}

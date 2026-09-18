namespace Forma.Application.Common.Authorization;

/// <summary>
/// 權限常數 (細粒度權限控制)
/// </summary>
public static class Permissions
{
    /// <summary>
    /// 使用者管理
    /// </summary>
    public static class Users
    {
        public const string View = "Users.View";
        public const string Create = "Users.Create";
        public const string Update = "Users.Update";
        public const string Delete = "Users.Delete";
        public const string ManageRoles = "Users.ManageRoles";
    }

    /// <summary>
    /// 專案管理
    /// </summary>
    public static class Projects
    {
        public const string View = "Projects.View";
        public const string Create = "Projects.Create";
        public const string Update = "Projects.Update";
        public const string Delete = "Projects.Delete";
        public const string ManageMembers = "Projects.ManageMembers";
    }

    /// <summary>
    /// 表單管理
    /// </summary>
    public static class Forms
    {
        public const string View = "Forms.View";
        public const string Create = "Forms.Create";
        public const string Update = "Forms.Update";
        public const string Delete = "Forms.Delete";
        public const string ManagePermissions = "Forms.ManagePermissions";
    }

    /// <summary>
    /// 表單填報
    /// </summary>
    public static class Submissions
    {
        public const string View = "Submissions.View";
        public const string Create = "Submissions.Create";
        public const string Update = "Submissions.Update";
        public const string Delete = "Submissions.Delete";
        public const string Review = "Submissions.Review";
        public const string Export = "Submissions.Export";
    }

    /// <summary>
    /// 報表
    /// </summary>
    public static class Reports
    {
        public const string View = "Reports.View";
        public const string Create = "Reports.Create";
        public const string Export = "Reports.Export";
    }

    /// <summary>
    /// 系統管理
    /// </summary>
    public static class System
    {
        public const string ViewAuditLogs = "System.ViewAuditLogs";
        public const string ManageSettings = "System.ManageSettings";
        public const string ViewStatistics = "System.ViewStatistics";
    }
}

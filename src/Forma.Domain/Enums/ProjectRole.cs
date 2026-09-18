namespace Forma.Domain.Enums;

/// <summary>
/// 計畫成員角色
/// </summary>
public enum ProjectRole
{
    /// <summary>
    /// 提交者（僅可填寫表單）
    /// </summary>
    Submitter = 0,

    /// <summary>
    /// 一般成員
    /// </summary>
    Member = 1,

    /// <summary>
    /// 分析師（可查看報告）
    /// </summary>
    Analyst = 2,

    /// <summary>
    /// 管理員
    /// </summary>
    Manager = 3,

    /// <summary>
    /// 擁有者
    /// </summary>
    Owner = 4
}

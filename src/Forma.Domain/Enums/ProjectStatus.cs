namespace Forma.Domain.Enums;

/// <summary>
/// 計畫狀態
/// </summary>
public enum ProjectStatus
{
    /// <summary>
    /// 草稿
    /// </summary>
    Draft = 0,

    /// <summary>
    /// 進行中
    /// </summary>
    Active = 1,

    /// <summary>
    /// 已完成
    /// </summary>
    Completed = 2,

    /// <summary>
    /// 已封存
    /// </summary>
    Archived = 3
}

namespace Forma.Domain.Enums;

/// <summary>
/// 督導任務狀態
/// </summary>
public enum SupervisionTaskStatus
{
    /// <summary>
    /// 未填寫
    /// </summary>
    Pending = 0,

    /// <summary>
    /// 填寫中（草稿）
    /// </summary>
    InProgress = 1,

    /// <summary>
    /// 已完成
    /// </summary>
    Completed = 2
}

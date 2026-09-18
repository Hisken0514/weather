namespace Forma.Domain.Enums;

/// <summary>
/// 改善辦理狀態（IsImprovementCompleted 為 false 時才需要填寫，用來說明目前處理進度）
/// </summary>
public enum ImprovementStatus
{
    /// <summary>
    /// 改善辦理中
    /// </summary>
    InProgress = 0,

    /// <summary>
    /// 尚未改善
    /// </summary>
    NotStarted = 1
}

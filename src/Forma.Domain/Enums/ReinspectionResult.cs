namespace Forma.Domain.Enums;

/// <summary>
/// 複查結果
/// </summary>
public enum ReinspectionResult
{
    /// <summary>
    /// 已改善
    /// </summary>
    Improved = 0,

    /// <summary>
    /// 待改善
    /// </summary>
    PendingImprovement = 1,

    /// <summary>
    /// 其他（自行輸入，見 FactoryReplyItem.ResultOtherText）
    /// </summary>
    Other = 2
}

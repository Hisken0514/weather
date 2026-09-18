namespace Forma.Domain.Enums;

/// <summary>
/// 表單提交狀態
/// </summary>
public enum SubmissionStatus
{
    /// <summary>
    /// 草稿
    /// </summary>
    Draft = 0,

    /// <summary>
    /// 已提交
    /// </summary>
    Submitted = 1,

    /// <summary>
    /// 審核中
    /// </summary>
    Reviewed = 2,

    /// <summary>
    /// 已核准
    /// </summary>
    Approved = 3,

    /// <summary>
    /// 已拒絕
    /// </summary>
    Rejected = 4
}

namespace Forma.Domain.Enums;

/// <summary>
/// 年度督導計畫狀態
/// </summary>
public enum SupervisionCampaignStatus
{
    /// <summary>
    /// 草稿（尚未啟用）
    /// </summary>
    Draft = 0,

    /// <summary>
    /// 進行中
    /// </summary>
    Active = 1,

    /// <summary>
    /// 已結束
    /// </summary>
    Closed = 2
}

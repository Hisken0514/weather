namespace Forma.Domain.Enums;

/// <summary>
/// 檔案狀態
/// </summary>
public enum FileStatus
{
    /// <summary>
    /// 上傳中
    /// </summary>
    Uploading = 0,

    /// <summary>
    /// 已完成
    /// </summary>
    Completed = 1,

    /// <summary>
    /// 處理中
    /// </summary>
    Processing = 2,

    /// <summary>
    /// 已刪除
    /// </summary>
    Deleted = 3,

    /// <summary>
    /// 錯誤
    /// </summary>
    Error = 4
}

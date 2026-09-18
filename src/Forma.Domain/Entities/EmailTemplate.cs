namespace Forma.Domain.Entities;

/// <summary>
/// 信件範本
/// </summary>
public class EmailTemplate : AuditableEntity
{
    /// <summary>
    /// 範本識別鍵 (如 welcome, password-reset 等)
    /// </summary>
    public string TemplateKey { get; set; } = string.Empty;

    /// <summary>
    /// 範本名稱
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 郵件主旨
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// HTML 內容
    /// </summary>
    public string HtmlContent { get; set; } = string.Empty;

    /// <summary>
    /// 是否啟用
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// 可用變數清單 (JSON 陣列)
    /// </summary>
    public string AvailableVariables { get; set; } = "[]";

    /// <summary>
    /// 測試變數 (JSON 物件)
    /// </summary>
    public string TestVariables { get; set; } = "{}";
}

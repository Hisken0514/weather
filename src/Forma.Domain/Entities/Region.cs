namespace Forma.Domain.Entities;

/// <summary>
/// 轄區（可由管理員自訂，作為督導機關與業者的轄區下拉選單來源）
/// </summary>
public class Region : BaseEntity
{
    /// <summary>
    /// 轄區名稱（唯一）
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// 排序順序（數字越小越前面）
    /// </summary>
    public int SortOrder { get; set; } = 0;
}

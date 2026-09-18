namespace Forma.Shared;

/// <summary>
/// Excel 把「工廠登記編號」「統一編號」這類固定8碼的政府編碼當數字存的話，前面的0
/// 會被自動去掉（e.g. 07003102 變成7003102），這裡補回8位數，避免同一家工廠因為
/// 前面缺0被系統誤判成不同工廠、或統一編號被存錯。
/// 只補純數字、且不滿8碼的（本來就有英文字母或已經8碼以上的維持原樣，不動）。
/// </summary>
public static class FactoryRegistrationNoNormalizer
{
    public static string Normalize(string regNo) =>
        regNo.Length < 8 && regNo.All(char.IsDigit) ? regNo.PadLeft(8, '0') : regNo;
}

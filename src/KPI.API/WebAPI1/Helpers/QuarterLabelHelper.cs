namespace WebAPI1.Helpers;

/// <summary>
/// 把內部使用的期別代碼（Q1/Q2/Q3/Q4/H1/Y）轉成使用者看到的顯示文字。
/// 代碼本身不變（資料庫、比對邏輯都還是用 Q2/Q4），只有顯示文字換掉。
/// </summary>
public static class QuarterLabelHelper
{
    private static readonly Dictionary<string, string> Labels = new()
    {
        ["Q2"] = "年度績效檢討（前一年度整體執行成果）",
        ["Q4"] = "年度改善追蹤（當年度 1–9 月執行情況）",
    };

    public static string GetLabel(string? period)
    {
        if (period != null && Labels.TryGetValue(period, out var label)) return label;
        return period ?? string.Empty;
    }
}

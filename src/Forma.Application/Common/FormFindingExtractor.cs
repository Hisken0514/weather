using System.Text.Json;
using System.Text.RegularExpressions;

namespace Forma.Application.Common;

public record SupervisionFindingField(string Label, string Value);

/// <summary>
/// 從督導表單 schema + 填答資料中，抽出固定幾個關鍵欄位（督導結果/違反法規條款/違反事實/
/// 建議事項備註），給工廠改善回覆、機關複查登打頁面顯示，讓填寫人知道當初督導記錄了什麼、
/// 要回覆什麼。比照 SupervisionService 既有「依 label 文字找欄位」的作法，只是擴充成找多個
/// 固定欄位而非單一欄位。
/// </summary>
public static class FormFindingExtractor
{
    private static readonly string[] TargetLabels = ["督導結果", "違反法規條款", "違反事實", "建議事項/備註"];

    public static List<SupervisionFindingField> Extract(string? schemaJson, string? submissionDataJson)
    {
        var result = new List<SupervisionFindingField>();
        if (string.IsNullOrWhiteSpace(schemaJson) || string.IsNullOrWhiteSpace(submissionDataJson))
            return result;

        try
        {
            var data = FormSubmissionDataHelper.ParseSubmissionData(submissionDataJson);

            using var doc = JsonDocument.Parse(schemaJson);
            if (!doc.RootElement.TryGetProperty("pages", out var pages))
                return result;

            foreach (var targetLabel in TargetLabels)
            {
                JsonElement? matchedField = null;
                foreach (var page in pages.EnumerateArray())
                {
                    if (!page.TryGetProperty("fields", out var fields)) continue;
                    matchedField = FindFieldByLabel(fields, targetLabel);
                    if (matchedField != null) break;
                }

                if (matchedField == null || !matchedField.Value.TryGetProperty("name", out var nameEl))
                    continue;

                var fieldName = nameEl.GetString() ?? "";
                var rawValue = data.TryGetValue(fieldName, out var v) ? v : null;
                result.Add(new SupervisionFindingField(targetLabel, ResolveDisplayValue(rawValue, matchedField.Value)));
            }
        }
        catch
        {
            // schema/資料格式不符預期就回傳目前已解析到的結果
        }

        return result;
    }

    private static JsonElement? FindFieldByLabel(JsonElement fields, string targetLabel)
    {
        foreach (var field in fields.EnumerateArray())
        {
            var rawLabel = field.TryGetProperty("label", out var l) ? l.GetString() ?? "" : "";
            var cleanLabel = Regex.Replace(rawLabel, "<[^>]*>", "").Trim();

            if (cleanLabel == targetLabel)
                return field;

            if (field.TryGetProperty("properties", out var props) &&
                props.TryGetProperty("fields", out var nestedFields) &&
                nestedFields.ValueKind == JsonValueKind.Array)
            {
                var nested = FindFieldByLabel(nestedFields, targetLabel);
                if (nested != null) return nested;
            }
        }
        return null;
    }

    private static string ResolveDisplayValue(object? value, JsonElement field)
    {
        switch (value)
        {
            case null:
                return "";
            case bool b:
                return b ? "是" : "否";
            case List<object?> list:
                return string.Join("、", list.Select(v => ResolveDisplayValue(v, field)).Where(s => s.Length > 0));
            case string s when s.Length == 0:
                return "";
            case string s:
                var options = GetOptionLabels(field);
                return options.TryGetValue(s, out var label) ? label : s;
            default:
                return value.ToString() ?? "";
        }
    }

    private static Dictionary<string, string> GetOptionLabels(JsonElement field)
    {
        var result = new Dictionary<string, string>();
        if (field.ValueKind != JsonValueKind.Object) return result;
        if (!field.TryGetProperty("properties", out var props)) return result;
        if (!props.TryGetProperty("options", out var options) || options.ValueKind != JsonValueKind.Array) return result;

        foreach (var opt in options.EnumerateArray())
        {
            var value = opt.TryGetProperty("value", out var v) ? v.GetString() : null;
            var label = opt.TryGetProperty("label", out var lv) ? lv.GetString() : null;
            if (value != null && label != null) result[value] = label;
        }
        return result;
    }
}

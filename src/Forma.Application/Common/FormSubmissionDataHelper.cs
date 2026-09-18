using System.Text.Json;

namespace Forma.Application.Common;

/// <summary>
/// 解析 FormSubmission.SubmissionData（JSON）成可用的 .NET 值，供督導相關服務共用。
/// </summary>
public static class FormSubmissionDataHelper
{
    /// <summary>
    /// 解析 SubmissionData JSON，優先取 .data 屬性，若無則取根層。
    /// </summary>
    public static Dictionary<string, object?> ParseSubmissionData(string json)
    {
        var result = new Dictionary<string, object?>();
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // FormSubmissionData 格式：{ "data": { ... }, "formId": "...", ... }
            JsonElement dataEl = root.TryGetProperty("data", out var d) ? d : root;

            foreach (var prop in dataEl.EnumerateObject())
                result[prop.Name] = ExtractJsonValue(prop.Value);
        }
        catch { /* 忽略格式錯誤的 JSON */ }
        return result;
    }

    public static object? ExtractJsonValue(JsonElement el) => el.ValueKind switch
    {
        JsonValueKind.String => el.GetString(),
        JsonValueKind.Number => el.TryGetInt64(out var i) ? (object?)i : el.GetDouble(),
        JsonValueKind.True => (object?)true,
        JsonValueKind.False => (object?)false,
        JsonValueKind.Null => null,
        JsonValueKind.Array => el.EnumerateArray().Select(ExtractJsonValue).ToList(),
        JsonValueKind.Object => el.GetRawText(),
        _ => null
    };
}

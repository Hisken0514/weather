namespace WebAPI1.Services;

public static class tool
{
    public static DateTime GetTaiwanNow()
    {
        TimeZoneInfo taiwanTimeZone;

        try
        {
            // 根據平台自動判斷時區 ID
            if (OperatingSystem.IsWindows())
                taiwanTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Taipei Standard Time");
            else
                taiwanTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Taipei");

            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, taiwanTimeZone);
        }
        catch (TimeZoneNotFoundException ex)
        {
            throw new Exception("無法辨識台灣時區，請確認系統支援。", ex);
        }
    }
}
namespace test.Models;
using System.ComponentModel.DataAnnotations;

public class WeatherForecasts
{
    public DateOnly Date { get; set; }
    public int TemperatureC { get; set; }
    
    [MaxLength(100)] // 👈 對應資料庫長度限制 character varying(100)
    public string Summary { get; set; } = string.Empty;
}
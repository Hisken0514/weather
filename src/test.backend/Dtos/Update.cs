namespace test.Dtos;

using System.ComponentModel.DataAnnotations;


public class Update
{
    [Required(ErrorMessage = "日期為必填欄位")]
    public DateOnly Date { get; set; }

    [Range(-100, 100, ErrorMessage = "溫度範圍必須介於 -100 到 100 度之間")]
    public int TemperatureC { get; set; }

    [MaxLength(100, ErrorMessage = "天氣描述不能超過 100 個字元")]
    public string Summary { get; set; } = string.Empty;
    
}
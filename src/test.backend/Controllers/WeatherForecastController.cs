using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using test.Dtos;
using test.Models;
    
namespace test.Controllers;

[ApiController]
[Route("[controller]")]
public class WeatherForecastController : ControllerBase
{
    private readonly AppDbContext _context;

    // 透過建構子注入 AppDbContext
    public WeatherForecastController(AppDbContext context)
    {
        _context = context;
    }

    // 1. 拿出「所有」天氣資料
    // GET: /WeatherForecast
    [HttpGet]
    public async Task<ActionResult<IEnumerable<WeatherForecasts>>> GetAll(CancellationToken ct)
    {
        // _context.WeatherForecasts 會自動轉譯成 SQL: SELECT "Date", "TemperatureC", "Summary" FROM "WeatherForecasts";
        var forecasts = await _context.WeatherForecasts.ToListAsync(ct);

        return Ok(forecasts);
    }

    // 3. 拿出「溫度高於指定度數」的天氣資料 (條件篩選)
    // GET: /WeatherForecast/warm?minTemp=20
    [HttpGet("warm")]
    public async Task<ActionResult<IEnumerable<WeatherForecasts>>> GetWarmDays([FromQuery] int minTemp, CancellationToken ct)
    {
        var warmDays = await _context.WeatherForecasts
            .Where(w => w.TemperatureC >= minTemp) // SQL: WHERE "TemperatureC" >= minTemp
            .OrderByDescending(w => w.TemperatureC) // 依溫度由高到低排序
            .ToListAsync(ct);

        return Ok(warmDays);
    }
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] WeatherForecastCreateDto dto, CancellationToken ct)
    {
        // 檢查日期是否已存在（因為 Date 是 Primary Key）
        var exists = await _context.WeatherForecasts.AnyAsync(w => w.Date == dto.Date, ct);
        if (exists)
        {
            return BadRequest(new { message = $"日期 {dto.Date} 的資料已存在" });
        }

        // 將 DTO 轉成 Entity
        var entity = new WeatherForecasts
        {
            Date = dto.Date,
            TemperatureC = dto.TemperatureC,
            Summary = dto.Summary
        };

        _context.WeatherForecasts.Add(entity);
        await _context.SaveChangesAsync(ct);
        
        var successResponse = JsonRespon<WeatherForecasts>.Success(entity, "POST成功");
        return Ok(successResponse);
        return CreatedAtAction(nameof(GetByDate), new { date = entity.Date }, entity);
    }
    [HttpPut("{date}")]
    public async Task<IActionResult> Update([FromBody] WeatherForecastCreateDto dto, CancellationToken ct)
    {   
        // 2. 尋找現有資料
        var entity = await _context.WeatherForecasts.FindAsync(new object[] { dto.Date }, ct);
        if (entity == null)
        {
            return NotFound(new { message = $"日期 {dto.Date} 的資料不存在" });
        }

        // 3. 更新屬性
        entity.TemperatureC = dto.TemperatureC;
        entity.Summary = dto.Summary;

        // 4. 儲存變更
        await _context.SaveChangesAsync(ct);

        return NoContent(); // HTTP 204 代表更新成功且不需回傳內容，亦可回傳 Ok(entity)
    }

    [HttpDelete("{date}")]
    public async Task<IActionResult> Delete(DateOnly date, CancellationToken ct)
    {
        var entity = await _context.WeatherForecasts.FindAsync(new object[] { date }, ct);
        if (entity == null)
        {
            return NotFound(new { message = $"找不到日期 {date} 的資料，無法刪除" });
        }

        // 2. 從 DbContext 中移除
        _context.WeatherForecasts.Remove(entity);

        // 3. 異步儲存變更至資料庫
        await _context.SaveChangesAsync(ct);

        // 4. 回傳 204 No Content 代表刪除成功且不需回傳資料內容
        return NoContent();
    }
    
    [HttpGet("{date}")]
    public async Task<IActionResult> GetByDate(DateOnly date, CancellationToken ct)
    {
        var entity = await _context.WeatherForecasts.FindAsync(new object[] { date }, ct);
        if (entity == null)
        {
            // 失敗：傳回 HTTP 404 並包裝失敗訊息
            var failResponse = JsonRespon<WeatherForecasts>.Fail($"找不到日期 {date} 的資料");
            return NotFound(failResponse);
        }
    
        // 成功：傳回 HTTP 200 並包裝資料 entity
        var successResponse = JsonRespon<WeatherForecasts>.Success(entity, "查詢成功");
        return Ok(successResponse);
    }
    
}
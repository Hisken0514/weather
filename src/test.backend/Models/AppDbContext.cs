using Microsoft.EntityFrameworkCore;

namespace test.Models; // ⚠️ 請確保這裡的命名空間與你的 Controller 一致

public class AppDbContext : DbContext
{
    // 建構子：接收 Program.cs 傳進來的資料庫連線設定
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
        
    }

    // 這代表 PostgreSQL 資料庫裡的 WeatherForecasts 資料表
    public DbSet<WeatherForecasts> WeatherForecasts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 如果 WeatherForecast 類別裡面沒有名為 Id 的欄位，需要指定 Primary Key (主鍵)
        // 這裡預設將 Date 設為主鍵：
        modelBuilder.Entity<WeatherForecasts>().HasKey(w => w.Date);
    }
}